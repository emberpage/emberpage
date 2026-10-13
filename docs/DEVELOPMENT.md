# Development

Use Node.js 24 and the pinned pnpm version. See [setup](../README.md) and [packaging](RELEASING.md).

## Modules

| Module | Owns | Imports |
| --- | --- | --- |
| `src/domain` | Identity, schemas, route validation, ranking, contracts | Domain only |
| `src/application` | Private archives, explicit sharing, recovery | Domain; injected adapters |
| `src/storage` | Atomic IndexedDB writes, quotas, ledgers | Domain and storage |
| `src/directory` | Bounded signed Nostr listings and votes | Domain and directory |
| `src/transport` | Browser IPFS storage/transfer and verified article networking | Domain and directory; injected adapters |
| `src/extraction` | Readable HTML, images, sanitization | Domain and extraction |
| `src/platform` | Chrome capture, sealed previews, inspection, keys, mesh IPC | Domain, extraction, platform |
| `src/pages` | Popup, preview, reader | Domain, pages, HTML sanitizer |
| `src/extension.ts` | Compose extension adapters and authorize commands | Extension modules |
| `src/offscreen.ts` | Compose browser mesh and document inspection | Offscreen adapters |
| `aggregator` | Separate metadata index, SQLite, dashboard | Metadata directory and domain contracts |

Keep state, quotas, and ordering inside their owning modules. Writer records reserved for explicit mesh contribution remain until removal, including uncertain or canceled publication. Private and received records retain LRU eviction. The writer reconciles existing local pin reservations before enforcing quotas; Manage also lists unmatched reservations for explicit removal without opening an unavailable article. Re-saving the same contributed snapshot preserves its exact file. Use public Effect workflows; do not reach into storage or locks. Capture owns its tokens, screenshot limits, and seals. Directory owns event kinds, tags, versions, signing and publication validation. Network verifies snapshots and pin receipts before requesting publication. Directory queries return records and diagnostics together, so overlapping requests cannot exchange warnings or activity counts. Transport has no Chrome dependency. WXT entrypoints start the composition roots.

Use `decodeArticle(bytes, {expected: record})` to verify a file against its declared size, file hash, content hash and URL hash. Storage and transport share this check; signed listing attributes, route validation and readable-content filters remain separate checks.

Archive management uses vault summaries, without decoding article bodies. Reading and public candidates use verified full records. This lets a damaged local file remain visible for explicit removal without treating it as a readable or shareable snapshot.

## Browser mesh

`platform/mesh` sends bounded Chrome messages to `offscreen.html`. That document has `DOM_PARSER` and `WEB_RTC` reasons: it inspects articles and hosts the Helia/libp2p node. `src/offscreen.ts` composes the browser IPFS adapter with IndexedDB persistence. No local RPC server, desktop app, or pinning account is required.

Saving privately does not start sharing. Explicit sharing retains exact archive bytes, establishes peer routes, and publishes signed metadata; retrieval verifies complete files before showing cards. **Pause contribution** stops the mesh without deleting saved copies. The next **Share on IPFS** or **Keep available** starts contribution again. Stored pins do not establish reachability or permanent availability. External pinning services are not implemented.

## Gates

`pnpm check` runs strict TypeScript, typed ESLint, official Effect diagnostics, unused-code/dependency scans, import rules, tests, and WXT build verification. Effect warnings/errors fail CI. JavaScript source, diagnostic suppressions, module cycles, Node imports in browser code, and aggregator imports of article transports are rejected.

The pinned Helia version has a small pnpm patch for pin-owner removal and repeated DAG references. Keep `patches/helia@7.1.16.patch`, the workspace patch registration and lockfile together. Native shared-block lifecycle tests protect retained snapshots during removal and garbage collection; remove the patch only when an upstream version passes those tests.

CI also runs extension, image, dashboard, and test-drive smoke scripts with disposable fixtures. Evidence stays in ignored `artifacts/`; experiments stay outside active source. Read `AGENTS.md` and Effect’s complete installed guide before editing Effect code. [PROTOCOL.md](PROTOCOL.md) defines formats and limits; [VERIFICATION.md](VERIFICATION.md) distinguishes fixtures from real network evidence.
