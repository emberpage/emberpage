# IPFS browser hardening spike

2026-10-11. **Final stable hardening and native transfer regression passed.** Production MeshCache is unchanged. Separate Chrome profiles use IndexedDB, Bitswap, and WebRTC through a localhost relay. Public Internet reachability and anonymity are not established.

Evidence: [55 hardening steps](ipfs-browser-hardening.json), [19 native regression steps](ipfs-browser-spike.json), [finite flood](ipfs-browser-flood.json). Hardening bundle SHA-256: `edcfa16a1676bbb63e1648df275f4c20fcca3aaab7914af9178a16ba687fc5fc`; the runner asserts an unchanged bundle during its run.

## Architecture

`preservation.js` owns consent, quota admission, budgets, revocation, and crash recovery. Private imports and read downloads have their own IndexedDB namespace and offline Helia instance. It borrows the network retrieval broker, but its storage is never the inbound Bitswap serving source.

`get(cid)` caches without seeding. `serve(cid)` / `pin(cid)` explicitly promote the verified file to the public store. A durable consent manifest authorizes the root and all DAG blocks. `revoke(cid)` removes authorization first, then its pin and unshared blocks; locally retained reads remain readable. Shared blocks needed by another explicitly preserved article remain available for that article.

## Limits

| Resource | Ceiling |
|---|---|
| Article | 2 MiB metadata preflight and actual output |
| Received DAG | 2 MiB + 4 KiB, at most 32 newly received blocks |
| Private/read cache | 16 MiB actual blocks, 100 roots; refuse growth |
| Preservation | 16 MiB actual blocks/conservative accounting, 100 articles; protect existing pins |
| Serving budget | 8 MiB/hour, 128 block loads/hour; persisted |
| Serving concurrency | 2 active, 2 waiting; 3-second queue deadline |
| Pin operations | Explicit local access, 3-second deadline |
| Bitswap | 1 MiB + 8 KiB frames; 4 inbound/outbound streams; response queue 2 |
| Incoming vectors | At most 32 wants or 4 blocks |
| Wanted CID | SHA-256, 32-byte digest, raw/dag-pb; reject identity hashes that bypass disk policy |

The counter charges bytes handed to Bitswap, including HAVE probes. The limit counts block loads, not all incoming packets. Transport/control overhead and malformed-packet CPU are not included; fixed UTC hours are not rolling windows.

## Confirmed gates

- A connected hostile peer cannot fetch a known private CID or a reader's unconsented cached CID. Explicit serve enables retrieval.
- Revocation blocks the root and unshared leaf CID, persists after restart, and also works when initiated on a recovered node. The private copy remains readable.
- Actual 16 MiB and 100-record ceilings refuse additional public and private records while retaining accepted copies and pins.
- A genuine oversized 3 MiB UnixFS root is refused from verified metadata. A 3 MiB raw response hits the frame bound. Neither leaves cached bytes.
- A hash-valid root claiming 1.5 MiB but linking three 1 MiB leaves crosses WebRTC and triggers `OverReadError`; partial blocks/root are removed.
- Real Chrome SIGKILL after pin, before consent commit, reclaims the staging pin and three blocks on restart, preserves a committed 70,000-byte pin/identity, and keeps the orphan CID remotely unavailable. Only its verified owned process is killed.
- Lowered serving byte/request budgets apply across independent peers and survive restart. Concurrent demand observes one active/one queued read under a lowered ceiling.
- Sixteen 513-entry messages attempt 8,208 wants. All are rejected before native event delivery, without ledger growth or article bytes. A subsequent legitimate 50,000-byte fetch succeeds.
- Original A→B, B browser restart, A offline, fresh C→B, native 2 MiB UnixFS, and all-holders-offline regression passes.

Startup runs before networking: the committed consent manifest is authoritative; pin metadata is rebuilt and uncommitted public blocks removed. This tests one interrupted-commit boundary, not power loss or every IndexedDB failure. Private crash-orphan downloads remain disk bounded but lack complete reclamation.

## Adoption gates and upstream coupling

Valid alternate DAG layouts can be read, but preservation currently requires the canonical importer. A mismatching CID is refused **before** publishing a differently addressed copy. General preservation should mirror the verified DAG exactly or specify stable importer settings.

Installed Bitswap types spell `maxWantlistSize`, while runtime uses `maxWantListSize`. Native truncation also excludes in-flight entries: an initial flood retained 64/63 total/pending entries. The ingress guard wraps private `broker.bitswap.network.safeDispatchEvent`; observation reads private ledgers. Dependencies are pinned. Production needs an upstream validator or maintained reviewed patch. [Bitswap source](https://github.com/ipfs/helia/tree/main/packages/bitswap).

Frame length is bounded before full decode; vector validation occurs after decode and before native hashing/ledger work. The finite test does not certify resistance to unlimited floods, Sybil peers, or connection exhaustion. IPFS/WebRTC is not anonymity infrastructure.

Local pin-walker access fixed revoke hangs. Busy authorized reads now queue within bounds. Repeated suites exhausted stale relay reservations; restarting the fixture restored admission without raising capacity again.

## Run and cleanup

From `spikes/ipfs-browser`: `npm ci`, `npm run build`, then `node server.mjs`. Separately run `npm run test:hardening` and `npm test`. `CHROME_BIN` overrides the installed Chrome executable. Hostile attack/pause helpers are isolated test APIs, not production interfaces.

Owned relay/server ports 4328/4329 are stopped; no owned spike Chrome processes remain.
