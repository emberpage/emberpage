import { send, status, busy, hostname } from './ui.js';
const $ = (selector) => document.querySelector(selector);
let currentTab;
async function init() {
  const { accepted } = await chrome.storage.local.get('accepted');
  $('#welcome').hidden = !!accepted;
  $('#app').hidden = !accepted;
  if (!accepted) return;
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
  renderCatalog(catalog);
}
$('#accept').addEventListener('click', () =>
  busy($('#accept'), async () => {
    await send('ACCEPT');
    await init();
  })
);
for (const button of document.querySelectorAll('[data-view]'))
  button.addEventListener('click', async () => {
    for (const tab of document.querySelectorAll('[data-view]'))
      tab.removeAttribute('aria-current');
    button.setAttribute('aria-current', 'page');
    for (const view of ['read', 'cache', 'library'])
      $(`#${view}-view`).hidden = view !== button.dataset.view;
    status('');
    if (button.dataset.view === 'library') {
      try {
        await library();
      } catch (error) {
        status(error.message, true);
      }
    }
  });
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
  $('#browse').textContent = entries.length
    ? 'Refresh popular articles'
    : 'Browse popular articles';
  if (!entries.length)
    empty(container, 'Browse to find complete article copies.');
  for (const entry of entries) {
    const helpful = entry.rating?.upvotes || 0;
    container.append(
      item(
        entry.title,
        `${hostname(entry.url)} · ${helpful} helpful ${helpful === 1 ? 'vote' : 'votes'} · Read`,
        async () => {
          await send('OPEN_COPY', { id: entry.contentHash });
          status('Article opened in a new tab.');
        }
      )
    );
  }
}
$('#browse').addEventListener('click', async () => {
  let entries;
  await busy(
    $('#browse'),
    async () => {
      status('Checking article copies…');
      const result = await send('CATALOG');
      entries = result.entries;
      const warning = result.warning;
      status(
        warning ||
          (entries.length
            ? 'Choose an article to read.'
            : 'No readable copies found. You can share an article from Save.')
      );
    },
    'Checking…'
  );
  if (entries) renderCatalog(entries);
});
$('#capture').addEventListener('click', () =>
  busy(
    $('#capture'),
    async () => {
      await send('CAPTURE', { tabId: currentTab.id });
      status('Preview opened in a new tab.');
    },
    'Preparing preview…'
  )
);
async function library() {
  const records = await send('LIBRARY');
  $('#saved-count').textContent = String(records.length);
  $('#clear').hidden = !records.length;
  const container = $('#library-list');
  container.replaceChildren();
  if (!records.length)
    empty(container, 'Open an article and choose Save to keep your first copy.');
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
        ($('#library-list .item-main') || $('[data-view="library"]')).focus();
      })
    );
    controls.append(remove);
    row.append(controls);
    container.append(row);
  }
}
$('#clear').addEventListener('click', () =>
  busy($('#clear'), async () => {
    await send('CLEAR');
    await library();
    renderCatalog([]);
    $('[data-view="library"]').focus();
    status(
      'Saved copies removed. Public copies may still be available.'
    );
  })
);
init().catch((error) => status(error.message, true));
