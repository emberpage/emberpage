# Public IPFS provider discovery and retrieval

Measured 2026-10-11. Script: `spikes/ipfs-public/public-provider.mjs`. It uses the feed spike's pinned native Helia installation, a fresh in-memory identity/blockstore, outbound TCP, client-mode public DHT, and Bitswap. No HTTP gateways, uploads, listening addresses, router changes, accounts, paid services, or production edits.

## Result

Public provider discovery and native byte retrieval succeeded. The final welcome-only run at 22:45 UTC completed in 5.845 seconds:

| Operation | Evidence |
| --- | --- |
| Bootstrap | Connected over TCP to Chicago and Amsterdam public bootstrap peers |
| Discover Kubo welcome root | Public DHT returned five provider records in 847 ms |
| Retrieve root block | 309 bytes from `104.131.131.82:4001`, verified against the requested SHA-256 CID |
| Follow `readme` link | Retrieved its 1,102-byte block from `149.28.82.235:4001`, verified against its CID, containing the expected welcome text |
| Cleanup | Node stopped; ephemeral identity and in-memory blocks discarded |

The public root CID is `bafybeie5nqv6kd3qnfjupgvz34woh3oksc3iau6abmyajn7qvtf6d2ho34`; the readme link is `QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB`. The root's SHA-256 is `9d6c2be50f706953479ab9df2ce3edca90b68053c00b3004b7f0accbe1e8eedf`, the readme block's is `120f6af601d46e10b2d2e11ed71c55d25f3042c22501e41d1246e7a1e9d3d8ec`. Source CID: [official Kubo quick start](https://docs.ipfs.tech/how-to/command-line-quick-start/).

The script records the sending peer and active connection address at each Bitswap block event. No provider was preselected or manually dialed; only public bootstrap addresses were configured. These are actual public TCP peers, not a localhost fixture or an HTTP download. The retrieved bytes are IPFS blocks; this experiment does not claim a production article rendering path.

## Negative result and implementation corrections

The other official example CID, `bafkreig24ijzqxj3cxdp6yh6ia2ysxzvxsfnd6rzahxxjv6ofcuix52wtq`, returned provider records but retrieval timed out after 30 seconds. Thus finding provider advertisements does not establish that their advertised bytes are reachable. [Official basic CLI example](https://docs.ipfs.tech/how-to/kubo-basic-cli/)

Earlier attempts are retained rather than hidden. Attempt 1 discovered providers but treated the new streamed blockstore API as a byte array; attempt 2 fixed collection and verified the welcome root; attempt 3 retrieved the root again but its optional README follow-up hit an ESM-only codec import mismatch. The final run uses that pinned codec's ESM entry and verifies both blocks. The initial construction also required adding the DHT's mandatory ping service. These were spike implementation corrections, not evidence of network failures.

## Bounds and remaining gap

Each block retrieval has a timeout and a 64 KiB accumulated-byte cap. Incoming/outgoing Bitswap messages are capped at 128 KiB, streams at four in each direction, and connections at sixteen. The runtime want-list option is explicitly `maxWantListSize`; its soft trimming behavior is not a general hostile-network security proof.

This establishes public discovery and outbound retrieval using native Helia. It does **not** establish an external reader fetching an article held only in our browser IndexedDB, browser connectivity across two independent NATs, global discovery of browser providers, or publisher-offline durability. Those are separate acceptance gates. The independent external browser/backend test remains unresolved in the parent report; a native public download cannot substitute for it.

Evidence: `ipfs-public-provider-results.json`, with `ipfs-public-provider-attempt1.json`, `ipfs-public-provider-attempt2.json`, and `ipfs-public-provider-attempt3.json` alongside it. Reproduce the two-candidate bounded test with `node spikes/ipfs-public/public-provider.mjs`; use `WELCOME_ONLY=1` for just the positive public welcome fixture. No preservation or provider announcements are made by this probe.
