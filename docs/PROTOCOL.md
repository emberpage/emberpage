# Ember Page protocol

Current contract for article files, listings and ratings. The event kinds are Ember Page conventions, not registered Nostr standards. There is one decoder, blob provider and relay, with no automatic fallbacks or stored-data migration.

## Article file and hashes

New files are UTF-8 JSON envelopes containing Base64 of native gzip-compressed article JSON:

```json
{"format":"emberpage.article","version":2,"encoding":"gzip","payload":"<Base64 gzip of article JSON>"}
```

`url` is normalized HTTP(S) without credentials or fragment, preserving content-defining query parameters. `capturedAt` is integer milliseconds, nonnegative and no more than 60 seconds in the future. Age alone does not invalidate a body. Required fields retain their known types. Bounded optional fields are inert and ignored for display; unknown format/version is rejected.

- `urlHash`: SHA-256 of UTF-8 normalized original URL.
- `contentHash`: SHA-256 of UTF-8 `JSON.stringify([1,url,title,byline,content])`. Capture time and optional metadata are excluded.
- `blobHash`: SHA-256 of the exact uploaded file bytes.

Maximum file and expanded JSON size are each 2 MiB. Decompression stops at the expanded limit before JSON parsing. Version 1 uncompressed archives remain readable; new writes always use version 2. Compression changes blob identity, not content identity. The same content can have different blob hashes when file serialization, capture time, or optional fields differ. Ratings attach to `(urlHash,contentHash)`, not blob identity or replication count.

## Fixed Blossom provider

Provider: `https://blossom.primal.net`.

Upload the file through PUT `/upload`, Content-Type `application/json`, X-SHA-256 equal to blobHash, with omitted credentials and finite timeout. Do not use `/media`, which can transform bytes. A successful receipt must match the exact hash, byte size, JSON MIME type and `https://blossom.primal.net/<blobHash>.json` URL. Persist `{blobHash,size,provider}` for explicit listing retries.

Authorization is a signed Nostr event of kind 24242, with `t=upload`, `x=blobHash`, `server=blossom.primal.net`, a two-minute `expiration`, and a human-readable purpose. The token is sent in HTTP, never published to a relay. **Primal-specific encoding:** `Authorization: Nostr <padded standard Base64 of UTF-8 signed-event JSON>`. Current Primal source uses the standard Base64 decoder; current BUD-11 specifies unpadded Base64url. This provider constraint is explicit; clients must not silently try both encodings. [Primal source](https://github.com/PrimalHQ/primal-blossom-server/blob/main/src/lib.rs), [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md)

The qualified read path is constructed from the verified hash:

```text
https://media.primal.net/uploads2/<hash[0]>/<hash[1:3]>/<hash[3:5]>/<fullHash>.json
```

GET this path with omitted credentials and `redirect:error`. Do not follow redirects or fetch arbitrary listing URLs. If the provider changes this layout, fail clearly. Allow only the configured provider and CDN in the network policy. [Primal source](https://github.com/PrimalHQ/primal-blossom-server/blob/main/src/lib.rs)

Enforce file size during streaming, before parsing. A caller may share `{remainingBytes}` across its bounded reader workers; each consumed chunk decrements that budget. Verify blobHash before parsing, recompute contentHash/urlHash, and match size, URL, title, byline and capture time against the listing. No network operation itself certifies content eligibility. Sanitization, actual visible text/DOM metrics and decoded-image bounds remain required before a reader card appears.

## Fixed Nostr metadata relay

Relay: `wss://relay.primal.net`.

Signing identity is one locally generated Schnorr/secp256k1 key per installation, stored separately from evictable article caches under `chrome.storage.local.emberpageSigningKey`. Clearing article caches must not remove the key. Public signatures link an installation's actions; they do not prove authorship or independent human voters.

All metadata is bounded to 8 KiB; writers measure the complete signed EVENT frame. Nostr `created_at` is integer Unix seconds. Normalized application records expose `createdAt` in milliseconds. Reject timestamps more than 60 seconds in the future and events outside the 30-day discovery window. There is no article expiry or automatic renewal. Requests/Wanted are outside this release.

### Listing: experimental kind 8965

Tags must contain exactly one each:

```json
[["t","emberpage-v1-listing"],["u","<urlHash>"],["x","<contentHash>"]]
```

Content is JSON with:

```json
{"version":1,"url":"https://example.org/article","urlHash":"<64 lowercase hex>","contentHash":"<64 lowercase hex>","blobHash":"<64 lowercase hex>","size":123456,"title":"Article title","byline":"Author","capturedAt":1791700000000,"provider":"https://blossom.primal.net"}
```

Tags and content hashes must agree. Reject conflicting/duplicate singleton tags, malformed fields, unsupported version, mismatched URL hash, and other provider references. Title must be nonblank; title/byline are at most 500 characters each; the normalized URL is at most 4096 characters. Only known fields are projected into normalized records. Optional remote ratings, scores or markup do not influence ranking or rendering.

Normalized listing: `{id,pubkey,createdAt,url,urlHash,contentHash,blobHash,size,title,byline,capturedAt,provider}`.

Publish only after the blob upload succeeds. If listing publication fails, retain the local copy and successful upload receipt. Explicit retry sends the listing using that receipt, without reuploading the file. Report complete sharing success only after relay OK accepts the signed listing.

Discovery query: kind 8965, `#t=emberpage-v1-listing`, `since=now-30days`, at most 100 returned metadata events. Validate Nostr event ID/signature and the contract locally; deduplicate exact event IDs. This bounded batch is not a claim of global completeness.

### Rating: experimental kind 8966

Tags must contain exactly one each:

```json
[["t","emberpage-v1-rating"],["u","<urlHash>"],["x","<contentHash>"]]
```

Content: `{"version":1,"urlHash":"<64 lowercase hex>","contentHash":"<64 lowercase hex>","value":1}`; value is exactly 1 or -1.

Normalized rating: `{id,pubkey,createdAt,urlHash,contentHash,value}`.

Query at most 5000 metadata events within 30 days for at most 100 requested `(urlHash,contentHash)` pairs. Relay filters over arrays can return a cross-product; reject any pair the caller did not request. Count only the newest valid rating per signing key and content snapshot in the seven-day popularity window. Resolve equal-time ties deterministically by event ID. Cap each rating direction at 50. No automatic vote follows reading or successful verification.

## Reader eligibility and ranking

An explicit discovery pass queries at most 100 recent listings and considers the bounded local metadata ledger. Identical file/metadata claims share an attempt. It allocates at most 20 downloads in rounds across URLs, with at most two claims per URL and four attempts per signing key. A claimed content hash cannot discard a competing file or conflicting metadata before verification. Only verified survivors merge by content hash. These concentration limits are not Sybil resistance; fresh keys and a flooded query window can still distort discovery. Download concurrency is two and the combined streaming budget is 16 MiB. Only complete files that pass all checks appear in Popular; the batch is not a global catalog.

After file and metadata verification, inspect and sanitize the HTML locally. Require at least 1,000 visible characters, one content block, at most 10 images, and text density between 0.1 and 1, excluding embedded image data. Bound inspection to 50,000 DOM nodes and 100 nesting levels. These are readability heuristics, not truth checks.

Render allowlisted inert HTML, presentation MathML and embedded still WebP only. Math attributes and annotations are removed. Local references are rewritten into an isolated ID namespace; external links retain the existing URL checks. Remove scripts, event handlers, frames, forms, remote resource loads and unsafe URLs. Before native image decoding, inspect RIFF/frame headers and reject malformed or animated WebP, image floods, dimensions above 8,192 px on either edge, or more than 16 million pixels per image. The article total is at most 32 million decoded pixels. Writer, preview and reader apply the same bounds.

Rank eligible snapshots by `(up - down + 2) / (ageHours + 2)^1.5`, using seven-day ratings and the earliest observed listing in the discovery window for age. Each rating direction is capped at 50; content hash then blob hash breaks ties. Replication count does not increase the score.

## Local limits and retention

These application limits do not promise provider capacity or retention.

| Resource | Limit |
| --- | --- |
| Article file | 2 MiB on upload and streamed download |
| Captured images | 10; WebP quality 0.8, longest edge 1,600 px; 1 MiB total data-URI bytes |
| Contributor articles | 100 records / 16 MiB |
| Reader articles | 100 records / 16 MiB |
| Discovery metadata | 1,000 listings / 2 MiB |
| Rating metadata | 5,000 events / 4 MiB |
| Pending share receipts | 20 records / 256 KiB |

Each article store also caps expanded article JSON at 16 MiB; archive listing decodes one record at a time. Contributor and reader stores evict whole records atomically by least recent use, accounting for stored bytes. Browsing cannot evict contributor copies. Discovery evicts oldest listings; ratings retain newest votes in the active window. Pending shares remain protected until explicit retry, discard or quota handling. If only protected records remain, reject the new write. Local eviction never deletes remote files. Clearing article caches retains the signing key.

If captured images exceed the limits, keep the preview with descriptive placeholders and disable saving/sharing until the user explicitly chooses text only or discards it. Do not silently save a partial image capture.

Article bodies have no age expiry. Listing and rating queries cover 30 days; popularity covers seven. Older bodies remain readable locally or while the provider serves them, even if they leave discovery. There is no automatic remote deletion or renewal. Losing the signing key can prevent owner-authorized deletion; deleting a listing cannot erase copies elsewhere.

## Completion, failure, and optional aggregator

Open one finite WebSocket operation and close subscriptions at EOSE, the result cap, rejection, disconnection, or timeout. Relay OK is acceptance at that relay, not future retrieval or retention. Empty completed queries differ from failed or refused queries. Provider and relay can independently fail; retain local copies and make the failure visible.

The separate optional aggregator imports only the read-only `NostrDirectory` and metadata validators. It consumes listings/ratings, never blob bodies, and never accesses the extension signing identity. Its index/trends are metadata observations. The extension does not call it and must work while it is stopped.

The dashboard refreshes 60 seconds after each completed pass. Its SQLite stores retain at most 1,000 listings / 2 MiB and 5,000 ratings / 4 MiB within 30 days, evicting oldest events first. The detailed journal is limited to seven days, 500 events and 1 MiB. Separate hourly counters retain 168 buckets / 32 KiB so journal eviction does not erase seven-day totals. Counters include repeated accepted/rejected observations, not unique articles or people; the current interval is partial.

Nostr and Blossom mechanisms do not guarantee permanent storage, free quotas, service availability, uploader anonymity or Sybil-resistant rankings. Actual provider workload and retention policies remain release qualification requirements. [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [Blossom BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md)
