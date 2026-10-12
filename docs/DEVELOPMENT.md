# Development

Use Node.js 24 and the pnpm version in `package.json`. See the [README](../README.md) for setup and [release guide](RELEASING.md) for packaging.

- `entrypoints/`: WXT startup wrappers and extension pages. Capture is an unlisted script, injected only on request.
- `src/`: extension behavior. Effect owns background commands, sharing, discovery, cancellation and bounded network work. Pure helpers handle validation, hashing, ranking and storage rules.
- `public/`: packaged styles and icons.
- `aggregator/`: separate localhost dashboard and bounded metadata storage.
- `spikes/`: isolated experiments, excluded from the extension.

Read `AGENTS.md` before changing Effect code. The production transport contract is in [PROTOCOL.md](PROTOCOL.md).

Version 0.1.1 starts fresh: databases, signing-key storage, article format (`emberpage.article`), and listing/rating tags use Ember Page names. Earlier records are not read or migrated. Historical signed research evidence remains unchanged; `v0.1.0` contains the pre-rebrand source.

The supplied logo is preserved in `assets/ember-page-logo.png`. Resized PNGs in `public/icons/` are used by the extension and dashboard.
