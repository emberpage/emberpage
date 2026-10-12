# Development

Use Node.js 24 and the pinned pnpm version. Setup is in the [README](../README.md); packaging is in [RELEASING.md](RELEASING.md).

## Modules

| Module | Owns | Imports |
| --- | --- | --- |
| `src/domain` | Article identity, validation, ranking and contracts | Domain only |
| `src/application` | Private archives, explicit sharing and recovery | Domain; injected adapters |
| `src/storage` | Atomic IndexedDB writes, quotas and ledgers | Domain and storage |
| `src/directory` | Bounded signed listings and ratings | Domain and directory |
| `src/transport` | Article uploads/downloads | Domain and directory; injected signing identity |
| `src/extraction` | Readable HTML, images and sanitization | Domain and extraction |
| `src/platform` | Chrome capture sessions, sealed previews, inspection and signing-key storage | Domain, extraction and platform |
| `src/pages` | Popup, preview and reader | Domain, pages and the HTML sanitizer |
| `src/extension.ts` | Compose adapters, authorize and route commands | Extension modules |
| `aggregator` | Separate metadata indexing, SQLite and dashboard | Metadata directory, identifiers and contracts |

Keep state and ordering rules inside the module that owns them. Callers use its Effect workflows; they do not reach into storage or locks. Capture owns token expiry, screenshot limits and preview seals. Transport receives a lazy identity adapter and has no Chrome dependency. WXT entrypoints only start the application.

## CI gates

`pnpm check` runs strict TypeScript, typed ESLint, official Effect diagnostics, unused-code/dependency scans, import rules, tests and a WXT build. Effect warnings and errors fail CI; missing requirements, unsafe Effect assertions and untyped failure channels are errors. The diagnostic CLI uses the installed compiler without patching it.

Import rules enforce the table, reject cycles and Node imports in browser code, and keep the aggregator away from article transports and body decoding. Tests deliberately cross these seams to verify the gates. JavaScript source and diagnostic suppressions are rejected.

CI also runs `pnpm smoke`, `pnpm smoke:images`, `pnpm smoke:aggregator` and `pnpm test:drive`. These use disposable local fixtures. Read `AGENTS.md` before changing Effect code; [PROTOCOL.md](PROTOCOL.md) defines the unchanged public format and limits.
