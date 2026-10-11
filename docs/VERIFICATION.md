# MeshCache first-release verification

Verified locally on 2026-10-11. No extension-store release or public aggregator deployment was performed.

## Acceptance evidence

- **72 automated tests pass** (`npm run check`, including the production build). Tests cover signature forgery, listing/body identity, exact-file tampering, streaming size limits, inert HTML, WebP header/pixel limits, quality-filter survivors, newest-key ratings, separate byte/count quotas, atomic eviction, protected pending shares, retry without repeated upload, and copies older than 24 hours.
- **Native Chrome for Testing with Codex computer use:** reloaded the unpacked extension, opened it through the actual toolbar on Wikipedia, used keyboard capture/review/private save/read, and observed the embedded portrait. The separate dashboard's Activity and Storage views were inspected through native computer use.
- **Private Chrome smoke:** keyboard Popular/Cache/Saved, local save/read/remove, text-only choice, embedded images, review at 360/800/1280 px, and no automatic network publication.
- **Cross-origin image Chrome smoke:** loaded pixels, bounded anonymous CORS, denied PNG/SVG screenshot capture, responsive-image selection, unavailable placeholders, restored scroll, and reader rendering with no remote image requests. Its disposable headless extension receives substituted screenshot permission; it alone does not establish a native toolbar activeTab grant. The native test above exercises the real toolbar grant.
- **Full production extension UI against live services:** keyboard Cache for readers, independent fresh reader profile Browse Popular/Read with visible WebP, Helpful, and Check ratings passed. The synthetic draft was seeded by the harness; real-page capture was verified separately. The dashboard is not involved in this workflow. See [results](research/live-ui.json), [shared screenshot](../artifacts/live-ui-shared.png), and [reader screenshot](../artifacts/live-ui-reader.png).
- **Production transport in MV3:** exact plain JSON upload, acknowledged signed listing, fresh-reader hash/metadata validation, filtering, WebP, and signed rating discovery passed. See [transport report](research/first-release-live.md).
- **Separate dashboard Chrome smoke:** keyboard navigation, search and filters, responsive layouts at 360/800/1280 px, polling focus preservation, and metadata-only APIs passed. Seven-day hourly counters survive detailed journal eviction. The running dashboard binds to localhost:4318 and refreshes metadata every 60 seconds.

## Sequential edge-case drive

The [twenty-drive log](TEST-DRIVE.md) records 20 sequential Chrome MV3 scenarios, all passing, with timestamps, actions, assertions, and screenshots. It covers first run, keyboard flows, real local capture, image overflow and explicit text-only recovery, missing and hostile content, offline share/rating failures, duplicate operations, pending cancellation, whole-record count/byte eviction, and the independent dashboard. These local edge-case runs publish nothing; they are separate from the live provider tests above. Native computer use also verified the refined dark review, a visible real-page portrait, and keyboard save-to-read focus.

## Test publication cleanup

Both live experiments used original synthetic articles and disposable signing keys. Exact test listing/rating IDs were absent after owner deletion. The qualified CDN and canonical URL's qualified serving target returned 404. Private recovery journals and temporary browser profiles were removed. Provider file DELETE timed out despite subsequently verified serving absence; this is not a demonstrated guarantee that all replicas or caches are erased.

## Before public release

Provider workload policy, quotas, sustained availability, retention, and deletion behavior still need qualification. These short tests demonstrate the tested flows at observation time, not permanent storage or sustained 2 MiB throughput. Signatures authenticate keys, not article truth, distribution rights, or independent people. The aggregator's trends describe metadata observations; only the extension's Popular list validates complete article bodies.

## Reproduce locally

```sh
npm run check
npm run smoke
npm run smoke:aggregator
```

Set `CHROMIUM_EXECUTABLE` when Playwright's installed Chrome executable differs from its expected cache version. `SMOKE_SCREENSHOT_PERMISSION=1 node scripts/smoke-images.mjs` uses a disposable permission-adjusted image harness. `node scripts/smoke-live.mjs` prepares the UI harness without publication; `LIVE_UI_SMOKE=1` explicitly enables a new synthetic publication and cleanup run. Live runs must retain their private recovery journal until cleanup is reconciled.
