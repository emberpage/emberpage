# Release a Chrome ZIP

Use Node.js 24 and the pnpm version in `package.json`.

1. Change the version in `package.json` on a branch. WXT uses it for the manifest and ZIP name.
2. Run the checks below and merge the pull request after required CI checks pass.
3. From updated `main`, push a tag matching the package version.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm smoke
pnpm smoke:images
pnpm smoke:aggregator
pnpm test:drive
pnpm zip

# Example for package version 0.1.7:
git switch main
git pull --ff-only
git tag v0.1.7
git push origin v0.1.7
```

Local files are in `.output/`: the unpacked extension and versioned Chrome ZIP. GitHub Actions repeats checks, verifies the manifest, and publishes the ZIP with SHA-256 checksums when a matching tag passes. A failed check prevents publication.

This releases [GitHub downloads](https://github.com/emberpage/emberpage/releases). Chrome Web Store submission requires a separate developer account and credentials. The separate dashboard is excluded from the ZIP.
