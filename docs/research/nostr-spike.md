# Nostr-only transport spike

Observed 2026-10-11. This was an isolated live experiment, not a transport migration.

## Result

**Nostr-only can carry Ember Page's existing encrypted article packets with substantially more headroom than the current public Waku limit, on selected relays. Public relays are still not interchangeable or a storage guarantee.** Damus accepted and returned a 545,312-byte signed message. Primal accepted a 138,956-byte message but rejected the larger one despite advertising a 1,000,000-byte message limit. nos.lol rejected the representative article.

The simplest viable shape remains one transport: small signed catalog events for discovery, with article packets in separate signed events fetched by exact event ID. The independent aggregator would query only catalog/request/vote metadata; the extension would decrypt and apply its existing body filters before displaying any popular candidate. No Blossom provider, chunking, alternate article representation, or automatic relay fallback was introduced.

## What actually ran

Historical harness retired with the encrypted packet format, [live results](./nostr-spike-results.json), and [read-only follow-up](./nostr-spike-index-followup.json).

The harness launched a disposable Chrome for Testing MV3 extension with locally bundled code and a restrictive WebSocket CSP. It reused production `encryptArticle`, authenticated gzip/AES-GCM decoding, `filterCandidates`, sanitization, and real browser DOM inspection. Schnorr signing and verification used the already installed Noble dependencies. Production extension files, dependencies, IndexedDB, and the separate Waku aggregator were untouched.

Three synthetic articles were created using high-entropy printable text, without envelope padding. They exercised small transport messages, a packet similar in size to the previously tested Wikipedia copy, and nearly the 500,000-byte plaintext article limit. Synthetic text exercises transport and existing filters; this was not another image capture or visual reader test.

| Fixture | Article JSON bytes | Encrypted packet bytes | Complete signed publication bytes | Existing candidate filters |
| --- | ---: | ---: | ---: | --- |
| Tiny | 550 | 708 | 1,276 | Excluded: insufficient visible text |
| Representative | 126,410 | 138,388 | 138,956 | Passed |
| Near article limit | 498,404 | 544,744 | 545,312 | Passed |

Each relay received three independent body probes, seconds apart. Damus and Primal each received one small catalog event after an eligible body was retrieved and verified; nos.lol received none. Events were explicitly labeled synthetic, had a unique experiment namespace, used temporary regular kinds 8964/8965, and requested expiry after 15 minutes. These kinds are provisional, not assigned Ember Page standards. No real article was uploaded, no secret key or body is stored in the results, and temporary browser profiles were removed.

## Live relay observations

| Relay | Tiny | Representative | Near article limit | Catalog |
| --- | --- | --- | --- | --- |
| Damus | Accepted and retrieved; client excluded | Accepted, retrieved, signature/decryption/DOM passed | Accepted and retrieved by exact ID; signature/decryption/DOM passed | 1,042-byte message accepted and retrieved through indexed metadata query |
| Primal | Accepted and retrieved; client excluded | Accepted, retrieved, signature/decryption/DOM passed | Rejected: `invalid: event too large: 545302` | 1,042-byte message accepted and retrieved through indexed metadata query |
| nos.lol | Accepted and retrieved; client excluded | Rejected: `invalid: event too large: 138946` | Connection closed with code 1006; no acceptance confirmed | Not published: no eligible body available |

Exact-ID and indexed queries used fresh WebSocket connections after publication. Returned bodies had their Nostr IDs/signatures verified, then were authenticated/decrypted, compared with the original articles, and inspected with the real candidate filters. This establishes observed end-to-end delivery, rather than relying on acknowledgment alone.

Primal's representative body remained retrievable at about 103 seconds. Damus's scheduled delayed connection failed; a separate disposable MV3 profile then successfully fetched and validated its large body at about 112 seconds and its representative body at about 131 seconds. The initial connection failure does not establish data loss.

Damus's large-body discovery was inconsistent: combined kind/namespace/URL-hash queries returned EOSE with no matching event, including the final follow-up around 161 seconds; a namespace-only query did return that large event. Exact-ID retrieval succeeded. The cause was not established. Small catalog queries worked, supporting metadata discovery followed by exact-ID body retrieval; the spike does not certify large-body tag discovery as reliable.

## Security and compatibility checks

Local checks rejected a forged signature, altered ciphertext, correctly re-signed altered ciphertext, expired packet, and wrong article URL. The tiny article was successfully transported but still excluded by the body filter. These distinguish signature verification, packet integrity, and display eligibility. Signed content alone is insufficient for inclusion.

The same packet and article format worked unchanged. Transport experiments do not invalidate existing Waku records or local copies. A future migration would still need a deliberate policy for retrieving records from the old network; Nostr does not automatically import Waku data. Signatures prove key control, not publisher ownership, factual accuracy, or one human per vote.

## Practical decision

Proceed with Nostr-only as the next transport implementation candidate. Keep catalog metadata separate from inline packet events, preserve explicit cache/share/read actions and failure states, and continue filtering all bodies before visible inclusion. Before switching the extension, select a fixed relay policy and an enforced full-event byte ceiling based on qualification, rather than the advertised WebSocket limit. This test establishes acceptance at measured sizes, not the precise maximum accepted size or a production workload agreement.

Availability was observed for minutes, not 24 hours. Expiration remains a client validity rule: NIP-40 allows relays to retain expired events indefinitely. Damus also documents intentionally wiping its database during an upgrade. Neither a successful test nor encryption guarantees continued free service or remote erasure. [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md), [Damus operator statement](https://damus.io/the-second-nukening/).

The advertised message size can differ from the normalized event limit. strfry's NIP-11 response derives `max_message_length` from its WebSocket setting, while event size has a separate setting. Deployed values cannot be inferred from source defaults. [NIP-11 implementation](https://github.com/hoytech/strfry/blob/master/src/apps/relay/RelayWebsocket.cpp), [configuration](https://github.com/hoytech/strfry/blob/master/strfry.conf).

## Follow-up: client-side chunking

For a fresh transport implementation, Nostr on Primal is the best tested starting point for a chunking experiment: representative-body exact-ID retrieval, indexed catalog discovery, and delayed readback all passed. Waku chunking would be the smallest change to the existing adapter, but would retain its larger SDK and temporary, nonguaranteed Store dependency. Chunked publication and multi-chunk retrieval have not yet been tested on either service; successful single-event publication is not qualification of a burst of chunk writes.

Keep chunking outside the article format: extract, sanitize, capture WebP images, compress, and encrypt exactly as now; serialize that complete packet into bytes; split those bytes into bounded chunks. Use a single signed manifest/catalog event containing transport version, ordered chunk event IDs, exact packet byte count, SHA-256 of the entire serialized packet, normal article identity/metadata, and expiry. Publish and confirm chunks first, then the manifest. Fetch chunks by exact ID on demand; discovery indexes need cover only the small manifest. A one-chunk article uses the same contract, avoiding a second representation or automatic fallback.

Readers must validate the manifest, unique bounded IDs, author/signatures, count, expiry, per-event size and cumulative encoded/decoded byte budgets before assembling. Verify assembled byte count and whole-packet hash before existing packet validation, bounded decompression, authenticated decryption, sanitization and candidate filtering. Do not display incomplete articles in the popular list. This protects against swapped/reordered/mixed fragments and unbounded assembly, but signatures and structural filters cannot establish article truth or prevent Sybil voting.

The article schema, image extraction, plaintext payload hash used for votes/deduplication, and whole-article IndexedDB eviction can remain unchanged. Keep incomplete fragments in bounded temporary memory rather than introducing persistent per-chunk IndexedDB records. Version the transport manifest independently; extractor or image-quality changes do not require a new chunk format. Old Waku records remain readable through their existing decoder but are not automatically copied to Nostr.

The UX can retain its existing buttons and progress/failure state. Sharing success requires the manifest and all chunks; failures retain the local copy. Public storage has no atomic multi-event transaction, so orphan chunks and later missing fragments remain possible. Chunking adds events, query traffic and rate-limit exposure; it removes a per-message ceiling without lifting article/storage budgets or establishing retention. A conservative complete-event target around 60 KB merits a live chunking test; base64 encoding arbitrary byte chunks adds about one-third overhead and must be included in that budget.

## Historical evidence

The encrypted-packet harness was retired with the first-release rewrite. These observations remain historical; use the [current plain-JSON transport report](first-release-live.md) and `scripts/spikes/first-release.mjs` for the current contract.

- [Live results](nostr-spike-results.json)
- [Index follow-up](nostr-spike-index-followup.json)
