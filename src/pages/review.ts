import { errorMessage } from '../domain/errors.ts';
import { Effect } from 'effect';
import type { Article } from '../domain/types.ts';
import { send, status, busy, hostname, element, control, sendEffect } from './ui.ts';
import { articleForMode } from '../domain/preview.ts';
import { sanitizeArticle } from '../extraction/sanitize.ts';
let capturedArticle: (Article & { textContent: string }) | undefined;
const textOnly = control('#text-only', 'input');
textOnly.addEventListener('change', renderPreview);
function renderPreview() {
  if (!capturedArticle) return;
  element('#article').innerHTML = sanitizeArticle(
    articleForMode(capturedArticle, textOnly.checked).content,
    capturedArticle.url
  );
  setControlsDisabled(false);
  if (capturedArticle.imageLimitExceeded && !textOnly.checked)
    control('#article-options', 'details').open = true;
  status(
    capturedArticle.imageLimitExceeded && !textOnly.checked
      ? capturedArticle.imageWarning
      : '',
    capturedArticle.imageLimitExceeded && !textOnly.checked
  );
}
const id = new URLSearchParams(location.search).get('id');
const buttons = [...document.querySelectorAll('button')];
function setControlsDisabled(disabled: boolean) {
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
function save(share: boolean): Promise<void> {
  const action = control(share ? '#share' : '#save', 'button');
  let completed = false;
  return Effect.runPromise(Effect.acquireUseRelease(
    Effect.sync(() => setControlsDisabled(true)),
    () => Effect.gen(function* () {
      status(share ? 'Preserving and sharing on IPFS…' : 'Saving your copy…');
      const result = yield* sendEffect('SAVE', { id, share, textOnly: textOnly.checked });
      if (result.validationError) {
        status(`${result.validationError} Saved on this device.`, true);
        return;
      }
      if (result.shareError) {
        status(`${result.shareError} Saved on this device. Choose Share on IPFS to retry.`, true);
        return;
      }
      const reader = new URL('reader.html', location.href);
      reader.searchParams.set('id', result.contentHash);
      const notice = result.warning || (share ? 'Shared publicly.' : '');
      if (notice) reader.searchParams.set('notice', notice);
      location.replace(reader.href);
      completed = true;
    }).pipe(Effect.catch((error) => Effect.sync(() => status(error.message, true)))),
    () => Effect.sync(() => {
      if (!completed) { setControlsDisabled(false); action.focus(); }
    })
  ));
}
control('#save', 'button').addEventListener('click', () => void save(false));
control('#share', 'button').addEventListener('click', () => void save(true));
control('#discard', 'button').addEventListener('click', () =>
  void busy(control('#discard', 'button'), async () => {
    await send('DISCARD', { id });
    const confirmation = element('#status');
    element('main').replaceChildren(confirmation);
    confirmation.tabIndex = -1;
    status('Preview discarded. You can close this tab.');
    confirmation.focus();
  })
);
send('DRAFT', { id })
  .then((article) => {
    capturedArticle = article;
    element('#title').textContent = article.title;
    element('#meta').textContent = [
      article.byline,
      hostname(article.url)
    ]
      .filter(Boolean)
      .join(' • ');
    renderPreview();
  })
  .catch((error) => status(errorMessage(error), true));
