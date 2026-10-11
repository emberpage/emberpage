# Working in this repository

Keep article capture, sharing, ratings, and serving explicit. Keep the aggregator separate and metadata-only. Preserve validation, quotas, sanitization, and failure recovery when refactoring.

Use pnpm. Run `pnpm check` before publishing changes. Run the browser smoke tests when extension entrypoints or workflows change. Experiments under `spikes/` are isolated and are not production transports.

# Learning more about Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
**completely**, and follow the links in the file when required.

If you need to learn more about particular Effect apis and concepts that the
guide doesn't cover, search through the source code in `node_modules/effect/src`.
