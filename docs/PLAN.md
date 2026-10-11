# MeshCache: fresh first-release plan

Implemented 2026-10-11. This is the first-release architecture; see [verification](VERIFICATION.md) for acceptance evidence. The original garden plan remains private historical context.

## Decision

Use **Blossom for article files and Nostr for small discovery and rating events**. Start with Primal's tested Blossom endpoint and its relay, configured in code. Keep the aggregator a separate, optional local site.

Nostr is not required for Blossom upload or download. It supplies the shared directory that lets readers discover articles and exchange ratings without us operating a mandatory directory server. Blossom's optional listing endpoint lists one known uploader's files; it does not provide global article discovery or popularity. Removing Nostr would mean dropping the public Popular experience or introducing another required directory service. [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-12](https://github.com/hzrd149/blossom/blob/master/buds/12.md), [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md).

These are two protocol roles and two endpoints, even if Primal operates both. The extension never calls the aggregator. No Waku, chunking, alternate providers, legacy decoders, or automatic transport fallbacks.

## Simple, explicit UX

1. **Capture:** the contributor presses the extension button to extract the current article and open a preview. Capture alone publishes nothing.
2. **Choose:** the preview offers **Cache only for me**, **Cache for readers**, and **Discard**. Keep a short public-sharing explanation and the existing explicit text-only choice.
3. **Share:** Cache for readers saves locally, validates the article, uploads its file, then publishes its signed listing. Report success only after both services accept their respective writes. On failure, retain the local copy and offer explicit Retry. If upload succeeded but listing failed, retry that listing using the saved upload receipt.
4. **Discover:** pressing Browse popular articles performs a bounded discovery pass. Show only complete articles that pass every reader-side filter. The reader presses Read to open a retained, sanitized copy.
5. **Rate:** thumbs up/down is an explicit signed action. Do not generate votes from reading or successful validation.

No automatic sharing, background seeding, hidden page loads, continuous subscriptions, automatic republishing, or implicit requests. Keep Library for local copies. A Wanted/request workflow is outside this first release; it can be added later as a separate explicit action.

## One article format

Upload UTF-8 `application/json` through Blossom **PUT /upload**, which preserves exact bytes. Do not use the transforming media endpoint.

```json
{
  "format": "meshcache.article",
  "version": 1,
  "article": {
    "url": "https://example.org/article",
    "title": "Article title",
    "byline": "Author",
    "capturedAt": 1791700000000,
    "content": "<p>Sanitized article HTML with embedded WebP images.</p>"
  }
}
```

This is a new first-release format. Implement exactly one decoder. No AES, URL-derived keys, gzip, or Base64 wrapper around the file. Publicly shared articles are public; URL-derived encryption would not provide secrecy when the URL is discoverable. Use HTTPS for transport.

Keep three identifiers:

| Identifier | Purpose |
| --- | --- |
| `urlHash` | SHA-256 of the normalized original URL; find copies of a page. |
| `contentHash` | SHA-256 of UTF-8 JSON for `[1, url, title, byline, content]`; deduplicate identical content and attach ratings independently of upload time or file serialization. |
| `blobHash` | SHA-256 of the exact uploaded bytes; verify the downloaded file. |

Do not include capture time or optional provenance fields in content identity. Changes to extracted HTML or images create a different snapshot. Extractor version and image quality are not reader compatibility requirements.

Accept bounded, inert optional fields in version 1; never render them as code or markup. Unknown format versions are skipped clearly. A future format change requires an explicit implementation decision, not guessed decoding or a legacy fallback.

## Small Nostr metadata

Use locally generated, per-install signing keys. No wallet, account, or login UI. Persist the key separately from evictable caches; clearing article caches must not delete it. The same key can sign Blossom authorization and MeshCache events. Blossom authorization is sent over HTTP and does not require publishing it to a relay. [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md).

Define two small, namespaced event contracts: **article listing** and **rating**. Freeze their experimental kinds and indexed tags in one protocol document before implementation; avoid claiming unregistered kinds are standards.

- Listings bind the URL/content/blob hashes, byte size, title, byline, capture time, and selected provider reference. Reader checks must match those fields against the body.
- Ratings target `urlHash` and `contentHash`. Count the newest valid vote per signing key and snapshot; repeated events or duplicate uploads do not add votes.
- Cap metadata events at 8 KiB. Query with limits and time filters; close subscriptions after completion or timeout.

Signatures authenticate a key and its statements. They do not prove authorship, permission to redistribute, factual accuracy, or distinct human voters. Copies from many keys are not independent proof of correctness. Public sharing under one installation key is linkable.

## Reader validation and Popular

On each explicit discovery pass, query at most 100 recent listings. Verify signatures, event contracts, timestamps, hashes, and provider references before downloading. Deduplicate content; inspect at most 20 unique files within a 16 MiB total download budget and a bounded concurrency of two. The list covers that bounded batch, not the entire network.

For every file, enforce size while streaming, verify `blobHash` before parsing, check its format and required field types, recompute content identity, and match listing fields. Reject malformed timestamps or ones more than 60 seconds in the future; age alone does not invalidate a body. Normalize HTTP(S) URLs consistently, rejecting credentials and preserving content-defining query parameters.

Then sanitize HTML and derive text and DOM metrics in the reader. Apply all eligibility rules before displaying a candidate: at least 1,000 visible characters, a content block, at most 10 images, bounded DOM counts, and the existing 0.1–1 text-density range excluding embedded image data. These are quality heuristics, not security or truth proofs. Do not trust producer-supplied text, DOM signatures, or extractor versions as validation.

Render only allowlisted inert HTML and validated embedded WebP images. Remove scripts, event handlers, frames, forms, remote resource loads, and unsafe URLs. Check WebP dimensions before full image decoding: reject images above 8,192 px on either edge or 16 million pixels, and enforce 32 million decoded pixels total per article. Apply the same limits in the writer and preview. Inspect WebP RIFF/frame headers in inert HTML before creating native images; reject malformed or animated files and raw image floods before sanitization can reduce their count. Bound inspection to 50,000 DOM nodes and 100 levels of nesting. Restrict network retrieval to the configured HTTPS provider and explicitly qualified CDN redirects; never fetch arbitrary URLs supplied by listings.

Rank the survivors using `(up - down + 2) / (ageHours + 2)^1.5`, counting ratings from the last 7 days. Use the earliest observed listing in the discovery window for a content snapshot's age; cap each rating direction at 50 and use hashes for deterministic ties. Do not reward replication count. An unavailable or rejected body never appears as a readable card. Empty results explain that no eligible copies were found. A locally retained copy remains readable without a network connection.

## Initial limits and retention

These are application limits, not provider promises:

| Resource | Limit / policy |
| --- | --- |
| Article file | 2 MiB, enforced on upload and streamed download. |
| Images | At most 10; one WebP preset, 1,600 px longest edge, quality 0.8; 1 MiB total encoded image data including data-URI overhead. |
| DOM | Existing bounded inspection, plus decoded-image pixel limits. |
| Contributor records | 100 articles / 16 MiB, least-recently-used eviction. |
| Reader records | 100 articles / 16 MiB, least-recently-used eviction. |
| Discovery metadata | 1,000 listings / 2 MiB, oldest first. |
| Rating metadata | 5,000 events / 4 MiB, retaining newest votes within the active window. |
| Pending share receipts | 20 / 256 KiB; retained until explicit retry, discard, or quota handling. |

Keep contributor and reader quotas separate so browsing cannot evict contributor records. Evict whole records atomically and account for the actual stored bytes. Protect pending shares from ordinary eviction; if only protected records remain, refuse the new write with a clear storage-full message. Local eviction never triggers remote deletion.

Preserve the robust explicit image-capture path, including handling cross-origin images. The new preset removes the transport-driven quality ladder. If the result exceeds limits, keep the preview with descriptive image placeholders and explain the size issue. Disable saving and sharing until the user explicitly chooses text-only, or discards the capture; never silently save a partial image capture. No guarantee that every page's images can be copied.

**Remove the 24-hour article expiry.** Old valid articles remain readable while retained locally or available from the provider. Use a 7-day popularity window, a 30-day listing discovery window, and a 30-day rating window. These windows bound queries and ranking; they do not expire article bodies. Discovery of older copies may disappear even while their files remain available.

Remote storage lasts as long as the provider retains and serves it. Blossom is not permanent storage, and no retention duration has been demonstrated. Do not automatically delete or renew uploads. Losing the signing key can prevent owner-authorized deletion; removing a listing cannot guarantee copies disappear elsewhere.

## Separate local aggregator

Keep the dashboard on localhost. It independently consumes listing/rating metadata, stores a bounded SQLite journal, and computes rolling trends. It does not download article bodies or certify their eligibility.

Show relay health, accepted/rejected events and reasons, duplicates, query latency, journal size/retention, and rolling trend counts. Label trends as metadata observations. Keep its 7-day journal retention, 500-event/1-MiB journal budget, and a 60-second schedule between completed refreshes. Persist at most 1,000 listing events/2 MiB and 5,000 rating events/4 MiB in the 30-day discovery window, evicting oldest events first. Keep at most 168 hourly observation counters (32 KiB) independently of the detailed journal, so journal eviction cannot erase seven-day trend totals. Seven-day observation totals count repeated accepted/rejected metadata observations, not unique articles or people; the current interval is partial. Do not add an extension-facing API or deploy it publicly.

## Implementation order and acceptance

1. Freeze the article and metadata contracts, hashes, limits, and ranking rules. Replace Waku and its legacy packet/expiry code with one Blossom HTTP client and one small Nostr client. Preserve extraction, sanitizer, preview, and local actions.
2. Implement upload-then-listing state, explicit retries, body verification, filtered Popular, and separate IndexedDB quotas. Keep provider-specific authorization encoding explicit rather than trying alternatives.
3. Update the independent aggregator to consume the new metadata contracts. Keep it optional and local.
4. Test drive the actual MV3 extension in Chrome for Testing with Codex computer use: private save produces no publication; explicit public save works; another client retrieves the exact file and displays images; Popular never displays metadata-only or invalid candidates; aggregator shutdown does not affect extension operation.
5. Verify forged events, tampered files, oversized responses/images, malicious HTML, duplicate votes, partial share failures, byte/count eviction, and readability beyond 24 hours. Confirm the exact new plain-JSON format and image preset through the provider; earlier encrypted-file probes do not establish those new behaviors.

Before public release, qualify provider workload policy, quotas, retention, and deletion behavior. No production migration or public deployment is part of this implementation.

## Evidence

The [Blossom spike](research/blossom-spike.md) verified exact upload/read of approximately 138 KB and 483 KB encrypted article JSON, plus a separate 2 MiB synthetic JSON file. It did not demonstrate sustained capacity or long-term retention. Deletion acknowledgments timed out, although all tested serving URLs subsequently returned 404.

The [Nostr spike](research/nostr-spike.md) demonstrated small indexed metadata events; larger body events encountered admission/indexing differences. Keep bodies off relays. See [discovery without Nostr](research/discovery-without-nostr.md) for the directory alternatives and primary protocol sources.
