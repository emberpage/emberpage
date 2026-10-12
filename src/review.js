import { send, status, busy, hostname } from './ui.js';
import { articleForMode } from './preview.js';
import { sanitizeArticle } from './sanitize.js';
let capturedArticle;
const textOnly = document.querySelector('#text-only');
textOnly.addEventListener('change', renderPreview);
function renderPreview() {
  if (!capturedArticle) return;
  document.querySelector('#article').innerHTML = sanitizeArticle(
    articleForMode(capturedArticle, textOnly.checked).content,
    capturedArticle.url
  );
  setControlsDisabled(false);
  status(
    capturedArticle.imageLimitExceeded && !textOnly.checked
      ? capturedArticle.imageWarning
      : '',
    capturedArticle.imageLimitExceeded && !textOnly.checked
  );
}
const id = new URLSearchParams(location.search).get('id');
const buttons = [...document.querySelectorAll('button')];
function setControlsDisabled(disabled) {
  buttons.forEach((button) => {
    button.disabled =
      disabled ||
      !capturedArticle ||
      (button.id !== 'discard' &&
        capturedArticle.imageLimitExceeded === true &&
        !textOnly.checked);
  });
  textOnly.disabled = disabled || !capturedArticle;
}
async function save(share) {
  const action = document.querySelector(share ? '#share' : '#save');
  setControlsDisabled(true);
  try {
    status(share ? 'Saving and sharing publicly…' : 'Saving your copy…');
    const result = await send('SAVE', {
      id,
      share,
      textOnly: textOnly.checked
    });
    if (result.validationError) {
      status(`${result.validationError} Saved on this device.`, true);
      setControlsDisabled(false);
      action.focus();
      return;
    }
    if (result.shareError) {
      status(
        `${result.shareError} Saved on this device. Choose Share publicly to retry.`,
        true
      );
      setControlsDisabled(false);
      action.focus();
      return;
    }
    document.querySelector('#review-controls').hidden = true;
    status(
      result.warning ||
        (share
          ? 'Shared publicly. The hosting service may remove this copy.'
          : 'Saved on this device.')
    );
    const open = document.createElement('button');
    open.className = 'primary';
    open.textContent = 'Read saved copy';
    open.setAttribute('aria-describedby', 'status');
    open.addEventListener('click', () =>
      busy(open, () => send('OPEN_COPY', { id: result.contentHash }))
    );
    document.querySelector('#status').after(open);
    open.focus();
  } catch (error) {
    status(error.message, true);
    setControlsDisabled(false);
    action.focus();
  }
}
document.querySelector('#save').addEventListener('click', () => save(false));
document.querySelector('#share').addEventListener('click', () => save(true));
document.querySelector('#discard').addEventListener('click', () =>
  busy(document.querySelector('#discard'), async () => {
    await send('DISCARD', { id });
    document.querySelector('main').replaceChildren(
      Object.assign(document.createElement('p'), {
        textContent: 'Preview discarded. You can close this tab.'
      })
    );
  })
);
send('DRAFT', { id })
  .then((article) => {
    capturedArticle = article;
    document.querySelector('#title').textContent = article.title;
    document.querySelector('#meta').textContent = [
      article.byline,
      hostname(article.url)
    ]
      .filter(Boolean)
      .join(' • ');
    renderPreview();
  })
  .catch((error) => status(error.message, true));
