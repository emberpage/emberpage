import { BoundaryError, errorMessage } from '../domain/errors.ts';
import { Effect } from 'effect';
import type { PopularEntry } from '../domain/types.ts';
import { send, status, busy, hostname, element, control } from './ui.ts';
const $ = element;
const buttonAt = (selector: string) => control(selector, 'button');
let currentTab: chrome.tabs.Tab | undefined;
let managing = false;
async function init() {
  const stored: unknown = await chrome.storage.local.get('accepted');
  const accepted = !!stored && typeof stored === 'object' && 'accepted' in stored && stored.accepted === true;
  if (!accepted) await send('ACCEPT');
  const tabs = await Effect.runPromise(Effect.tryPromise({
    try: () => chrome.tabs.query({ active: true, currentWindow: true }),
    catch: (error) => BoundaryError.from(error, errorMessage(error))
  }));
  [currentTab] = tabs;
  const supported = /^https?:\/\//.test(currentTab?.url || '');
  $('#domain').hidden = !supported;
  $('#domain').textContent = supported
    ? hostname(currentTab?.url || '')
    : '';
  $('#page-title').textContent = supported
    ? currentTab?.title || currentTab?.url || 'Article'
    : 'Open an article to preserve it.';
  buttonAt('#capture').disabled = !supported;
  buttonAt('#previewMenu').disabled = !supported;
  buttonAt('#browse').disabled = !supported;
  if (supported) renderCatalog(await send('LOCAL_CATALOG', { url: currentTab?.url }));
  await library();
}
function selectView(view: string) {
  for (const name of ['read', 'library']) $(`#${name}-view`).hidden = name !== view;
  status('');
}
function item(title: string, detail: string, open?: () => Promise<unknown>) {
  const row = document.createElement('div');
  row.className = 'item';
  const button = document.createElement('button');
  const main = open ? button : document.createElement('div');
  main.className = 'item-main';
  const label = document.createElement('span');
  label.className = 'item-title';
  label.textContent = title;
  const meta = document.createElement('span');
  meta.className = 'item-detail';
  meta.textContent = detail;
  main.append(label, meta);
  if (open) button.addEventListener('click', () => void busy(button, open));
  row.append(main);
  return row;
}
function empty(container: HTMLElement, text: string) {
  const paragraph = document.createElement('p');
  paragraph.className = 'empty';
  paragraph.textContent = text;
  container.append(paragraph);
}
function renderCatalog(entries: PopularEntry[], emptyMessage = 'No saved copies of this page found.') {
  const container = $('#catalog-list');
  container.replaceChildren();
  if (!entries.length)
    empty(container, emptyMessage);
  for (const entry of entries) {
    const helpful = entry.rating?.upvotes || 0;
    container.append(
      item(
        entry.title,
        `Archived ${new Date(entry.capturedAt).toLocaleDateString()} · ${helpful} helpful ${helpful === 1 ? 'vote' : 'votes'}`,
        async () => {
          await send('OPEN_COPY', { id: entry.contentHash });
          status('Article opened in a new tab.');
        }
      )
    );
  }
}
async function browse(button: HTMLButtonElement) {
  await busy(button, async () => {
    if (!$('#catalog-list').querySelector('.item')) $('#catalog-list').replaceChildren();
    if (!/^https?:\/\//.test(currentTab?.url || '')) throw new Error('Choose a web article first.');
    status('Finding copies…');
    const result = await send('CATALOG', { url: currentTab?.url });
    const entries = result.entries;
    renderCatalog(entries, result.warning || undefined);
    status(entries.length ? result.warning : '');
  });
}
buttonAt('#browse').addEventListener('click', () => {
  managing = false;
  selectView('read');
  void browse(buttonAt('#browse')).catch((error) => status(errorMessage(error), true));
});
function capture(button: HTMLButtonElement, action: 'SAVE_PAGE' | 'CAPTURE') {
  return busy(button, async () => {
    if (currentTab?.id === undefined) throw new Error('Choose an article tab first.');
    await send(action, { tabId: currentTab.id });
    status(action === 'SAVE_PAGE' ? 'Article opened in a new tab.' : 'Preview opened in a new tab.');
  }, action === 'SAVE_PAGE' ? 'Saving…' : 'Preparing preview…');
}
buttonAt('#capture').addEventListener('click', () => void capture(buttonAt('#capture'), 'SAVE_PAGE'));
buttonAt('#previewMenu').addEventListener('click', () => void capture(buttonAt('#previewMenu'), 'CAPTURE'));
async function library() {
  const supported = /^https?:\/\//.test(currentTab?.url || '');
  $('#library-view').hidden = !managing && !supported;
  const records = managing
    ? await send('LIBRARY')
    : supported ? await send('LIBRARY', { url: currentTab?.url }) : [];
  $('#library-title').textContent = managing ? 'Your archive' : 'Saved for this page';
  $('#saved-count').textContent = String(records.length);
  buttonAt('#clear').hidden = !records.length;
  $('#done').hidden = !managing;
  $('#saved-count').hidden = managing;
  const container = $('#library-list');
  container.replaceChildren();
  if (!records.length)
    empty(container, managing ? 'Your archive is empty.' : 'No saved copy of this page yet.');
  for (const record of records) {
    const detail = record.pendingShare
      ? 'Sharing unfinished'
      : record.shared
        ? record.source === 'reader'
          ? 'Community archive'
          : 'Public archive'
        : 'Saved on this device';
    const row = record.source === 'mesh'
      ? item(record.title, 'The article is no longer in your archive. Remove its retained contribution to free space.')
      : item(record.title, `${managing ? hostname(record.url) + ' · ' : ''}${new Date(record.capturedAt).toLocaleString()} · ${detail}`, () =>
        send('OPEN_COPY', { id: record.contentHash })
      );
    const controls = document.createElement('div');
    controls.className = 'item-actions';
    controls.hidden = !managing;
    if (record.pendingShare) {
      const retry = document.createElement('button');
      retry.className = 'small-button';
      retry.textContent = 'Retry sharing';
      retry.addEventListener('click', () => {
        void busy(retry, async () => {
          const result = await send('CONTRIBUTE', { id: record.contentHash });
          status(
            result.warning ||
              result.shareError ||
              (result.shared ? 'Shared publicly.' : result.validationError),
            !result.shared
          );
          await library();
          focusLibrary();
        });
      });
      controls.append(retry);
      const discard = document.createElement('button');
      discard.className = 'small-button';
      discard.textContent = 'Cancel sharing';
      discard.addEventListener('click', () =>
        void busy(discard, async () => {
          await send('DISCARD_SHARE', { id: record.contentHash });
          await library();
          focusLibrary();
          status(
            'Sharing canceled. An IPFS copy may still be public.'
          );
        })
      );
      controls.append(discard);
    }
    const remove = document.createElement('button');
    remove.className = 'small-button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${record.title}`);
    remove.addEventListener('click', () =>
      void busy(remove, async () => {
        await send('DELETE', { id: record.contentHash, source: record.source });
        await library();
        focusLibrary();
      })
    );
    controls.append(remove);
    row.append(controls);
    container.append(row);
  }
}
async function manageLibrary() {
  managing = true;
  selectView('library');
  control('#options', 'details').open = false;
  try {
    await library();
    (document.querySelector('#library-list .item-actions button') ? buttonAt('#library-list .item-actions button') : buttonAt('#done')).focus();
  } catch (error) { status(errorMessage(error), true); }
}
async function finishManaging() {
  managing = false;
  selectView('library');
  try {
    await library();
    focusLibrary();
  } catch (error) { status(errorMessage(error), true); }
}
$('#manage').addEventListener('click', () => { void manageLibrary(); });
$('#done').addEventListener('click', () => { void finishManaging(); });
function focusLibrary() {
  (document.querySelector('#library-list button') ? buttonAt('#library-list button') : control('#options > summary', 'summary')).focus();
}
buttonAt('#clear').addEventListener('click', () =>
  void busy(buttonAt('#clear'), async () => {
    await send('CLEAR');
    managing = false;
    selectView('library');
    await library();
    renderCatalog([]);
    control('#options', 'details').open = false;
    focusLibrary();
    status(
      'Saved copies removed. Public copies may still be available.'
    );
  })
);
init().catch((error) => status(errorMessage(error), true));

buttonAt('#pause-contribution').addEventListener('click', () =>
  void busy(buttonAt('#pause-contribution'), async () => {
    await send('STOP_MESH');
    control('#options', 'details').open = false;
    control('#options > summary', 'summary').focus();
    status('Contribution paused. Saved copies stay on this device.');
  })
);
