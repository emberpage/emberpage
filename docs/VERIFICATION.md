# Testing and limitations

## Testing release: 0.1.9

This release passed **94 automated tests**, strict TypeScript, linting, Effect diagnostics, architecture and unused-code checks, release-manifest validation, and extension/image/dashboard smoke tests. **20 sequential fixture scenarios** covered private save/read/remove, preview validation, text-only recovery, malformed content, offline failures, repeated actions, pending shares and eviction. These tests publish nothing.

Layout checks cover 360, 800 and 1,280 px widths, keyboard navigation, local fonts, light/dark themes and shadcn Typeset article styling. Release CI and ZIP checksums are available on [GitHub](https://github.com/emberpage/emberpage/releases).

Native Chrome for Testing captured all six Wikipedia images with unchanged production permissions. An earlier “image unavailable” report misread the accessibility label of successfully embedded images. Missing descriptions now remain empty; only failed image captures get an unavailable placeholder. Isolated image fixtures use temporary permissions and do not establish native toolbar behavior on their own.

## Public services

Earlier synthetic tests verified upload, signed listing, independent-reader validation, images and rating discovery before the Ember Page namespace change. They have not been repeated in the current namespace. Test records later disappeared and tested file URLs returned 404; this does not prove every remote copy was deleted.

Long-term retention, provider quotas and sustained capacity remain unproven. Sharing is not anonymous. Signatures do not establish article accuracy or independent voters. The dashboard observes metadata; Community checks complete article files before displaying them.

Chrome Web Store submission and public dashboard hosting are not configured.

## Run the checks

```sh
pnpm check
pnpm smoke
pnpm smoke:images
pnpm smoke:aggregator
pnpm test:drive
```

Set `CHROMIUM_EXECUTABLE` to test with another installed Chromium browser. Fixture tests use disposable profiles and temporary local/screenshot permissions; native toolbar behavior needs a separate manual check.
