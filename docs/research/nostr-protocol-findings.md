# Nostr and Blossom for Ember Page

Researched 2026-10-11. This is a design assessment, not an implemented migration or a provider availability test. Only primary specifications and maintainer source were consulted. No events or blobs were published, and no dependencies were added.

## Recommendation

The initial assessment below considers Nostr metadata with Blossom files. The later Nostr-only assessment supersedes a blanket recommendation to add Blossom: qualify inline Nostr storage first because it has fewer moving parts. Nostr for small signed discovery events, with Blossom for the existing encrypted article file, separates article size from relay message size. The decisive difference is separation: relay message limits constrain metadata, while a separately selected blob provider constrains the article. This is an architectural inference from [NIP-94 file metadata](https://github.com/nostr-protocol/nips/blob/master/94.md) and [BUD-02 uploads](https://github.com/hzrd149/blossom/blob/master/buds/02.md), not a guarantee that a particular public service will accept Ember Page files.

Keep the single HTML/WebP article representation and existing gzip/AES-GCM packet. Do not introduce chunking, alternate article formats, or automatic transport fallbacks. A migration would be one explicitly chosen transport, requiring separate acceptance tests against selected relays and blob providers. Keep the separate aggregator metadata-only; no extension-to-aggregator integration is proposed here.

## Smaller alternative: keep Waku metadata, move bodies to Blossom

Waku + Blossom is a narrower change: preserve Waku catalog/request/vote operations and their existing signatures, and replace the catalog's body reference with the exact encrypted JSON blob descriptor. The body no longer needs to fit a 150KiB Waku message, while metadata remains small. This preserves the same proofless admission and short/uncertain Store retention limitations described below. Nostr + Blossom changes discovery and signing as well, but provides directly indexed signed-event filters and explicit relay rejection messages. Neither option improves blob retention by itself. This is a comparison of proposed application designs, not a protocol guarantee.

## Discovery and relay behavior

Nostr signs events with Schnorr/secp256k1. Queries can combine kinds, authors, single-letter tag filters, time ranges, and initial result limits. An indexed Ember Page URL-hash tag permits targeted lookup without scanning every article. An initial query ends at `EOSE`, but its subscription remains live until closed. Event acceptance is acknowledged with `OK`, including a rejection reason. These mechanisms do not promise complete results, replication to other relays, or durable storage. [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)

Use bounded local validation and close subscriptions when each manual extension operation completes. Query a curated set of explicitly configured relays; deduplicate event IDs across them. The aggregator can maintain a rolling metadata subscription or poll independently. An empty answer means that the queried relays supplied no matching usable event, not that the article is absent everywhere.

Do **not** use kind 30078 or 78 for public discovery. Current NIP-78 explicitly describes private application data and recommends authenticated-owner-only reads. Reusing these kinds would make discovery depend on relays ignoring that recommendation. [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md)

## Proposed concrete contract

The following conventions are a proposal for Ember Page, not an existing interoperable Ember Page NIP. Existing kinds retain their specified meanings; additional tags are application metadata. Provider acceptance of the chosen event kinds and tags must be checked before implementation.

### Encrypted article blob

Upload the exact UTF-8 JSON bytes of `{header, crypto}` produced by the current v1 packet implementation, as `application/json`. The header contains `version`, `urlHash`, `payloadHash`, millisecond `timestamp`, and authenticated `encoding:"gzip"`; crypto contains base64 `encryptedData` and `iv`. Do not modify key derivation, authenticated-header serialization, or plaintext hashing. Retain 500,000-byte decompressed plaintext and 680,000-byte envelope limits as client limits. These are Ember Page limits, not Blossom limits.

Compute `blobHash = SHA256(exact uploaded bytes)`. This hash is **different** from `payloadHash = SHA256(raw article JSON)`. The former verifies storage transfer; the latter verifies authenticated article content. Never substitute one for the other. Receivers bound the HTTP download, verify blobHash, validate the packet, decrypt and bounded-decompress, verify payloadHash, then sanitize for display. Repeated encryption can yield different blob hashes for the same plaintext payload.

Blossom stores blobs by their SHA-256 and serves them with HTTP GET/HEAD. Uploads use PUT `/upload`; the server must hash the exact received bytes and must not alter them. The returned descriptor includes URL, hash, size, MIME type, and upload timestamp. Verify that descriptor against locally computed values before announcing the file. [BUD-01 retrieval](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02 upload](https://github.com/hzrd149/blossom/blob/master/buds/02.md)

### Article announcement: kind 1063

Use a NIP-94 file metadata event. `content` is a plain-text description/title, and the tags identify the actual encrypted JSON file. Example template, before Nostr signing:

```json
{
  "kind": 1063,
  "created_at": 1791734400,
  "tags": [
    ["t", "emberpage-article"],
    ["url", "https://blob.example/HEX_BLOB_HASH.json"],
    ["m", "application/json"],
    ["x", "HEX_BLOB_HASH"],
    ["size", "123456"],
    ["u", "HEX_URL_HASH"],
    ["r", "https://example.com/article"],
    ["emberpage-version", "1"],
    ["emberpage-payload", "HEX_PLAINTEXT_PAYLOAD_HASH"],
    ["emberpage-captured", "1791734400000"],
    ["emberpage-byline", "A writer"],
    ["expiration", "1791820800"]
  ],
  "content": "Article title"
}
```

`url`, `m`, `x`, and `size` follow [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md). `u` is a **Ember Page-specific URL-hash convention**, not a claim that Nostr standardizes it. `r` is the disclosed original link in this application. Multi-letter `emberpage-*` fields are read after retrieval; do not depend on relays indexing them. Publish an announcement only after the explicit share operation receives a successful blob upload response.

Exact lookup proposal:

```json
{"kinds":[1063],"#t":["emberpage-article"],"#u":["HEX_URL_HASH"],"since":1791734400,"limit":100}
```

Public browsing uses the same kind/type filter without `#u`. Recompute URL normalization/hash, require all known fields, reject duplicate conflicting singleton tags, and verify event signatures before metadata enters the index. Title/byline remain claims by the sharing key, not proof of the original publisher. Rank only locally verified votes; optional remote score/category/rating fields cannot influence ranking. Apply existing bounds, project only known fields, and ignore bounded optional metadata. Reject unsupported packet or application major versions; no negotiation framework is needed.

The extension reader must download and verify each candidate it intends to display, then run the existing content eligibility filters before adding it to the visible popular list. An authentic announcement can still name an unavailable, corrupted, tiny, or unusable article. The separate metadata-only aggregator cannot perform those body checks and must not assert reader eligibility from metadata alone. Pin a selected read to the verified payloadHash; do not silently substitute another copy or version.

### Requests: kind 1

Use an ordinary plain-text note such as `Please share: Article title`, tagged `t=emberpage-request`, `u=urlHash`, `r=normalizedURL`, `emberpage-version=1`, and `expiration=requestTime+86400`. This request interpretation is Ember Page-specific; kind 1 itself remains a text note. It does not reserve a new globally assigned kind. Query kind 1 plus the request hashtag and optional `#u`; validate URL/hash and the bounded title before accepting a request. Canonical request identity remains URL hash, with newest timestamp per requester and a bounded aggregate list.

### Votes: kind 7

Use NIP-25 reactions with `content:"+"` or `"-"`, an `e` tag naming the announcement/request event, and a `p` tag naming that event's signer. Add `t=emberpage-vote` and a 24-hour expiration. This authenticates the reaction to a specific event. [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md)

For Ember Page article ranking, resolve that referenced announcement from already verified metadata and map it to the plaintext payloadHash. Count at most one latest valid vote per `(pubkey, scope, canonical target)`, across duplicate announcements and relays; break equal-time ties deterministically by event ID. Never trust a voter-supplied target hash without the verified reference. Request votes map to the verified request's URL hash. Missing referenced metadata means an unresolved vote, not permission to fetch/decrypt an article in the aggregator. This mapping is application ranking policy, not a Nostr consensus rule.

A signature proves key control, not one human or one independent copy. Cheap new keys make votes Sybil-vulnerable. Pubkey deduplication and rate limits reduce accidental repetition; they do not establish independent-user consensus. Nostr's key-generation API makes this limitation explicit in practice. [nostr-tools signing source](https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts)

## Expiration, provider policies, and privacy

NIP-40's expiration tag uses Unix seconds. Clients should ignore expired events, but relays may retain them indefinitely and third parties can copy them. It is not an erasure or privacy guarantee. Apply Ember Page's 24-hour validity locally regardless of relay behavior; Blob retention needs its own provider policy and is not controlled by an event's expiration. [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md)

NIP-11 optionally advertises relay capabilities and restrictions: complete UTF-8 WebSocket message size, content character limit, query limits, timestamp windows, proof of work, authentication, payment, and restricted writes. Omitted fields do not mean unlimited service. Measure the final `["EVENT", signedEvent]` bytes, not just content. NIP-11 is advisory capability information; a server's current acceptance response remains authoritative. [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md)

Blossom has no protocol-wide promise that a 680KB JSON file is accepted or retained. Its specified responses include size/type rejection, payment, authorization, and rate limiting. Optional HEAD `/upload` can preflight hash/type/size, but a successful preflight does not guarantee the later upload. Browser JavaScript cannot manually supply `Content-Length`; provider testing must include actual browser PUT behavior. [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md), [BUD-06](https://github.com/hzrd149/blossom/blob/master/buds/06.md)

Where authentication is required, current BUD-11 uses a signed kind 24242 token, base64url without padding in `Authorization: Nostr ...`. Scope the token to the server domain and exact blob hash, use a short expiration, and sign only the explicitly authorized operation. Tokens are HTTP authorization, not relay discovery events. [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md)

Blossom specifies cross-origin headers, but deployed server compliance still needs browser verification. Use a curated HTTPS provider list and bounded requests; do not fetch arbitrary announcement URLs in the aggregator. Reader downloads require host permission/CSP review and redirect handling. Metadata can advertise a blob without proving it still exists. A metadata-only dashboard must say “announced” or “indexed”; even a successful HEAD would establish only availability at the time checked. [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md)

Neither transport provides uploader anonymity. A Nostr relay sees connection IP, signing pubkey, and public metadata; a Blossom server sees upload connection IP, bytes, and any authorization key. A public original URL makes URL-derived encryption available to everyone who reads the announcement. It protects packet integrity and transport content organization, not secrecy against someone who knows the URL. URL hashes also allow dictionary checks; the separate aggregator must not claim zero knowledge merely because some fields are hashes.

## Browser signing and implementation suitability

Current maintainer README exports `generateSecretKey`, `getPublicKey`, `finalizeEvent`, and `verifyEvent` from `@nostr/tools/pure`; `SimplePool` is from `@nostr/tools/pool`. The repository name remains `nostr-tools`, while current installation docs use JSR `@nostr/tools`. Do not assume an older npm `nostr-tools` release has identical exports. Pin and inspect the actual selected release before implementation. [Maintainer README](https://github.com/nbd-wtf/nostr-tools/blob/master/README.md)

Source confirms `querySync` is asynchronous despite its name, and pool publication returns one promise per relay. Preserve individual acknowledgement/rejection outcomes rather than equating socket connection with publish success. A query convenience API may resolve partial/empty results after relay closure; retain network status so “no copy” is not conflated with “all relays unavailable.” [Pool source](https://github.com/nbd-wtf/nostr-tools/blob/master/abstract-pool.ts)

`verifyEvent` caches verification on its event object; subsequent mutation is not rechecked. Verify fresh parsed wire objects and project immutable validated metadata. Do not attach a cached verified marker to altered remote fields. [Signing/verifying source](https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts)

For simple extension UX, an extension-owned persistent signing key avoids requiring a second wallet/signer extension, but requires honest local-key storage and recovery decisions. Existing P-256 vote keys cannot sign Nostr events: Nostr uses Schnorr/secp256k1. NIP-07 offers optional `window.nostr.getPublicKey()` and `signEvent()` in a webpage; it is not guaranteed in an extension popup/offscreen worker. Do not add a multi-signer abstraction just to use this option. [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md), [Nostr signature specification](https://github.com/nostr-protocol/nips/blob/master/01.md#events-and-signatures)

## Comparison with current public Waku

| Property | Current Ember Page on public Waku | Proposed Nostr + Blossom |
| --- | --- | --- |
| Article size | Entire encoded message must fit 153600 bytes. | Small relay announcement; blob provider independently limits file size. |
| Discovery | Exact URL-hash content topic; separate global metadata/request/vote topics. | Kind + indexed type/hash tags; selected relay queries. |
| Authentication | Article AES-GCM/hash validation; separate P-256 vote signature. | Signed Nostr metadata and votes; unchanged AES-GCM/hash validation for downloaded blob. |
| Retention | Network recommends at least 12h Store; no application-level 24h guarantee. | Relay and blob retention are separate provider policies; 24h client validity is local. |
| Admission/rates | RLN or discretionary proofless bandwidth; local throttle is not RLN. | Relay auth/payment/PoW/rates and separate blob auth/payment/quota policies. |
| Availability | Relay acknowledgement does not establish future Store retrieval. | Blob upload and relay acknowledgement do not establish future blob retrieval. |
| Aggregator | Metadata index only. | Metadata events/votes/requests only; no blob fetch or decryption. |

Waku's published network specification caps the **full protobuf message** at 150KB, recommends average messages around 4KB, and recommends Store retention of at least 12 hours. Proofless service is discretionary; Store persistence expects valid RLN proofs. Specified membership quota is 100 messages per 600-second epoch, not a universal free-client entitlement. Current Ember Page does not generate RLN proofs. [Waku network specification](https://dev-lip.logos.co/messaging/standards/core/64/network.html), [nwaku concrete 150KiB default](https://github.com/logos-messaging/logos-delivery/blob/master/logos_delivery/waku/waku_core/message/default_values.nim)

In this implementation session, a live public relay accepted a 4538-byte synthetic message, rejected a 339118-byte message with status 420 and the explicit 153600-byte limit, then accepted another small message. That is session evidence, not a new test performed for this research. The installed JS SDK's 1MiB utility check did not describe the deployed public service cap. Nostr should likewise be evaluated by real selected-provider responses, never by a library's permissive schema alone.

## Acceptance criteria before choosing a migration

1. Read selected relays' NIP-11 documents and provider terms; establish support for public kinds 1063/1/7, indexed `#t`/`#u`, and bounded historical queries. Do not assume automatic relay-to-relay replication.
2. Privately test the full browser upload/download path with a synthetic blob: actual size/MIME admission, authorization, CORS, redirects, correct returned hash, and documented retention. A capability document alone is insufficient.
3. Test signatures, conflicting tags, replay/timestamps, duplicate votes across relays, fake unsigned ratings, malicious blob descriptors, and bounded decompression against fixtures.
4. Test partial failure: blob stored but announcement rejected, announcement indexed but blob missing, and all relays unavailable. Preserve local copies and present the failed operation accurately; no hidden republishing or fallback transport.
5. Keep the aggregator independent and metadata-only. Its indexed/rated record must not be presented as decrypted-content validation or confirmed availability.

The protocol fit is favorable, but no public Nostr relay or Blossom provider has been qualified by this research. Provider selection and retention remain the largest unresolved deployment decisions.


## Additional assessment: qualify Nostr-only inline storage first

Added 2026-10-11 after the coordinator's read-only live NIP-11 checks. The coordinator observed `max_message_length=1000000`, `max_limit=500`, and NIP-40 support at `relay.damus.io` and `relay.primal.net`; no retention duration was advertised. `nos.lol` advertised 131072 bytes. A separate read-only Python HTTP request during this assessment confirmed the nos.lol value; Damus and Primal returned HTTP 403 to that request, so their observations are attributed to the coordinator rather than independently re-confirmed here. Endpoint information is provider policy and can change. [Damus endpoint](https://relay.damus.io), [Primal endpoint](https://relay.primal.net), [nos.lol endpoint](https://nos.lol), [NIP-11 limitation semantics](https://github.com/nostr-protocol/nips/blob/master/11.md)

Given these advertised limits and the user's preference for simple code, **Nostr-only is the first candidate to qualify**. Place the existing encrypted packet JSON directly into the `content` string of a dedicated Ember Page body event. Retain separate small catalog/request/vote events. That removes Blossom HTTP upload/download/authentication, provider selection, CORS, and cross-provider partial-failure paths. It still leaves relay admission, retention, and data-transfer policy to prove. Do not implement Nostr-only plus a hidden Blossom or Waku fallback.

The protocol permits arbitrary event content and experimentation with regular kinds in the 1000–9999 range. A Ember Page-specific regular kind is therefore structurally legitimate. It would be a documented application convention, not an allocated/reserved global kind or a guarantee of public-relay acceptance. Select and check the actual number against the current kind registry and selected operators before implementation. Do not use kind 1063 for an inline article body: that kind describes a file through URL/hash metadata. Do not use private app-data kinds 78/30078 or ephemeral kinds 20000–29999. [NIP-01 kind ranges](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds), [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md), [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md)

Proposed inline body fields: `kind=K_BODY` (dedicated regular kind, number deliberately unresolved), `content=JSON.stringify(existing encrypted v1 packet)`, `t=emberpage-body`, `u=urlHash`, and `expiration=captureTimeSeconds+86400`. A separate dedicated regular catalog kind uses bounded JSON content with the current catalog fields plus `bodyEventId`, and `t=emberpage-article`, `u=urlHash`. Catalog publication follows body acknowledgement. The body event is verified by event ID/signature and existing packet authentication; a catalog entry must agree with the body's URL hash and plaintext payload hash. Pin reads to that bodyEventId and payloadHash. This is one transport with two event types, not two article formats.

The separate aggregator subscribes only to catalog/request/vote kinds. It records bodyEventId as a reference and never queries body events or decrypts packets. Extension readers fetch the referenced body event and apply all existing validation and eligibility filters before listing a candidate. An acknowledged body followed by a rejected catalog remains a failed public listing, with the local saved copy preserved. Discovery cannot presume complete relay replication.

A typical current packet under the 680000-byte envelope budget should fit a 1000000-byte message advertisement, since AES ciphertext is base64 with little extra escaping. That is a size estimate, not a universal proof: serializing the packet again as an event content string escapes quotes/backslashes, signatures/tags add overhead, and unknown optional fields could materially increase it. Measure the complete UTF-8 signed `["EVENT", event]` frame before connection/publication. Also enforce the provider's separate `max_content_length` if advertised. Do not infer the full frame size from the original packet length alone.

There is concrete reason not to equate advertised frame size with admission. The Damus-maintained strfry fork's sample configuration has separate normalized `maxEventSize=65536` and WebSocket `maxWebsocketPayloadSize=131072` limits. These are repository defaults, **not the deployed Damus limits**, but demonstrate independent checks an operator can configure. [Damus strfry sample config](https://github.com/damus-io/strfry/blob/master/strfry.conf)

Upstream strfry lets an operator install write-policy plugins that inspect events and source information, enforce pubkey/rate/spam policies, and choose accept, reject, or shadowReject. Even plugin acceptance does not override other validation checks. The deployed plugin configuration for Damus/Primal was not established by this research; Primal's published server repository describes discovery/cache services and cannot by itself prove its public relay's admission configuration. [strfry plugin specification](https://github.com/hoytech/strfry/blob/master/docs/plugins.md), [Primal server repository](https://github.com/PrimalHQ/primal-server)

The deciding acceptance test is a separately authorized synthetic inline body at representative maximum size, on the intended custom kind: relay `OK`, subsequent exact-ID retrieval, indexed hash lookup, retention observation or documented commitment, and unambiguous rejection reporting. No such publication was performed in this assessment. If selected public relays qualify, use Nostr-only and omit Blossom. If they do not, stop and choose a storage design explicitly; Blossom remains an alternative architecture, not an automatic recovery path.
