# Testing and limitations

## Browser mesh

The current packaged extension transferred a **433,865-byte snapshot from this Mac to a GitHub-hosted browser**, with exact size and SHA-256. Both used real offscreen documents, Chrome messaging, production CSP, IndexedDB contribution storage, WebRTC and Bitswap. No desktop node, gateway or pinning account was needed. Evidence: `artifacts/simplification-cycle/pass-27/`.

A separate standalone-browser WAN transfer passed in pass 22. Earlier public-relay attempts failed with rejected reservations, full contributor connection capacity or a handshake timeout. Mesh now leaves connection capacity for readers. These successes prove actual transfer, not guaranteed availability: contributors must remain online, browser storage is not permanent, and sustained capacity/hostile networks remain untested.

Independent-network tests used synthetic copies and direct fixture listings. A subsequent live test published one original synthetic article through the production extension, discovered it through Nostr in a fresh browser, fetched and validated it through IPFS, cached it, opened the reader UI and verified offline reading. That discovery test used two local browsers and a seeded private archive; it does not add independent-network or native capture evidence. No user article or rating was published. Disposable browser profiles and local contributions were removed; the synthetic public listing remains subject to relay retention. Evidence is retained in `artifacts/final-qualification/live-result.json`.

External pinning integration, Chrome Web Store submission and public dashboard hosting are not configured. The aggregator remains metadata-only. Browser pins are neither permanent nor anonymous.

## Application checks

`pnpm check` runs unit tests, strict TypeScript, ESLint, Effect diagnostics, unused-code and architecture checks, WXT build and release validation. Chrome extension, image and aggregator smoke tests pass; all 20 sequential browser test-drive cases pass. Fixtures cover private save/read/remove, preview, text-only recovery, malformed content, offline sharing, quotas, keyboard navigation, light/dark and narrow layouts. Network evidence stays in `artifacts/browser-ipfs/`; current simplification checks and screenshots are in `artifacts/simplification-cycle/`.

Earlier native Chrome testing verified genuine toolbar capture and six embedded Wikipedia images. Automated capture fixtures use temporary local/screenshot permissions and are separate evidence.

## Reproduce

```sh
pnpm check
pnpm smoke
pnpm smoke:images
pnpm smoke:aggregator
pnpm test:drive
```

Set `CHROMIUM_EXECUTABLE` to use another installed Chromium. Tests use disposable profiles; ordinary native toolbar use needs a separate check.
