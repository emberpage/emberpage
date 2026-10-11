# IndexedDB IPFS browser transfer spike

2026-10-11. **Pass for controlled browser peers on one computer. Internet reachability, public provider discovery, and unattended availability are unproven.** Production MeshCache is unchanged.

## What ran

Actual Chrome for Testing in separate persistent profiles, Helia with IndexedDB blockstore and datastore, Bitswap, browser WebRTC, and a locally controlled libp2p WebSocket circuit relay. No Primal, HTTP block gateway, default HTTP router, public bootstrap peer, STUN server, or TURN server. The HTTP server supplied only the test UI/modules; article bytes came from browser peers. The test explicitly receives a holder address; it does not demonstrate CID-only global discovery.

The node uses `createHeliaLight`, `withLibp2pLight`, and `withBitswap`, avoiding the full Helia factory's default HTTP routing. [Helia source](https://github.com/ipfs/helia/tree/main/packages/helia), [libp2p integration](https://github.com/ipfs/helia/tree/main/packages/libp2p), [Bitswap implementation](https://github.com/ipfs/helia/tree/main/packages/bitswap).

## Assertions and evidence

`ipfs-browser-spike.json` contains timestamps, SHA-256 checks, pin lists, identities, peer connections, Bitswap block sender IDs, Chrome WebRTC stats, and browser HTTP request inventories.

| Assertion | Result |
|---|---|
| Canvas-generated 32×32 WebP decodes in Chrome | Pass |
| A imports a 507,528-byte synthetic JSON article with embedded WebP and explicitly pins it | Pass |
| B dials A's WebRTC address, downloads via Bitswap, verifies exact bytes, and pins | Pass |
| Non-WebRTC A–B peer connections close before downloading | Pass |
| A imports a valid exactly 2 MiB JSON article; native UnixFS splits it into two 1 MiB leaves plus DAG root | Pass |
| B retrieves the multi-block file; exact SHA-256 matches | Pass |
| Chrome reports connected WebRTC with succeeded UDP host candidate pair and 2,760,072 received bytes | Pass |
| A closes completely; B closes and restarts its browser profile | Pass |
| B retains identical peer identity, explicit pins, and locally readable blocks | Pass |
| Fresh C retrieves both files from B with A offline | Pass |
| Relay WebSocket connections close; a newly imported uncached 64,000-byte file transfers on the existing WebRTC connection | Pass; connection disruption only |
| A/B/C all close; fresh D cannot retrieve article within a 3-second timeout | Expected bounded failure, 3,003 ms |
| Browser HTTP requests carry no article blocks | Pass; only local documents and JavaScript |

The relay reconnects automatically after connection closure. This is not evidence of a sustained relay outage. The recorded WebRTC candidate-pair byte counters and absence of alternative serving-peer connections establish the direct browser data path in this local test.

Default current `@helia/unixfs` importer uses 1 MiB chunks and balanced layout. This is IPFS-native chunking, not a bespoke MeshCache chunk envelope. [UnixFS implementation](https://github.com/ipfs/helia/tree/main/packages/unixfs). Default chunking makes the smaller article one raw block; the 2 MiB article exercises the multi-block DAG.

The local relay has 256 maximum reservations and 16 MiB/120-second circuit limits solely for repeatable testing. Earlier reruns exhausted a 20-reservation fixture because stale reservations remain after short-lived profile tests; increasing the fixture capacity avoids conflating fixture admission with transport correctness. Two intermediate diagnostic assertions expected Chrome `data-channel` stats, which were absent; the final assertion checks the available succeeded candidate-pair stats instead. No transport fallback was added. The initial hardcoded tiny image fixture failed a final decode check; it was replaced by a canvas-generated WebP and the complete transfer suite reran successfully with a Chrome decode assertion.

## Run

From `spikes/ipfs-browser`:

```sh
npm ci
npm run build
node server.mjs
```

In a second terminal:

```sh
npm test
```

The runner uses the repository's existing Playwright dependency and installed Chrome for Testing. `http://127.0.0.1:4328` provides manual Start / Publish synthetic article / Fetch / Pin / Stop controls. Copy a holder's WebRTC address and CID to a second separately labeled node. This is deliberately spike UI, not production UX. Server and relay ports are 4328 and 4329.

## Consequences

IndexedDB can store authentic IPFS blocks, pin metadata, and node identity. A restarted holder can supply another reader after the original publisher disappears. Pinning provides local persistence; online independent holders provide availability. Every holder being offline correctly makes retrieval fail. Pins do not make global permanence promises.

The browser fixture has no public content routing. Explicit holder addresses are the rendezvous input. Production needs independent relay/bootstrap operators, discoverable reachable holder addresses, clear limits/eviction and consent, real cross-network NAT tests, and extension lifecycle work. Existing privacy protections for inert article rendering remain necessary: CID validation verifies bytes, not safety or article truth. Direct WebRTC exposes network metadata to peers; IPFS is not an anonymity transport.

The approximately 924 KiB minified browser bundle is substantially larger than the current application. The isolated dependency audit reports **18 high-severity entries**, primarily propagated `node-forge` and `braces` advisories through server/React Native/default-config dependencies. Exact package versions and lockfile are retained; this is not a production dependency approval. See `spikes/ipfs-browser/audit.json`. Release work must audit the actual shipped module graph and remediate supported dependencies rather than assuming browser bundling removes all relevant risk.

Separate MV3 offscreen evidence is in `ipfs-mv3-spike.json`, owned by the parent task. This browser report does not claim long-running extension background reliability, internet NAT reachability, public DHT discovery, malicious-peer resistance, or relay independence in production.
