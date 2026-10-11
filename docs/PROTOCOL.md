# Ember Page first-release protocol

Frozen 2026-10-11 for the architecture in [PLAN.md](PLAN.md). This is a new first release: one public article format, one blob provider, one metadata relay. The experimental kinds below are Ember Page conventions, not registered Nostr standards. No Waku, legacy packet decoder, encryption, compression, chunking, or automatic provider/format fallback is part of this contract.

Ember Page starts fresh with its own database names, signing-key slot, article format identifier, and signed event namespaces. There is no legacy decoder, directory fallback, or stored-data migration.

## Article file and hashes

The file is exact UTF-8 JSON:

```json
{"format":"emberpage.article","version":1,"article":{"url":"https://example.org/article","title":"Article title","byline":"Author","capturedAt":1791700000000,"content":"<p>Sanitized HTML containing embedded WebP images.</p>"}}
```

`url` is normalized HTTP(S) without credentials or fragment, preserving content-defining query parameters. `capturedAt` is integer milliseconds, nonnegative and no more than 60 seconds in the future. Age alone does not invalidate a body. Required fields retain their known types. Bounded optional fields are inert and ignored for display; unknown format/version is rejected.

- `urlHash`: SHA-256 of UTF-8 normalized original URL.
- `contentHash`: SHA-256 of UTF-8 `JSON.stringify([1,url,title,byline,content])`. Capture time and optional metadata are excluded.
- `blobHash`: SHA-256 of the exact uploaded file bytes.

Maximum file size is 2 MiB. The same content can have different blob hashes when file serialization, capture time, or optional fields differ. Ratings attach to `(urlHash,contentHash)`, not blob identity or replication count.

## Fixed Blossom provider

Provider: `https://blossom.primal.net`.

Upload the file through PUT `/upload`, Content-Type `application/json`, X-SHA-256 equal to blobHash, with omitted credentials and finite timeout. Do not use `/media`, which can transform bytes. A successful receipt must match the exact hash, byte size, JSON MIME type and `https://blossom.primal.net/<blobHash>.json` URL. Persist `{blobHash,size,provider}` for explicit listing retries.

Authorization is a signed Nostr event of kind 24242, with `t=upload`, `x=blobHash`, `server=blossom.primal.net`, a two-minute `expiration`, and a human-readable purpose. The token is sent in HTTP, never published to a relay. **Primal-specific encoding:** `Authorization: Nostr <padded standard Base64 of UTF-8 signed-event JSON>`. Current Primal source uses the standard Base64 decoder; current BUD-11 specifies unpadded Base64url. This provider constraint is explicit; clients must not silently try both encodings. [Primal source](https://github.com/PrimalHQ/primal-blossom-server/blob/main/src/lib.rs), [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md)

The qualified read path is constructed from the verified hash:

```text
https://media.primal.net/uploads2/<hash[0]>/<hash[1:3]>/<hash[3:5]>/<fullHash>.json
```

That precise Primal CDN layout was observed in the live provider spike and appears in current provider source. GET it with omitted credentials and `redirect:error`, rather than following opaque browser redirects or fetching arbitrary URLs from a listing. If the provider changes this layout, fail clearly; do not guess another path. The extension must allow only the configured provider and this CDN in its network policy. [Spike evidence](research/blossom-spike-results.json), [Primal source](https://github.com/PrimalHQ/primal-blossom-server/blob/main/src/lib.rs)

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

## Completion, failure, and optional aggregator

Open one finite WebSocket operation and close subscriptions at EOSE, the result cap, rejection, disconnection, or timeout. Relay OK is acceptance at that relay, not future retrieval or retention. Empty completed queries differ from failed or refused queries. Provider and relay can independently fail; retain local copies and make the failure visible.

The separate optional aggregator imports only the read-only `NostrDirectory` and metadata validators. It consumes listings/ratings, never blob bodies, and never accesses the extension signing identity. Its index/trends are metadata observations. The extension does not call it and must work while it is stopped.

Nostr and Blossom mechanisms do not guarantee permanent storage, free quotas, service availability, uploader anonymity or Sybil-resistant rankings. Actual provider workload and retention policies remain release qualification requirements. [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [Blossom BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md)
