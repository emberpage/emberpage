import { Deferred, Effect, Exit, Schema } from 'effect';
import { createHeliaLight } from 'helia';
import { delegatedHTTPRouter } from '@helia/delegated-routing-client';
import { withLibp2pLight } from '@helia/libp2p';
import { withBitswap } from '@helia/bitswap';
import { fixedSize } from 'ipfs-unixfs-importer/chunker';
import { unixfs } from '@helia/unixfs';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { identify, identifyPush } from '@libp2p/identify';
import { ping } from '@libp2p/ping';
import { noise } from '@libp2p/noise';
import { yamux } from '@libp2p/yamux';
import { multiaddr } from '@multiformats/multiaddr';
import { IDBBlockstore } from 'blockstore-idb';
import { BlackHoleBlockstore } from 'blockstore-core';
import { IDBDatastore } from 'datastore-idb';
import { MemoryDatastore } from 'datastore-core';
import { Key } from 'interface-datastore';
import { CID } from 'multiformats/cid';
import { decodeArticle, MAX_ARTICLE_BYTES } from '../domain/article.ts';
import { BoundaryError, IpfsQuotaError } from '../domain/errors.ts';
import { isSnapshotCid, MAX_IPFS_DAG_OVERHEAD } from '../domain/cid.ts';
import { isSnapshotRoute, PUBLIC_BOOTSTRAP_ROUTES, ReaderRoutes, isPublicPeerAddress } from '../domain/routes.ts';
import type { ArticleCopy, IpfsMirror, Listing } from '../domain/types.ts';

const io = <A>(operation: (signal: AbortSignal) => PromiseLike<A>) =>
  Effect.tryPromise({try: operation, catch: cause => BoundaryError.from(cause)});
const reject = (message: string) => Effect.fail(BoundaryError.from(new Error(message)));
const BYTE_LIMIT = 32 * 1024 * 1024;

/** Only explicitly contributed blocks enter this store. */
export class ContributedBlocks extends IDBBlockstore {
  #stored = 0;
  readonly #mutations = new Map<string, Promise<void>>();
  #sent = 0;
  #window = Date.now();
  override async open() {
    await super.open();
    this.#stored = 0;
    for await (const pair of super.getAll()) for await (const bytes of pair.bytes) this.#stored += bytes.length;
  }
  async #mutate<A>(cid: CID, operation: () => Promise<A>): Promise<A> {
    const key = cid.multihash.bytes.join(',');
    const previous = this.#mutations.get(key);
    const {promise, resolve} = Promise.withResolvers<void>();
    this.#mutations.set(key, promise);
    try {
      await previous;
      return await operation();
    } finally {
      resolve();
      if (this.#mutations.get(key) === promise) this.#mutations.delete(key);
    }
  }
  override async put(...args: Parameters<IDBBlockstore['put']>) {
    const [cid, input, options] = args;
    return this.#mutate(cid, async () => {
      options?.signal?.throwIfAborted();
      if (await super.has(cid, options)) return cid;
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const bytes of input instanceof Uint8Array ? [input] : input) {
        size += bytes.length;
        if (size > MAX_ARTICLE_BYTES || this.#stored + size > BYTE_LIMIT)
          throw new Error('The mesh block storage limit is full. Remove contributed copies in Manage.');
        chunks.push(bytes);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
      options?.signal?.throwIfAborted();
      if (this.#stored + size > BYTE_LIMIT)
        throw new Error('The mesh block storage limit is full. Remove contributed copies in Manage.');
      this.#stored += size;
      try {
        await super.put(cid, bytes);
      } catch (error) {
        this.#stored -= size;
        throw error;
      }
      return cid;
    });
  }
  override async *get(...args: Parameters<IDBBlockstore['get']>) {
    if (Date.now() - this.#window >= 3600000) {this.#window = Date.now(); this.#sent = 0;}
    for await (const bytes of super.get(...args)) {
      if (this.#sent + bytes.length > 64 * 1024 * 1024)
        throw new Error('Mesh serving reached its hourly bandwidth limit.');
      this.#sent += bytes.length;
      yield bytes;
    }
  }
  override async delete(...args: Parameters<IDBBlockstore['delete']>) {
    const [cid, options] = args;
    return this.#mutate(cid, async () => {
      options?.signal?.throwIfAborted();
      let size = 0;
      if (await super.has(cid, options)) for await (const bytes of super.get(cid, options)) size += bytes.length;
      options?.signal?.throwIfAborted();
      // Join the native write before releasing the guard or changing accounting.
      await super.delete(cid);
      this.#stored -= size;
    });
  }
}

interface DownloadLimit {
  maximumBytes: number;
  budget?: {remainingBytes: number};
}
/** Discard received blocks immediately; they are never available to other peers. */
export class ReceivedBlocks extends BlackHoleBlockstore {
  #remaining: number;
  readonly #budget: DownloadLimit['budget'];
  constructor(limit: DownloadLimit) {super(); this.#remaining = limit.maximumBytes; this.#budget = limit.budget;}
  override async put(...args: Parameters<BlackHoleBlockstore['put']>) {
    const [cid, input, options] = args;
    for await (const bytes of input instanceof Uint8Array ? [input] : input) {
      options?.signal?.throwIfAborted();
      if (bytes.length > this.#remaining) throw new Error('The snapshot exceeds its block download limit.');
      if (this.#budget && bytes.length > this.#budget.remainingBytes) {
        this.#budget.remainingBytes = 0;
        throw new Error('The article search reached its download limit.');
      }
      this.#remaining -= bytes.length;
      if (this.#budget) this.#budget.remainingBytes -= bytes.length;
    }
    return cid;
  }
}

interface MeshNode {
  add(bytes: Uint8Array, signal: AbortSignal): Promise<string>;
  pin(cid: string, signal: AbortSignal): Promise<void>;
  unpin(cid: string): Promise<void>;
  isPinned(cid: string): Promise<boolean>;
  collect(): Promise<void>;
  read(cid: string, signal: AbortSignal): AsyncIterable<Uint8Array>;
  routes(): string[];
  dial(route: string, signal: AbortSignal): Promise<void>;
  close(): Promise<void>;
}
/** Native root-pin semantics stay inside the mesh adapter. */
export class SnapshotPins {
  readonly #pins: ReturnType<typeof createHeliaLight>['pins'];
  constructor(pins: ReturnType<typeof createHeliaLight>['pins']) {this.#pins = pins;}
  async #complete(cid: CID): Promise<void> {
    try {await this.#pins.get(cid); return;} catch (error) {
      if (!(error instanceof Error) || error.name !== 'NotFoundError') throw error;
    }
    // Helia resumes existing block marks and writes the root record last.
    for await (const block of this.#pins.add(cid)) {void block;}
  }
  async pin(cid: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    // Once entered, local pin metadata finishes; the mesh joins it on cancellation.
    await this.#complete(CID.parse(cid));
  }
  async unpin(cid: string): Promise<void> {
    const root = CID.parse(cid);
    await this.#complete(root);
    for await (const block of this.#pins.rm(root)) {void block;}
  }
  isPinned(cid: string): Promise<boolean> {return this.#pins.isPinned(CID.parse(cid));}
}
interface Consent {
  get(): Promise<boolean>;
  set(enabled: boolean): Promise<void>;
}
interface Reservations {
  reserve(blobHash: string, size: number, cid?: string): Promise<boolean>;
  release(blobHash: string): Promise<void>;
  list(): Promise<{blobHash: string; size: number; cid?: string}[]>;
}
const consentStore = (): Consent => {
  const datastore = new IDBDatastore('emberpage-mesh-consent-v1');
  const key = new Key('/serving');
  let opening: Promise<void> | undefined;
  const access = async <A>(operation: () => Promise<A>) => {
    await (opening ??= datastore.open());
    return operation();
  };
  return {
    get: () => access(async () => await datastore.has(key) && (await datastore.get(key))[0] === 1),
    set: enabled => access(async () => {await datastore.put(key, new Uint8Array([enabled ? 1 : 0]));})
  };
};
const createBrowserNode = async (contributing: boolean, offline = false, download: DownloadLimit = {maximumBytes: MAX_ARTICLE_BYTES + MAX_IPFS_DAG_OVERHEAD}): Promise<MeshNode> => {
  const datastore = contributing ? new IDBDatastore('emberpage-mesh-node-v1') : new MemoryDatastore();
  const blocks = contributing ? new ContributedBlocks('emberpage-mesh-blocks-v1') : new ReceivedBlocks(download);
  if (datastore instanceof IDBDatastore) await datastore.open();
  if (blocks instanceof IDBBlockstore) await blocks.open();
  const storage = createHeliaLight({datastore, blockstore: blocks, routers: offline ? [] : [delegatedHTTPRouter({url: 'https://delegated-ipfs.dev', filterProtocols: ['transport-bitswap'], filterAddrs: ['webrtc','wss','tls']})]});
  let connectionCount = () => 0;
  const connected = offline ? undefined : withBitswap(withLibp2pLight(storage, {
    // Leave four slots for reader relay/WebRTC upgrades; at most two discovery dials run in parallel.
    connectionGater: {denyDialMultiaddr: address => Promise.resolve(!isPublicPeerAddress(address.toString()) ||
      contributing && connectionCount() >= 8)},
    addresses: {listen: contributing ? ['/p2p-circuit', '/webrtc'] : []},
    connectionManager: {maxConnections: contributing ? 12 : 4, maxParallelDials: 2, maxDialQueueLength: 12},
    transports: [webSockets(), circuitRelayTransport({maxReservationQueueLength: 12, maxInboundStopStreams: 4, maxOutboundStopStreams: 4}), webRTC()],
    connectionEncrypters: [noise()], streamMuxers: [yamux()],
    peerDiscovery: contributing ? [bootstrap({list: [...PUBLIC_BOOTSTRAP_ROUTES]})] : [],
    services: {ping: ping(), identify: identify(), identifyPush: identifyPush(), ...(contributing ? {dht: kadDHT({clientMode: true})} : {})}
  }), {maxInboundStreams: 4, maxOutboundStreams: 4, maxWantlistSize: 64,
    maxIncomingMessageSize: 512 * 1024, maxOutgoingMessageSize: 512 * 1024,
    sendBlocksMaxQueueLength: 4, messageSendConcurrency: 2, sendBlocksTimeout: 10000});
  connectionCount = () => connected?.libp2p.getConnections().length ?? 0;
  const node = connected ?? storage;
  const fs = unixfs(node);
  const pins = new SnapshotPins(node.pins);
  const close = async () => {
    for (const connection of connected?.libp2p.getConnections() ?? []) connection.abort(new Error('Mesh session closed.'));
    await node.stop();
    if (blocks instanceof IDBBlockstore) await blocks.close();
    if (datastore instanceof IDBDatastore) await datastore.close();
  };
  try {await node.start();} catch (error) {await close(); throw error;}
  return {
    add: async (bytes, signal) => (await fs.addBytes(bytes, {signal, cidVersion: 1, rawLeaves: true, chunker: fixedSize({chunkSize: 262144})})).toString(),
    pin: (cid, signal) => pins.pin(cid, signal),
    unpin: cid => pins.unpin(cid),
    isPinned: cid => pins.isPinned(cid),
    collect: () => node.gc(),
    read: (cid, signal) => fs.cat(CID.parse(cid), {signal}),
    routes: () => (connected?.libp2p.getMultiaddrs() ?? []).map(address => address.toString()).filter(address => isSnapshotRoute(address) && address.includes('/webrtc/')).slice(0, 3),
    dial: async (route, signal) => {if (!connected) throw new Error('The mesh node is paused.'); await connected.libp2p.dial(multiaddr(route), {signal});},
    close
  };
};

/** Persistent contributors and disposable receive-only readers have separate stores. */
export class BrowserIpfs {
  readonly #reservations: Reservations;
  readonly #consent: Consent;
  readonly #createNode: (contributing: boolean, offline?: boolean, download?: DownloadLimit) => Promise<MeshNode>;
  readonly #timeoutMs: number;
  #publisher: Promise<MeshNode> | undefined;
  #reads = 0;
  #maintenance = false;
  #epoch = 0;
  readonly #pending = new Map<string, Deferred.Deferred<IpfsMirror, BoundaryError>>();
  constructor({reservations, consent, createNode = createBrowserNode, timeoutMs = 60000}: {
    reservations: Reservations; consent?: Consent; createNode?: (contributing: boolean, offline?: boolean, download?: DownloadLimit) => Promise<MeshNode>; timeoutMs?: number;
  }) {
    this.#reservations = reservations; this.#consent = consent ?? consentStore();
    this.#createNode = createNode; this.#timeoutMs = timeoutMs;
  }
  #contributor() {
    return this.#publisher ??= this.#createNode(true).catch(error => {this.#publisher = undefined; throw error;});
  }
  readonly resumeEffect = Effect.fn('BrowserIpfs.resume')(function*(this: BrowserIpfs) {
    const epoch = this.#epoch;
    const enabled = yield* io(() => this.#consent.get());
    if (enabled && epoch === this.#epoch && !this.#maintenance) yield* io(() => this.#contributor());
  });
  readonly pauseEffect = Effect.fn('BrowserIpfs.pause')(function*(this: BrowserIpfs) {
    return yield* Effect.scoped(Effect.gen({self: this}, function*() {
      yield* Effect.acquireRelease(Effect.suspend(() => this.#pending.size || this.#reads || this.#maintenance
        ? reject('Wait for the current mesh operation to finish.') : Effect.sync(() => {this.#maintenance = true; this.#epoch++;})),
        () => Effect.sync(() => {this.#maintenance = false;}));
      yield* io(() => this.#consent.set(false));
      const node = this.#publisher; this.#publisher = undefined;
      if (node) yield* io(async () => (await node).close());
    })).pipe(Effect.uninterruptible);
  });
  readonly #mirror = Effect.fn('BrowserIpfs.pinSnapshot')(function*(this: BrowserIpfs, copy: ArticleCopy) {
    const canonical = yield* io(() => decodeArticle(copy.bytes, {expected: copy}));
    let created = false, importStarted = false;
    let importing: Promise<string> | undefined;
    let pinning: Promise<void> | undefined;
    return yield* Effect.gen({self: this}, function*() {
      created = yield* Effect.tryPromise({try: () => this.#reservations.reserve(canonical.blobHash, canonical.size),
        catch: cause => cause instanceof IpfsQuotaError ? cause : BoundaryError.from(cause)});
      const node = yield* io(() => this.#contributor());
      importStarted = true;
      const cid = yield* io(signal => (importing = node.add(canonical.bytes, signal)));
      if (!isSnapshotCid(cid)) return yield* reject('The browser node returned an invalid snapshot CID.');
      yield* io(() => this.#reservations.reserve(canonical.blobHash, canonical.size, cid));
      yield* io(signal => (pinning = node.pin(cid, signal)));
      if (!(yield* io(() => node.isPinned(cid)))) return yield* reject('The browser node did not confirm the snapshot pin.');
      yield* io(() => this.#consent.set(true));
      let routes = node.routes();
      while (!routes.length) {yield* Effect.sleep(250); routes = node.routes();}
      return {cid, uri: `ipfs://${cid}`, size: canonical.size, routes};
    }).pipe(Effect.onExit(exit => Effect.gen({self: this}, function*() {
      const pendingWrite = pinning ?? importing;
      if (pendingWrite) yield* Effect.promise(() => pendingWrite.then(() => undefined, () => undefined));
      if (created && !importStarted && Exit.isFailure(exit))
        yield* io(() => this.#reservations.release(canonical.blobHash));
    })));
  });
  readonly mirrorEffect = Effect.fn('BrowserIpfs.mirror')(function*(this: BrowserIpfs, copy: ArticleCopy) {
    const {owner, pending} = yield* Effect.sync(() => {
      const existing = this.#pending.get(copy.blobHash);
      if (existing) return {owner: false, pending: existing};
      if (this.#pending.size || this.#reads || this.#maintenance) return {owner: false, pending: null};
      const pending = Deferred.makeUnsafe<IpfsMirror, BoundaryError>(); this.#pending.set(copy.blobHash, pending);
      return {owner: true, pending};
    });
    if (!pending) return yield* reject('Wait for the current mesh operation to finish.');
    if (!owner) return yield* Deferred.await(pending);
    return yield* this.#mirror(copy).pipe(
      Effect.timeoutOrElse({duration: this.#timeoutMs, orElse: () => reject('Preservation did not finish. Your saved copy is safe; try again.')}),
      Effect.mapError(error => BoundaryError.from(error, 'Could not preserve on IPFS. ' + error.message)),
      Effect.onExit(exit => Deferred.done(pending, exit).pipe(Effect.asVoid)),
      Effect.ensuring(Effect.sync(() => {this.#pending.delete(copy.blobHash);})));
  });
  readonly readEffect = Effect.fn('BrowserIpfs.read')(function*(this: BrowserIpfs, listing: Listing,
    {budget, routes = listing.routes}: {budget?: {remainingBytes: number}; routes?: readonly string[]} = {}
  ): Effect.fn.Return<ArticleCopy, BoundaryError> {
    if (!isSnapshotCid(listing.cid) || !/^[a-f0-9]{64}$/.test(listing.blobHash) ||
      !Number.isSafeInteger(listing.size) || listing.size < 1 || listing.size > MAX_ARTICLE_BYTES)
      return yield* reject('Invalid article file reference.');
    const safeRoutes = yield* Schema.decodeUnknownEffect(ReaderRoutes)(routes).pipe(Effect.mapError(cause => BoundaryError.from(cause, 'Invalid mesh peer routes.')));
    if (budget && (!Number.isSafeInteger(budget.remainingBytes) || budget.remainingBytes < listing.size))
      return yield* reject('The article search reached its download limit.');
    return yield* Effect.scoped(Effect.gen({self: this}, function*() {
      yield* Effect.acquireRelease(Effect.suspend(() => this.#reads >= 2 || this.#pending.size || this.#maintenance
        ? reject('Wait for the current mesh operation to finish.') : Effect.sync(() => {this.#reads++;})),
        () => Effect.sync(() => {this.#reads--;}));
      const node = yield* Effect.acquireRelease(io(() => this.#createNode(false, false, {maximumBytes: listing.size + MAX_IPFS_DAG_OVERHEAD, ...(budget ? {budget} : {})})), node => Effect.promise(() => node.close()));
      const rtcRoutes = safeRoutes.filter(route => route.includes('/webrtc/'));
      yield* Effect.forEach(rtcRoutes.length ? rtcRoutes : safeRoutes,
        route => io(signal => node.dial(route, signal)).pipe(
          Effect.timeoutOrElse({duration: 8000, orElse: () => reject('The contributing peer did not respond.')}),
          Effect.catch(() => Effect.void)), {concurrency: 2});
      const bytes = yield* io(async signal => {
        const bytes = new Uint8Array(listing.size); let size = 0;
        for await (const chunk of node.read(listing.cid, signal)) {
          size += chunk.length;
          if (size > listing.size) throw new Error('The snapshot exceeds its declared file size.');
          bytes.set(chunk, size - chunk.length);
        }
        if (size !== listing.size) throw new Error('The article file size does not match its listing.');
        return bytes;
      });
      const copy = yield* io(() => decodeArticle(bytes, {expected: listing}));
      for (const field of ['url','title','byline','capturedAt'] as const)
        if (copy.article[field] !== listing[field]) return yield* reject('The article metadata does not match its listing.');
      return copy;
    }).pipe(Effect.timeoutOrElse({duration: this.#timeoutMs, orElse: () => reject('Article download timed out.')})));
  });
  readonly #remove = Effect.fn('BrowserIpfs.removePins')(function*(this: BrowserIpfs, blobHash?: string) {
    return yield* Effect.scoped(Effect.gen({self: this}, function*() {
      yield* Effect.acquireRelease(Effect.suspend(() => this.#pending.size || this.#reads || this.#maintenance
        ? reject('Wait for the current mesh operation to finish.') : Effect.sync(() => {this.#maintenance = true; this.#epoch++;})),
        () => Effect.sync(() => {this.#maintenance = false;}));
      const records = yield* io(() => this.#reservations.list());
      const selected = blobHash === undefined ? records : records.filter(record => record.blobHash === blobHash);
      if (!selected.length && blobHash !== undefined) return;
      if (selected.length || blobHash === undefined) {
        const publisher = this.#publisher;
        const node = publisher ? yield* io(() => publisher) :
          yield* Effect.acquireRelease(io(() => this.#createNode(true, true)), node => Effect.promise(() => node.close()));
        for (const record of selected) {
          const cid = record.cid;
          if (cid && (yield* io(() => node.isPinned(cid)))) yield* io(() => node.unpin(cid));
        }
        yield* io(() => node.collect());
        for (const record of selected) yield* io(() => this.#reservations.release(record.blobHash));
      }
      if (selected.length === records.length) {
        yield* io(() => this.#consent.set(false));
        const publisher = this.#publisher; this.#publisher = undefined;
        if (publisher) yield* io(async () => (await publisher).close());
      }
    })).pipe(Effect.uninterruptible);
  });
  readonly forgetEffect = Effect.fn('BrowserIpfs.forget')(function*(this: BrowserIpfs, blobHash: string) {
    yield* this.#remove(blobHash);
  });
  readonly clearEffect = Effect.fn('BrowserIpfs.clear')(function*(this: BrowserIpfs) {
    yield* this.#remove();
  });
}
