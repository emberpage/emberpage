import { Predicate } from 'effect';
type Listing = import('../types.ts').Listing;
import { hashUrl, MAX_ARTICLE_BYTES } from './article.ts';
import { normalizeUrl } from './url.ts';
import { IndexedRecords, recordBytes } from './storage.ts';
export const LISTING_WINDOW_MS: number = 30 * 24 * 60 * 60 * 1000;
const HASH: RegExp = /^[a-f0-9]{64}$/;
export async function validateCatalogEntry(
  entry: Listing,
  {
    now = Date.now()
  }:
    | {
        now?: number | undefined;
      }
    | undefined = {}
) {
  try {
    if (
      !entry ||
      Array.isArray(entry) ||
      recordBytes(entry) > 8192 ||
      !(
        ['id', 'pubkey', 'urlHash', 'contentHash', 'blobHash'] as Array<
          keyof Listing
        >
      ).every(
        (key: keyof Listing) =>
          Predicate.isString(entry[key]) && HASH.test(entry[key])
      ) ||
      !Number.isSafeInteger(entry.createdAt) ||
      entry.createdAt <= now - LISTING_WINDOW_MS ||
      entry.createdAt > now + 60000 ||
      !Number.isSafeInteger(entry.capturedAt) ||
      entry.capturedAt < 0 ||
      entry.capturedAt > now + 60000 ||
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
function newest(a: Listing, b: Listing) {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}
export class CatalogLedger {
  store: IndexedRecords<Listing>;
  now: () => number;
  maxRecords: number;
  maxBytes: number;
  constructor({
    name = 'emberpage-catalog-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = 1000,
    maxBytes = 2 * 1024 * 1024
  }: {
    name?: string | undefined;
    indexedDB?: IDBFactory | undefined;
    now?: (() => number) | undefined;
    maxRecords?: number | undefined;
    maxBytes?: number | undefined;
  } = {}) {
    this.store = new IndexedRecords({ name, indexedDB });
    this.now = now;
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  update(incoming: Listing[] | undefined = []) {
    return this.store.update((records: Listing[]) => {
      const byId: Map<string, Listing> = new Map(
        records.map((record: Listing) => [record.id, record])
      );
      for (const entry of incoming)
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
      const kept: Listing[] = [];
      let bytes: number = 0;
      for (const entry of [...byId.values()]
        .filter(
          (entry: Listing) => entry.createdAt > this.now() - LISTING_WINDOW_MS
        )
        .sort(newest)) {
        const size: number = recordBytes(entry);
        if (kept.length >= this.maxRecords || bytes + size > this.maxBytes)
          continue;
        kept.push(entry);
        bytes += size;
      }
      return kept;
    });
  }
  async ingest(entries: Listing[]) {
    if (!Array.isArray(entries)) throw new Error('Invalid catalog.');
    const valid: Listing[] = [];
    for (const entry of entries.slice(0, 1000))
      if (await validateCatalogEntry(entry, { now: this.now() }))
        valid.push({
          id: entry.id,
          pubkey: entry.pubkey,
          createdAt: entry.createdAt,
          url: entry.url,
          urlHash: entry.urlHash,
          contentHash: entry.contentHash,
          blobHash: entry.blobHash,
          size: entry.size,
          title: entry.title,
          byline: entry.byline,
          capturedAt: entry.capturedAt,
          provider: entry.provider
        });
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
