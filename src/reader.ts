import { Effect } from 'effect';
import type { Rating } from './types.ts';
import { send, status, hostname, busy, element, control, errorMessage, sendEffect } from './ui.ts';
import { sanitizeArticle } from './sanitize.ts';
import { normalizeUrl } from './core/url.ts';
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
      showRating(await send('RATINGS', { id }));
      status('Ratings updated.');
    },
    'Checking…'
  )
);
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
    element('#copy-label').textContent = shared
      ? 'Shared copy'
      : 'Private copy';
    element('#ratings').hidden = !shared;
    showRating(rating);
    element('#copy-note').hidden = !shared;
    status(params.get('notice') || '');
});
void Effect.runPromise(load()).catch((error: unknown) => status(errorMessage(error), true));
