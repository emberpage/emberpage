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
const rtcConnections = window.__spikeRTC || [];
let node, fs;
const events = [];
function record(type, detail) { events.push({ at: new Date().toISOString(), type, detail }); document.querySelector('pre').textContent = JSON.stringify(events, null, 2); }
window.spike = {
  async start(label, relay) {
    const blockstore = new IDBBlockstore(`emberpage-spike-${label}-blocks`);
    const datastore = new IDBDatastore(`emberpage-spike-${label}-data`);
    await blockstore.open(); await datastore.open();
    node = withBitswap(withLibp2pLight(createHeliaLight({ blockstore, datastore }), {
      addresses: { listen: [`${relay}/p2p-circuit`, '/webrtc'] },
      transports: [webSockets(), circuitRelayTransport(), webRTC({ rtcConfiguration: { iceServers: [] } })],
      connectionEncrypters: [noise()], streamMuxers: [yamux()],
      services: { identify: identify() },
      connectionGater: { denyDialMultiaddr: () => false }
    }), { runOnLimitedConnections: true });
    await node.start(); fs = unixfs(node); window.spike.node = node;
    record('start', node.libp2p.peerId.toString()); return this.info();
  },
  async add(bytes) { const cid = await fs.addBytes(Uint8Array.from(bytes)); record('add', cid.toString()); return cid.toString(); },
  async get(cid, timeout = 15000) {
    const chunks = []; let total = 0;
    for await (const chunk of fs.cat(CID.parse(cid), { signal: AbortSignal.timeout(timeout), onProgress: evt => { if (evt.type === 'bitswap:block') record(evt.type, { cid: evt.detail.cid.toString(), sender: evt.detail.sender.toString() }); } })) { chunks.push(chunk); total += chunk.length; }
    const result = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', result))).map(v => v.toString(16).padStart(2, '0')).join('');
    record('get', { cid, bytes: total, hash }); return { bytes: total, hash };
  },
  async pin(cid) { for await (const result of node.pins.add(CID.parse(cid))) {} record('pin', cid); },
  async dial(address) { const conn = await node.libp2p.dial(multiaddr(address), { signal: AbortSignal.timeout(20000) }); for (const other of node.libp2p.getConnections(conn.remotePeer)) { if (other.id !== conn.id && !other.remoteAddr.toString().includes('/webrtc')) await other.close(); } record('dial', conn.remoteAddr.toString()); return conn.remoteAddr.toString(); },
  async stop() { await node.stop(); record('stop', true); },
  async info() { const pins = []; for await (const pin of node.pins.ls()) pins.push(pin.cid.toString()); const rtc = []; for (const pc of rtcConnections) { const stats = []; for (const stat of (await pc.getStats()).values()) if (['candidate-pair', 'data-channel', 'local-candidate', 'remote-candidate'].includes(stat.type)) stats.push(stat); rtc.push({ state: pc.connectionState, stats }); } return { rtc, peerId: node.libp2p.peerId.toString(), addresses: node.libp2p.getMultiaddrs().map(a => a.toString()), connections: node.libp2p.getConnections().map(c => ({ peer: c.remotePeer.toString(), address: c.remoteAddr.toString() })), pins, events }; }
};
record('ready', true);
