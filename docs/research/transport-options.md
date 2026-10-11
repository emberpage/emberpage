# Ember Page transport options

Research date: 2026-10-11. This is a design investigation, not a migration. Extension code and its separate local aggregator remain unchanged.

## Decision

Nostr merits evaluation, but the simplest candidate may be **Nostr alone** for our currently bounded packets, rather than immediately adding Blossom. Live relay advertisements below have more headroom than public Waku. This is a candidate for a bounded acceptance test, not a verified replacement. Nostr plus Blossom separates larger files from discovery, but public storage-provider policies introduce a separate unresolved dependency. Current Waku remains functional after the size fix.

This judgment preserves explicit sharing, a list containing only candidates that survive body validation, bounded local storage, one article format, and an independent metadata-only aggregator. It does not assume an aggregator API in the extension.

## What the protocols actually provide

Blossom defines HTTP storage of SHA-256-addressed files. Uploads to `PUT /upload` must preserve the exact bytes; file type, payment, quota and rejection policies still belong to the operator. `PUT /media` is a separate transformation endpoint and would be inappropriate for an encrypted Ember Page packet. The existing packet JSON can be uploaded as a single file without splitting images, removing formatting, or changing the article schema. Its file hash identifies the encrypted envelope bytes; the existing payload hash continues to identify the original plaintext JSON. These hashes have different purposes. [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md).

Nostr provides signed events and WebSocket queries over event kinds, authors, time ranges and indexed single-letter tags. A relay acknowledgment is that relay's acceptance. Clients choose relays; there is no promise that another arbitrary relay has the same data. A fixed small relay set would therefore be part of Ember Page's network configuration. Signatures identify the submitting key and protect event bytes, not the original publisher or factual truth. [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md).

Nostr relays have their own event-size, query, authentication, payment and write restrictions. Small metadata avoids the article-size problem but does not eliminate quotas. Its expiry extension explicitly permits indefinite storage of expired events. Blossom's optional Sunset header is advisory, and deletion support is optional. The 24-hour Ember Page expiry must remain a client rule, never a promise that network copies disappear. [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md), [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md), [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-12](https://github.com/hzrd149/blossom/blob/master/buds/12.md).

## A simple possible design

1. **Cache only for me:** retain the current private IndexedDB flow and make no transport calls.
2. **Cache for readers:** retain the reviewed article and local save; upload its exact encrypted packet JSON to one selected Blossom server; verify returned file hash and size; publish a small signed listing to the selected Nostr relays only after upload succeeds. Report file-upload and listing failures distinctly, preserving the local copy and explicit retry.
3. **Browse:** query bounded recent listings and votes; deduplicate by payload, download a bounded set of packets, verify their file hashes, decrypt and authenticate, sanitize and apply all existing candidate filters, then rank only survivors. Metadata alone is insufficient to put an entry into the extension's popular list. Network downloads need a cumulative byte budget as well as count and timeout limits.
4. **Read:** pin the selected plaintext payload hash and preserve current reader cache quotas and private-copy protection.
5. **Aggregator:** independently consume listing/request/vote metadata and compute rolling trends. It never fetches, decrypts or validates article bodies. Its metadata trends consequently cannot certify that a body passes extension filters or remains retrievable.

An extension-generated persistent Nostr key can sign listings, votes and short-lived upload authorizations. This does not inherently require a wallet, social login or external signer UI. Authorizations should be scoped to the upload action, file hash and server domain, with a short expiry. Keys still allow cross-action correlation and do not establish one human per vote. [Nostr tools](https://github.com/nbd-wtf/nostr-tools), [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md).

Public file announcements can use NIP-94 kind 1063 with Ember Page-specific schema and routing tags. Public requests and vote semantics need an explicit event contract and relay acceptance check. NIP-78 app-data kinds are unsuitable: their current specification expects private owner-authenticated access. Do not invent a supposedly standardized Ember Page kind number. [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md), [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md).

Use a selected HTTPS storage origin, bounded responses and verified file hashes; do not accept arbitrary download origins from malicious listings. Blossom specifies cross-origin headers, but actual providers and redirects must be tested from the production MV3 manifest. If host permissions are needed, restrict them to selected storage domains. Never render provider HTML or execute remote code. [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

## Alternatives and tradeoffs

| Design | Useful property | Remaining burden |
| --- | --- | --- |
| Current Waku | Already implemented and live-tested; one transport | 150 KiB public wire cap, temporary Store, proofless delivery policy |
| Nostr alone, inline encrypted packets | One transport; some current relay advertisements fit our 680 KB packet ceiling | Actual custom-event acceptance, complete signed frame size, retention and operator policy unqualified |
| Waku metadata + Blossom files | Smaller migration; bodies leave the size-limited relay | Both service types remain; Waku retention and rate policies remain |
| Nostr metadata + Blossom files | Direct signed metadata queries plus ordinary HTTP file transfer | Provider qualification, metadata relay policy, persistent signing identity |
| Custom Waku network | Operator controls deployment policy | Hosting and operations; not access to the existing public network at higher limits |
| IPFS plus discovery | Content-addressed file distribution | Someone must pin and serve files; browser routing/gateway dependencies |

The public Waku network caps the full serialized message, and gives proofless traffic discretionary service under bandwidth pressure. Its Store is not guaranteed storage. Selecting another public relay does not make a higher wire limit a reliable network contract. [Waku network](https://dev-lip.logos.co/messaging/standards/core/64/network.html), [Waku FAQ](https://docs.waku.org/learn/faq).

IPFS pinning prevents local garbage collection but requires an available provider. Its own browser guidance cautions against expecting browsers to provide data continuously. That conflicts with a lightweight explicit-action MV3 extension acting as always-on storage. [IPFS pinning](https://docs.ipfs.tech/how-to/pin-files/), [IPFS web applications](https://docs.ipfs.tech/how-to/ipfs-in-web-apps/).

## Costs and qualification

### Live Nostr relay advertisements

Read-only HTTPS requests on 2026-10-11 used `Accept: application/nostr+json`. No events were sent. These are advertised capabilities, not measured acceptance or guarantees; absent retention metadata means unknown retention.

| Endpoint | Advertised maximum message bytes | Initial query maximum | Subscriptions | Advertises NIP-40 |
| --- | --- | --- | --- | --- |
| [relay.damus.io](https://relay.damus.io) | 1,000,000 | 500 | 200 | Yes |
| [relay.primal.net](https://relay.primal.net) | 1,000,000 | 500 | 20 | Yes |
| [nos.lol](https://nos.lol) | 131,072 | 500 | 20 | Yes |

The 1,000,000-byte advertisements exceed Ember Page's existing 680,000-byte packet bound, leaving room for a bounded event wrapper. The 138,240-byte Wikipedia packet would exceed nos.lol's advertised ceiling even before the signed wrapper. Thus a generic random Nostr relay is not interchangeable with a deliberately qualified relay. Nostr-only inline bodies require a dedicated public event contract; NIP-94 describes externally retrievable files, and NIP-78 private application data is not a public-body storage shortcut. Do not silently duplicate bodies between inline and Blossom representations as fallback behavior. [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md), [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md), [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md).

In addition to WebSocket frame size, a relay implementation can impose a lower normalized event-size limit and custom write policy. An advertised large frame size therefore does not establish that a large article event will be stored. Damus's strfry fork contains separate configurable defaults, which must not be treated as its deployed configuration. Measure the complete signed frame and then verify actual acceptance and retrieval from a fresh client. [Focused Nostr-only assessment](./nostr-protocol-findings.md#additional-assessment-qualify-nostr-only-inline-storage-first).

### Blossom provider result

Four endpoints were examined across three operator contexts. **No public provider was qualified for Ember Page's workload.** Primal's source supports detected JSON, and a locally generated existing packet was detected as JSON; raw opaque ciphertext is explicitly rejected by that implementation. Its free product policy promises media, not systematic encrypted application storage. nostr.build and blossom.band share an operator; its free-service terms restrict bots/scripts, systematic storage and external-CDN use. Oxtr lacks enough published policy and retention evidence to select. Unsigned preflights failed with authorization or malformed-request responses, so they prove no upload acceptance. [Detailed provider findings](./blossom-provider-findings.md), [Primal source](https://github.com/PrimalHQ/primal-blossom-server), [nostr.build terms](https://account.nostr.build/tos).

No protocol makes storage or delivery free. Public service operators subsidize a free tier, set quotas, or charge. Self-hosting gives control but moves costs and abuse handling to us; it would be separate from the aggregator, not a reason to turn the aggregator into a body store.

Illustrative workload only: 1,000 new 100 KB packets per day imply about 100 MB of daily uploads and roughly 100 MB of live bodies under a truly enforced 24-hour retention policy. At 100 reads per article, delivery is about 10 GB/day. Provider retention beyond 24 hours increases stored bytes. This arithmetic is not a provider price quote.

The next test should evaluate Nostr-only first, because that preserves a single transport and avoids an unqualified blob host. It must establish actual custom public-event acceptance, full-frame size, fresh-client retrieval, filtering, operator policy and retention, using synthetic packets in an isolated harness. If larger bodies are needed, qualify a Blossom provider before selecting that architecture. A Blossom check must additionally establish actual MV3 upload/download, byte-for-byte retrieval and upload policy. Both designs must preserve private copies on failures and apply body filters before visible listing. No automatic provider switching, chunking, or alternate article formats are required. Until those checks pass, a full migration is premature.

See [provider findings](./blossom-provider-findings.md) and [event-contract findings](./nostr-protocol-findings.md). This initial research did not publish events. The subsequently authorized [live Nostr spike](./nostr-spike.md) did publish bounded synthetic events: Damus accepted and returned a 545,312-byte signed message; Primal accepted 138,956 bytes but rejected 545,312 bytes; nos.lol rejected the representative article. Small catalog discovery worked on Damus and Primal. These observations qualify Nostr-only as an implementation candidate, while leaving precise relay ceilings, long-term retention, and production workload policy unresolved.

### Follow-up: larger sizes

The subsequently authorized [Primal Blossom live spike](./blossom-spike.md) successfully uploaded and retrieved unchanged encrypted article JSON at 137,936 and 482,816 bytes, plus a separate 2 MiB generic JSON probe. No chunking, signup, or paid account was needed. DELETE acknowledgments timed out at 60 seconds, but all tested serving paths subsequently returned 404. Technical compatibility at those sizes is now verified; production workload permission, quotas, and retention are still unresolved.

Six additional read-only NIP-11 endpoint checks on 2026-10-11 found no advertised message limit above the existing Damus/Primal 1,000,000-byte advertisements: [relay.nostr.net](https://relay.nostr.net) 262,144 bytes; [Snort](https://relay.snort.social) 524,288 bytes and describes in-memory storage; [nostr.wine](https://nostr.wine) 524,288 bytes with payment/restricted writes; [nostr.mom](https://nostr.mom) and [0xtr](https://nostr.oxtr.dev) 131,072 bytes; [Wellorder](https://nostr-pub.wellorder.net) omits a size limit. An omitted limit is unknown, not unlimited. These are advertisements only; no events were published to these six relays.

File services have substantially larger published bounds. Primal's [official app source](https://github.com/PrimalHQ/primal-web-app/blob/main/src/pages/Premium/PremiumHighlights.tsx) lists 100 MB files/1 GB total on Free, 1 GB files/10 GB total on Premium, and 10 GB files/100 GB total on Pro. This is its media/Blossom product, not its Nostr relay event limit; permission and successful byte-preserving upload of Ember Page's encrypted JSON remain unqualified. [blossom.band](https://blossom.band/) advertises 20 MiB free/100 MiB paid, but its supported file types and service policies still matter. Cloudflare R2 [documents roughly 5 GiB single-request S3 uploads](https://developers.cloudflare.com/r2/platform/limits/) (the footnote gives 4.995 GiB); browser access via [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) requires trusted credentials and an authorization issuer. R2 adds an operated storage account and cost/abuse responsibility; it is not an anonymous public relay replacement. None of these file-service upload paths was live-tested in this follow-up.
