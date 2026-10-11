// Read-only, finite native IPFS retrieval; uses the feed spike's pinned installation.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const require = createRequire(new URL('../ipfs-feeds/package.json', import.meta.url));
const load = name => import(require.resolve(name));
const { createHeliaLight } = await load('helia');
const { withLibp2pLight } = await load('@helia/libp2p');
const { withBitswap } = await load('@helia/bitswap');
const { tcp } = await load('@libp2p/tcp');
const { noise } = await load('@libp2p/noise');
const { yamux } = await load('@libp2p/yamux');
const { identify } = await load('@libp2p/identify');
const { ping } = await load('@libp2p/ping');
const { kadDHT } = await load('@libp2p/kad-dht');
const { multiaddr } = await load('@multiformats/multiaddr');
const { CID } = await load('multiformats/cid');
const candidates = [
  { cid: 'bafkreig24ijzqxj3cxdp6yh6ia2ysxzvxsfnd6rzahxxjv6ofcuix52wtq', source: 'https://docs.ipfs.tech/how-to/kubo-basic-cli/' },
  { cid: 'bafybeie5nqv6kd3qnfjupgvz34woh3oksc3iau6abmyajn7qvtf6d2ho34', source: 'https://docs.ipfs.tech/how-to/command-line-quick-start/' }
];
const bootstraps = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
];
const evidence = { at: new Date().toISOString(), scope: 'Existing public CIDs; outbound native TCP DHT and Bitswap only. No HTTP gateways, uploads, provider publication, listen ports, router changes, accounts, or independent second NAT claim.', candidates: [], bootstraps: [] };
const node = withBitswap(withLibp2pLight(createHeliaLight(), {
  addresses: { listen: [] }, transports: [tcp()], connectionEncrypters: [noise()], streamMuxers: [yamux()],
  connectionManager: { maxConnections: 16 },
  services: { identify: identify(), ping: ping(), dht: kadDHT({ clientMode: true }) }
}), { maxIncomingMessageSize: 128 * 1024, maxOutgoingMessageSize: 128 * 1024, maxInboundStreams: 4, maxOutboundStreams: 4, maxWantListSize: 32, messageReceiveTimeout: 3000, messageSendTimeout: 3000, messageSendConcurrency: 1 });
const started = Date.now();
try {
  await node.start();
  for (const address of bootstraps) {
    try { const conn = await node.libp2p.dial(multiaddr(address), { signal: AbortSignal.timeout(10000) }); evidence.bootstraps.push({ address, ok: true, remoteAddress: conn.remoteAddr.toString() }); }
    catch (e) { evidence.bootstraps.push({ address, ok: false, error: e.message }); }
  }
  for (const candidate of (process.env.WELCOME_ONLY === '1' ? candidates.slice(1) : candidates)) {
    const result = { ...candidate, providers: [], transfers: [] }; evidence.candidates.push(result);
    const cid = CID.parse(candidate.cid);
    const queryStarted = Date.now();
    try {
      for await (const p of node.routing.findProviders(cid, { signal: AbortSignal.timeout(20000) })) {
        result.providers.push({ id: p.id.toString(), addresses: p.multiaddrs.map(a => a.toString()), router: p.router });
        if (result.providers.length >= 5) break;
      }
      result.queryOutcome = result.providers.length ? 'providers-found' : 'no-providers';
    } catch (e) { result.queryOutcome = 'error'; result.queryError = e.message; }
    result.queryDurationMs = Date.now() - queryStarted;
    const getStarted = Date.now();
    try {
      const stream = node.blockstore.get(cid, { signal: AbortSignal.timeout(30000), onProgress: e => {
        if (e.type === 'bitswap:block') result.transfers.push({ cid: e.detail.cid.toString(), sender: e.detail.sender.toString(), connections: node.libp2p.getConnections(e.detail.sender).map(c => c.remoteAddr.toString()) });
      } });
      const chunks = []; let total = 0;
      for await (const chunk of stream) { total += chunk.byteLength; if (total > 64 * 1024) throw Error('Public block exceeds 64 KiB probe limit'); chunks.push(chunk); }
      const bytes = Buffer.concat(chunks, total);
      const hash = createHash('sha256').update(bytes).digest();
      if (cid.multihash.code !== 0x12 || !hash.equals(Buffer.from(cid.multihash.digest))) throw Error('SHA-256 CID mismatch');
      result.getOutcome = 'verified-block'; result.bytes = bytes.byteLength; result.sha256 = hash.toString('hex');
      if (cid.code === 0x70) {
        const { decode } = await import(new URL('../ipfs-feeds/node_modules/@ipld/dag-pb/src/index.js', import.meta.url));
        const readme = decode(bytes).Links.find(link => link.Name === 'readme');
        if (readme) {
          result.readme = { cid: readme.Hash.toString(), transfers: [] };
          try {
            const chunks = []; let total = 0;
            for await (const chunk of node.blockstore.get(readme.Hash, { signal: AbortSignal.timeout(15000), onProgress: e => { if (e.type === 'bitswap:block') result.readme.transfers.push({ cid: e.detail.cid.toString(), sender: e.detail.sender.toString(), connections: node.libp2p.getConnections(e.detail.sender).map(c => c.remoteAddr.toString()) }); } })) {
              total += chunk.byteLength; if (total > 64 * 1024) throw Error('Readme exceeds 64 KiB probe limit'); chunks.push(chunk);
            }
            const block = Buffer.concat(chunks, total), hash = createHash('sha256').update(block).digest();
            if (!hash.equals(Buffer.from(readme.Hash.multihash.digest))) throw Error('Readme CID mismatch');
            result.readme.outcome = 'verified-block'; result.readme.bytes = block.byteLength; result.readme.sha256 = hash.toString('hex');
            const payload = readme.Hash.code === 0x70 ? decode(block).Data : block;
            result.readme.containsWelcome = new TextDecoder().decode(payload).includes('Hello and Welcome to IPFS');
          } catch (e) { result.readme.outcome = 'error'; result.readme.error = e.message; }
        }
      }
    } catch (e) { result.getOutcome = 'error'; result.getError = e.message; }
    result.getDurationMs = Date.now() - getStarted;
  }
} finally {
  await node.stop();
  evidence.durationMs = Date.now() - started;
  evidence.cleanup = 'Native node stopped; in-memory fetched blocks and ephemeral identity discarded.';
  await writeFile(new URL('../../docs/research/ipfs-public-provider-results.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
