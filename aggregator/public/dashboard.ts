import { Effect, Option as EffectOption, Schema } from 'effect';
import { ListingSchema } from '../types.ts';
const StatsSchema = Schema.Struct({ count: Schema.Number, bytes: Schema.Number, maxRecords: Schema.Number, maxBytes: Schema.Number, ttlMs: Schema.Number, evictionPolicy: Schema.String, nextExpiryAt: Schema.optionalKey(Schema.Number) });
const DashboardSchema = Schema.Struct({
  generatedAt: Schema.Number,
  articles: Schema.Array(Schema.Struct({ ...ListingSchema.fields, category: Schema.String, score: Schema.Number, rating: Schema.Struct({ upvotes: Schema.Number, downvotes: Schema.Number, score: Schema.optionalKey(Schema.Number) }) })),
  events: Schema.Array(Schema.Struct({ id: Schema.String, action: Schema.String, kind: Schema.String, outcome: Schema.String, startedAt: Schema.Number, durationMs: Schema.Number, details: Schema.Record(Schema.String, Schema.Unknown) })),
  storage: Schema.Struct({ catalog: StatsSchema, ratings: StatsSchema, journal: StatsSchema, trends: StatsSchema, dbBytes: Schema.NullOr(Schema.Number) }),
  network: Schema.Struct({ connected: Schema.Boolean, peers: Schema.Number, lastQuerySucceeded: Schema.Boolean, error: Schema.NullOr(Schema.String), pending: Schema.Number, indexing: Schema.Boolean, intervalMs: Schema.Number, nextRunAt: Schema.NullOr(Schema.Number), observedAt: Schema.Number }),
  trends: Schema.Array(Schema.Struct({ startedAt: Schema.Number, runs: Schema.Number, accepted: Schema.Number, rejected: Schema.Number, failures: Schema.Number })),
  lastRefresh: Schema.NullOr(Schema.Struct({ finishedAt: Schema.optionalKey(Schema.Number), discovered: Schema.optionalKey(Schema.Number), indexed: Schema.optionalKey(Schema.Number), votes: Schema.optionalKey(Schema.Number), rejected: Schema.optionalKey(Schema.Number), duplicates: Schema.optionalKey(Schema.Number) }))
});
type DashboardSnapshot = typeof DashboardSchema.Type;
type DashboardArticle = DashboardSnapshot['articles'][number];
const failure = (error: unknown) => error instanceof Error ? error : new Error('The local dashboard did not respond.');
function $(selector: '#source' | '#category' | '#ranking' | '#event-filter'): HTMLSelectElement;
function $(selector: '#search' | '#show-article-details'): HTMLInputElement;
function $(selector: '#reload' | '#refresh'): HTMLButtonElement;
function $(selector: '#tools'): HTMLDetailsElement;
function $(selector: string): HTMLElement;
function $(selector: string) {
  const node=document.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing dashboard element: ${selector}`);
  return node;
}
let snapshot: DashboardSnapshot | undefined;
const categories = ['AI', 'Technology', 'Finance', 'Science', 'Politics', 'General'];

function status(text: string, error = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', error);
}
const apiEffect = Effect.fn('Dashboard.request')(function* (path: string, method: string = 'GET') {
  const response = yield* Effect.tryPromise({
    try: (signal: AbortSignal) => fetch(path, { signal, method, cache: 'no-store', ...(method === 'POST' ? { headers: { 'X-EmberPage-Action': 'refresh' } } : {}) }),
    catch: failure
  });
  const raw: unknown = yield* Effect.tryPromise({ try: () => response.json(), catch: failure });
  if (!response.ok) {
    const error = Schema.decodeUnknownOption(Schema.Struct({ error: Schema.String }))(raw);
    return yield* Effect.fail(new Error(EffectOption.isSome(error) ? error.value.error : `The local dashboard returned ${response.status}.`));
  }
  return yield* Schema.decodeUnknownEffect(DashboardSchema)(raw).pipe(Effect.mapError(failure));
});
function element<T extends keyof HTMLElementTagNameMap>(tag: T, className: string, text?: string): HTMLElementTagNameMap[T] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function sourceUrl(raw: string) {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function domain(raw: string) { return sourceUrl(raw)?.hostname.replace(/^www\./, '') || 'Source unavailable'; }
function date(raw: number | undefined | null) { return typeof raw === 'number' && Number.isFinite(raw) ? new Date(raw).toLocaleString() : 'Not reported'; }
function age(raw: number) {
  if (!Number.isFinite(raw)) return 'Save time unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - raw) / 60_000));
  if (minutes < 1) return 'Saved just now';
  if (minutes < 60) return `Saved ${minutes}m ago`;
  if (minutes < 1440) return `Saved ${Math.floor(minutes / 60)}h ago`;
  return `Saved ${Math.floor(minutes / 1440)}d ago`;
}
function bytes(value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0) return 'Not reported';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
function categoryFor(article: DashboardArticle) { return categories.includes(article.category) ? article.category : 'General'; }
function empty(container: HTMLElement, title: string, detail: string) {
  const message = element('div', 'empty');
  message.append(element('strong', '', title), element('span', '', detail));
  container.append(message);
}
function originalLink(raw: string, label: string) {
  const url = sourceUrl(raw);
  if (!url) return element('span', 'quiet', 'Source unavailable');
  const link = element('a', 'article-link', label);
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
  const rank = (article: DashboardArticle) => Number.isFinite(article.score) ? article.score : typeof article.rating?.score === 'number' && Number.isFinite(article.rating.score) ? article.rating.score : -Infinity;
  articles.sort($('#ranking').value === 'newest' ? (a, b) => b.createdAt - a.createdAt || a.contentHash.localeCompare(b.contentHash) : (a, b) => rank(b) - rank(a) || a.contentHash.localeCompare(b.contentHash));
  $('#article-count').textContent = `${articles.length} ${articles.length === 1 ? 'article' : 'articles'}${articles.length !== snapshot.articles.length ? ` of ${snapshot.articles.length}` : ''}`;
  const container = $('#article-list');
  const focusedId = document.activeElement?.closest('.article-row')?.getAttribute('data-id');
  container.replaceChildren();
  if (!articles.length) empty(container, snapshot.articles.length ? 'No articles match these filters.' : 'The directory is empty.', snapshot.articles.length ? 'Try another source, category, or search.' : 'This dashboard checks for articles every minute while it runs. You can also choose Check for updates.');
  for (const article of articles) {
    const row = element('article', 'article-row');
    row.dataset.id = `${article.urlHash}:${article.contentHash}`;
    const body = element('div', 'article-body');
    const title = element('h3', ''); title.append(originalLink(article.url, article.title || 'Untitled article')); body.append(title);
    const meta = element('div', 'article-meta');
    meta.append(element('span', 'article-source', domain(article.url)));
    if (article.byline) meta.append(element('span', '', article.byline));
    body.append(meta);
    const details = element('div', 'article-details'), votes = element('div', 'votes');
    details.append(element('p', 'quiet', `${categoryFor(article)} · ${age(article.capturedAt)}`));
    for (const [label, value] of ([['Helpful', article.rating?.upvotes], ['Incomplete', article.rating?.downvotes], ['Score', article.score ?? article.rating?.score]] as [string, number | undefined][])) {
      const metric = element('div', '');
      metric.append(element('strong', '', typeof value === 'number' && Number.isFinite(value) ? label === 'Score' ? value.toFixed(2) : String(value) : '—'), element('span', '', label));
      votes.append(metric);
    }
    details.append(votes); body.append(details);
    row.append(body); container.append(row);
    if (row.dataset.id === focusedId) row.querySelector('a')?.focus({ preventScroll: true });
  }
}
function humanize(key: string) { return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'); }
function detailText(value: unknown) {
  if (value === null) return 'Not reported';
  if (typeof value === 'object') return JSON.stringify(value);
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : 'Not reported';
}
function renderEvents() {
  if (!snapshot) return;
  const filter = $('#event-filter').value;
  const events = snapshot.events.filter(event => filter === 'all' || event.outcome === filter).sort((a, b) => b.startedAt - a.startedAt);
  $('#event-count').textContent = `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  const container = $('#event-list');
  const openIds = new Set([...container.querySelectorAll('details[open]')].map(event => event.getAttribute('data-id')));
  const focusedId = document.activeElement?.closest('.event')?.getAttribute('data-id');
  container.replaceChildren();
  if (!events.length) empty(container, filter === 'all' ? 'No recorded operations yet.' : 'No events match this filter.', 'Activity appears when an operation finishes.');
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
  if (!snapshot) return;
  const container = $('#storage-list'); container.replaceChildren();
  for (const [key, title] of ([['catalog', 'Article listings'], ['ratings', 'Public ratings'], ['journal', 'Activity log'], ['trends', 'Hourly totals']] as [Exclude<keyof DashboardSnapshot['storage'], 'dbBytes'>, string][])) {
    const store = snapshot.storage[key];
    if (!store) continue;
    const section = element('section', 'store'), header = element('div', 'store-head');
    header.append(element('h3', '', title), element('span', 'store-total', `${Number.isFinite(store.count) ? store.count : 'Unreported'} ${store.count === 1 ? 'record' : 'records'} · ${bytes(store.bytes)}`));
    section.append(header);
    for (const [value, limit, label, format] of ([[store.count, store.maxRecords, 'Record limit', String], [store.bytes, store.maxBytes, 'Space limit', bytes]] as [number, number, string, (value: number) => string][])) {
      if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) continue;
      const line = element('div', 'budget-line'); line.append(element('span', '', label), element('span', '', `${format(value)} / ${format(limit)}`));
      const meter = element('meter', ''); meter.min = 0; meter.max = limit; meter.value = value; meter.setAttribute('aria-label', `${title}: ${label}`);
      section.append(line, meter);
    }
    const details = element('div', 'store-details');
    if (Number.isFinite(store.nextExpiryAt)) details.append(element('span', '', `Next removal ${date(store.nextExpiryAt)}`));
    if (typeof store.ttlMs === 'number' && Number.isFinite(store.ttlMs)) details.append(element('span', '', `Expires after ${(store.ttlMs / 3_600_000).toFixed(0)} hours`));
    if (store.evictionPolicy) details.append(element('span', '', store.evictionPolicy));
    else details.append(element('span', '', key === 'journal' ? 'Expires after 7 days. Newer events fit first.' : 'Kept for 30 days. Oldest records are removed first.'));
    section.append(details); container.append(section);
  }
  $('#database-size').hidden = !Number.isFinite(snapshot.storage.dbBytes);
  $('#database-size').textContent = `Database file: ${bytes(snapshot.storage.dbBytes)}. This includes storage overhead; the limits above count only stored records.`;
}
function renderNetwork(network: DashboardSnapshot['network']) {
  const pending = Number.isFinite(network.pending) ? network.pending : null;
  $('#network-label').textContent = (pending ?? 0) > 0 ? 'Checking listings' : network.indexing ? 'Automatic updates on' : network.lastQuerySucceeded ? 'Last update succeeded' : 'Idle';
  $('#network-dot').className = `state-dot${(pending ?? 0) > 0 ? ' progress' : network.indexing || network.connected ? ' connected' : ''}`;
  const peers = Array.isArray(network.peers) ? network.peers.length : Number.isFinite(network.peers) ? network.peers : null;
  $('#network-detail').textContent = [peers !== null ? `${peers} server connections` : 'Connection count unavailable', pending !== null ? `${pending} pending` : ''].filter(Boolean).join(' · ');
  $('#network-observed').textContent = Number.isFinite(network.nextRunAt) && network.nextRunAt !== null ? `Next update ${date(network.nextRunAt)}` : `Checked ${date(network.observedAt)}`;
  const interval = Number.isFinite(network.intervalMs) ? network.intervalMs >= 60_000 ? `${network.intervalMs / 60_000} ${network.intervalMs === 60_000 ? 'minute' : 'minutes'}` : `${network.intervalMs / 1000} ${network.intervalMs === 1000 ? 'second' : 'seconds'}` : null;
  $('.sidebar-note').textContent = network.indexing ? `The dashboard checks public article listings ${interval ? `every ${interval}` : 'automatically'}. It does not download articles.` : 'Automatic updates are off. Choose Check for updates to get new listings.';
  $('#network-error').hidden = !network.error; $('#network-error').textContent = network.error || '';
}
function render(data: DashboardSnapshot) {
  const articlesChanged = !snapshot || JSON.stringify(data.articles) !== JSON.stringify(snapshot.articles);
  const eventsChanged = !snapshot || JSON.stringify(data.events) !== JSON.stringify(snapshot.events);
  snapshot = data;
  $('#snapshot-time').textContent = `Saved results ${date(data.generatedAt)}`;
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
  $('#refresh-summary').textContent = refresh ? `Last update ${date(refresh.finishedAt)}. ${(['discovered', 'indexed', 'votes', 'rejected', 'duplicates'] as const).filter(key => Number.isFinite(refresh[key])).map(key => `${refresh[key]} ${key}`).join('; ')}.` : 'No update recorded. Categories use article titles and author names.';
}
let loading = false, snapshotReadFailed = false;
async function load(relay = false, quiet = false) {
  if (loading) return;
  loading = true;
  if (!quiet) {
    $('#reload').disabled = $('#refresh').disabled = true;
    status(relay ? 'Checking for new articles…' : 'Loading saved results…');
  }
  if (relay) { $('#network-label').textContent = 'Refreshing'; $('#network-dot').className = 'state-dot progress'; }
  try {
    render(await Effect.runPromise(apiEffect(relay ? '/api/refresh' : '/api/dashboard', relay ? 'POST' : 'GET')));
    if (!quiet || (!relay && snapshotReadFailed)) status(relay ? 'Update finished.' : '');
    if (!relay) snapshotReadFailed = false;
  } catch (error) {
    if (!relay) snapshotReadFailed = true;
    status(`${error instanceof Error ? error.message : 'The local dashboard did not respond.'} Open Tools and choose Reload saved results to try again.`, true);
    if (snapshot) renderNetwork(snapshot.network);
    else { $('#network-label').textContent = 'Unavailable'; $('#network-detail').textContent = 'The local dashboard did not respond.'; $('#article-count').textContent = 'Saved results unavailable'; }
  } finally { loading = false; $('#reload').disabled = $('#refresh').disabled = false; }
}
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  for (const item of document.querySelectorAll('[data-view]')) item.removeAttribute('aria-current');
  button.setAttribute('aria-current', 'page');
  for (const view of ['articles', 'activity', 'storage']) $(`#${view}-view`).hidden = view !== button.getAttribute('data-view');
  $('#view-title').textContent = button.textContent;
  $('#tools').open = false;
  $('#main').focus({ preventScroll: true });
});
$('#search').addEventListener('input', renderArticles);
$('#show-article-details').addEventListener('change', () => {
  document.body.classList.toggle('show-article-details', $('#show-article-details').checked);
});
for (const id of ['source', 'category', 'ranking']) $(`#${id}`).addEventListener('change', () => {
  const active = Number(Boolean($('#source').value)) + Number(Boolean($('#category').value)) + Number($('#ranking').value !== 'popular');
  $('#filters > summary').textContent = active ? `Filters (${active})` : 'Filters';
  renderArticles();
});
$('#event-filter').addEventListener('change', renderEvents);
$('#reload').addEventListener('click', () => void load());
$('#refresh').addEventListener('click', () => void load(true));
void load();


setInterval(() => { if (document.visibilityState === 'visible') void load(false, true); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void load(false, true); });
