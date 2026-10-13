# Protocol and limits

IPFS stores article files. Nostr carries signed listings and votes. The extension searches the current URL; the separate aggregator indexes metadata across URLs. No Blossom, local RPC, desktop app, pinning account, automatic sharing, or external pinning service is used. Real network evidence is recorded separately in [VERIFICATION.md](VERIFICATION.md).

## Files and identity

Article fields: `{url,title,byline,content,capturedAt}`. URL is normalized HTTP(S), without credentials or fragment, preserving meaningful query parameters. Capture time is integer milliseconds, nonnegative and at most 60 seconds ahead. Optional bounded metadata is inert.

Files are UTF-8 JSON:

```json
{"format":"emberpage.article","version":2,"encoding":"gzip","payload":"<Base64 gzip of article JSON>"}
```

File and expanded JSON each have a 2 MiB limit. Streaming/decompression stop before exceeding it. Only version 2 compressed archives are accepted.

| Identity | SHA-256 input |
| --- | --- |
| `urlHash` | UTF-8 normalized URL |
| `contentHash` | UTF-8 `JSON.stringify([1,url,title,byline,content])` |
| `blobHash` | Exact file bytes |

Capture time and optional metadata do not affect content identity. Serialization/compression changes can change blob identity. A CID addresses exact IPFS content; supported snapshot CIDs are SHA-256 CIDv1 raw or DAG-PB. Ratings attach to `(urlHash,contentHash)`, never replication count.

## Browser contribution

Helia/libp2p runs in the extension’s offscreen document, with blocks, pins, and node identity persisted in IndexedDB. Sharing stores the exact saved bytes, verifies the retained file, and obtains public peer routes before announcing it. Opening a downloaded copy also caches the validated article in the reader vault; **Keep available** explicitly contributes it under contributor quotas.

Only signed public WSS circuit/WebRTC routes are accepted: configured bootstrap relays or validated public AutoTLS `libp2p.direct` relays. Reject private/reserved addresses, malformed peer IDs, duplicate routes, and arbitrary HTTP endpoints. Listings contain 1–3 routes; a reader may combine at most 12 distinct validated routes for an identical file. libp2p authenticates peer identities, and the file’s hashes/CID remain independently verified.

**Pause contribution** stops the node without deleting copies or pins. Sharing/keeping again resumes contribution. A retained pin proves local storage, not WAN reachability or permanence. Availability requires connected contributors and may change when relay reservations expire. Provider records/routes and connected peers can expose network endpoints; encryption is not anonymity.

## Signed metadata

Relays: `wss://relay.primal.net`, `wss://relay.damus.io`, `wss://nos.lol`. Publish the same signed event to each. At least one acceptance establishes publication; partial acceptance is reported. Queries merge validated observations and deduplicate event IDs. Relay acceptance does not promise retention or global completeness.

One installation signing key lives separately in `chrome.storage.local.emberpageSigningKey`. Clearing article caches retains it. Signatures link activity; they do not prove authorship or independent human voters. Metadata is bounded to 8 KiB, including signed publication frames. Event times use Unix seconds; normalized `createdAt` uses milliseconds. Reject events more than 60 seconds ahead or outside the 30-day discovery window.

### Listing: kind 8965

Singleton tags: `[["t","emberpage-v2-listing"],["u","<urlHash>"],["x","<contentHash>"]]`.

Content:

```json
{"version":2,"url":"https://example.org/article","urlHash":"<hex>","contentHash":"<hex>","blobHash":"<hex>","size":123456,"title":"Article","byline":"Author","capturedAt":1791700000000,"cid":"<CID>","routes":["<public peer route>"]}
```

Hashes are 64 lowercase hex characters. Title is nonblank; title/byline each ≤500 characters; URL ≤4096. Normalized records add `{id,pubkey,createdAt}`. Verify event ID/signature, singleton tags, format, URL hash, CID, routes, sizes, and timestamps. Only known fields influence display/ranking.

Publish after verified retention. Persist `{contentHash,blobHash,size,cid,routes,pinned}` for unfinished sharing. Publication failure retains the local file and receipt; explicit retry reuses the retained file. Pending copies remain protected. Successful listing publication is separate from remotely verified retrieval.

**Find saved copies** queries kind 8965, listing namespace, current normalized URL hash, and the last 30 days, with at most 100 metadata events. Locally verify the URL again. The aggregator may query across URLs.

### Vote: kind 8966

Singleton tags: `[["t","emberpage-v1-rating"],["u","<urlHash>"],["x","<contentHash>"]]`.

Content: `{version:1,urlHash,contentHash,value}`; value is exactly `1` or `-1`. Normalized records add `{id,pubkey,createdAt}`. Query at most 5,000 events for at most 100 requested hash pairs; reject relay cross-product results outside those pairs. Count the newest valid vote per signing key/snapshot within seven days; deterministic event-ID ties; each direction capped at 50. Reading never votes automatically.

## Reader security and ranking

Consider only matching-URL listings. Identical file/metadata claims share a download; conflicting claims cannot suppress alternatives before verification. At most 20 attempts, four per signing key, two concurrent readers, and 16 MiB total requested-block budget. Each file allows at most 64 KiB extra UnixFS metadata; the Chrome bridge conservatively reserves that overhead before downloading. These limits do not stop Sybil identities or flooded discovery windows.

Verify exact size/blob hash, decode bounded JSON, recompute URL/content hashes, and match URL, title, byline, and capture time. Inspect before showing a card: ≥1,000 visible characters, ≥1 content block, ≤10 images, text density 0.1–1, ≤50,000 DOM nodes, ≤100 nesting levels.

Render allowlisted inert HTML, presentation MathML, and embedded still WebP. Strip scripts, handlers, forms, frames, remote resources, unsafe URLs, math attributes/annotations. Isolate local IDs. Validate image headers before decoding: no animation/malformed files, ≤8,192 px per edge, ≤16 million pixels per image, ≤32 million pixels total. Writer/preview/reader share these bounds. Readability checks do not verify facts.

Only verified survivors merge by content hash. Rank by `(up-down+2)/(ageHours+2)^1.5`, using seven-day votes and the earliest observed listing age. Content hash then blob hash breaks ties. Mirrors do not boost popularity.

## Quotas and retention

| Resource | Limit |
| --- | --- |
| File / expanded JSON | 2 MiB each |
| Capture images | 10; WebP quality 0.8, longest edge 1,600 px; 1 MiB data-URI total |
| Contributor vault | 100 records / 16 MiB stored files / 16 MiB expanded JSON |
| Reader vault | Same, independently |
| Shared IPFS snapshots | 100 records / 16 MiB snapshot payloads |
| IPFS block store | 32 MiB actual block bytes |
| Mesh block reads/serving | 64 MiB per hourly window per worker |
| Discovery ledger | 1,000 listings / 2 MiB |
| Vote ledger | 5,000 events / 4 MiB |
| Pending receipts | 20 records / 256 KiB |

Vault writes are atomic, evict whole least-recently-used records, and reject writes when only protected contributions or pending shares remain. Writer records are reserved before a pin attempt; cancellation cannot strand a retained pin without a Manage entry. Re-saving identical contributed content keeps its retained file bytes. Browsing cannot evict contributor articles. Mesh payload accounting is separate from browser database/block/index overhead. Removing a contributor record or clearing the archive reclaims its retained IPFS pins; cleanup failure keeps the saved record for retry. Pausing retains pins. Article eviction and removal do not retract copies elsewhere. Image overflow keeps preview placeholders and blocks save/share until explicit text-only recovery or discard.

Bodies have no age expiry. Discovery covers 30 days; popularity covers seven. There is no automatic renewal, deletion, or guaranteed storage lifetime.

## Aggregator and resource lifetimes

The optional aggregator imports read-only metadata directory/contracts, never article bodies, signing keys, or extension transport. The extension does not depend on it. Dashboard refresh waits 60 seconds after each completed pass. SQLite retains 1,000 listings / 2 MiB and 5,000 votes / 4 MiB within 30 days; detailed journal ≤7 days / 500 events / 1 MiB; hourly counters ≤168 buckets / 32 KiB. Counters represent observations, not unique people.

Close each finite relay subscription on completion, limits, rejection, disconnection, cancellation, or timeout. Distinguish empty completed queries from failed queries. Mesh and relays can fail independently; retain readable local copies and report incomplete operations.
