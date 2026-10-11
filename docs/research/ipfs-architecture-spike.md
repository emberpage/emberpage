# IPFS architecture spike: storage, serving, and discovery

Investigated 2026-10-11. This note is primary-source architecture research, not a claim of successful Internet retrieval. The separate executable spike reports own measured results. Production Ember Page is unchanged.

## Finding

IndexedDB is a legitimate persistent storage backend for a browser IPFS node. A pin protects local blocks from the node's garbage collector. A running transport and reachable provider are still required for another reader to retrieve those blocks. This makes participant serving possible; it does not make storage permanent or anonymous.

The official Helia introduction documents `blockstore-idb` for bytes and `datastore-idb` for pin metadata, peer state, and names. Its separate pinning and providing examples demonstrate that retaining content and announcing availability are distinct operations. [Helia examples](https://github.com/ipfs-examples/helia-examples/blob/main/examples/helia-101/README.md)

## Dependencies that must be measured

Helia's current browser source configures circuit relays, WebRTC, direct WebRTC, WebSockets, Noise, bootstrap peers, delegated HTTP routing, and a client-mode DHT. Those defaults are not proof of provider-independent operation. A relay facilitates reachability, while a delegated router handles discovery; neither should silently become a storage backend. [Browser defaults](https://github.com/ipfs/helia/blob/main/packages/libp2p/src/utils/libp2p-defaults.browser.ts), [bootstrap configuration](https://github.com/ipfs/helia/blob/main/packages/libp2p/src/utils/bootstrappers.ts)

The current `createHelia` source composes HTTP, libp2p, and Bitswap. `createHeliaLight` starts without brokers or routing. Published npm versions can differ from repository main; inspect installed code and record exact versions. Explicitly exclude HTTP article gateway brokers in the participant-transfer experiment and record network requests. Otherwise successful retrieval could merely demonstrate HTTP download. [Helia construction source](https://github.com/ipfs/helia/blob/main/packages/helia/src/index.ts)

IPFS content routing locates holders of a known CID; Bitswap can retrieve blocks from connected peers without a DHT lookup. Therefore an explicit-address local test proves transfer, but not global provider discovery. UnixFS already supplies a standard block DAG for larger files, avoiding application-level message chunk manifests. [IPFS routing and transfer](https://docs.ipfs.tech/concepts/how-ipfs-works/)

## Manifest V3

A WebRTC node belongs in an extension document, rather than assuming the service worker is an immortal networking process. Chrome explicitly offers an offscreen document `WEB_RTC` reason; this needs the `offscreen` permission. The document only exposes the runtime extension API and one document is available per normal profile. Non-audio reasons have no fixed API lifetime limit, which still does not guarantee browser uptime. [Chrome offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen)

The existing extraction offscreen document creates a sharing seam: either deliberately share its lifecycle or use a separate spike extension. Do not change production extraction merely to make an experimental transport run. Closing Chrome, disabling the extension, power loss, and computer sleep must be reported separately from persistent IDB recovery. [Chrome worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

## Feeds and aggregation

Use immutable signed contributor snapshots linked by CID, with a stable IPNS name pointing to the latest snapshot. The separate aggregator remains metadata-only: it polls registered names, validates records and feed signatures, computes observed trends, and publishes another immutable result snapshot. It does not download or inspect article bodies. The reader fetches candidate articles and applies every existing eligibility rule before showing them in readable Popular. A later client can fetch the aggregator snapshot without becoming the collector. Explicit registration is the initial discovery root; IPFS does not enumerate all application feeds.

IPNS records carry a signature, sequence, validity, and cache TTL. DHT entries expire after 48 hours even if signed validity is longer, so records need republication. Resolvers can accept an older valid update; consumers should persist the highest accepted sequence and expose snapshot age. IPNS publication does not pin the target snapshot or article. PubSub announcements alone do not supply offline history. [IPNS mechanics](https://docs.ipfs.tech/concepts/ipns/)

## Limits and privacy

Pins prevent IPFS garbage collection, not deletion by a user or loss of the browser profile. The product must distinguish bounded read cache from an explicit preservation commitment, and refuse a new preservation pin at quota rather than silently evicting an older promised pin. Multiple independent online holders are needed to survive publisher shutdown. [IPFS local and remote pins](https://docs.ipfs.tech/how-to/pin-files/)

IPFS encrypts transport, but public routing links peer identities to supplied content; peer address lookups can expose IP addresses. A CID proves byte integrity, not authorship, safety, truth, or unique-human voting. Reading must not automatically announce private history or promote local-only records into a serving store. The existing bounded parsing, sanitization, image budgets, signatures, per-key caps, and explicit action boundaries remain necessary. [IPFS privacy](https://docs.ipfs.tech/concepts/privacy-and-encryption/)

## Acceptance gates before choosing IPFS

1. Three isolated browser profiles with distinct IndexedDB databases: A imports and pins, B fetches and explicitly pins, A stops, C fetches identical bytes from B.
2. Restart B; verify peer identity, pin metadata, and every referenced block survive. Confirm cold-cache C cannot succeed after all holders stop.
3. No Primal, HTTP article gateway, shared memory, shared filesystem, or CAR injection in the retrieval path. Record transport, relay/routing endpoints, connections, and transferred bytes.
4. Label manual peer-address transfer separately from discovery by CID. Repeat public discovery and retrieval across distinct networks/NATs before claiming Internet availability.
5. The metadata feed spike rejects tampered signatures, rollback, duplicate identities/actions, and malformed or oversized snapshots. A new feed update advances a stable name and result snapshot; holder outage yields an explicit unavailable/stale result. Separately, the reader-filter spike fetches article bodies and verifies that every Popular candidate is a survivor of all eligibility rules.
6. Test extension popup closure, idle worker suspension, offscreen restart, browser restart, quota refusal, and unpin plus garbage collection. Measure startup time, package size, idle requests, serving bandwidth, and teardown.

A local positive result warrants a larger network spike, not a production migration. The key decision is whether useful availability can be achieved with a modest number of independently operated holders while preserving the explicit UX and bounded resource model.

## Public infrastructure update

Shipyard announced that its IPFS engineering and infrastructure work would end on September 30, 2026, with Protocol Labs determining the future of domains and services. This does not establish that IPFS itself stopped or that today's bootstrap endpoints are unavailable; it does make live checks important before relying on historical defaults. [Shipyard announcement](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/)

Protocol Labs' follow-up describes redirected browser navigation, growing rate limits for hotlink/backend gateway traffic, dedicated nodes for backend services, and changes in maintainership funding. It affirms continuing protocol work; the announcement should not be summarized as an IPFS network shutdown. [Protocol Labs follow-up](https://blog.ipfs.tech/2026-08-beyond-sponsored-gateways/)

Read-only DNS checks on October 11 resolved the published am6 bootstrap address to `lith-1.bootstrap.ipni.io:4443` WSS, sv15 to `chic-1-b.bootstrap.ipni.io:4453` WSS, and va1 to `va1.bootstrap.libp2p.io:443` WSS. DNS publication is not circuit-relay reservation admission or an availability guarantee. The primary WebRTC browser guide demonstrates operating a relay rather than promising a free public relay service. [Browser connectivity guide](https://docs.libp2p.io/guides/webrtc-browser-connectivity/)
