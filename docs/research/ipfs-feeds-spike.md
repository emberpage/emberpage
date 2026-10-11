# IPFS contributor feeds and independent aggregation spike

Date: 2026-10-11. Throwaway code in `spikes/ipfs-feeds`; production extension and root package dependencies unchanged. Synthetic data only. This answers whether IPFS/IPNS can carry contributor discovery metadata and popularity without Nostr or a mandatory aggregator inside the extension.

## Verdict

Yes for the exercised paths: separate Helia nodes exchanged signed contributor feeds and an independently signed popularity snapshot through IPFS Bitswap. Real signed IPNS names resolved through a local Kademlia network, and a separate bounded public-DHT experiment published and resolved a synthetic IPNS pointer from a fresh resolver that never dialed the publisher directly. No Primal, Nostr, HTTP gateway, or simulated pointer map was used.

This is not evidence of durable browser hosting or effortless global discovery. An aggregator polls an explicitly registered list of contributor names. IPFS does not enumerate every MeshCache feed. Public pointer resolution passed; public retrieval of the referenced file and long-term retention were not tested here.

## Run

```sh
npm ci --prefix spikes/ipfs-feeds --ignore-scripts
npm run spike --prefix spikes/ipfs-feeds
npm run spike:public --prefix spikes/ipfs-feeds
```

The local spike reuses the root project's installed `jsdom`, article encoder, `inspectArticle` sanitizer/inspector, candidate filter, and aggregator ranking function. It does not change their implementations. The package owns its isolated Helia dependencies. Both commands run to completion and stop their nodes. The public command publishes only an empty, synthetic signed feed pointer with a 60-second IPNS validity, disables upkeep, then discards in-memory keys and blocks. DHT expiry is not a global erasure guarantee.

## Exercised architecture

1. A contributor stores immutable signed JSON feeds linking to article CIDs and containing explicit listings or ratings. A bounded feed is a snapshot rather than an unbounded event log.
2. Contributor IPNS names point to the latest feed CIDs. The local aggregator's explicit registry binds each name to an expected envelope signing key; registration is not open enumeration.
3. An independent aggregator resolves names, retrieves feeds, checks registered signers, signatures, time, sequence, sizes, and schema, then deduplicates and computes trends using the existing metadata ranking function.
4. The aggregator signs a popularity snapshot, stores it on IPFS, and publishes its own stable IPNS name. A third node resolves and fetches that snapshot. A temporary localhost HTTP `/popular` and `/health` endpoint also demonstrates how an optional future extension could poll the separate site.
5. The aggregator never downloads article bodies. The reader downloads bodies independently and applies the existing hash verification, sanitizer, actual DOM inspection, and candidate filter. A short article appears in metadata trends but is excluded from the reader's final candidates. Metadata rankings do not certify readability.

Local network configuration: three separate in-memory Helia 7.1.16 nodes, TCP over localhost, Noise encryption, Yamux, Bitswap, a private Kademlia protocol `/meshcache/spike/kad/1.0.0`, no public bootstrap and no HTTP block broker. IPNS package 10.2.2. These are actual network sockets and cryptographic records, not browser IndexedDB or simulated transport.

## Results

`spikes/ipfs-feeds/evidence.json` records 14 sequential passing checks with durations:

- Two contributor names resolved and their initially absent feed blocks fetched by a separate aggregator.
- Metadata-only ranking, duplicate listing/rating collapse, independent signed snapshot retrieval.
- Reader body qualification using production `inspectArticle` and `filterCandidates`; short content rejected.
- Tampered signatures, unregistered signer, stale signed feed, older observed sequence, oversized decoded feed, too many events, excessive advertised article size, and future rating rejected.
- Same contributor IPNS name updated to a newer signed feed CID.
- HTTP snapshot/health polling succeeds; article body endpoint returns 404.

Feed acceptance bounds: 64 KiB encoded envelope, 100 events, 8 KiB per event, 24-hour feed freshness, seven-day event window, advertised article size at most 2 MiB. These are spike choices, not changes to production retention. The feed byte check occurs **after** `strings.get` has downloaded the whole raw block; this spike does not prove bounded malicious network allocation. A production transport needs a block/stream byte cap before allocation. The signed feed's event fields are validated only to the degree needed for this experiment; full production schema/canonical encoding, persistent sequence high-water marks, total crawl budgets and cancellation still need design.

`spikes/ipfs-feeds/public-evidence.json` records four passing public-network steps in approximately 24 seconds: publisher bootstrap, signed IPNS publication, fresh resolver bootstrap, exact CID pointer resolution. It used two official `bootstrap.libp2p.io` peer addresses and public `/ipfs/kad/1.0.0` routing, no HTTP routing, and no explicit publisher dial from the resolver. In the latest run, publishing took 10.4 seconds and resolving 9.2 seconds. The resolver had no connection to the publisher in its peer list at the end; this is an end-state observation, not continuous connection tracing. Two bounded runs succeeded; this is not a latency SLA. Ordinary DHT queries may establish additional network peer connections.

## Limits and decision implications

IPNS update publication and cached resolution have freshness tradeoffs. IPNS records require republication; content retention is a separate matter. A signed valid old snapshot can still be stale, hence the explicit time and sequence checks. An offline contributor's older signed feed eventually fails this freshness rule even if its referenced articles still exist. Production must deliberately choose availability versus freshness instead of treating signatures as proof of latest state.

Per-key vote deduplication does not defeat multiple identities. This spike offers no Sybil resistance, global consensus, anonymity, automatic feed discovery, independent long-term replicas, extension lifecycle verification, or browser background service. An always-online aggregator can fetch/pin feed snapshots, but doing that does not require it to host article bodies.

`npm audit` for the isolated installed dependency tree reports 15 high-severity entries, recorded in `spikes/ipfs-feeds/dependency-audit.json`. Several are default Helia/React Native/ACME dependency paths; no audit remediation or production adoption was attempted. Importing a smaller networking composition helps runtime configuration but does not eliminate the installed dependency audit findings.

Next useful gate: test the browser serving spike's public reachability; then prove feed persistence, stale IPNS behavior across restarts, and independent holders with all original contributors offline. Keep optional aggregation separate from the core reader and make feed registration explicit.

## Primary sources

- [Helia source and modules](https://github.com/ipfs/helia): installed package READMEs and TypeScript declarations were inspected for Helia 7 composition, IPNS publish/resolve, Bitswap, and libp2p DHT options.
- [IPNS semantics and republication](https://docs.ipfs.tech/concepts/ipns/): immutable CIDs, signed mutable names, cache/validity tradeoffs, and DHT upkeep. The spike's short-lived validity does not establish article expiry.
- [Helia IPNS implementation](https://github.com/ipfs/helia/tree/main/packages/ipns): real IPNS routing rather than application-local pointer storage.
