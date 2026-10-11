import { createHeliaLight } from 'helia';
import { withLibp2pLight } from '@helia/libp2p';
import { withBitswap } from '@helia/bitswap';
import { unixfs } from '@helia/unixfs';
import { IDBBlockstore } from 'blockstore-idb';
import { IDBDatastore } from 'datastore-idb';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { multiaddr } from '@multiformats/multiaddr';
import { CID } from 'multiformats/cid';
import * as dagPb from '@ipld/dag-pb';
// Internal codec import is confined to the hostile fixture and pinned package version.
import { BitswapMessage, WantType } from './node_modules/@helia/bitswap/dist/src/pb/message.js';
import { UnixFS } from 'ipfs-unixfs';
import { sha256 } from 'multiformats/hashes/sha2';
import { PreservationStore, ReadStore, LIMITS, LOCAL_ACCESS } from './preservation.js';
const rtcConnections = window.__spikeRTC || [];
let node, fs, local, readFs, publicStore, readStore;
const events = [];
function record(type, detail) { events.push({ at: new Date().toISOString(), type, detail }); document.querySelector('pre').textContent = JSON.stringify(events, null, 2); }
window.spike = {
  async start(label, relay, limits = {}, hostile = false) {
    const datastore = new IDBDatastore(`meshcache-spike-${label}-data`); await datastore.open();
    publicStore = new PreservationStore(`meshcache-spike-${label}-public-blocks`, datastore, limits); await publicStore.open(); if (hostile) Object.assign(publicStore.limits, { servedBytes: 64 * 1024 * 1024, servedRequests: 4096, servingConcurrency: 32 });
    const localData = new IDBDatastore(`meshcache-spike-${label}-private-read-data`); await localData.open();
    readStore = new ReadStore(`meshcache-spike-${label}-private-read-blocks`, localData); await readStore.open();
    local = createHeliaLight({ blockstore: readStore, datastore: localData }); await local.start(); readFs = unixfs(local);
    const blockstore = publicStore;
    node = withBitswap(withLibp2pLight(createHeliaLight({ blockstore, datastore }), {
      addresses: { listen: [`${relay}/p2p-circuit`] },
      transports: [webSockets(), circuitRelayTransport()],
      connectionEncrypters: [noise()], streamMuxers: [yamux()],
      services: { identify: identify() },
      connectionGater: { denyDialMultiaddr: () => false }
    }), { runOnLimitedConnections: true, maxIncomingMessageSize: 1024 * 1024 + 8192, maxOutgoingMessageSize: hostile === 'raw' ? 4 * 1024 * 1024 : 1024 * 1024 + 8192, maxInboundStreams: 4, maxOutboundStreams: 4, maxWantListSize: 32, messageSendConcurrency: 2, sendBlocksConcurrency: 1, sendBlocksMaxQueueLength: 2, messageReceiveTimeout: 3000, sendBlocksTimeout: 3000 });
    await publicStore.reconcile(node.pins);
    const addBroker = node.addBlockBroker.bind(node); node.addBlockBroker = broker => { addBroker(broker); local.addBlockBroker(broker); };
    await node.start(); fs = unixfs(node); window.spike.node = node;
    record('start', node.libp2p.peerId.toString()); return this.info();
  },
  async privateAdd(bytes) { const data = Uint8Array.from(bytes); if (data.length > LIMITS.fileBytes) throw new Error('Article exceeds 2 MiB'); if (readStore.receiving) throw new Error('One article operation at a time'); readStore.receiving = new Map(); try { const cid = await readFs.addBytes(data); await readStore.accept(cid.toString()); record('private-add', cid.toString()); return cid.toString(); } catch (err) { await readStore.discardReceive(); throw err; } },
  async add(bytes) { const cid = await publicStore.preserve(Uint8Array.from(bytes), fs, node.pins); record('add', cid); return cid; },
  async serve(cid) { if (publicStore.state.records.some(record => record.cid === cid)) return; const bytes = await readBytes(cid, 15000); const publicCid = await publicStore.preserve(bytes, fs, node.pins); if (publicCid !== cid) throw new Error('CID changed on promotion'); record('serve', cid); },
  async revoke(cid) { await publicStore.revoke(cid, node.pins); record('revoke', cid); },
  pauseAfterPin() { publicStore.afterPin = async cid => { window.spike.pausedCommit = cid; record('pause-after-pin', cid); await new Promise(() => {}); }; },
  policyInfo() { return { public: publicStore.info(), read: readStore.info() }; },
  // Hostile fixture only: bypass our producer rules to test actual peer input.
  async attackPublish(bytes, raw = false) { const data = Uint8Array.from(bytes); let cid; if (raw) { cid = CID.createV1(0x55, await sha256.digest(data)); await IDBBlockstore.prototype.put.call(publicStore, cid, data); publicStore.allowed.add(cid.toString()); } else { cid = await fs.addBytes(data); for await (const child of node.pins.add(cid, { [LOCAL_ACCESS]: true })) publicStore.allowed.add(child.toString()); } return cid.toString(); },
  async get(cid, timeout = 15000) {
    const result = await readBytes(cid, timeout); const total = result.length;
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', result))).map(v => v.toString(16).padStart(2, '0')).join('');
    record('get', { cid, bytes: total, hash }); return { bytes: total, hash };
  },
  async pin(cid) { await this.serve(cid); record('pin', cid); },
  protocolInfo() { const broker = node.blockBrokers.find(item => item.name === 'bitswap'); return { ledgers: [...broker.bitswap.peerWantLists.ledgerMap.values()].map(ledger => ({ peer: ledger.peerId.toString(), totalWants: ledger.wants.size, pendingWants: [...ledger.wants.values()].filter(want => want.status === 'want').length, sendQueue: ledger.sendQueue.size, bytesSent: ledger.bytesSent })), connections: node.libp2p.getConnections().length }; },
  async attackFlood(address, knownCid, messages = 16, wants = 512) {
    const connection = await node.libp2p.dial(multiaddr(address)); const stream = await node.libp2p.dialProtocol(connection.remotePeer, '/ipfs/bitswap/1.2.0', { signal: AbortSignal.timeout(5000) }); let sent = 0;
    for (let m = 0; m < messages; m++) { const entries = [{ cid: CID.parse(knownCid).bytes, priority: 999, wantType: WantType.WantBlock, sendDontHave: true }]; for (let i = 0; i < wants; i++) { const cid = CID.createV1(0x55, await sha256.digest(new TextEncoder().encode(`unknown-${m}-${i}`))); entries.push({ cid: cid.bytes, priority: 1, wantType: WantType.WantBlock, sendDontHave: true }); } const encoded = BitswapMessage.encode({ wantlist: { entries, full: true } }); const prefix = []; let length = encoded.length; while (length >= 128) { prefix.push((length & 127) | 128); length = Math.floor(length / 128); } prefix.push(length); const message = new Uint8Array(prefix.length + encoded.length); message.set(prefix); message.set(encoded, prefix.length); if (!stream.send(message)) await stream.onDrain({ signal: AbortSignal.timeout(5000) }); sent += message.length; }
    await stream.close({ signal: AbortSignal.timeout(5000) }); return { messages, wantsPerMessage: wants + 1, attempts: messages * (wants + 1), framedBytes: sent };
  },
  async attackFalseSize(bytes) {
    const data = Uint8Array.from(bytes); const links = []; const blockSizes = [];
    for (let offset = 0; offset < data.length; offset += 1024 * 1024) { const leaf = data.subarray(offset, offset + 1024 * 1024); const cid = CID.createV1(0x55, await sha256.digest(leaf)); await IDBBlockstore.prototype.put.call(publicStore, cid, leaf); publicStore.allowed.add(cid.toString()); links.push({ Hash: cid, Name: '', Tsize: leaf.length }); blockSizes.push(BigInt(Math.floor(leaf.length / 2))); }
    const unixfs = new UnixFS({ type: 'file', blockSizes }); const rootBytes = dagPb.encode(dagPb.prepare({ Data: unixfs.marshal(), Links: links })); const root = CID.createV1(dagPb.code, await sha256.digest(rootBytes)); await IDBBlockstore.prototype.put.call(publicStore, root, rootBytes); publicStore.allowed.add(root.toString()); return { cid: root.toString(), claimedBytes: unixfs.fileSize().toString(), linkedBytes: data.length, leaves: links.map(link => link.Hash.toString()) };
  },
  async dial(address) { const conn = await node.libp2p.dial(multiaddr(address), { signal: AbortSignal.timeout(20000) }); for (const other of node.libp2p.getConnections(conn.remotePeer)) { if (other.id !== conn.id && !other.remoteAddr.toString().includes('/webrtc')) await other.close(); } record('dial', conn.remoteAddr.toString()); return conn.remoteAddr.toString(); },
  async stop() { await local.stop(); await node.stop(); record('stop', true); },
  async info() { const pins = []; for await (const pin of node.pins.ls()) pins.push(pin.cid.toString()); const rtc = []; for (const pc of rtcConnections) { const stats = []; for (const stat of (await pc.getStats()).values()) if (['candidate-pair', 'data-channel', 'local-candidate', 'remote-candidate'].includes(stat.type)) stats.push(stat); rtc.push({ state: pc.connectionState, stats }); } return { policy: { public: publicStore.info(), read: readStore.info() }, rtc, peerId: node.libp2p.peerId.toString(), addresses: node.libp2p.getMultiaddrs().map(a => a.toString()), connections: node.libp2p.getConnections().map(c => ({ peer: c.remotePeer.toString(), address: c.remoteAddr.toString() })), pins, events }; }
};
async function readBytes(cid, timeout) {
  if (readStore.receiving) throw new Error('One article download at a time');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new Error('Article timed out')), timeout);
  readStore.receiving = new Map(); const chunks = []; let total = 0;
  try {
    const ownPublic = publicStore.state.records.some(record => record.cid === cid); const source = ownPublic ? fs : readFs;
    const stat = await source.stat(CID.parse(cid), { [LOCAL_ACCESS]: ownPublic, signal: controller.signal }); record('metadata', { cid, type: stat.type, size: stat.size.toString() }); if (stat.type === 'directory' || stat.size > BigInt(LIMITS.fileBytes)) readStore.reject('Article metadata exceeds 2 MiB');
    for await (const chunk of source.cat(CID.parse(cid), { blockReadConcurrency: 1, [LOCAL_ACCESS]: ownPublic, signal: controller.signal, onProgress: evt => { if (evt.type === 'bitswap:block') record(evt.type, { cid: evt.detail.cid.toString(), sender: evt.detail.sender.toString() }); } })) {
      total += chunk.length; if (total > LIMITS.fileBytes) { controller.abort(); throw new Error('Article exceeds 2 MiB'); } chunks.push(chunk);
    }
    const result = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } if (ownPublic) readStore.receiving = null; else await readStore.accept(cid); return result;
  } catch (err) { controller.abort(); await readStore.discardReceive(); throw err; } finally { clearTimeout(timer); }
}
record('ready', true);
