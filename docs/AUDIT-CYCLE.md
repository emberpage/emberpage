# Architecture and E2E audit

Ten sequential passes, scheduled every 10 minutes. Completed: 10/10. Cycle finished.

Each pass checks WXT conventions, Effect boundaries, pnpm reproducibility, shadcn Typeset/theme integration, and module boundaries. It runs `pnpm check`, `pnpm smoke`, `pnpm smoke:aggregator`, and `pnpm test:drive` against local fixtures.

Record the commit, findings, test results, evidence paths, and remaining gaps below. Public publishing tests are excluded. A test failure counts as an executed pass and must be reported honestly.

## Pass 1 — 2026-10-12 01:10 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f` (v0.1.5). Initial dirty state: only this untracked audit log. Application code unchanged. Baseline pass; no previous cycle results.

**Findings**

- **P2 — Same-tab capture reservation happens too late.** `src/background.ts:227` checks `captures.has`, then awaits injection at line 229, and reserves the session only at line 245. Two concurrent CAPTURE requests can both pass the guard. A deterministic local Chrome adapter reproduction held both injections until they entered: two injections, two successful responses, two preview tabs, zero network calls. This can also overwrite the active image-capture token. Reserve the tab before the first asynchronous capture operation and release it for the entire workflow. Evidence: `artifacts/audit-cycle/pass-01/capture-race.mjs` and `capture-race.log`. This is a mock-adapter concurrency proof, not a native-browser reproduction.
- **P3 — Strict type coverage is partial.** `tsconfig.json:6` disables `checkJs`; lines 12–14 explicitly include TypeScript files. Core storage, sanitization, extraction, Nostr validation, and page controllers remain JavaScript. Passing strict TypeScript does not establish those implementations are type-checked. Consider checking or migrating these modules incrementally; no need to rewrite them just for a framework convention.

**Adherence**

- WXT: file-based HTML/background/unlisted entrypoints; Chrome listeners register synchronously inside background `main`; runtime APIs stay inside runtime functions. WXT owns build/ZIP/manifest and generated TS config. No automatic content-script host grants.
- Effect: traced workflows, Schema decoding at Chrome/aggregator inputs, injected adapters, scoped HTTP stream/controller cleanup, share lock finalizers, discovery coalescing, and scheduler interruption. Cancellation and SIGTERM regression tests passed. Classes with injected adapters are the existing seam; Context/Layer adoption is partial, not by itself a demonstrated runtime defect.
- pnpm: pinned 12.11.2, committed lockfile, constrained esbuild lifecycle approval, frozen CI install, pinned Actions, and tag-gated verified release artifacts. No lockfile/package changes during this pass. A fresh install/bit-for-bit reproducibility experiment was not run.
- shadcn: actual pinned upstream Typeset, semantic shared theme, bundled Geist fonts, OS light/dark appearance, focus rings and contained wide blocks. Browser checks verified font loading, rich article HTML, theme switching and responsive widths. UI controls are native HTML styled with shared tokens, not shadcn React components.
- Architecture: article workflow owns local/public distinctions behind injected storage/network interfaces; pure core filtering/hashing; separate aggregator uses only signed metadata. Extension source has no aggregator imports or dashboard endpoint. Existing quotas, pending-copy protection and explicit user actions passed. The capture race above is the concrete lifecycle seam gap.

**Verification**

| Command | Result |
| --- | --- |
| `pnpm check` | PASS: 84 tests, strict TS, WXT build and release manifest checks |
| `pnpm smoke` | PASS: extraction, private save/read/remove, preview, text-only, safe images and rich HTML; 360/800/1280px and light/dark |
| `pnpm smoke:aggregator` | PASS: local HTTP, fonts, light/dark, filters, keyboard navigation, activity/storage and explicit update |
| `pnpm test:drive` | PASS: 20/20 sequential scenarios, including offline/error/quota/retry/pending-share cases |

Logs, copied screenshots and scenario records: `artifacts/audit-cycle/pass-01/`. No public articles or ratings were published. Tests use isolated profiles, fixture servers and test databases. Native toolbar activeTab permission, live provider behavior, long-term retention, and exhaustive contrast/accessibility were not re-proven. Readability remains the extractor; Typeset styles its sanitized output.

## Pass 2 — 2026-10-12 01:20 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: pass-1 additions to `docs/TEST-DRIVE.md` and this untracked audit log. Application code unchanged. Emphasis: storage atomicity, quota failure recovery, and dependency reproducibility.

**Findings:** no new actionable issues. Pass-1 P2 capture reservation race (`src/background.ts:227–245`) and P3 partial JS type coverage (`tsconfig.json:6,12–14`) remain unresolved; their implementations are unchanged. No additional framework layers or UI interactions are justified by this pass.

**Adherence and edge cases**

- WXT: rechecked background `main`, unlisted capture injection, generated TS config and explicit-permission manifest. Build and manifest verification passed; no content-script host grants or background saving appeared.
- Effect: scoped stream cleanup, share lock lifecycle and interruption recovery rechecked. Typed error/Schema seams remain in TS workflows; native Promise adapters and JS persistence remain explicit. Tests cover aborted HTTP/relay requests, scheduler shutdown, pending receipts after interrupted shares, and a local catalog failure after accepted publication (`tests/archive.test.js:219,251`).
- pnpm: isolated copied package/lock/workspace files passed `install --frozen-lockfile --lockfile-only --ignore-scripts` with pnpm 12.11.2; copied lockfile SHA-256 equals the repository lockfile. This checks manifest/lock consistency, not a fresh dependency download or bit-for-bit release reproducibility. CI still uses frozen installs, pinned Actions and verified tag releases.
- shadcn: shared theme/local fonts and pinned Typeset unchanged; repeated browser checks exercised rich HTML, contained tables/code/images, light/dark rendering, keyboard focus paths and 360/800/1280px layouts. Full WCAG coverage was not asserted.
- Architecture: `IndexedRecords.update` owns synchronous IndexedDB transformations inside one read/write transaction (`src/core/storage.js:35`); vault quotas/pending protection remain behind its interface. Regression tests cover atomic quota failure and concurrent bounded writer/reader separation (`tests/core.test.js:158,186`). SQLite metadata rollback preserves both collections on insert failure (`tests/aggregator-store.test.js:35`). Separate aggregator stores metadata only; extension source has no dashboard dependency.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20 sequential scenarios). Additional isolated frozen-lockfile check PASS. Outputs, per-pass screenshot copies and scenario records are in `artifacts/audit-cycle/pass-02/`.

No public publishing, user archive deletion, provider changes or application edits. Chrome E2E uses disposable fixture profiles and a fixture-only permission adjustment; native activeTab, live providers and long-term retention remain separate unverified claims. Compared with pass 1: all suites still pass, no new findings, and manifest/lock consistency now has additional isolated evidence.

## Pass 3 — 2026-10-12 01:30 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: previous test-drive log additions and this audit log. Emphasis: malformed remote input, integrity/filter ordering, and measured semantic color contrast.

**Findings:** no new actionable issues. The pass-1 capture reservation race (`src/background.ts:227–245`) and partial JS type coverage (`tsconfig.json:6,12–14`) remain unresolved. No application code changed.

**Adherence and edge cases**

- WXT: MV3 module background and unlisted capture remain registered from entrypoint runtime functions. WXT build and manifest verification passed with the same explicit permissions and no automatic host access. Existing native permission limitations remain separate from fixture tests.
- Effect: typed network errors wrap adapter failures; scoped HTTP controller/stream ownership and timeout/interruption regression checks passed. Chrome command schemas and aggregator metadata schemas remain separate from pure JS wire validation. No new cancellation or resource-lifetime failure observed.
- pnpm: package-manager pin, workspace build approval, lockfile and frozen CI/release paths unchanged. Required checks ran through pnpm; this pass did not repeat the isolated install check from pass 2 or claim byte-identical release reproducibility.
- shadcn: added an isolated Chromium diagnostic against actual `public/theme.css`. Six text/focus token pairs in both themes passed: body, muted text, muted text on muted surface, primary button, error text, and focus ring. Lowest text ratio: 5.51:1; lowest focus ratio: 7.46:1. Exact values and diagnostic source: `artifacts/audit-cycle/pass-03/contrast-results.json` and `contrast.mjs`. This measures those semantic pairs in Chromium's sRGB canvas projection, not every component/state or a complete WCAG audit. Repeated smoke tests still cover local fonts, Typeset rich HTML, dark/light and mobile layouts.
- Architecture: signed metadata is validated before discovery; article bytes/hash/size and listing metadata are checked before inspection; only sanitized, eligible copies reach the reader list (`src/network/nostr.js:41`, `src/core/article.js:90`, `src/core/candidates.js:91`). Tests reject forgery/conflicting tags, provider/budget violations, wrong hashes, unknown formats, malformed UTF-8, future dates and byte bombs (`tests/network.test.js:103,134`; `tests/core.test.js:95`). Reader sanitizes again at rendering (`src/reader.js:51`); dashboard uses text nodes for remote labels and remains metadata-only. Signatures prove provenance/integrity, not truth or unique humans.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20 sequential scenarios). Additional color-contrast diagnostic PASS (12 measured pairs). Logs and copied screenshots/scenario records: `artifacts/audit-cycle/pass-03/`.

Compared with pass 2: same passing suites and unresolved findings; added concrete contrast evidence. Public articles/ratings were not published, user archives were not touched, and providers/protocols were unchanged. Native activeTab, public service durability and live provider behavior remain unverified by these isolated fixture runs.

## Pass 4 — 2026-10-12 01:40 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: accumulated test-drive evidence and this audit log. Emphasis: UI loading/error/discard transitions and keyboard focus.

**New finding — P3: discarded-preview confirmation loses focus and announcement.** `src/review.js:77` replaces all main content after DISCARD, including the focused button and live `#status` region, with an ordinary paragraph. An instrumented replay of scenario 7 in the actual built Chrome extension observed `activeTag: BODY`, no active ID, and zero live regions after keyboard activation. The draft was correctly removed and nothing cached, but confirmation has no focused or live announcement target. Preserve a status region or move focus to an appropriate confirmation element without adding unnecessary controls. Evidence: `artifacts/audit-cycle/pass-04/discard-probe.log`, `discard-drive.md`, and `discard-screenshots/`. No screen-reader session was run; the measured DOM/focus result is the basis of this finding.

The pass-1 P2 same-tab capture race (`src/background.ts:227–245`) and P3 JS type coverage gap (`tsconfig.json:6,12–14`) remain unresolved. Application code unchanged.

**Adherence**

- WXT: module background and unlisted capture run from entrypoint functions; build/manifest checks passed. Preview, reader and popup remain file-based HTML entrypoints; runtime workflows retain explicit user actions.
- Effect: save/share/inspection use named workflows and schema input decoding; resource lock finalizers, screenshot semaphore and imperative Chrome reply adapters remain localized. Existing cancellation, coalescing, pending-share and scheduler tests passed. No Effect code was edited.
- pnpm: pinned package manager, WXT prepare/build/ZIP scripts, lockfile, frozen CI installation, pinned Actions and tag release gating remain unchanged; all required commands ran via pnpm.
- shadcn: native controls use shared semantic theme and local fonts; article output uses actual Typeset. Light/dark, rich HTML, narrow layouts, keyboard menus/filters, and save/remove/clear focus paths passed. The new discard focus gap shows the current E2E assertions do not cover every completion transition. Contrast evidence from pass 3 remains applicable to the unchanged tokens.
- Architecture: UI controllers communicate through the Chrome message interface; archive workflow owns capture/save/read/share constraints, and the aggregator remains a separate metadata-only process. Shared `busy` restores initiating controls for errors; review Save restores focus on failures; popup Remove/Clear focus moves to surviving controls. The discard path bypasses these completion guarantees by replacing its entire main subtree.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20). Supplemental built-extension scenario-7 replay PASS for discard functionality and reproduced the accessibility gap. Logs, copied standard screenshots/scenario records and probe evidence: `artifacts/audit-cycle/pass-04/`.

Compared with pass 3: all standard suites still pass; one new P3 UI finding. Local fixtures and disposable Chrome profiles only; no public uploads/ratings, user archive deletion, provider/protocol changes or application edits. Native activeTab and live provider behavior were not retested.

## Pass 5 — 2026-10-12 01:50 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: prior test-drive evidence and this audit log. Emphasis: separate aggregator HTTP lifecycle, local access rules and shipped package contents.

**Findings:** no new actionable issues. Prior findings remain: P2 same-tab capture reservation (`src/background.ts:227–245`), P3 JS type coverage (`tsconfig.json:6,12–14`), and P3 discard focus/live confirmation (`src/review.js:77`). Application code unchanged.

**Adherence**

- WXT: build/ZIP still owned by WXT; synchronous listener registration inside background `main`, unlisted capture, and HTML pages remain intact. Newly generated ZIP manifest has exactly activeTab/scripting/storage/offscreen and no host permissions or automatic content scripts.
- Effect: scoped aggregator startup joins indexer shutdown before closing the server/database (`aggregator/main.ts:65,94,106`); typed HTTP errors and separate metadata schemas remain in place. Regression tests passed for SIGTERM query cancellation, clean port release and bind-failure cleanup (`tests/aggregator-runtime.test.js:23,63`). No runtime/module rewrites are warranted from these results.
- pnpm: pinned 12.11.2, lockfile, explicit esbuild build approval, frozen CI installs and tag-gated release verification unchanged. Additional `pnpm zip` passed. Package inspection saved the local SHA-256; it does not claim cross-machine byte reproducibility or publish another release.
- shadcn: package inspection compared shipped Typeset, shared theme and both local font files byte-for-byte with source assets. Dashboard allows only explicit theme/font/static routes and correct MIME/CSP (`aggregator/server.ts:14–29`); browser smokes verified local fonts, responsive rich HTML and OS light/dark. Prior discard accessibility finding remains.
- Architecture: HTTP reads remain passive and metadata-only. Tests passed for rejected foreign Host/Origin, missing explicit refresh header, oversized request bodies, 409 concurrent refresh and preserved prior snapshots after a failed query (`tests/aggregator-server.test.js:19,30,40`). The metadata directory interface has query methods only (`aggregator/types.ts:40`); extension bundle inspection found no aggregator, experiment, SQLite or environment files. No article body endpoint exists.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20); additional `pnpm zip` and package inspection PASS. Evidence: `artifacts/audit-cycle/pass-05/`, including `package-check.json`, command logs and copied screenshots/scenario records.

Compared with pass 4: all suites still pass, no new findings; added package separation/asset-byte evidence. Tests used disposable local fixtures, not the user's dashboard DB or archives. No public publishing, permissions/provider/protocol changes or application edits. Native activeTab, live providers, long-term retention and exhaustive accessibility remain unverified by these runs.

## Pass 6 — 2026-10-12 02:00 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: accumulated test-drive evidence and this audit log. Emphasis: discovery/rating windows, deduplication and article retention independence.

**Findings:** no new actionable issues. Existing P2 capture reservation (`src/background.ts:227–245`), P3 JS type coverage (`tsconfig.json:6,12–14`) and P3 discarded-preview focus/status (`src/review.js:77`) remain unresolved. Application code unchanged.

**Adherence**

- WXT: runtime registration and explicit capture entrypoints unchanged; generated manifest/build checks passed. No background capture/rating or broad host grants introduced.
- Effect: archive discovery uses Deferred to share one in-flight operation and clears ownership on completion/interruption (`src/archive.ts:282–306`); network adapter uses scoped cancellation; aggregator refresh and scheduler lifetimes remain joined. Existing recovery/cancellation tests passed. Public operations still require explicit extension actions; rolling metadata indexing remains separate.
- pnpm: pinned 12.11.2, lockfile, WXT preparation/build scripts, frozen CI installation and release gates unchanged. All required commands ran via pnpm; no install, dependency or release changes were made.
- shadcn: Typeset and shared theme/local fonts unchanged; repeated browser checks passed for rich HTML, keyboard menus/filters, responsive layouts and light/dark. Pass-3 contrast measurements still apply; the discard completion gap is not resolved by successful routine smoke tests.
- Architecture: catalog/votes use bounded metadata ledgers; body retention belongs to the independent vault. Ledger tests cover duplicate listings, latest vote per key/snapshot, bounded counts, separate seven-day popularity and 30-day retention windows (`tests/catalog.test.js:33,48`; `tests/votes.test.js:23,49,70`). Aggregator ranks metadata without retrieving bodies and caps each vote direction at 50 (`aggregator/indexer.ts:89`). These are key-based counts, not distinct-human proof.

**Additional evidence:** an isolated fake-indexeddb diagnostic advanced a simulated clock by 30 days plus 1ms. Both metadata ledgers expired their records while the separately stored 100-day-old private article remained readable. Source/results: `artifacts/audit-cycle/pass-06/retention.mjs`, `retention.log`, `retention-results.json`. This proves module separation for simulated expiry, not browser disk permanence or provider retention.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20). Retention diagnostic PASS. Logs and copied screenshots/scenario records: `artifacts/audit-cycle/pass-06/`.

Compared with pass 5: all standard suites still pass, no new findings; added simulated cross-module expiry evidence. Disposable local profiles/databases only. No public article/rating publishing, user archive deletion, provider/protocol/permission changes or application edits. Native activeTab, live service behavior and long-term availability remain separate unverified claims.

## Pass 7 — 2026-10-12 02:10 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: accumulated test-drive evidence and this audit log. Emphasis: cross-origin image capture, responsive pixels, placeholders and source-page restoration.

**Findings:** no new actionable issues. Existing P2 capture reservation (`src/background.ts:227–245`), P3 JS type coverage (`tsconfig.json:6,12–14`) and P3 discarded-preview focus/status (`src/review.js:77`) remain unresolved. Application code unchanged.

**Adherence**

- WXT: background/main and unlisted script lifecycle unchanged; production manifest checks passed with the same explicit permissions. Browser fixture scripts inject only through the tested extension workflow.
- Effect: capture screenshot requests require a bounded tab/token session and a semaphore (`src/background.ts:161–206`); network requests retain typed errors and scoped abort/stream cleanup. Standard timeout/interruption and pending-share tests passed. No Effect code was edited.
- pnpm: pinned package manager, lockfile, WXT scripts and frozen/tag-gated CI release workflow unchanged. All four required suites ran through pnpm; no dependency or release changes.
- shadcn: actual Typeset, local fonts and shared theme unchanged; rich-HTML mobile/light/dark checks passed. Visually inspected the additional private reader screenshot: captured images remain within the reading column with captions and an explicit unavailable-image placeholder. Existing discard focus gap remains open.
- Architecture: image capture remains an extraction concern in the extension, not an aggregator feature. Loaded pixels, bounded anonymous fetch and authorized rendered pixel capture feed one safe WebP representation; total URI, image count/dimension/pixel and time budgets remain enforced (`src/content.js:13,333`; `src/sanitize.js:3–15`). Original scroll and temporary overlay cleanup are handled in finally (`src/content.js:188`). Stored reader HTML is self-contained; aggregator stores metadata only.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20). Additional `SMOKE_SCREENSHOT_PERMISSION=1 node scripts/smoke-images.mjs` PASS: reproduced real canvas taint, CORS-allowed/denied PNG and SVG capture, responsive selected green pixels, unavailable placeholder, restored scroll, private save/read and no remote reader image requests.

The image harness grants screenshot permission only in its disposable extension copy; the shipped manifest was unchanged. This does not prove the real toolbar activeTab grant. Logs and copied screenshots/scenario records: `artifacts/audit-cycle/pass-07/`, including `screenshots/cross-origin-images-reader.png`.

Compared with pass 6: all suites still pass, no new findings; added two-origin browser image-path coverage. No public uploads/ratings, user archive deletion, provider/protocol changes or application edits. Live providers, exhaustive accessibility and long-term durability remain unverified by these local fixtures.

## Pass 8 — 2026-10-12 02:20 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: prior test-drive evidence and this audit log. Emphasis: plan adherence, request coalescing/scheduler shutdown, and error classification across module interfaces.

**New finding — P3: real relay timeout is classified as a network failure.** The timer at `src/network/nostr.js:88` raises “The article directory took too long to respond.” The classifier at `aggregator/indexer.ts:117` recognizes only “timed out”/“timeout”, so it assigns `network`, gives the generic indexing-failed message, and records a network error in the journal. An isolated silent-socket adapter exercised the actual NostrDirectory timeout, then MetadataIndexer: output code and storedCode were `network`, with the original timeout message retained in the cause. Use a stable transport error code/tag across this seam rather than classifying user-facing prose. Evidence: `artifacts/audit-cycle/pass-08/timeout-classification.mjs`, `timeout.log`, `timeout-results.json`. Existing timeout regression uses a different mock message and misses this path (`tests/aggregator-indexer.test.js:229`). No public relay was contacted.

Prior P2 capture reservation, P3 JS type coverage and P3 discarded-preview focus/status remain unresolved. Application code unchanged.

**Adherence**

- WXT: `defineBackground` module main, unlisted capture and HTML entrypoints match documented startup conventions; build/manifest checks passed. Runtime imports remain free of Chrome listener registration until main runs.
- Effect: Deferred discovery coalescing, acquire/release locks, scheduler stop/shutdown and native Promise adapters are localized. Tests passed for non-overlapping scheduled runs, manual busy rejection, transport abort and shutdown joining. The new finding is a typed-error semantic gap at the directory/indexer seam, not a reason to add framework wrappers everywhere.
- pnpm: pinned package manager and lockfile; WXT prepare/build/ZIP scripts; frozen CI installs and verified tag releases unchanged. All required suites ran through pnpm.
- shadcn: actual Typeset/shared theme/local fonts and focus styles remain intact; repeated browser checks passed for rich HTML, responsive/light/dark rendering and keyboard menus/filters. Existing discarded-preview completion focus gap remains open.
- Architecture: compared implementation with `docs/PLAN.md` and `docs/DEVELOPMENT.md`: save privately first; public share/rate and Community query explicit; one provider/relay; no transport fallbacks; no background serving; separate rolling metadata-only aggregator; IPFS spikes isolated. Existing coalescing tests prove one query for concurrent Community requests and a later explicit refresh (`tests/archive.test.js:270`). Scheduler tests prove start/stop lifecycle and no overlap (`tests/aggregator-indexer.test.js:112,151,190`).

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20). Supplemental silent-socket probe completed and reproduced the classification defect. Logs and copied screenshots/scenario records: `artifacts/audit-cycle/pass-08/`.

Compared with pass 7: all standard suites pass; one new P3 diagnostics finding. Local fixture evidence only; native activeTab, live providers, retention and exhaustive accessibility remain unverified. No public publishing, user archive deletion, provider/protocol/permission changes or application edits.

## Pass 9 — 2026-10-12 02:30 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: accumulated test-drive evidence and this audit log. Emphasis: release verification and same-machine build repeatability.

**Findings:** no new actionable issues. Existing P2 capture reservation, P3 JS type coverage, P3 discarded-preview focus/status and P3 relay-timeout classification remain unresolved at the previously cited files/lines. Application code unchanged.

**Adherence**

- WXT: startup wrappers use defineBackground/defineUnlistedScript; WXT owns build output and generated configuration. `scripts/verify-release.mjs:11` checks package/manifest version, brand, MV3, module worker, exact permissions, no host grants/content scripts, CSP constraints and required entrypoints. Tag builds require the tag to match the package version.
- Effect: named archive/network/indexer workflows, typed errors, scoped resources and explicit imperative adapters unchanged; cancellation/share/scheduler regression tests passed. The timeout semantic gap recorded in pass 8 remains a concrete defect; partial Context/Layer adoption alone is not a new finding.
- pnpm: package-manager pin, committed lockfile, constrained build scripts and frozen CI remain aligned. The CI verifies before producing a ZIP/checksum and publishing a matching tag. Additional same-machine rebuild used the same checkout/dependencies.
- shadcn: both article pages retain actual Typeset containers; shared semantic tokens, local fonts, allowed server routes and focus styles unchanged. Repeated responsive/light/dark browser checks passed. The discard completion accessibility finding remains unresolved.
- Architecture: extension has no dashboard imports/endpoint; separate aggregator remains metadata-only. Experiments/database files are excluded from shipped artifacts. Article workflow continues to own private/public distinctions and the injected storage/network seam, without new wrappers or hidden actions.

**Additional evidence:** SHA-256 maps of all 40 production files before and after another `pnpm build` matched exactly. Evidence: `artifacts/audit-cycle/pass-09/build-before.json`, `build-comparison.json`, `rebuild.log`. This establishes repeated build bytes on this machine with unchanged dependencies, not clean-room/cross-platform reproducibility or ZIP timestamp stability.

**Verification:** `pnpm check` PASS (84/84); `pnpm smoke` PASS; `pnpm smoke:aggregator` PASS; `pnpm test:drive` PASS (20/20). Additional rebuild PASS and byte comparison matched. Logs and copied screenshots/scenario records: `artifacts/audit-cycle/pass-09/`.

Compared with pass 8: all suites still pass, no new findings; repeatability evidence added. Local fixtures/disposable profiles only; no public publishing, user archive deletion, provider/protocol/permission changes or application edits. Native toolbar activeTab, live providers, long-term retention and exhaustive accessibility remain unverified by this cycle.

## Pass 10 — 2026-10-12 02:40 UTC

Commit: `6b0674fd22a87b830ac65c6091d710c259b5786f`, unchanged. Initial dirty state: previous test-drive evidence and this audit log. Emphasis: final regression pass and reconciliation of all cycle evidence.

No new actionable issues. All four previously recorded findings remain unresolved at the same source lines: P2 capture reservation (`src/background.ts:227`), P3 partial JavaScript type coverage (`tsconfig.json:6`), P3 discard completion focus/status (`src/review.js:77`), and P3 timeout classification (`aggregator/indexer.ts:117`). Their implementations were checked again; no fixes are implied by passing suites.

All five adherence areas rechecked: WXT owns lifecycle/build/manifest; Effect owns named workflows/scoped resources with imperative adapters; pnpm is pinned and CI uses frozen installs/tag verification; actual Typeset/shared semantic theme/local fonts remain configured; the lightweight extension and query-only metadata aggregator remain separate. Existing error, cancellation, quota, pending-share and validation checks passed. No speculative framework rewrites recommended.

`pnpm check` PASS (84/84), `pnpm smoke` PASS, `pnpm smoke:aggregator` PASS, `pnpm test:drive` PASS (20/20). Evidence: `artifacts/audit-cycle/pass-10/`. This repeats rich article/mobile/light-dark, private save/read/remove, text-only, offline/error and dashboard keyboard/filter/activity/storage scenarios. Application code unchanged; only audit/test logs were updated. No public publishing or changes to user archives, providers, protocols or shipped permissions.

## Final result

**10/10 scheduled passes completed. 40/40 required suite runs passed; zero suite failures.** The same 84 automated tests ran ten times (840 passing test executions), and the same 20 sequential E2E scenarios ran ten times (200/200 passing scenario executions). These are repeated executions, not 840 or 200 distinct tests.

| Priority | Remaining issue | Evidence |
| --- | --- | --- |
| P2 | Concurrent same-tab captures can open two previews | Pass 1, mock Chrome adapter reproduction |
| P3 | Core JavaScript is outside strict type checking | `tsconfig.json:6` |
| P3 | Discarding preview loses focus and removes live confirmation | Pass 4, built-extension keyboard replay |
| P3 | Actual relay timeout becomes generic network failure | Pass 8, actual transport timer with silent socket adapter |

Supplemental evidence includes lockfile consistency, twelve semantic contrast pairs, shipped asset/permission separation, simulated metadata expiry independent of article retention, two-origin image capture and same-machine byte-identical production rebuilds. No application fixes were made. Native toolbar activeTab permission, live provider behavior/retention, cross-machine reproducibility and exhaustive accessibility remain outside this cycle's proof.

Machine-readable totals: `artifacts/audit-cycle/summary.json`. Per-pass logs, screenshots and reproductions remain under `artifacts/audit-cycle/`.

## Follow-up — native TypeScript and enforced boundaries

The user authorized fixes after the audit cycle. All four recorded findings are resolved: capture reserves the tab before injection and releases after failure; every authored code module is native, strictly checked TypeScript; discard keeps and focuses its live confirmation; relay timeout classification uses the typed error code. Regression tests cover capture concurrency and the real transport timer, and the sequential browser drive checks discard focus.

Effect owns workflows, scoped cleanup and runtime validation. Pure modules use its Schema, Predicate or typed contracts. WXT still owns extension builds and lifecycle; the separate dashboard compiles its TypeScript asset locally and stays metadata-only. Sharing, providers, quotas and shipped permissions are unchanged. Empty ratings queries now reset their own diagnostics rather than repeating listing counts.

`pnpm check` additionally enforces typed ESLint with inline overrides disabled, Effect use per module, unused code/dependencies, import direction and JavaScript/suppression bans across the source tree. Negative tests exercise the actual tools, including multiline directives, a new folder with JavaScript and forbidden platform/dashboard imports. Historical experiments, unused live probes and research were removed from the active repository; their history remains in Git.

Verification: `pnpm check` PASS (90/90 tests), extension and dashboard smoke tests PASS, all 20 sequential browser scenarios PASS. The cross-origin image smoke also passed and now runs in CI. These use local fixtures and disposable extension profiles; they do not publish articles or ratings. The completed ten-pass automation remains paused.
