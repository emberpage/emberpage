# Ember Page

<img src="public/icons/logo.png" alt="Ember Page" width="96" height="96">

Save an article to read later, or share a copy for other people to read.

## Install in Chrome

1. Download the Chrome ZIP from [the latest release](https://github.com/emberpage/emberpage/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the unzipped folder.
4. Pin Ember Page using Chrome’s extensions menu.

Ember Page is not in the Chrome Web Store yet.

## Save, share, and read

- **Save:** open an article and click **Save article** in Ember Page. A private copy opens, ready to read.
- **Read:** saved copies are shown first. Choose **Popular** to find shared copies, then pick one to read. Copies are checked for readability; their facts are not verified.
- **More:** **Options** lets you preview before saving or manage saved copies. In a preview, **More options** offers **Share publicly**, **Text only**, and discard. The reader’s **Article options** includes the original link and ratings.

Nothing is saved or shared until you choose an action. Ratings are sent only when you press a rating button.

## Privacy and storage

Private copies stay on this device. Public sharing makes the article, title, and link available to anyone. Check for personal information and share only content you have permission to distribute.

Sharing is not anonymous: service providers can see your IP address, and public activity from this installation can be linked. Removing a saved copy does not remove public copies.

Space is limited, so older unused copies may be removed. Shared copies have no fixed expiry, but the hosting service can remove them. Keep another copy of anything important.

## Development

Use Node.js 24+ and pnpm 12.11.2.

```sh
pnpm install
pnpm dev
```

`pnpm check` checks types, tests, and the build. `pnpm smoke` tests the extension in Chrome. `pnpm zip` creates a release ZIP.

`pnpm aggregator` starts a separate [local dashboard](http://127.0.0.1:4318). It tracks public titles, links, and ratings without downloading articles. The extension works without it.

See [development](docs/DEVELOPMENT.md), [architecture and limits](docs/PROTOCOL.md), [verification](docs/VERIFICATION.md), and [releases](docs/RELEASING.md).
