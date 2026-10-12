import { send, status, hostname, busy } from './ui.js';
import { sanitizeArticle } from './sanitize.js';
import { normalizeUrl } from './core/url.js';
const params = new URLSearchParams(location.search);
const id = params.get('id');
function showRating(rating) {
  document.querySelector('#rating-summary').textContent =
    `${rating.upvotes} helpful • ${rating.downvotes} incomplete.`;
}
for (const [selector, value] of [
  ['#helpful', 1],
  ['#incomplete', -1]
]) {
  const button = document.querySelector(selector);
  button.addEventListener('click', () =>
    busy(
      button,
      async () => {
        showRating(await send('RATE', { id, value }));
        status('Rating sent.');
      },
      'Sending…'
    )
  );
}
const refresh = document.querySelector('#refresh-ratings');
refresh.addEventListener('click', () =>
  busy(
    refresh,
    async () => {
      showRating(await send('RATINGS', { id }));
      status('Ratings updated.');
    },
    'Checking…'
  )
);
send('READ', { id })
  .then(({ article, rating, shared }) => {
    document.title = `${article.title} · Ember Page`;
    document.querySelector('#title').textContent = article.title;
    document.querySelector('#meta').textContent = [
      article.byline,
      hostname(article.url),
      `Saved ${new Date(article.capturedAt).toLocaleString()}`
    ]
      .filter(Boolean)
      .join(' • ');
    const source = document.querySelector('#source');
    source.href = normalizeUrl(article.url);
    source.hidden = false;
    document.querySelector('#article').innerHTML = sanitizeArticle(
      article.content,
      article.url
    );
    document.querySelector('#copy-label').textContent = shared
      ? 'Shared copy'
      : 'Private copy';
    document.querySelector('#ratings').hidden = !shared;
    showRating(rating);
    document.querySelector('#copy-note').hidden = !shared;
    status(params.get('notice') || '');
  })
  .catch((error) => status(error.message, true));
