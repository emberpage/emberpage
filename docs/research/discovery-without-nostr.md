# Does Ember Page need Nostr?

Researched 2026-10-11. This note concerns discovery architecture only. No production changes, uploads, or relay publications were made.

## Answer

**Nostr relays are not required to upload or download a Blossom file.** They are a practical option for public discovery and votes. Blossom alone does not provide the global popular article directory required by the current reader experience.

Keep these responsibilities separate:

- **Blossom:** store the existing encrypted article JSON and retrieve its exact bytes using a known SHA-256.
- **Discovery:** map an original article URL/hash to a blob reference and expose public listings, requests, and signed votes.
- **Optional aggregator:** independently index and rank public metadata. Readers must remain usable when it is absent.

This separation follows Blossom's HTTP blob endpoints and Nostr's signed event/query protocol; it does not imply any provider guarantees retention, free access, or universal admission. [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md), [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)

## What Blossom alone provides

GET `/<sha256>` retrieves a known blob; HEAD can check it without downloading the body. PUT `/upload` stores bytes and returns a descriptor containing URL, SHA-256, size, MIME type, and upload time. A file hash verifies bytes, not the article's provenance or popularity. [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md)

An original page's URL hash is not its Blossom blob hash. Ember Page encrypts using a random IV, so the same article can produce different encrypted files. Knowing the original URL therefore does not locate the blob: the reader needs a supplied descriptor or a discovery mapping. This follows the current packet implementation in `src/core/crypto.js`, not a Blossom lookup feature.

BUD-12 describes optional listing by **a known uploader pubkey**. It marks that listing endpoint unrecommended. It does not specify a cross-server, global article search or vote directory. A list of uploads by one known key cannot reveal all other uploaders or rank community copies. Implementations may require authorization; do not assume anonymous enumeration. [BUD-12](https://github.com/hzrd149/blossom/blob/master/buds/12.md)

Blossom authentication may use Nostr signing keys and signed kind-24242 events, supplied in the HTTP Authorization header. Those tokens authorize actions on the blob server; they do **not** need publication to a Nostr relay. A program can generate/sign them locally and use HTTP only. Requirements depend on the selected server. [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md)

## Alternatives

| Design | What the reader can do | What must be built or operated |
| --- | --- | --- |
| Blossom + share links | Open a supplied blob reference, verify/decrypt, save locally. | Encode the original URL and blob reference in a share link or importable descriptor. No global discovery service. |
| Blossom + selected uploader lists | Browse known contributors where the provider permits listing. | Maintain an explicit contributor list and merge provider-specific results. No complete global discovery. |
| Blossom + new HTTP directory | Browse public listings, find URL/hash mappings, exchange votes/requests. | Define and run the directory's writes, queries, signatures, abuse controls, retention, and availability. |
| Blossom + small Nostr events | Query public metadata by indexed tags, find blob references, exchange signed votes/requests. | Define the Ember Page event contract, validate it, and qualify selected relays. |
| Blossom + existing Waku metadata | Retain current metadata/request/vote exchange while moving article bodies off Waku. | Define blob references in the current catalog. Existing Waku admission and Store limitations remain. |

The first two alternatives deliberately reduce the product's discovery capability. A new HTTP directory can satisfy discovery, but if all readers require it, it is a mandatory service. Renaming it an “optional aggregator” does not remove that dependency. Multiple directories could reduce dependence on one operator, but introduce another protocol and deployment project.

Nostr already defines signatures, event acceptance/rejection, indexed single-letter tags, time filters, and subscription closure. Its signatures authenticate keys, not independent humans; public relays can reject events or return partial results. These facilities make it a reasonable metadata carrier, not a fundamental requirement of encryption or file storage. [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)

## Recommendation for the current requirements

If the reader must keep a public popular list, URL-based discovery, requests, and community votes while the separate aggregator stays optional, **retain one public metadata transport**. Small Nostr events are a plausible choice with Blossom bodies; existing Waku metadata is another. Do not operate both as automatic fallbacks.

If the user instead chooses “cache privately and share an explicit link,” remove global discovery and votes from scope. Blossom HTTP plus locally signed upload authorization is then sufficient; a Nostr relay client adds no required capability.

For either design, keep the single existing article format. Readers must download, authenticate, bounded-decompress, and inspect a candidate before showing it as an eligible public copy. The optional aggregator stores only metadata and cannot establish body validity or availability. Selected-provider behavior still needs direct validation; no protocol choice alone establishes retention or an entitlement to free storage.
