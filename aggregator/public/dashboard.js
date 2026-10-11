const $ = selector => document.querySelector(selector);
let snapshot;
const categories = ['AI', 'Technology', 'Finance', 'Science', 'Politics', 'General'];

function status(text, error = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', error);
}
async function api(path, method = 'GET') {
  const response = await fetch(path, { method, cache: 'no-store', ...(method === 'POST' ? { headers: { 'X-EmberPage-Action': 'refresh' } } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `The local aggregator returned ${response.status}.`);
  return data;
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function sourceUrl(raw) {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function domain(raw) { return sourceUrl(raw)?.hostname.replace(/^www\./, '') || 'Source unavailable'; }
function date(raw) { return Number.isFinite(raw) ? new Date(raw).toLocaleString() : 'Not reported'; }
function age(raw) {
  if (!Number.isFinite(raw)) return 'Capture time unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - raw) / 60_000));
  if (minutes < 1) return 'Captured just now';
  if (minutes < 60) return `Captured ${minutes}m ago`;
  if (minutes < 1440) return `Captured ${Math.floor(minutes / 60)}h ago`;
  return `Captured ${Math.floor(minutes / 1440)}d ago`;
}
function bytes(value) {
  if (!Number.isFinite(value) || value < 0) return 'Not reported';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
function categoryFor(article) { return categories.includes(article.category) ? article.category : 'General'; }
function empty(container, title, detail) {
  const message = element('div', 'empty');
  message.append(element('strong', '', title), element('span', '', detail));
  container.append(message);
}
function originalLink(raw, label) {
  const url = sourceUrl(raw);
  if (!url) return element('span', 'quiet', 'Source unavailable');
  const link = element('a', 'read-button', label);
  link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
function renderArticles() {
  if (!snapshot) return;
  const query = $('#search').value.trim().toLowerCase();
  const selectedDomain = $('#source').value, selectedCategory = $('#category').value;
  const articles = snapshot.articles.filter(article =>
    (!query || `${article.title || ''} ${article.byline || ''} ${domain(article.url)}`.toLowerCase().includes(query)) &&
    (!selectedDomain || domain(article.url) === selectedDomain) &&
    (!selectedCategory || categoryFor(article) === selectedCategory));
  const rank = article => Number.isFinite(article.score) ? article.score : Number.isFinite(article.rating?.score) ? article.rating.score : -Infinity;
  articles.sort($('#ranking').value === 'newest' ? (a, b) => b.createdAt - a.createdAt || a.contentHash.localeCompare(b.contentHash) : (a, b) => rank(b) - rank(a) || a.contentHash.localeCompare(b.contentHash));
  $('#article-count').textContent = `${articles.length} ${articles.length === 1 ? 'article' : 'articles'}${articles.length !== snapshot.articles.length ? ` of ${snapshot.articles.length}` : ''}`;
  const container = $('#article-list');
  const focusedId = document.activeElement.closest('.article-row')?.dataset.id;
  container.replaceChildren();
  if (!articles.length) empty(container, snapshot.articles.length ? 'No articles match these filters.' : 'The directory is empty.', snapshot.articles.length ? 'Try another source, category, or search.' : 'The indexer checks the relay every minute while this server runs. You can also choose Refresh from relay.');
  for (const article of articles) {
    const row = element('article', 'article-row');
    row.dataset.id = `${article.urlHash}:${article.contentHash}`;
    const body = element('div', 'article-body'); body.append(element('h3', '', article.title || 'Untitled article'));
    const meta = element('div', 'article-meta');
    meta.append(element('span', 'article-source', domain(article.url)), element('span', '', categoryFor(article)), element('span', '', age(article.capturedAt)));
    if (article.byline) meta.append(element('span', '', article.byline));
    body.append(meta);
    const actions = element('div', 'row-actions'), votes = element('div', 'votes');
    for (const [label, value] of [['Helpful', article.rating?.upvotes], ['Incomplete', article.rating?.downvotes], ['Score', article.score ?? article.rating?.score]]) {
      const metric = element('div', '');
      metric.append(element('strong', '', Number.isFinite(value) ? label === 'Score' ? value.toFixed(2) : String(value) : '—'), element('span', '', label));
      votes.append(metric);
    }
    actions.append(votes, originalLink(article.url, 'Open original'));
    row.append(body, actions); container.append(row);
    if (row.dataset.id === focusedId) row.querySelector('a')?.focus({ preventScroll: true });
  }
}
function humanize(key) { return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'); }
function detailText(value) {
  if (value === null) return 'Not reported';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function renderEvents() {
  if (!snapshot) return;
  const filter = $('#event-filter').value;
  const events = snapshot.events.filter(event => filter === 'all' || event.outcome === filter).sort((a, b) => b.startedAt - a.startedAt);
  $('#event-count').textContent = `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  const container = $('#event-list');
  const openIds = new Set([...container.querySelectorAll('details[open]')].map(event => event.dataset.id));
  const focusedId = document.activeElement.closest('.event')?.dataset.id;
  container.replaceChildren();
  if (!events.length) empty(container, filter === 'all' ? 'No recorded operations yet.' : 'No events match this filter.', 'The journal updates when an operation finishes.');
  for (const event of events) {
    const row = element('details', 'event'), summary = element('summary', '');
    row.dataset.id = event.id; row.open = openIds.has(event.id);
    const title = element('span', 'event-title', humanize(event.action)); title.append(element('small', '', event.kind));
    summary.append(element('span', 'event-time', date(event.startedAt)), title, element('span', `outcome ${event.outcome}`, event.outcome), element('span', 'event-duration', Number.isFinite(event.durationMs) ? `${Math.round(event.durationMs)} ms` : 'Not reported'));
    const data = element('dl', 'event-data');
    data.append(element('dt', '', 'Event ID'), element('dd', '', event.id));
    for (const [key, value] of Object.entries(event.details || {})) data.append(element('dt', '', humanize(key)), element('dd', '', detailText(value)));
    row.append(summary, data); container.append(row);
    if (event.id === focusedId) summary.focus({ preventScroll: true });
  }
}
function renderStorage() {
  const container = $('#storage-list'); container.replaceChildren();
  for (const [key, title] of [['catalog', 'Signed listings'], ['ratings', 'Signed ratings'], ['journal', 'Operation journal'], ['trends', 'Hourly observation counters']]) {
    const store = snapshot.storage[key];
    if (!store) continue;
    const section = element('section', 'store'), header = element('div', 'store-head');
    header.append(element('h3', '', title), element('span', 'store-total', `${Number.isFinite(store.count) ? store.count : 'Unreported'} ${store.count === 1 ? 'record' : 'records'} · ${bytes(store.bytes)}`));
    section.append(header);
    for (const [value, limit, label, format] of [[store.count, store.maxRecords, 'Record budget', String], [store.bytes, store.maxBytes, 'Data budget', bytes]]) {
      if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) continue;
      const line = element('div', 'budget-line'); line.append(element('span', '', label), element('span', '', `${format(value)} / ${format(limit)}`));
      const meter = element('meter', ''); meter.min = 0; meter.max = limit; meter.value = value; meter.setAttribute('aria-label', `${title}: ${label}`);
      section.append(line, meter);
    }
    const details = element('div', 'store-details');
    if (Number.isFinite(store.nextExpiryAt)) details.append(element('span', '', `Next expiry ${date(store.nextExpiryAt)}`));
    if (Number.isFinite(store.ttlMs)) details.append(element('span', '', `Expires after ${(store.ttlMs / 3_600_000).toFixed(0)} hours`));
    if (store.evictionPolicy) details.append(element('span', '', store.evictionPolicy));
    else details.append(element('span', '', key === 'journal' ? 'Expires after 7 days. Newer events fit first.' : '30-day discovery window. Oldest records leave first.'));
    section.append(details); container.append(section);
  }
  $('#database-size').hidden = !Number.isFinite(snapshot.storage.dbBytes);
  $('#database-size').textContent = `SQLite file on disk: ${bytes(snapshot.storage.dbBytes)}. Includes database engine overhead; data budgets count serialized record bytes.`;
}
function renderNetwork(network) {
  const pending = Number.isFinite(network.pending) ? network.pending : null;
  $('#network-label').textContent = pending > 0 ? 'Checking metadata' : network.indexing ? 'Rolling index on' : network.lastQuerySucceeded ? 'Last query succeeded' : 'Idle';
  $('#network-dot').className = `state-dot${pending > 0 ? ' progress' : network.indexing || network.connected ? ' connected' : ''}`;
  const peers = Array.isArray(network.peers) ? network.peers.length : Number.isFinite(network.peers) ? network.peers : null;
  $('#network-detail').textContent = [peers !== null ? `${peers} open relay connections` : 'Peer count unavailable', pending !== null ? `${pending} pending` : ''].filter(Boolean).join(' · ');
  $('#network-observed').textContent = Number.isFinite(network.nextRunAt) ? `Next index ${date(network.nextRunAt)}` : `Observed ${date(network.observedAt)}`;
  const interval = Number.isFinite(network.intervalMs) ? network.intervalMs >= 60_000 ? `${network.intervalMs / 60_000} ${network.intervalMs === 60_000 ? 'minute' : 'minutes'}` : `${network.intervalMs / 1000} ${network.intervalMs === 1000 ? 'second' : 'seconds'}` : null;
  $('.sidebar-note').textContent = network.indexing ? `The server indexes public metadata ${interval ? `every ${interval}` : 'automatically'}. Article bodies stay off disk.` : 'The rolling index is off. Choose Refresh from relay to update public metadata.';
  $('#network-error').hidden = !network.error; $('#network-error').textContent = network.error || '';
}
function render(data) {
  const articlesChanged = !snapshot || JSON.stringify(data.articles) !== JSON.stringify(snapshot.articles);
  const eventsChanged = !snapshot || JSON.stringify(data.events) !== JSON.stringify(snapshot.events);
  snapshot = data;
  $('#snapshot-time').textContent = `Local snapshot ${date(data.generatedAt)}`;
  if (articlesChanged) {
    const selected = $('#source').value;
    $('#source').replaceChildren(new Option('All sources', ''));
    for (const host of [...new Set(data.articles.map(article => domain(article.url)))].sort()) $('#source').add(new Option(host, host));
    if ([...$('#source').options].some(option => option.value === selected)) $('#source').value = selected;
    renderArticles();
  }
  if (eventsChanged) renderEvents();
  renderStorage(); renderNetwork(data.network);
  const trends = $('#trend-list'); trends.replaceChildren();
  for (const trend of data.trends || []) {
    const row = element('div', 'trend');
    const text = element('p', '', `${new Date(trend.startedAt).toLocaleDateString()} ${new Date(trend.startedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · ${trend.runs} refreshes · ${trend.accepted} accepted observations · ${trend.rejected} rejected · ${trend.failures} failures`);
    row.append(text); trends.append(row);
  }
  const refresh = data.lastRefresh;
  $('#refresh-summary').textContent = refresh ? `Last relay refresh ${date(refresh.finishedAt)}. ${['discovered', 'indexed', 'votes', 'rejected', 'duplicates'].filter(key => Number.isFinite(refresh[key])).map(key => `${refresh[key]} ${key}`).join('; ')}.` : 'No relay refresh recorded. Categories use public title and byline metadata.';
}
let loading = false, snapshotReadFailed = false;
async function load(relay = false, quiet = false) {
  if (loading) return;
  loading = true;
  if (!quiet) {
    $('#reload').disabled = $('#refresh').disabled = true;
    status(relay ? 'Refreshing signed directory metadata…' : 'Reading local metadata…');
  }
  if (relay) { $('#network-label').textContent = 'Refreshing'; $('#network-dot').className = 'state-dot progress'; }
  try {
    render(await api(relay ? '/api/refresh' : '/api/dashboard', relay ? 'POST' : 'GET'));
    if (!quiet || (!relay && snapshotReadFailed)) status(relay ? 'Relay refresh finished.' : '');
    if (!relay) snapshotReadFailed = false;
  } catch (error) {
    if (!relay) snapshotReadFailed = true;
    status(`${error.message} Refresh local to read the last saved snapshot.`, true);
    if (snapshot) renderNetwork(snapshot.network);
    else { $('#network-label').textContent = 'Unavailable'; $('#network-detail').textContent = 'The local aggregator did not respond.'; $('#article-count').textContent = 'Snapshot unavailable'; }
  } finally { loading = false; $('#reload').disabled = $('#refresh').disabled = false; }
}
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  for (const item of document.querySelectorAll('[data-view]')) item.removeAttribute('aria-current');
  button.setAttribute('aria-current', 'page');
  for (const view of ['articles', 'activity', 'storage']) $(`#${view}-view`).hidden = view !== button.dataset.view;
  $('#view-title').textContent = button.textContent;
});
$('#search').addEventListener('input', renderArticles);
for (const id of ['source', 'category', 'ranking']) $(`#${id}`).addEventListener('change', renderArticles);
$('#event-filter').addEventListener('change', renderEvents);
$('#reload').addEventListener('click', () => load());
$('#refresh').addEventListener('click', () => load(true));
load();


setInterval(() => { if (document.visibilityState === 'visible') load(false, true); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(false, true); });
