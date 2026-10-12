# What has been tested

## Current checks: 0.1.5

On 2026-10-11, the local build passed strict TypeScript, **84 automated tests**, the production build/manifest check, extension and dashboard browser smoke tests, and **20 sequential browser scenarios**. GitHub CI and ZIP checksums are available with each [release](https://github.com/emberpage/emberpage/releases).

The [drive log](TEST-DRIVE.md) records keyboard actions, assertions and local screenshot paths. It covers save/read/remove, text-only recovery, missing or hostile content, offline failures, repeated actions, pending shares and count/size eviction. These fixture runs publish nothing. Responsive checks cover 360, 800 and 1,280 px widths. Theme checks verify local Geist fonts and light/dark rendering; extracted article HTML uses the upstream shadcn Typeset stylesheet.

Native Chrome testing separately exercised the real toolbar permission: preview a Wikipedia article, save privately, then read its embedded portrait. The screenshot-permission smoke harness uses a disposable adjusted manifest; it does not prove that toolbar permission by itself.

## Earlier live service tests

Before the rebrand, the production flow passed public upload, signed listing, independent-reader download/validation, embedded images and rating discovery. See the [transport report](research/first-release-live.md) and [UI results](research/live-ui.json). Those tests used original synthetic articles and disposable keys; they were not repeated after the namespace change.

The earlier report recorded 72 tests under the pre-WXT build. That is historical evidence, not the current test count. Historical signed payloads remain unchanged.

After cleanup, the test listing/rating IDs were absent and the tested file-serving URLs returned 404. File deletion requests timed out, so these observations do not prove that every remote copy or cache was erased.

## What remains unproven

Short tests do not establish sustained capacity, long-term retention, anonymity or future availability. Provider workload policy, quotas, retention and deletion behavior still need qualification. Signatures do not prove article accuracy or distinct voters. Dashboard trends observe metadata; Popular validates complete files.

The release is a GitHub download. Chrome Web Store submission and public dashboard hosting are not configured.

## Run the checks

```sh
pnpm check
pnpm smoke
pnpm smoke:aggregator
pnpm test:drive
```

Set `CHROMIUM_EXECUTABLE` if the installed browser differs from Playwright's expected executable.

For isolated image tests, run `SMOKE_SCREENSHOT_PERMISSION=1 node scripts/smoke-images.mjs`. This uses a disposable permission-adjusted harness.

`node scripts/smoke-live.mjs` prepares the live UI harness without publishing. **Adding `LIVE_UI_SMOKE=1` publishes a synthetic article and ratings to public services.** Keep its private recovery journal until cleanup is reconciled.
