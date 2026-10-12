# Development

Use Node.js 24 and the pnpm version in `package.json`. See the [README](../README.md) for setup and [release guide](RELEASING.md) for packaging.

- `entrypoints/`: WXT startup wrappers and extension pages. Capture is an unlisted script, injected only on request.
- `src/`: extension behavior. Effect owns background commands, sharing, discovery, cancellation and bounded network work. Pure helpers handle validation, hashing, ranking and storage rules.
- `public/`: packaged styles and icons.
- `aggregator/`: separate localhost dashboard and bounded metadata storage.

`pnpm check` covers every TypeScript module, including tests, scripts and configuration. It runs typed ESLint, unused-code and dependency checks, architecture rules, tests and a WXT build. JavaScript source, type suppressions and modules without Effect are rejected. Read `AGENTS.md` before changing Effect code. The production transport contract is in [PROTOCOL.md](PROTOCOL.md).

Version 0.1.1 starts fresh: databases, signing-key storage, article format (`emberpage.article`), and listing/rating tags use Ember Page names. Earlier records are not read or migrated. Older experiments are available in Git history.

The supplied logo is preserved in `assets/ember-page-logo.png`. Resized PNGs in `public/icons/` are used by the extension and dashboard.
