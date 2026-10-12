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
- **Read:** your **Archive** opens first. Choose **Community** to browse popular archived articles. Each is checked for readability; its facts are not verified.
- **More:** **Options** lets you preview before saving or manage saved copies. In a preview, **More options** offers **Share publicly**, **Text only**, and discard. Public sharing is optional and only for articles you have permission to redistribute. The reader’s **Article options** includes the original link and ratings.

Nothing is saved or shared until you choose an action. Ratings are sent only when you press a rating button.

## Privacy and storage

Saving is private by default. **Share publicly** publishes the article snapshot, title, and original link for anyone to read. Check for personal information before making an archive public.

Sharing is not anonymous: service providers can see your IP address, and public activity from this installation can be linked. Removing a saved copy does not remove public copies.

This is a limited archive, not permanent storage. Older unused articles may be removed to make room, and public hosting has no guaranteed lifetime. Keep a separate backup of anything irreplaceable.

## Development

Use Node.js 24+ and pnpm 12.11.2.

```sh
pnpm install
pnpm dev
```

All code is TypeScript. Effect handles workflows and validation. `pnpm check` enforces typed linting, unused-code and architecture rules, then runs tests and the WXT build. `pnpm smoke` tests the extension in Chrome. `pnpm zip` creates a release ZIP.

`pnpm aggregator` starts a separate [local dashboard](http://127.0.0.1:4318). It tracks community archive listings and ratings without downloading articles. The extension works without it.

See [development](docs/DEVELOPMENT.md), [architecture and limits](docs/PROTOCOL.md), [verification](docs/VERIFICATION.md), and [releases](docs/RELEASING.md).
