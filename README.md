# Ember Page

<img src="public/icons/logo.png" alt="Ember Page" width="96" height="96">

Keep readable snapshots of articles you care about, so you can revisit them when links break or pages disappear.

## Install in Chrome

1. Download the Chrome ZIP from [the latest release](https://github.com/emberpage/emberpage/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the unzipped folder.
4. Pin Ember Page using Chrome’s extensions menu.

Ember Page is not in the Chrome Web Store yet.

## Build your reading archive

- **Save:** open an article and click **Save article** in Ember Page. A private copy opens, ready to read.
- **Read:** open a saved article from **Archive**, or choose **Community** to browse articles shared by others.
- **Options:** preview before saving, manage saved articles, or save a text-only copy. The preview also lets you share publicly; the reader offers the original link and ratings.

## Privacy and storage

Saving is private by default. **Share publicly** publishes your copy, title, and original link. Share only what you have permission to distribute, and check for personal information first. Community articles are checked for readability, not factual accuracy.

Sharing is not anonymous: service providers can see your IP address, and public activity from this installation can be linked. Removing a saved copy does not remove public copies.

This is a limited archive, not permanent storage. Older unused articles may be removed to make room, and public hosting has no guaranteed lifetime. Keep a separate backup of anything irreplaceable.

## Development

Use Node.js 24+ and pnpm 12.11.2.

```sh
pnpm install
pnpm dev
```

Run `pnpm check` for TypeScript, linting, Effect diagnostics, architecture checks, tests and the WXT build. `pnpm smoke` tests the extension in Chrome; `pnpm zip` packages it.

`pnpm aggregator` starts a separate [local dashboard](http://127.0.0.1:4318). It tracks community archive listings and ratings without downloading articles. The extension works without it.

See [development](docs/DEVELOPMENT.md), [architecture and limits](docs/PROTOCOL.md), [verification](docs/VERIFICATION.md), and [releases](docs/RELEASING.md).
