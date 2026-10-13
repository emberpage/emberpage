import { BoundaryError, errorMessage } from '../domain/errors.ts';
import { Effect } from 'effect';
import type { Rating } from '../domain/types.ts';
import { send, status, hostname, busy, element, control, sendEffect } from './ui.ts';
import { sanitizeArticle } from '../extraction/sanitize.ts';
import { normalizeUrl } from '../domain/url.ts';
const params = new URLSearchParams(location.search);
const id = params.get('id');
function showRating(rating: Rating) {
  element('#rating-summary').textContent =
    `${rating.upvotes} helpful • ${rating.downvotes} incomplete.`;
}
const choices: [string, number][] = [
  ['#helpful', 1],
  ['#incomplete', -1]
];
for (const [selector, value] of choices) {
  const button = control(selector, 'button');
  button.addEventListener('click', () =>
    void busy(
      button,
      async () => {
        showRating(await send('RATE', { id, value }));
        status('Rating sent.');
      },
      'Sending…'
    )
  );
}
const refresh = control('#refresh-ratings', 'button');
refresh.addEventListener('click', () =>
  void busy(
    refresh,
    async () => {
      const result = await send('RATINGS', { id });
      showRating(result);
      status(result.warning || 'Ratings updated.');
    },
    'Checking…'
  )
);
const preserveButton = control('#preserve-ipfs', 'button');
let preserved = false;
let sharedCopy = false;
function ipfsError(error: unknown) {
  element('#ipfs-status').textContent = `${errorMessage(error)} Your local copy is still available.`;
  element('#ipfs-status').classList.add('error');
  preserveButton.disabled = false;
  preserveButton.textContent = sharedCopy ? 'Keep available' : 'Share on IPFS';
  preserveButton.focus();
}
const preserve = Effect.fn('Reader.preserve')(function* () {
  const keeping = sharedCopy;
  element('#ipfs-status').textContent = 'Preserving and announcing this copy…';
  const result = yield* sendEffect('CONTRIBUTE', { id });
  if (result.validationError) return yield* BoundaryError.from(undefined,result.validationError);
  if (result.cid) {
    const link = control('#ipfs-link', 'a');
    link.href = `ipfs://${result.cid}`;
    link.textContent = link.href;
    element('#ipfs-result').hidden = false;
    element('#copy-ipfs').hidden = false;
    element('#copy-label').textContent = 'IPFS copy';
  }
  if (result.shareError) {
    element('#ipfs-status').textContent = result.pinned
      ? 'Kept in this browser. Listing not published. Retry sharing to make it discoverable.'
      : `${result.shareError} Your local copy is still available.`;
    element('#ipfs-status').classList.add('error');
    preserveButton.disabled = false;
    preserveButton.textContent = result.pinned ? 'Retry sharing' : (sharedCopy ? 'Keep available' : 'Share on IPFS');
    preserveButton.focus();
    return;
  }
  if (!result.shared || !result.cid) return yield* BoundaryError.from(undefined,'Sharing did not finish. Your local copy is still available.');
  preserved = true;
  sharedCopy = true;
  element('#copy-label').textContent = 'Shared copy';
  preserveButton.textContent = keeping ? 'Kept available' : 'Shared on IPFS';
  element('#ipfs-status').textContent = result.warning || 'Listed for readers. This browser keeps the copy and contributes while running. Availability depends on connected peers.';
  element('#ratings').hidden = false;
  element('#rating-options').hidden = false;
  element('#copy-note').hidden = false;
  control('#copy-ipfs', 'button').focus();
});
preserveButton.addEventListener('click', () => {
  if (preserved || preserveButton.disabled) return;
  preserveButton.disabled = true;
  preserveButton.textContent = 'Preserving…';
  element('#ipfs-status').textContent = '';
  element('#ipfs-status').classList.remove('error');
  try {
    void Effect.runPromise(preserve()).catch(ipfsError);
  } catch (error) { ipfsError(error); }
});
const copyIpfs = control('#copy-ipfs', 'button');
copyIpfs.addEventListener('click', () => {
  void busy(copyIpfs, async () => {
    await navigator.clipboard.writeText(control('#ipfs-link', 'a').href);
    element('#ipfs-status').textContent = 'IPFS address copied. This browser keeps the snapshot.';
  });
});
const load = Effect.fn('Reader.load')(function* () {
    const { article, rating, shared } = yield* sendEffect('READ', { id });
    document.title = `${article.title} · Ember Page`;
    element('#title').textContent = article.title;
    element('#meta').textContent = [
      article.byline,
      hostname(article.url),
      `Archived ${new Date(article.capturedAt).toLocaleString()}`
    ]
      .filter(Boolean)
      .join(' • ');
    const source = control('#source', 'a');
    source.href = normalizeUrl(article.url);
    source.hidden = false;
    element('#article').innerHTML = sanitizeArticle(
      article.content,
      article.url
    );
    sharedCopy = shared === true;
    preserveButton.textContent = sharedCopy ? 'Keep available' : 'Share on IPFS';
    element('#copy-label').textContent = shared
      ? 'Shared copy'
      : 'Saved copy';
    element('#ipfs-preservation').hidden = false;
    preserveButton.disabled = false;
    element('#ratings').hidden = !shared;
    element('#rating-options').hidden = !shared;
    showRating(rating);
    element('#copy-note').hidden = !shared;
    status(params.get('notice') || '');
});
void Effect.runPromise(load()).catch((error: unknown) => status(errorMessage(error), true));
