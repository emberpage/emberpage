# WXT, pnpm, and Effect migration

Verified 2026-10-11. The application still uses its existing Blossom/Nostr protocol, explicit actions, reader eligibility checks, bounded IndexedDB caches, and separate metadata-only local dashboard. IPFS experiments remain isolated.

WXT owns the manifest and build. Explicit startup wrappers live in `entrypoints/`; `capture.ts` is an unlisted script injected only when requested. Static assets live in `public/`. Load `.output/chrome-mv3/`; `pnpm zip` produces the versioned Chrome archive.

Effect 4 owns typed background commands, share/discovery workflows, bounded concurrency, HTTP timeout/abort scopes, stream cleanup, relay cancellation, and aggregator scheduling/shutdown. Pure inspection, ranking, hashing, and storage rules retain their existing behavior. TypeScript checks the new runtime modules strictly; retained JavaScript exposes focused typed boundaries. The installed Effect guide is required reading in `AGENTS.md`.

Verification passed:

- Frozen pnpm install and strict TypeScript.
- 83 tests, including interruption, retry/receipt recovery, malformed command rejection, scheduler cancellation, process shutdown, and startup failure cleanup.
- Production WXT build and manifest/entrypoint verification.
- Actual extension smoke and local dashboard smoke at 360/800/1280 pixels.
- Twenty sequential browser edge cases on the final build; see `TEST-DRIVE.md` and the locally generated `artifacts/test-drive-results.json`.
- Visible Chrome via Codex computer use: native Extensions → Ember Page button, Get started → Cache → Preview this article → Cache only for me → Read saved copy. The production manifest had no added host permissions. The synthetic article's cross-origin local image appeared in both preview and reader. This verifies that path with the real toolbar activeTab gesture, not every publisher/image condition.

The separate image smoke also passed with its documented disposable screenshot-permission harness. That harness alone does not prove a real toolbar grant. No live publication test was repeated for this tooling migration.

The GitHub workflow runs verification and publishes tested ZIPs/checksums from matching version tags. Chrome Web Store publication and public dashboard hosting are not configured. See `RELEASING.md`.

The subsequent Ember Page 0.1.1 rebrand starts fresh storage, signing-key, article-format, and discovery namespaces at the user's request. This supersedes namespace continuity from the tooling-only migration described above. Historical signed evidence remains unchanged.
