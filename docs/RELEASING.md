# Releases

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm smoke
pnpm smoke:aggregator
pnpm test:drive
pnpm zip
```

WXT writes the unpacked Chrome extension and versioned ZIP to `.output/`. The manifest version comes from `package.json`; do not maintain a second version in a manifest file.

For the next release, update the package version on a branch and merge a pull request after its required checks pass. From the updated main branch, push a matching tag:

```sh
git switch main
git pull --ff-only
git tag v0.1.2
git push origin v0.1.2
```

GitHub Actions installs the frozen lockfile, typechecks, runs tests, builds, and drives the actual extension and local dashboard. It verifies the production manifest, packages the extension, and records ZIP SHA-256 checksums. A matching `v` tag publishes those verified artifacts as a GitHub release. A failed check prevents release publication.

This pipeline publishes GitHub downloads. Chrome Web Store submission is a separate release step that requires a developer account and store credentials; none are configured here. The aggregator and isolated research experiments are not included in the extension ZIP.
