# MeshCache · Emberpage

A Chrome Manifest V3 extension for explicit article caching. Keep a copy on your device or share it for readers. Blossom stores article files; small signed Nostr events provide discovery and ratings. A separate localhost dashboard indexes metadata. The extension never calls the dashboard.

## Run locally

```sh
pnpm install
pnpm check
pnpm dev
```

Use Node.js 24 or newer and pnpm 12.11.2. WXT opens a development browser with the extension installed. For a production build, run `pnpm build` and load `.output/chrome-mv3/` at `chrome://extensions` with Developer mode enabled.

- **Cache → Preview this article:** review the extracted text and images, then choose **Cache only for me**, **Cache for readers**, or **Discard**.
- **Popular → Browse popular articles:** retrieve a bounded batch and show only complete copies that pass every reader-side check. Select a copy to read it locally.
- **Saved:** open or remove local copies. An unfinished share has an explicit retry or cancellation action.
- **Reader ratings:** Helpful/Incomplete publishes a signed vote only when pressed.

No automatic capture, publication, seeding, rating, or republishing. Opening the popup reads local state. Public sharing exposes the original URL, title, article, and installation signing key. Providers can see your IP. Only share content you have permission to distribute.

## Local dashboard

```sh
pnpm aggregator
```

Open [localhost:4318](http://127.0.0.1:4318). The dashboard stores only signed listing and rating metadata, computes rolling trends, and shows indexing health and rejection reasons. It binds to localhost, retains a bounded seven-day journal, and never retrieves article bodies. The extension works when this process is stopped. Dashboard trends are metadata observations, not validated readable copies.

## Code structure

WXT discovers the extension's entrypoints and generates its manifest. Browser pages remain small vanilla HTML/CSS/JavaScript views. Effect TypeScript owns background share/discovery orchestration, cancellable transport operations, and the separate aggregator's indexing and resource lifetimes. Pure article inspection, hashing, ranking, and storage rules remain focused modules.

The main project uses pnpm and a frozen lockfile. Research under `spikes/` is isolated, has its own recorded dependency trees, and is not shipped in the extension. Historical evidence describes the builds used at the time; current development and release commands are below.

## Storage and transport

One public UTF-8 JSON article format, with embedded WebP images. No URL-derived encryption, compression wrapper, Waku, chunking, legacy decoder, or provider fallback. Format versions are independent of extraction and image-encoder settings; unknown versions are skipped rather than guessed. Optional inert fields can evolve within the same version.

The exact file SHA-256 verifies downloaded bytes. A separate content hash over the required content fields identifies a snapshot independently of capture time and serialization. Signed listings bind those hashes and metadata; readers match the downloaded body and sanitize it before rendering. Signatures identify keys, not truthful publishers or independent people.

Initial limits: 2 MiB per file, 10 embedded images, WebP 1,600 px at quality 0.8, and 1 MiB total image data. Decoded image dimensions and aggregate pixels are bounded before rendering. A capture exceeding image limits requires an explicit text-only choice. Cross-origin images use the existing authorized capture strategies; some images remain unavailable.

Contributor and reader caches each retain up to 100 articles / 16 MiB with least-recently-used eviction. Pending shares are protected and receipts are separately capped at 20 / 256 KiB. Metadata and ratings have independent count/byte limits. There is no 24-hour article expiry. Discovery and ranking have time windows; old retained articles remain readable. Remote availability depends on the provider and is not permanent storage.

The initial provider is `blossom.primal.net`; metadata uses `relay.primal.net`. Public downloads use the qualified `media.primal.net` hash path and fail closed on redirects. Primal currently requires padded Base64 authorization; this is explicit provider behavior, not a generic Blossom compatibility layer. Clearing article caches preserves the signing key. Losing that key may prevent owner-authorized deletion. Local removal does not delete public files or listings.

## Verification

```sh
pnpm check
pnpm smoke
pnpm smoke:aggregator
pnpm test:drive
pnpm zip
```

The automated checks use synthetic fixtures. Live transport checks must be explicit; they can publish public synthetic listings and files. The [20 sequential drive log](docs/TEST-DRIVE.md) includes edge cases and screenshots. See the [verification report](docs/VERIFICATION.md) for what was actually run.

## Releases

[GitHub releases](https://github.com/emberpage/emberpage/releases) contain versioned Chrome ZIPs and checksums. CI verifies builds and browser behavior before publishing a tagged release. See [the release process](docs/RELEASING.md). Chrome Web Store submission and public aggregator hosting are separate and are not configured.

## Design and evidence

- [Implementation plan](docs/PLAN.md)
- [Protocol contract](docs/PROTOCOL.md)
- [Blossom spike](docs/research/blossom-spike.md)
- [Nostr discovery research](docs/research/discovery-without-nostr.md)

Readability extracts the article. A strict DOM allowlist removes active content and remote resources. Candidate quality checks derive text and structure from the rendered copy; they do not require matching extractor versions or trust producer-supplied metrics. Public ratings remain vulnerable to fabricated identities, so popularity is a bounded preference signal.
