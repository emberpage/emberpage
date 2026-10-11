# IPFS dependency review

Final hardened browser measured 2026-10-11 at 22:46 UTC. Isolated experiment in `spikes/ipfs-dependencies`; no changes to production, browser-spike, or feed-spike manifests. Run `npm ci --ignore-scripts` followed by `npm run review` in that folder. The folder's `.npmrc` records the peer-install experiment. A clean `npm ci --ignore-scripts --no-fund` completed successfully after the baseline measurement, adding 388 packages and reproducing 11 high findings without native install scripts. The final isolated manifest additionally declares the browser's interface-datastore, DAG-PB, and UnixFS fixture dependencies; install with scripts disabled succeeded.

## Results

| Installation | npm audit high findings | Audit dependency count |
| --- | ---: | ---: |
| Existing browser spike | 17 | 635 |
| Existing feed spike | 18 | 514 |
| Isolated browser install with legacy peer installation | 11 | 421 |

Counts describe those exact lockfile trees at the timestamp above; later package or source changes require another measurement. These are package-level findings, including packages affected through dependencies, rather than 17 or 18 independent bugs. The underlying advisories are `node-forge` RSA signature verification and `braces` recursion denial of service. The current latest published versions, 1.4.0 and 3.0.3 respectively, remain affected. Both advisory pages currently list no patched version. Therefore there is no supported version override that clears these issues, and `npm audit fix --force` is not an acceptable automatic downgrade. [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

After feed hardening, a separate audit at 22:23 UTC reported 19 high findings for that installation. It is preserved as `artifacts/hardened-feeds-audit.json`. The final 22:46 audit returned 18, as listed above; audit responses are time-dependent. Earlier baseline artifacts, source, manifest, and lockfile are preserved in `artifacts/baseline/`. No browser bundle conclusion is applied to the feed process.

`npm explain` establishes two relevant paths: `@helia/libp2p → @ipshipyard/libp2p-auto-tls → acme-client → node-forge`, and `@helia/unixfs → it-glob → fast-glob → micromatch → braces`. Browser WebRTC 6.1.0 also declares `react-native-webrtc` as a regular dependency. Its React Native peer installs bring a CLI/Metro chain; they are not browser transport requirements. `legacy-peer-deps=true` removes that peer chain in this isolated install, while retaining the library's direct dependencies. This is an installation experiment, not a blanket recommendation to disregard peer contracts.

## Shipped browser graph

The executable review rebuilt the final hardened browser entry twice with esbuild 0.28.2: once against its original installation and once against the isolated installation. Both produced a 959,507-byte minified bundle with 802 contributing modules. In both output metafiles, zero output bytes came from `node-forge`, `braces`, `micromatch`, React Native, Metro, `acme-client`, auto-TLS, Helia HTTP, or delegated HTTP routing. Both bundles evaluated successfully in real headless Chrome and exposed the spike API. This smoke verifies build and initial evaluation, not a repeated networking test. The earlier baseline was 945,610 bytes and 801 contributing modules. The pre-ingress-guard measurement was 958,650 bytes, preserved separately in `artifacts/pre-ingress-guard/`.

Final source SHA-256: `browser.js` is `19e86aec7afaa3e12647b2f38ce8cf2f6189bb83a3e1a2aa30c21f7ed6cd7cab`; its necessary local sibling `preservation.js` is `5e2333bfce269c791ec524a47b24ced74e5ef09f177e1c701f92fcf9d4434819`. The isolated build includes that sibling and resolves the pinned fixture codec through its own node_modules rather than through the other spike's installation.

The browser already uses the smallest supported construction exposed by these pinned packages: `createHeliaLight`, `withLibp2pLight`, and `withBitswap`, with transports supplied explicitly. Their exports still install broad dependency trees, but tree shaking excludes the unused default constructors from this browser artifact. Deep-importing private implementation files, replacing packages with stubs, or fabricating patched version overrides would add maintenance risk without improving these measurements.

The feed process executes Node modules without the browser artifact's tree shaking. Do not apply the browser graph conclusion to the Node process. Disabling automatic TLS means the forge API path is not configured; excluding adversarial glob input can constrain the braces path, but neither is a dependency patch. Installed code and process configuration require a separate reachability review before release.

## Network resource bounds

Inspection of installed `@helia/bitswap` 4.0.20 shows actual constants of 4 MiB incoming/outgoing message limits and 1,024 inbound/outbound streams. Interface comments advertise different defaults, so explicit options are necessary. The network decoder enforces length-prefixed message size before protobuf decoding, but incoming blocks are hashed before the want-list handler discards blocks without a matching want. Repeated bounded messages can still consume CPU and bandwidth.

Use explicit `maxIncomingMessageSize`, `maxOutgoingMessageSize`, `maxInboundStreams`, `maxOutboundStreams`, `maxWantListSize` (the installed runtime spelling differs from its documentation), and queue/concurrency options; test them against the chosen UnixFS block size. The runtime want limit is a soft ledger trim and exempts in-flight entries; the browser hardening spike therefore adds an explicit message-vector guard. Retain application-level article-byte, block-count, time, connection, transfer, and total-storage budgets. A 2 MiB article limit does not itself cap a malicious DAG's traversal, incoming transport buffers, or blocks persisted before cancellation. The original spike's unbounded concatenation prompted subsequent reader/storage hardening; its tests are reported separately from this build review. [Bitswap source](https://github.com/ipfs/helia/tree/main/packages/bitswap/src)

## Evidence and decision

`artifacts/results.json` records counts, byte size, source SHA-256, contributing-module checks, and smoke outcomes; the audit JSON and output metafiles are alongside it. `browser-snapshot.js` preserves the source used for the isolated build. Package versions and resolved dependency tree are pinned in the isolated lockfile.

Retain the supported light construction and add metafile checks to any production build. Keep the unresolved install advisories visible; do not claim a clean dependency audit or complete security proof from the absence of those modules in a browser bundle. The optional peer omission experiment saves install surface, but its networking compatibility must be rechecked before adopting it in the transport spike.
