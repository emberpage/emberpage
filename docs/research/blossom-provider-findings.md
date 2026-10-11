# Blossom providers for MeshCache article packets

Checked 2026-10-11, approximately 08:20–08:27 UTC. Sources below are protocol specifications, operator sites, operator source code, and read-only HTTP responses. No upload, mirror, deletion, account creation, signing, or publishing was performed.

## Finding

**Subsequent live test:** the user authorized a bounded Primal Blossom spike. Exact encrypted JSON article packets of 137,936 and 482,816 bytes were accepted and retrieved with matching hashes and existing article checks; a separate 2 MiB JSON capacity probe also round-tripped. Deletion acknowledgments timed out, while all tested serving URLs subsequently returned 404. See the [live spike report](./blossom-spike.md). The research below predates that test; production workload policy and retention remain unqualified.

**No examined public service is yet confirmed to accept this workload under its deployed rules and policies. Primal is a technical candidate for the exact existing encrypted JSON envelope, with important policy and deployment unknowns.** Do not turn protocol-level binary support into a provider guarantee.

The proposed bytes are `JSON.stringify(packet)`, whose payload is gzip-compressed then encrypted, with ciphertext encoded inside JSON. They are not a raw ciphertext file or a gzip file. A local packet made by the current `encryptArticle()` and piped to macOS `file --mime-type -` reported `application/json`. No network upload occurred. That supports investigating Primal's JSON path without changing MeshCache's packet format; it does not prove its production detector or account rules will accept a 138,240-byte or 680,000-byte packet.

## Providers and policy

| Endpoint / operator | Exact encrypted JSON envelope | Opaque `application/octet-stream` bytes | Published limits / retention | Assessment |
| --- | --- | --- | --- | --- |
| [blossom.primal.net](https://blossom.primal.net/) / Primal | Source explicitly maps JSON to `.json`; production acceptance untested | Source explicitly rejects detected octet-stream | Official app source advertises free 1 GB total / 100 MB file; premium 10 GB / 1 GB file | Technical candidate for JSON; not established for arbitrary files or this use policy |
| [blossom.nostr.build](https://blossom.nostr.build/) / nostr.build | Not among advertised types | Not promised | Blossom service: 20 MiB free / 100 MiB paid per upload; no advertised free expiry | Not a justified free article-storage default |
| [blossom.band](https://blossom.band/) / nostr.build | Same operator's advertised media/document policy | Not promised | Same free/paid Blossom limits; paid storage quotas apply | Not an independent mirror operator |
| [blossom.oxtr.dev](https://blossom.oxtr.dev/) / operator policy unidentified | Root describes blob upload; no deployed type rule found | No explicit acceptance promise found | No operator quota, pricing, retention, abuse, or service commitment found | Operational endpoint, insufficient evidence to select |

These are four inspected endpoints across three operator contexts, not four independent retention domains.

### Primal: header example versus detected bytes

The [operator README](https://github.com/PrimalHQ/primal-blossom-server) shows `Content-Type: application/octet-stream` for `PUT /upload`. Its implementation at commit `030a75b6659daaf6f38f3eb0a7d843bd399ee049` instead determines type using [`file --mime-type`](https://github.com/PrimalHQ/primal-blossom-server/blob/030a75b6659daaf6f38f3eb0a7d843bd399ee049/src/lib.rs#L1118-L1130), applies a [detected-type rejection gate](https://github.com/PrimalHQ/primal-blossom-server/blob/030a75b6659daaf6f38f3eb0a7d843bd399ee049/src/lib.rs#L724-L727), and [rejects octet-stream while mapping JSON](https://github.com/PrimalHQ/primal-blossom-server/blob/030a75b6659daaf6f38f3eb0a7d843bd399ee049/src/lib.rs#L1076-L1095). An HTTP MIME header alone cannot override this. Exact packet JSON is a plausible path; random encrypted bytes are not.

[Official Primal application source](https://github.com/PrimalHQ/primal-web-app/blob/main/src/pages/Premium/PremiumHighlights.tsx#L38-L111) lists premium at $7/month or $75/year alongside the quotas above. These are published product values, not a measured anonymous Blossom entitlement. [Primal terms source](https://github.com/PrimalHQ/primal-web-app/blob/main/src/pages/Terms.tsx#L48-L100) describes free images/videos, best-effort storage with older media evicted, changeable limits, prohibited infringing/illegal content, and a seven-day grace after paid expiry before excess storage is removed. It does not establish permission for an automated encrypted article cache. Live SPA terms/pricing did not provide readable policy text in this inspection; official source may lag deployment.

Primal's [deletion implementation](https://github.com/PrimalHQ/primal-blossom-server/blob/030a75b6659daaf6f38f3eb0a7d843bd399ee049/src/lib.rs#L548-L602) requires signed delete authorization and uploader association. Removing one uploader's association does not necessarily remove shared storage if another uploader remains. No enforced 24-hour deletion option was established.

### nostr.build and blossom.band

The [Blossom operator page](https://blossom.band/) advertises free image/audio/video uploads, with paid PDF/SVG/ZIP support, signed upload/mirror/delete actions, and no free file-count limit or expiry. Mirrors are limited by remaining paid storage or the free 20 MiB limit. Annual tiers are $18/5 GB, $69/25 GB, $120/100 GB, and $240/500 GB. A paid lapse does not immediately erase uploads. The separate [nostr.build media product](https://nostr.build/) advertises 450 MB files; this must not replace the Blossom endpoint's documented 100 MiB cap.

[Terms](https://account.nostr.build/tos) prohibit free-service bots/scripts, excessive or systematic storage, and external CDN use; free uploads can be removed. An extension's automatic signed request does not make this workload authorized. [Privacy policy](https://account.nostr.build/privacy) describes indefinite upload logs linking content hash/URL to IP, public key, user agent and referrer. Deletion can leave backup/CDN copies temporarily. Encrypted JSON permission, throughput quotas, and a guaranteed 24-hour purge remain unestablished.

### Oxtr

The [operator endpoint's root page](https://blossom.oxtr.dev/) advertises blob GET/HEAD/PUT, uploader lists, DELETE and mirroring. That generic description and working CORS do not prove arbitrary encrypted bytes are accepted. No operator-owned service policy, production configuration, paid/free quota, retention guarantee, or deletion semantics were identified. Do not substitute the upstream server project's example defaults for this deployment's settings.

## Read-only API observations

Requests used an artificial Chrome-extension Origin. `OPTIONS /upload` requested PUT and `authorization,content-type,x-sha-256`. Representative unsigned `HEAD /upload` supplied `X-Content-Type`, `X-Content-Length: 680000`, and a placeholder 64-zero SHA-256; no body or authorization event was sent.

| Endpoint | OPTIONS result | Representative JSON / octet-stream HEAD result |
| --- | --- | --- |
| Primal | 200; origin `*`; methods GET/PUT/DELETE; headers `Authorization, *` | 400 for both; no CORS header or X-Reason observed. Plain unsigned HEAD without metadata had returned 401 |
| nostr.build | 204; origin `*`; methods include HEAD/PUT/DELETE; explicit auth/content/X headers | 401 for both; reason: authorization missing; origin `*` |
| blossom.band | Same observed preflight as nostr.build | 401 for both; authorization missing; origin `*` |
| Oxtr | 200; origin `*`; methods GET/PUT/DELETE/HEAD; allow headers `*` | 401 for both; authorization event required; origin `*` |

These observations are evidence of live endpoints and preflight behavior, **not accepted MIME types, authenticated quota, or upload success**. Primal omits HEAD in its returned preflight methods, so a browser HEAD optimization can fail even where PUT preflight is available. Error-response CORS also needs a real browser check. All four `GET /.well-known/blossom.json` probes returned 404; this path did not reveal a policy document. Root and upload endpoint links above identify the observed APIs.

## Protocol, browser access, and account UX

[BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md) requires byte-preserving binary upload and a hash/size/type descriptor, but explicitly allows unsupported-media, payment, quota and policy rejection. Use `/upload`, not `/media`, which can transform media. Hash the exact serialized envelope bytes for Blossom; MeshCache's inner plaintext payload hash is a different identity.

[BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md) uses signed kind-24242 Nostr authorization: action, expiration, blob hash and optionally server scope. Current specification uses unpadded base64url. Older deployed implementations may differ. A locally generated signing identity can avoid a signup screen where the operator permits it; authorization is still a linkable public-key identity. Nostr's [signature format](https://github.com/nostr-protocol/nips/blob/master/01.md) differs from MeshCache's existing P-256 rating keys, so those keys cannot simply be reused.

[BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md) specifies permissive browser CORS, including redirect destinations; current probes establish only part of that surface. [Chrome documentation](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) distinguishes CORS-limited requests from privileged extension requests with host permissions. `activeTab` on the publisher is not permission for a storage provider. Narrow provider permissions, redirect destinations, credentials-omitted fetch behavior and error paths need explicit browser verification; this research makes no manifest change.

[BUD-06](https://github.com/hzrd149/blossom/blob/master/buds/06.md) offers HEAD metadata preflight but explicitly does not guarantee subsequent PUT success. The unsigned failures above cannot settle policy.

## Expiry, mirrors, and costs

The authorization event's expiration expires the token, **not the stored blob**. No examined provider established client-selected absolute 24-hour storage expiry. [BUD-01's optional Sunset header](https://github.com/hzrd149/blossom/blob/master/buds/01.md#sunset-header-optional) is advisory, not guaranteed erasure. MeshCache can reject old pointers locally but cannot thereby promise remote deletion.

[BUD-04](https://github.com/hzrd149/blossom/blob/master/buds/04.md) allows signed server-side mirrors and policy rejection. [BUD-12](https://github.com/hzrd149/blossom/blob/master/buds/12.md) defines deletion endpoints; it does not make deletion global across mirrors, caches or other owners. More providers increase requests and expose upload identity/IP to more operators. No cost-per-article, sustained free throughput, or abuse-safe mass-storage commitment was established.

## Decision and remaining evidence

For the current exact encrypted JSON packet, investigate Primal first **as a candidate**, not a selected guaranteed backend. Its source type gate is compatible with locally detected JSON, but its free media policy, anonymous key eligibility, production detector, exact limits and retention need confirmation. nostr.build's published free-use restrictions already conflict with systematic article storage. Oxtr lacks enough operator policy evidence.

Before choosing any provider, obtain operator confirmation that encrypted packet JSON and this automated workload are permitted; establish per-key and per-IP quotas, bandwidth charges and retention; then separately authorize a bounded disposable upload/read/hash/delete test using the exact packet bytes and a Chrome extension origin. A HEAD success alone is insufficient. No such mutation was performed for this research, and no extension dependency or implementation was changed.
