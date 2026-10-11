import { hashUrl, MAX_ARTICLE_BYTES } from './article.js';
import { normalizeUrl } from './url.js';
import { IndexedRecords, recordBytes } from './storage.js';
export const LISTING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HASH = /^[a-f0-9]{64}$/,
  FIELDS = [
    'id',
    'pubkey',
    'createdAt',
    'url',
    'urlHash',
    'contentHash',
    'blobHash',
    'size',
    'title',
    'byline',
    'capturedAt',
    'provider'
  ];
export async function validateCatalogEntry(entry, { now = Date.now() } = {}) {
  try {
    if (
      !entry ||
      Array.isArray(entry) ||
      recordBytes(entry) > 8192 ||
      !['id', 'pubkey', 'urlHash', 'contentHash', 'blobHash'].every(
        (key) => typeof entry[key] === 'string' && HASH.test(entry[key])
      ) ||
      !Number.isSafeInteger(entry.createdAt) ||
      entry.createdAt <= now - LISTING_WINDOW_MS ||
      entry.createdAt > now + 60_000 ||
      !Number.isSafeInteger(entry.capturedAt) ||
      entry.capturedAt < 0 ||
      entry.capturedAt > now + 60_000 ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 1 ||
      entry.size > MAX_ARTICLE_BYTES ||
      typeof entry.title !== 'string' ||
      !entry.title.trim() ||
      entry.title.length > 500 ||
      typeof entry.byline !== 'string' ||
      entry.byline.length > 500 ||
      entry.provider !== 'https://blossom.primal.net' ||
      normalizeUrl(entry.url) !== entry.url ||
      entry.url.length > 4096
    )
      return false;
    return (await hashUrl(entry.url)) === entry.urlHash;
  } catch {
    return false;
  }
}
function newest(a, b) {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}
/** Retain verified transport metadata only; this ledger never qualifies article bodies. */
export class CatalogLedger {
  constructor({
    name = 'emberpage-catalog-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = 1000,
    maxBytes = 2 * 1024 * 1024
  } = {}) {
    this.store = new IndexedRecords({ name, indexedDB });
    this.now = now;
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  update(incoming = []) {
    return this.store.update((records) => {
      const byId = new Map(records.map((record) => [record.id, record]));
      for (const entry of incoming)
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
      const kept = [];
      let bytes = 0;
      for (const entry of [...byId.values()]
        .filter((entry) => entry.createdAt > this.now() - LISTING_WINDOW_MS)
        .sort(newest)) {
        const size = recordBytes(entry);
        if (kept.length >= this.maxRecords || bytes + size > this.maxBytes)
          continue;
        kept.push(entry);
        bytes += size;
      }
      return kept;
    });
  }
  async ingest(entries) {
    if (!Array.isArray(entries)) throw new Error('Invalid catalog.');
    const valid = [];
    for (const entry of entries.slice(0, 1000))
      if (await validateCatalogEntry(entry, { now: this.now() }))
        valid.push(
          Object.fromEntries(FIELDS.map((field) => [field, entry[field]]))
        );
    await this.update(valid);
    return valid.length;
  }
  list() {
    return this.update();
  }
  clear() {
    return this.store.clear();
  }
}
