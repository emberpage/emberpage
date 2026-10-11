# IPFS spike results

2026-10-11. **IndexedDB-backed participant serving and separate IPFS/IPNS aggregation both worked in the tested configurations.** The production extension still uses Blossom/Nostr; no migration or deployment was performed.

## Measured results

| Question | Result | Evidence |
|---|---|---|
| Can a browser pin IPFS blocks in IndexedDB? | Yes; identity, pins, and bytes survived a full browser restart. | [Browser experiment](ipfs-browser-spike.md) |
| Can another holder replace the original publisher? | Yes on one host: A closed, restarted B served exact bytes to fresh C over WebRTC/Bitswap. | [Transfer log](ipfs-browser-spike.json) |
| Can the IPFS node live outside the extension UI? | Yes in a separate MV3 offscreen extension: service worker stopped, control page closed, peer retrieval still succeeded. | [MV3 experiment](ipfs-mv3-spike.md) |
| Can popularity/discovery metadata use IPFS instead of Nostr? | Yes for explicitly registered feeds: real IPNS pointers, signed feed files, metadata-only aggregation, signed result snapshots. | [Feed experiment](ipfs-feeds-spike.md) |
| Can public IPNS names resolve independently? | Two bounded public-DHT probes resolved the exact CID without explicitly dialing the publisher. | [Public log](../../spikes/ipfs-feeds/public-evidence.json) |
| Can a later optional client poll the aggregator? | Yes: IPNS/IPFS result retrieval and localhost HTTP snapshot/health polling both passed. | [14-check feed log](../../spikes/ipfs-feeds/evidence.json) |
| Can read/private data stay outside public serving? | Yes in the hardened spike: separate stores, explicit promotion, revocation, and crash reconciliation passed. | [Browser hardening](ipfs-browser-hardening.md) |
| Can lifecycle recovery survive an actual process crash? | Yes for committed records: offscreen recreation and verified disposable Chrome SIGKILL recovery passed. | [Lifecycle log](ipfs-mv3-lifecycle.json) |
| Can transfers survive repeated fresh readers? | Twenty sequential fresh-profile transfers passed after the original publisher closed; readers did not automatically seed. | [20-run log](ipfs-repeat-drive.json) |
| Can metadata processing reject malicious input before unbounded traversal/storage? | Finite oversized-frame, deep/fanout DAG, stale/equivocating feed, quota, connection, and interrupted-commit checks passed. | [Collector hardening](ipfs-feeds-hardening.md) |
| Can public CID routing find and fetch external content? | Yes for a native TCP node: Kubo welcome root verified; another advertised CID timed out. Browser publisher discoverability remains separate. | [Public provider experiment](ipfs-public-provider-spike.md) |
| Can the external relay path carry exact bytes? | Yes through a disposable public WSS circuit, including replacement-holder retrieval. Both endpoints were on this Mac. | [Public network proof](ipfs-public-network-proof.md) |
| Does this prove permanent, anonymous, globally discoverable browser hosting? | No. Independent-network provider discovery/retrieval and maintained infrastructure remain adoption gates. | [Constraints](ipfs-architecture-spike.md) |

The feed test uses the actual production article inspector and eligibility filter. The metadata snapshot can contain a short article, but the reader removes it after downloading and inspecting its body. Aggregation therefore stays separate and metadata-only, and cannot bypass the reader's filters.

## Architecture this supports

An explicitly shared article becomes a CID and a local preservation pin. Independent readers can opt into retaining and serving that same content. Contributor feed snapshots contain signed listings and explicit ratings; stable IPNS names identify their latest snapshots. A separate collector polls a registered set of names, computes observed trends, and publishes a signed result snapshot. An optional discovery client can later poll that output. Nostr and Primal are not required by this design.

The registry remains an application discovery root. IPFS routing finds holders of a known CID, not every Ember Page contributor. Multiple independent registries/collectors are possible, but this spike does not implement their federation or choose their trust policy.

## What prevents immediate adoption

- **Reachability:** local direct WebRTC and external relay-only transfers passed. Independent-network CID discovery plus byte retrieval remains unverified. Public bootstrap peers refused relay reservations, community probes failed, and the independent diagnostic backend timed out. The temporary Quick Tunnel is not a production relay arrangement.
- **Availability:** if all holders stop, a fresh reader correctly fails. Useful resilience needs independent online holders and a deliberately chosen preservation policy. IndexedDB retains local bytes; it cannot serve while Chrome is closed.
- **Consent:** the hardened experiment separates private/read storage from public storage. Explicit serving permission survives restart; revocation removes public blocks while retaining a private copy. This implementation remains isolated from production.
- **Resource bounds:** browser file/storage/bandwidth/concurrency/frame/want limits and collector storage/metadata/connection limits passed finite malicious-peer tests. The browser's strict want guard currently uses a pinned internal Bitswap dispatch API because the upstream limit did not enforce the intended bound. Resolve that integration seam before shipping. The collector has a finite frame ceiling, but its want-ledger setting is a soft trim target, not a measured strict accumulated-entry cap. Finite tests do not establish immunity to continuous network abuse.
- **Storage integration:** preservation currently accepts only the canonical importer layout; general preservation should copy the verified DAG exactly. Private interrupted downloads stay disk-bounded but still need a crash-orphan reclamation policy. These are documented prototype restrictions, not completed production features.
- **Dependencies:** the measured browser bundle is about 960 KB across 802 contributing modules. Current isolated audits still report high-severity dependency entries. The reviewed forge/braces/React Native/server-default paths contributed zero bytes to that browser bundle, but that observation does not make the whole dependency graph safe. See the [timestamped dependency review](ipfs-dependency-review.md).
- **Privacy:** public IPFS routing and direct WebRTC expose participant network metadata. This architecture does not satisfy anonymous sharing by itself.

The final browser rerun passed 55 recorded hardening steps and 19 baseline steps. Twenty sequential fresh-reader runs passed on the final bundle. The rerun exposed an obsolete optional progress-event assertion and cumulative local relay reservation exhaustion; [observer failure](ipfs-repeat-observer-failure.json) and [capacity failure](ipfs-repeat-capacity-failure.json) are retained. The final run used the fresh relay and holder-byte accounting, and did not silently switch transport.

## Recommendation

IPFS is a credible transport for a participant-operated Ember Page. Keep this experiment separate from the core extension until public provider discovery and transfer across different networks, a maintained relay arrangement, the Bitswap guard integration, and independent holder uptime are qualified. The optional aggregation path can remain a separate local collector and later a separate discovery extension. There is no reason to restore Waku merely to add application-level chunking: the tested IPFS file path already uses native UnixFS blocks.

The current production checks still pass: `npm run check`, 72 tests plus build. Test servers and disposable browsers are shut down after the experiments. All publication used synthetic data; the public pointer probes had 60-second signed validity and disabled upkeep. Expiry is not a guarantee of global erasure.
