# Primal Blossom live spike

Tested 2026-10-11 from a disposable Chrome for Testing MV3 extension. Production extension code, dependencies, article limits, image extraction, IndexedDB records, and the separate aggregator were unchanged.

## Outcome

**Primal Blossom accepted and returned the exact existing encrypted article JSON without chunking, signup, or a paid account. It also successfully transferred a separate 2 MiB JSON capacity probe.** This establishes technical suitability at the measured sizes. It does not establish the advertised maximum, sustained quotas, production workload permission, or 24-hour retention.

| Probe | Uploaded bytes | PUT | Hash/size descriptor | Fresh public read | Existing article checks |
| --- | ---: | --- | --- | --- | --- |
| Representative article | 137,936 | 200 | Matched | Exact bytes | Authenticated decryption, deep equality, DOM filters passed |
| Large article | 482,816 | 200 | Matched | Exact bytes | Authenticated decryption, deep equality, DOM filters passed |
| Generic JSON capacity probe | 2,097,152 | 200 | Matched | Exact bytes | Not an article; intentionally outside the article model |

The article probes used production `encryptArticle`, gzip/AES-GCM decoding, `filterCandidates`, and real browser DOM inspection. The larger article's plaintext JSON was 480,389 bytes, within the existing 500,000-byte limit. No envelope padding was used. The 2 MiB probe was ordinary synthetic JSON, not a claim that our current reader accepts a 2 MiB article.

All uploads used `PUT /upload`, never `/media`, to preserve bytes. Returned descriptors were checked against locally computed SHA-256 and exact byte counts. Downloads were bounded and compared byte for byte. Both article packets passed our existing checks after retrieval. A second MV3 page retrieved each file without an authorization header or cookies; this was a fresh client page, not a second browser profile.

## Browser and API findings

The disposable extension needed no host permissions. Requests used `credentials: omit`; its CSP permitted only HTTPS Primal endpoints/subdomains. Blossom downloads redirected to `media.primal.net`; the redirect and final CDN response worked in Chrome with browser CORS enforced. Actual response URLs are recorded in the results. This tests the provider path, not arbitrary download origins.

Authorization used a disposable Schnorr key and kind-24242 events scoped to action, exact file hash, provider domain, and a short expiry. Primal's current implementation expects padded standard Base64; the latest BUD-11 specification requires unpadded Base64url. The harness deliberately uses Primal's documented encoding, with no automatic encoding fallback. This difference matters if replacing the provider or adopting a generic SDK. [Primal implementation](https://github.com/PrimalHQ/primal-blossom-server/blob/main/src/lib.rs), [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md).

## Deletion and cleanup

All three signed DELETE requests failed to return an acknowledgment before the 60-second client deadline. Nevertheless, subsequent requests to both the canonical hash URLs and descriptor `.json` URLs returned 404. The provider requests resolved through `r2a.primal.net` to missing objects. An additional read-only check of each original `media.primal.net` URL also returned 404.

Thus **absence at the tested serving endpoints was verified, but clean DELETE acknowledgment was not**. Global erasure, backup removal, and future cache state were not established. A production cleanup flow would need to reconcile timed-out deletion with observed availability instead of assuming either success or failure from the timeout alone.

A private recovery journal containing only the disposable key and test hashes was written with mode 0600 before uploads, to permit cleanup after interruption. All observed absence checks passed, the journal was removed, and the temporary extension/profile was removed. Results contain no private key or article body. No real articles or Nostr discovery events were published.

## Decision

Primal Blossom is now technically demonstrated for unchanged MeshCache packet JSON at approximately 138 KB and 483 KB, with a separate successful 2 MiB transfer. Nostr metadata plus Blossom body storage is a credible way to avoid client-side chunking. It would still add a second service dependency; the aggregator can remain metadata-only and independent.

Before production selection, establish workload policy, actual per-key/IP quotas, retention, and the deletion timeout behavior. This small test does not qualify the public service for sustained encrypted article caching or promise that its published media allowance applies unchanged.

## Historical evidence

The encrypted-packet harness was retired with the first-release rewrite. These observations remain historical; use the [current plain-JSON transport report](first-release-live.md) and `scripts/spikes/first-release.mjs` for the current contract.

- [Live results](blossom-spike-results.json)
- [CDN absence checks](blossom-spike-cdn-cleanup.json)
