import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { CID } from 'multiformats/cid';
import { createHeliaLight } from 'helia';
import { unixfs } from '@helia/unixfs';
import { fixedSize } from 'ipfs-unixfs-importer/chunker';
import { MemoryDatastore } from 'datastore-core';
import { IDBDatastore } from 'datastore-idb';
import { sha256 } from 'multiformats/hashes/sha2';
import { encodeArticle } from '../src/domain/article.ts';
import { indexedDB } from 'fake-indexeddb';
import { IpfsReservations } from '../src/storage/ipfs.ts';
import { BrowserIpfs, ContributedBlocks, ReceivedBlocks, SnapshotPins } from '../src/transport/ipfs.ts';
import { meshRoutes as fixtureRoutes } from './mesh-fixture.ts';
import type { Listing } from '../src/domain/types.ts';

const meshRoutes = fixtureRoutes();
const copy = await encodeArticle({url: 'https://example.org/browser-ipfs', title: 'Explicit browser contribution', byline: 'Fixture',
  capturedAt: Date.now(), content: `<p>${'Original browser contribution observations for an archive. '.repeat(40)}</p>`});
const cid = CID.createV1(0x55, await sha256.digest(copy.bytes)).toString();
const entry: Listing = {id: 'fixture', pubkey: 'a'.repeat(64), createdAt: Date.now(), ...copy.article,
  cid, routes: meshRoutes, urlHash: copy.urlHash, contentHash: copy.contentHash, blobHash: copy.blobHash, size: copy.size};
function fixture({corrupt = false, oversized = false, routeFail = false, hang = false, timeoutMs = 60000} = {}) {
  const ledger = new IpfsReservations({name: crypto.randomUUID(), indexedDB});
  const trace: string[] = [], pins = new Set<string>();
  let enabled = false;
  const factory = (contributing: boolean, offline = false, download?: {maximumBytes: number; budget?: {remainingBytes: number}}) => {
    trace.push(offline ? 'maintenance' : contributing ? 'contributor' : 'reader');
    return Promise.resolve({
      add: (bytes: Uint8Array) => {trace.push('add'); assert.deepEqual(bytes, copy.bytes); return Promise.resolve(cid);},
      pin: (value: string) => {trace.push('pin'); pins.add(value); return Promise.resolve();},
      unpin: (value: string) => {trace.push('unpin'); pins.delete(value); return Promise.resolve();},
      isPinned: (value: string) => Promise.resolve(pins.has(value)),
      collect: () => {trace.push('collect'); return Promise.resolve();},
      routes: () => [...meshRoutes],
      dial: () => {trace.push('dial'); return routeFail ? Promise.reject(new Error('Unreachable')) : Promise.resolve();},
      read: async function* (_cid: string, signal: AbortSignal) {
        trace.push('read');
        if (routeFail) throw new Error('No contributing peer is reachable');
        if (hang) await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true}));
        if (download?.budget) download.budget.remainingBytes -= copy.size;
        yield oversized ? new Uint8Array(copy.size + 1) : corrupt ? Uint8Array.from(copy.bytes, value => value ^ 1) : copy.bytes;
      },
      close: () => {trace.push('close'); return Promise.resolve();}
    });
  };
  const consent = {get: () => Promise.resolve(enabled), set: (value: boolean) => {enabled = value; return Promise.resolve();}};
  return {node: new BrowserIpfs({reservations: ledger, createNode: factory, consent, timeoutMs}), trace, pins, ledger, consent, factory};
}
await test('browser pins require an explicit action, verify exact bytes, retain durable accounting and enable serving', async () => {
  const {node, trace, ledger, consent} = fixture();
  await Effect.runPromise(node.resumeEffect());
  assert.deepEqual(trace, []);
  assert.deepEqual(await Effect.runPromise(node.mirrorEffect(copy)), {cid, uri: `ipfs://${cid}`, size: copy.size, routes: meshRoutes});
  assert.deepEqual(trace, ['contributor', 'add', 'pin']);
  assert.equal(await consent.get(), true);
  assert.equal((await ledger.list())[0]?.cid, cid);
  await Effect.runPromise(node.pauseEffect());
  assert.equal(await consent.get(), false);
  assert.equal((await ledger.list()).length, 1);
  assert.equal(trace.at(-1), 'close');
});
await test('browser reads use a separate disposable receive-only node and bind every listing field', async () => {
  const {node, trace, ledger, consent} = fixture();
  const budget = {remainingBytes: copy.size * 2};
  assert.deepEqual((await Effect.runPromise(node.readEffect(entry, {budget}))).article, copy.article);
  assert.equal(budget.remainingBytes, copy.size);
  assert.deepEqual(trace, ['reader','dial','read','close']);
  assert.deepEqual(await ledger.list(), []);
  assert.equal(await consent.get(), false);
  for (const extras of [{title: 'forged'}, {byline: 'forged'}, {capturedAt: entry.capturedAt + 1}, {url: 'https://foreign.example'},
    {urlHash: 'f'.repeat(64)}, {contentHash: 'f'.repeat(64)}])
    await assert.rejects(Effect.runPromise(node.readEffect({...entry, ...extras})), /does not match/);
});
await test('browser reads reject corrupt bytes, oversize output, invalid peer routes and download budget exhaustion', async () => {
  for (const options of [{corrupt: true}, {oversized: true}, {routeFail: true}]) {
    const {node, trace} = fixture(options);
    await assert.rejects(Effect.runPromise(node.readEffect(entry)), /integrity|hash|declared file size|reachable/i);
    assert.equal(trace.at(-1), 'close');
  }
  const {node, trace} = fixture();
  await assert.rejects(Effect.runPromise(node.readEffect({...entry, cid: 'invalid'})), /Invalid article file/);
  await assert.rejects(Effect.runPromise(node.readEffect(entry, {routes: ['http://127.0.0.1']})), /Invalid mesh/);
  await assert.rejects(Effect.runPromise(node.readEffect(entry, {budget: {remainingBytes: copy.size - 1}})), /download limit/);
  assert.deepEqual(trace, []);
});
await test('browser read timeout closes its node and identical pin requests coalesce', async () => {
  const {node, trace} = fixture({hang: true, timeoutMs: 10});
  await assert.rejects(Effect.runPromise(node.readEffect(entry)), /timed out/);
  assert.equal(trace.at(-1), 'close');
  const pinned = fixture();
  const [a, b] = await Promise.all([Effect.runPromise(pinned.node.mirrorEffect(copy)), Effect.runPromise(pinned.node.mirrorEffect(copy))]);
  assert.deepEqual(a, b);
  assert.equal(pinned.trace.filter(value => value === 'pin').length, 1);
});
await test('explicit removal and clear unpin only this extension ledger and recover quotas', async () => {
  const {node, ledger, pins, trace} = fixture();
  await Effect.runPromise(node.mirrorEffect(copy));
  await Effect.runPromise(node.forgetEffect('f'.repeat(64)));
  assert.equal(pins.size, 1);
  await Effect.runPromise(node.forgetEffect(copy.blobHash));
  assert.equal(pins.size, 0);
  assert.deepEqual(await ledger.list(), []);
  assert.ok(trace.includes('collect'));
  await Effect.runPromise(node.mirrorEffect(copy));
  await Effect.runPromise(node.clearEffect());
  assert.equal(pins.size, 0);
  assert.equal(trace.at(-1), 'close');
});
await test('quota failure leaves the private article untouched and never starts a browser node', async () => {
  const {node, trace, ledger} = fixture();
  for (let n=1;n<=100;n++) await ledger.reserve(n.toString(16).padStart(64, '0'),1);
  await assert.rejects(Effect.runPromise(node.mirrorEffect(copy)), /limit is full/);
  assert.deepEqual(trace, []);
  assert.equal(copy.bytes.length, copy.size);
});

await test('a stale persisted-consent read cannot restart serving after Pause', async () => {
  const {ledger, factory, trace} = fixture();
  const {promise, resolve} = Promise.withResolvers<boolean>();
  const node = new BrowserIpfs({reservations: ledger, createNode: factory, consent: {get: () => promise, set: () => Promise.resolve()}});
  const resume = Effect.runPromise(node.resumeEffect());
  await Effect.runPromise(node.pauseEffect());
  resolve(true);
  await resume;
  assert.deepEqual(trace, []);
});
await test('removing a paused contribution uses only offline maintenance and keeps serving disabled', async () => {
  const {node, trace, consent, ledger} = fixture();
  await Effect.runPromise(node.mirrorEffect(copy));
  await Effect.runPromise(node.pauseEffect());
  trace.length = 0;
  await Effect.runPromise(node.forgetEffect(copy.blobHash));
  assert.deepEqual(trace, ['maintenance','unpin','collect','close']);
  assert.equal(await consent.get(), false);
  assert.deepEqual(await ledger.list(), []);
});

await test('cancelled removal holds its guard until native unpin settles, so a new pin cannot be erased later', async () => {
  const f = fixture();
  const {promise: started, resolve: ready} = Promise.withResolvers<void>();
  const {promise: finish, resolve: finishUnpin} = Promise.withResolvers<void>();
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: async (contributing, offline, download) => {
    const session = await f.factory(contributing, offline, download);
    return {...session, unpin: async (value: string) => {ready(); await finish; await session.unpin(value);}};
  }});
  await Effect.runPromise(node.mirrorEffect(copy));
  const controller = new AbortController();
  const removal = Effect.runPromise(node.forgetEffect(copy.blobHash), {signal: controller.signal});
  const rejected = assert.rejects(removal);
  await started;
  controller.abort();
  await assert.rejects(Effect.runPromise(node.mirrorEffect(copy)), /Wait for/);
  finishUnpin();
  await rejected;
  assert.equal(f.pins.size, 0);
  await Effect.runPromise(node.mirrorEffect(copy));
  assert.equal(f.pins.size, 1);
});
await test('clear collects orphaned blocks even when no pin reservation remains', async () => {
  const {node, ledger, trace} = fixture();
  await Effect.runPromise(node.clearEffect());
  assert.deepEqual(await ledger.list(), []);
  assert.deepEqual(trace, ['maintenance','collect','close']);
});
await test('receive-only factory receives an independent block limit including bounded DAG metadata', async () => {
  const f = fixture();
  const budget = {remainingBytes: copy.size * 2};
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: (contributing, offline, limit) => {
    if (!contributing) {
      assert.equal(limit?.maximumBytes, copy.size + 65536);
      assert.equal(limit?.budget, budget);
    }
    return f.factory(contributing, offline, limit);
  }});
  await Effect.runPromise(node.readEffect(entry, {budget}));
  assert.equal(budget.remainingBytes, copy.size);
});

await test('parallel contributed-block writes cannot exceed the exact persistent 32 MiB cap', async () => {
  const store = new ContributedBlocks('quota-' + crypto.randomUUID());
  await store.open();
  try {
    for (let n=0;n<16;n++) {
      const bytes = new Uint8Array((n===15 ? 1 : 2)*1024*1024).fill(n);
      await store.put(CID.createV1(0x55, await sha256.digest(bytes)), bytes);
    }
    const writes = await Promise.allSettled([16,17].map(async n => {
      const bytes = new Uint8Array(1024*1024).fill(n);
      return store.put(CID.createV1(0x55, await sha256.digest(bytes)), bytes);
    }));
    assert.equal(writes.filter(write => write.status==='fulfilled').length, 1);
    assert.equal(writes.filter(write => write.status==='rejected').length, 1);
    let total=0;
    for await(const pair of store.getAll()) for await(const bytes of pair.bytes) total += bytes.length;
    assert.equal(total, 32*1024*1024);
  } finally {await store.close(); await store.destroy();}
});
await test('duplicate multihashes count once and ordered deletion recovers the exact block quota', async () => {
  const store = new ContributedBlocks('duplicates-' + crypto.randomUUID());
  await store.open();
  try {
    const bytes = new Uint8Array(2 * 1024 * 1024).fill(100);
    const digest = await sha256.digest(bytes);
    const key = CID.createV1(0x55, digest);
    const alias = CID.createV1(0x70, digest);
    const {promise: entered, resolve: enter} = Promise.withResolvers<void>();
    const {promise: finish, resolve: release} = Promise.withResolvers<void>();
    const first = store.put(key, (async function*() {enter(); await finish; yield bytes;})());
    await entered;
    const duplicate = store.put(alias, bytes);
    release();
    await Promise.all([first, duplicate]);
    for (let n = 0; n < 15; n++) {
      const other = new Uint8Array(2 * 1024 * 1024).fill(n);
      await store.put(CID.createV1(0x55, await sha256.digest(other)), other);
    }
    await Promise.all([store.delete(key), store.delete(alias)]);
    const replacement = new Uint8Array(2 * 1024 * 1024).fill(101);
    await store.put(CID.createV1(0x55, await sha256.digest(replacement)), replacement);
    const excess = new Uint8Array(1).fill(102);
    await assert.rejects(store.put(CID.createV1(0x55, await sha256.digest(excess)), excess), /storage limit/);
    let total = 0;
    for await (const pair of store.getAll()) for await (const block of pair.bytes) total += block.length;
    assert.equal(total, 32 * 1024 * 1024);
  } finally {await store.close(); await store.destroy();}
});
await test('queued block mutation survives failed input and canceled writes, and delete follows an active put', async () => {
  const store = new ContributedBlocks('ordering-' + crypto.randomUUID());
  await store.open();
  try {
    const bytes = new Uint8Array([1, 2, 3]);
    const key = CID.createV1(0x55, await sha256.digest(bytes));
    const {promise: entered, resolve: enter} = Promise.withResolvers<void>();
    const {promise: finish, resolve: release} = Promise.withResolvers<void>();
    const first = store.put(key, (async function*() {enter(); await finish; yield bytes;})());
    await entered;
    const controller = new AbortController();
    const canceled = assert.rejects(store.put(key, bytes, {signal: controller.signal}), /abort/i);
    const removal = store.delete(key);
    controller.abort();
    release();
    await Promise.all([first, canceled, removal]);
    assert.equal(await store.has(key), false);
    await assert.rejects(store.put(key, (function*() {yield bytes; throw new Error('broken input');})()), /broken input/);
    await store.put(key, bytes);
    assert.equal(await store.has(key), true);
  } finally {await store.close(); await store.destroy();}
});
await test('receive-only blocks enforce requested-network byte caps and never become serveable', async () => {
  const budget = {remainingBytes: 20};
  const store = new ReceivedBlocks({maximumBytes: 10, budget});
  const bytes = new Uint8Array(6);
  const key = CID.createV1(0x55, await sha256.digest(bytes));
  await store.put(key, bytes);
  assert.equal(await store.has(key), false);
  assert.equal(budget.remainingBytes, 14);
  await assert.rejects(store.put(key, bytes), /block download limit/);
  const scarce = new ReceivedBlocks({maximumBytes:20, budget:{remainingBytes:5}});
  await assert.rejects(scarce.put(key, bytes), /search reached its download limit/);
});

await test('failed imports retain cleanup reservations until explicit removal collects partial blocks', async () => {
  const f = fixture();
  const store = new ContributedBlocks('failed-import-' + crypto.randomUUID());
  await store.open();
  const chunk = new Uint8Array([4, 5, 6]);
  const key = CID.createV1(0x55, await sha256.digest(chunk));
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: async (contributing, offline, limit) => {
    const session = await f.factory(contributing, offline, limit);
    return {...session, add: async () => {await store.put(key, chunk); throw new Error('Import interrupted after a block write');},
      collect: async () => {await store.delete(key); f.trace.push('collect');}};
  }});
  try {
    await assert.rejects(Effect.runPromise(node.mirrorEffect(copy)), /Import interrupted/);
    assert.equal(await store.has(key), true);
    assert.equal((await f.ledger.list())[0]?.blobHash, copy.blobHash);
    assert.equal(await f.consent.get(), false);
    await Effect.runPromise(node.pauseEffect());
    await Effect.runPromise(node.forgetEffect(copy.blobHash));
    assert.equal(await store.has(key), false);
    assert.deepEqual(await f.ledger.list(), []);
    assert.ok(f.trace.includes('maintenance'));
  } finally {await store.close(); await store.destroy();}
});
await test('canceled import holds the mutation guard until native writes settle and remains removable', async () => {
  const f = fixture();
  const {promise: started, resolve: ready} = Promise.withResolvers<void>();
  const {promise: finish, resolve: finishImport} = Promise.withResolvers<void>();
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: async (contributing, offline, limit) => {
    const session = await f.factory(contributing, offline, limit);
    return {...session, add: async () => {ready(); await finish; return cid;}};
  }});
  const controller = new AbortController();
  const importResult = Effect.runPromise(node.mirrorEffect(copy), {signal: controller.signal});
  const rejected = assert.rejects(importResult);
  await started; controller.abort();
  await assert.rejects(Effect.runPromise(node.forgetEffect(copy.blobHash)), /Wait for/);
  await assert.rejects(Effect.runPromise(node.pauseEffect()), /Wait for/);
  finishImport(); await rejected;
  assert.equal((await f.ledger.list()).length, 1);
  await Effect.runPromise(node.forgetEffect(copy.blobHash));
  assert.deepEqual(await f.ledger.list(), []);
});
await test('node startup failure releases an unused reservation without starting an import', async () => {
  const f = fixture();
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: () => Promise.reject(new Error('Startup failed'))});
  await assert.rejects(Effect.runPromise(node.mirrorEffect(copy)), /Startup failed/);
  assert.deepEqual(await f.ledger.list(), []);
});

await test('native root pins accept repeated explicit contribution and repair incomplete removal', async () => {
  const blocks = new ContributedBlocks('native-pins-' + crypto.randomUUID());
  await blocks.open();
  const node = createHeliaLight({blockstore: blocks, datastore: new MemoryDatastore(), routers: []});
  await node.start();
  try {
    const root = await unixfs(node).addBytes(new Uint8Array(300000).fill(7));
    const pins = new SnapshotPins(node.pins);
    await pins.pin(root.toString(), new AbortController().signal);
    await pins.pin(root.toString(), new AbortController().signal);
    await pins.unpin(root.toString());
    const partial = node.pins.add(root);
    assert.equal((await partial.next()).done, false);
    await partial.return();
    await assert.rejects(node.pins.get(root), {name: 'NotFoundError'});
    assert.equal(await pins.isPinned(root.toString()), true);
    await pins.unpin(root.toString());
    await node.gc();
    assert.equal(await blocks.has(root), false);
    assert.equal(await pins.isPinned(root.toString()), false);
  } finally {await node.stop(); await blocks.close(); await blocks.destroy();}
});
await test('canceled pin holds the mutation guard until native pin writes settle', async () => {
  const f = fixture();
  const {promise: started, resolve: ready} = Promise.withResolvers<void>();
  const {promise: finish, resolve: finishPin} = Promise.withResolvers<void>();
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: async (contributing, offline, limit) => {
    const session = await f.factory(contributing, offline, limit);
    return {...session, pin: async (value: string) => {ready(); await finish; await session.pin(value);}};
  }});
  const controller = new AbortController();
  const pinResult = Effect.runPromise(node.mirrorEffect(copy), {signal: controller.signal});
  const rejected = assert.rejects(pinResult);
  try {
    await started; controller.abort();
    await assert.rejects(Effect.runPromise(node.forgetEffect(copy.blobHash)), /Wait for/);
    await assert.rejects(Effect.runPromise(node.pauseEffect()), /Wait for/);
  } finally {finishPin(); await rejected;}
  assert.equal((await f.ledger.list()).length, 1);
  await Effect.runPromise(node.forgetEffect(copy.blobHash));
  assert.deepEqual(await f.ledger.list(), []);
});

await test('native IndexedDB pin commits finish before canceled mesh cleanup starts', async () => {
  const f = fixture();
  const blocks = new ContributedBlocks('pin-commit-blocks-' + crypto.randomUUID());
  const datastore = new IDBDatastore('pin-commit-metadata-' + crypto.randomUUID());
  await blocks.open(); await datastore.open();
  const storage = createHeliaLight({blockstore: blocks, datastore, routers: []});
  await storage.start();
  const pins = new SnapshotPins(storage.pins), fs = unixfs(storage);
  const {promise: started, resolve: ready} = Promise.withResolvers<void>();
  const {promise: finish, resolve: finishPin} = Promise.withResolvers<void>();
  const put = datastore.put.bind(datastore);
  let entered = false, writeSignal: AbortSignal | undefined;
  datastore.put = async (...args: Parameters<IDBDatastore['put']>) => {
    const result = await put(...args);
    if (!entered && args[0].toString().startsWith('/pinned-block/')) {
      entered = true; writeSignal = args[2]?.signal; ready(); await finish;
    }
    return result;
  };
  const node = new BrowserIpfs({reservations: f.ledger, consent: f.consent, createNode: async (contributing, offline, limit) => {
    const session = await f.factory(contributing, offline, limit);
    return {...session, add: async (bytes: Uint8Array) => (await fs.addBytes(bytes)).toString(),
      pin: (value: string, signal: AbortSignal) => pins.pin(value, signal),
      unpin: (value: string) => pins.unpin(value), isPinned: (value: string) => pins.isPinned(value), collect: () => storage.gc()};
  }});
  const controller = new AbortController();
  const operation = Effect.runPromise(node.mirrorEffect(copy), {signal: controller.signal});
  const rejected = assert.rejects(operation);
  try {
    await started; controller.abort();
    assert.equal(writeSignal, undefined, 'Native pin metadata must not race IDB transactions against caller cancellation');
    await assert.rejects(Effect.runPromise(node.forgetEffect(copy.blobHash)), /Wait for/);
  } finally {finishPin(); await rejected;}
  try {
    const record = (await f.ledger.list())[0]; assert(record?.cid);
    await storage.pins.get(CID.parse(record.cid));
    await Effect.runPromise(node.forgetEffect(copy.blobHash));
    assert.deepEqual(await f.ledger.list(), []);
    assert.equal(await blocks.has(CID.parse(record.cid)), false);
  } finally {await storage.stop(); await blocks.close(); await datastore.close(); await blocks.destroy(); await datastore.destroy();}
});

await test('shared native blocks survive removing, re-pinning and removing another snapshot', async () => {
  const blocks = new ContributedBlocks('shared-pins-' + crypto.randomUUID());
  await blocks.open();
  const node = createHeliaLight({blockstore: blocks, datastore: new MemoryDatastore(), routers: []});
  await node.start();
  try {
    const fs = unixfs(node), pins = new SnapshotPins(node.pins);
    for (const repeatedLeaf of [false, true]) {
    const a = new Uint8Array(524288).fill(13); if (!repeatedLeaf) a.fill(17, 262144);
    const b = a.slice(); b.fill(29, 262144);
    const rootA = await fs.addBytes(a, {rawLeaves: true, chunker: fixedSize({chunkSize: 262144})});
    const rootB = await fs.addBytes(b, {rawLeaves: true, chunker: fixedSize({chunkSize: 262144})});
    assert.notEqual(rootA.toString(), rootB.toString());
    const signal = new AbortController().signal;
    await pins.pin(rootA.toString(), signal); await pins.pin(rootB.toString(), signal);
    await pins.unpin(rootA.toString()); await pins.pin(rootA.toString(), signal);
    await pins.unpin(rootB.toString()); await node.gc();
    const chunks: Uint8Array[] = [];
    for await (const chunk of fs.cat(rootA)) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), Buffer.from(a));
    await pins.unpin(rootA.toString()); await node.gc();
    let remaining = 0; for await (const block of blocks.getAll()) {void block; remaining++;}
    assert.equal(remaining, 0);
    }
  } finally {await node.stop(); await blocks.close(); await blocks.destroy();}
});
