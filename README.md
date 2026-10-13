# Ember Page

<img src="public/icons/logo.png" alt="Ember Page" width="96" height="96">

Keep articles readable when links break or pages disappear.

## Install

Download and unzip the Chrome ZIP from [Releases](https://github.com/emberpage/emberpage/releases). In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder. Pin Ember Page in Chrome’s extensions menu. It is not in the Chrome Web Store yet.

## Use

- **Save article:** keep a private, readable copy on this device.
- **Find saved copies:** find other readers’ snapshots of the page you’re visiting.
- **Share on IPFS:** make a saved copy public. No account, desktop app, or pinning service is required.
- **Keep available:** contribute a copy you found. Your browser participates while running.
- **Options:** preview, manage saved articles, or pause contribution. Pausing keeps your saved copies.

Sharing and voting are explicit. Share only what you have permission to distribute, and check for personal information first. Copies are checked for readability, not factual accuracy.

Browser sharing is experimental. Packaged browser transfers have worked across independent networks, but reliable availability is not established. See [verification and limitations](docs/VERIFICATION.md) before relying on it.

This is not permanent or anonymous storage. Peers and network providers may see your IP address; public shares and votes use a linked identifier. Availability depends on connected peers. Unused private and downloaded copies may be removed when storage fills up. Contributed copies stay until you remove them. Removing a contributed copy stops retaining it here; copies elsewhere cannot be erased. Back up anything irreplaceable.

## Develop

Use Node.js 24+ and pnpm 12.11.2.

```sh
pnpm install
pnpm dev
```

`pnpm check` runs type, lint, Effect, architecture, test, and build gates. `pnpm smoke` tests Chrome; `pnpm zip` packages the extension.

`pnpm aggregator` starts the separate [local dashboard](http://127.0.0.1:4318). It indexes listings and votes without downloading articles. The extension works independently and searches only the current page.

[Development](docs/DEVELOPMENT.md) · [Protocol and limits](docs/PROTOCOL.md) · [Verification](docs/VERIFICATION.md) · [Releases](docs/RELEASING.md)
