# How Ember Page works

Ember Page preserves readable article snapshots for when links break or pages disappear. Saving is private by default; public sharing is optional and requires permission to redistribute the article.

## Extension

Save article extracts the selected page, saves a private copy, and opens the reader. Options offers a preview before saving; its More options includes public sharing, text-only mode, and discard. Oversized images open the preview for an explicit text-only choice. Sharing saves a local copy, uploads the article file, then publishes its title and link. A failed share keeps the local copy and offers an explicit retry.

Selecting Community starts a bounded search and shows only downloaded articles that pass integrity, safety, image and readability checks. Opening an article and rating it are separate actions. There is no automatic sharing, voting or background serving.

## Two services

[Blossom](https://github.com/hzrd149/blossom) stores article files. [Nostr](https://github.com/nostr-protocol/nips/blob/master/01.md) carries small signed listings and ratings so readers can discover those files. Both currently use Primal endpoints. The extension uses one provider and one relay, without automatic fallbacks.

Files and listings are public. Signatures identify an installation's key; they do not establish the author's identity, permission to share, factual accuracy or independent voters. These services can observe connecting IP addresses. Remote retention and availability depend on the provider; uploaded articles are not permanent storage.

Local copies have count and size limits. Older copies can be evicted to make space; pending shares are protected. Articles do not expire after 24 hours, but discovery searches the last 30 days and popularity uses the last seven days.

The [protocol](PROTOCOL.md) defines the file format, validation, ranking and exact limits. [Verification](VERIFICATION.md) records the tested behavior and remaining service-policy questions.

## Optional dashboard

The dashboard runs separately on localhost. It reads titles, links and ratings to show trends and connection activity. It never downloads article files. Its trends are observations of metadata, not proof that an article is safe or readable.

The extension does not call the dashboard and works while it is stopped. There is no public dashboard deployment or extension-facing API.

## Experiments

IPFS experiments stay in `spikes/`. They are not used by the extension. Earlier Waku, Nostr and Blossom probes remain in [research](research/README.md).
