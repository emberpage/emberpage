import { send, status, busy, hostname } from './ui.js';
const $ = (selector) => document.querySelector(selector);
let currentTab;
let managing = false;
async function init() {
  const { accepted } = await chrome.storage.local.get('accepted');
  if (!accepted) await send('ACCEPT');
  const [tabs, catalog] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    send('LOCAL_CATALOG')
  ]);
  [currentTab] = tabs;
  const supported = /^https?:\/\//.test(currentTab?.url || '');
  $('#domain').textContent = supported
    ? hostname(currentTab.url)
    : 'Choose a web page';
  $('#page-title').textContent = supported
    ? currentTab.title || currentTab.url
    : 'Open an article to start.';
  $('#capture').disabled = !supported;
  $('#previewMenu').disabled = !supported;
  renderCatalog(catalog);
  await library();
}
for (const button of document.querySelectorAll('[data-view]'))
  button.addEventListener('click', async () => {
    selectView(button.dataset.view);
    if (button.dataset.view === 'read') await browse(button);
    else {
      try { await library(); } catch (error) { status(error.message, true); }
    }
  });
function selectView(view) {
  for (const tab of document.querySelectorAll('[data-view]')) {
    if (tab.dataset.view === view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  for (const name of ['read', 'library']) $(`#${name}-view`).hidden = name !== view;
  status('');
}
function item(title, detail, open) {
  const row = document.createElement('div');
  row.className = 'item';
  const button = document.createElement('button');
  button.className = 'item-main';
  const label = document.createElement('span');
  label.className = 'item-title';
  label.textContent = title;
  const meta = document.createElement('span');
  meta.className = 'item-detail';
  meta.textContent = detail;
  button.append(label, meta);
  button.addEventListener('click', () => busy(button, open));
  row.append(button);
  return row;
}
function empty(container, text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'empty';
  paragraph.textContent = text;
  container.append(paragraph);
}
function renderCatalog(entries) {
  const container = $('#catalog-list');
  container.replaceChildren();
  if (!entries.length)
    empty(container, 'No shared articles found yet.');
  for (const entry of entries) {
    const helpful = entry.rating?.upvotes || 0;
    container.append(
      item(
        entry.title,
        `${hostname(entry.url)} · ${helpful} helpful ${helpful === 1 ? 'vote' : 'votes'}`,
        async () => {
          await send('OPEN_COPY', { id: entry.contentHash });
          status('Article opened in a new tab.');
        }
      )
    );
  }
}
async function browse(button) {
  let entries;
  await busy(button, async () => {
    status('Finding articles…');
    const result = await send('CATALOG');
    entries = result.entries;
    status(result.warning || (entries.length ? '' : 'No readable copies found. Preview an article to share it.'));
  });
  if (entries) renderCatalog(entries);
}
$('#browse').addEventListener('click', async () => {
  selectView('read');
  await browse($('#browse'));
});
function capture(button, action) {
  return busy(button, async () => {
    await send(action, { tabId: currentTab.id });
    status(action === 'SAVE_PAGE' ? 'Article opened in a new tab.' : 'Preview opened in a new tab.');
  }, action === 'SAVE_PAGE' ? 'Saving…' : 'Preparing preview…');
}
$('#capture').addEventListener('click', () => capture($('#capture'), 'SAVE_PAGE'));
$('#previewMenu').addEventListener('click', () => capture($('#previewMenu'), 'CAPTURE'));
async function library() {
  const records = await send('LIBRARY');
  $('#saved-count').textContent = String(records.length);
  $('#clear').hidden = !records.length;
  $('#manage').hidden = !records.length;
  $('#done').hidden = !managing;
  $('#saved-count').hidden = managing;
  const container = $('#library-list');
  container.replaceChildren();
  if (!records.length)
    empty(container, 'Save an article to keep your first copy.');
  for (const record of records) {
    const detail = record.pendingShare
      ? 'Sharing unfinished'
      : record.shared
        ? record.source === 'reader'
          ? 'Shared copy'
          : 'Shared publicly'
        : 'Saved on this device';
    const row = item(record.title, `${hostname(record.url)} · ${detail}`, () =>
      send('OPEN_COPY', { id: record.contentHash })
    );
    const controls = document.createElement('div');
    controls.className = 'item-actions';
    controls.hidden = !managing;
    if (record.pendingShare) {
      const retry = document.createElement('button');
      retry.className = 'small-button';
      retry.textContent = 'Retry sharing';
      retry.addEventListener('click', () =>
        busy(retry, async () => {
          const result = await send('RETRY_SHARE', { id: record.contentHash });
          status(
            result.warning ||
              result.shareError ||
              (result.shared ? 'Shared publicly.' : result.validationError),
            !result.shared
          );
          await library();
          focusLibrary();
        })
      );
      controls.append(retry);
      const discard = document.createElement('button');
      discard.className = 'small-button';
      discard.textContent = 'Cancel sharing';
      discard.addEventListener('click', () =>
        busy(discard, async () => {
          await send('DISCARD_SHARE', { id: record.contentHash });
          await library();
          focusLibrary();
          status(
            'Sharing canceled. An already uploaded copy may still be public.'
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
      busy(remove, async () => {
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
$('#manage').addEventListener('click', async () => {
  managing = true;
  selectView('library');
  $('#options').open = false;
  try {
    await library();
    ($('#library-list .item-actions button') || $('#done')).focus();
  } catch (error) { status(error.message, true); }
});
$('#done').addEventListener('click', async () => {
  managing = false;
  try {
    await library();
    focusLibrary();
  } catch (error) { status(error.message, true); }
});
function focusLibrary() {
  ($('#library-list .item-main') || $('[data-view="library"]')).focus();
}
$('#clear').addEventListener('click', () =>
  busy($('#clear'), async () => {
    await send('CLEAR');
    managing = false;
    await library();
    renderCatalog([]);
    $('#options').open = false;
    $('[data-view="library"]').focus();
    status(
      'Saved copies removed. Public copies may still be available.'
    );
  })
);
init().catch((error) => status(error.message, true));
