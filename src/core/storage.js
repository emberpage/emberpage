import { decodeArticle } from './article.js';

export const MAX_RECORDS = 100,
  MAX_VAULT_BYTES = 16 * 1024 * 1024;
const encoder = new TextEncoder(),
  HASH = /^[a-f0-9]{64}$/;
export function recordBytes(record) {
  const { bytes, ...metadata } = record;
  return (
    encoder.encode(JSON.stringify(metadata)).byteLength +
    (bytes instanceof Uint8Array ? bytes.byteLength : 0)
  );
}
/** Atomic IndexedDB collection updates; transformations run synchronously in the transaction. */
export class IndexedRecords {
  constructor({ name, indexedDB = globalThis.indexedDB, keyPath = 'id' }) {
    this.name = name;
    this.indexedDB = indexedDB;
    this.keyPath = keyPath;
    this.dbPromise = null;
  }
  open() {
    return (this.dbPromise ??= new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.name, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('records', { keyPath: this.keyPath });
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => {
        this.dbPromise = null;
        reject(
          request.error ||
            new Error('Close other Ember Page windows to open the archive.')
        );
      };
    }));
  }
  async update(change = (records) => records) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite'),
        store = tx.objectStore('records');
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () =>
        reject(failure || tx.error || new Error('Local storage failed.'));
      const request = store.getAll();
      request.onsuccess = () => {
        try {
          result = change(request.result);
          const old = new Map(
              request.result.map((record) => [record[this.keyPath], record])
            ),
            kept = new Set(result.map((record) => record[this.keyPath]));
          for (const key of old.keys()) if (!kept.has(key)) store.delete(key);
          for (const record of result)
            if (old.get(record[this.keyPath]) !== record) store.put(record);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
    });
  }
  clear() {
    return this.update(() => []);
  }
}
function lru(a, b) {
  return (
    b.lastAccessedAt - a.lastAccessedAt ||
    b.storedAt - a.storedAt ||
    a.contentHash.localeCompare(b.contentHash)
  );
}
export class LocalVault {
  constructor({
    name = 'emberpage-writer-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = MAX_RECORDS,
    maxBytes = MAX_VAULT_BYTES
  } = {}) {
    if (
      !Number.isSafeInteger(maxRecords) ||
      maxRecords < 1 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes < 1
    )
      throw new Error('Invalid archive limits.');
    this.store = new IndexedRecords({
      name,
      indexedDB,
      keyPath: 'contentHash'
    });
    this.now = now;
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  bounded(records) {
    const ordered = [...records].sort(
        (a, b) => Number(b.pendingShare) - Number(a.pendingShare) || lru(a, b)
      ),
      kept = [];
    let bytes = 0;
    for (const record of ordered) {
      const size = recordBytes(record);
      if (kept.length >= this.maxRecords || bytes + size > this.maxBytes) {
        if (record.pendingShare)
          throw new Error(
            'The archive is full of pending shares. Existing copies were kept.'
          );
        continue;
      }
      bytes += size;
      kept.push(record);
    }
    return kept.sort(lru);
  }
  async saveRecord(copy, { shared = false, pendingShare = false } = {}) {
    const decoded = await decodeArticle(copy.bytes, {
      blobHash: copy.blobHash,
      now: this.now()
    });
    if (
      decoded.contentHash !== copy.contentHash ||
      decoded.urlHash !== copy.urlHash ||
      decoded.size !== copy.size
    )
      throw new Error('Archive identity does not match file.');
    let saved;
    await this.store.update((records) => {
      const previous = records.find(
        (record) => record.contentHash === copy.contentHash
      );
      if (previous?.pendingShare && previous.blobHash !== copy.blobHash)
        throw new Error(
          'Finish or discard the pending share before replacing this file.'
        );
      saved = {
        bytes: decoded.bytes,
        urlHash: decoded.urlHash,
        contentHash: decoded.contentHash,
        blobHash: decoded.blobHash,
        size: decoded.size,
        url: decoded.article.url,
        title: decoded.article.title,
        capturedAt: decoded.article.capturedAt,
        listedAt: copy.listedAt ?? decoded.article.capturedAt,
        shared: shared || previous?.shared === true,
        pendingShare: pendingShare || previous?.pendingShare === true,
        storedAt: previous?.storedAt ?? this.now(),
        lastAccessedAt: Math.max(
          this.now(),
          ...records.map((record) => record.lastAccessedAt + 1)
        )
      };
      if (recordBytes(saved) > this.maxBytes)
        throw new Error('This article exceeds the local cache size limit.');
      const kept = this.bounded([
        ...records.filter((record) => record.contentHash !== saved.contentHash),
        saved
      ]);
      if (!kept.includes(saved))
        throw new Error('The archive is full. Existing copies were kept.');
      return kept;
    });
    return { ...saved, article: decoded.article };
  }
  async getRecord(contentHash) {
    let found;
    await this.store.update((records) =>
      this.bounded(
        records.map((record) => {
          if (record.contentHash !== contentHash) return record;
          found = {
            ...record,
            lastAccessedAt: Math.max(
              this.now(),
              ...records.map((item) => item.lastAccessedAt + 1)
            )
          };
          return found;
        })
      )
    );
    return found
      ? {
          ...found,
          article: (
            await decodeArticle(found.bytes, {
              blobHash: found.blobHash,
              now: this.now()
            })
          ).article
        }
      : null;
  }
  async listRecords() {
    const records = await this.store.update((records) => this.bounded(records));
    return Promise.all(
      records.map(async (record) => ({
        ...record,
        article: (
          await decodeArticle(record.bytes, {
            blobHash: record.blobHash,
            now: this.now()
          })
        ).article
      }))
    );
  }
  async flag(contentHash, field, value, listedAt) {
    let changed = null;
    await this.store.update((records) => {
      const updated = records.map((record) => {
        if (record.contentHash !== contentHash) return record;
        changed = {
          ...record,
          [field]: value === true,
          ...(listedAt === undefined ? {} : { listedAt })
        };
        return changed;
      });
      const kept = this.bounded(updated);
      if (changed && !kept.includes(changed))
        throw new Error('The archive is full. Existing copies were kept.');
      return kept;
    });
    return changed;
  }
  setShared(hash, value, listedAt) {
    if (
      listedAt !== undefined &&
      (!Number.isSafeInteger(listedAt) ||
        listedAt < 0 ||
        listedAt > this.now() + 60_000)
    )
      throw new Error('Invalid listing timestamp.');
    return this.flag(hash, 'shared', value, listedAt);
  }
  setPending(hash, value) {
    return this.flag(hash, 'pendingShare', value);
  }
  deleteRecord(hash) {
    return this.store.update((records) =>
      records.filter((record) => record.contentHash !== hash)
    );
  }
  clear() {
    return this.store.clear();
  }
}
export class ShareReceipts {
  constructor({
    name = 'emberpage-receipts-v1',
    indexedDB = globalThis.indexedDB,
    maxRecords = 20,
    maxBytes = 256 * 1024
  } = {}) {
    this.store = new IndexedRecords({
      name,
      indexedDB,
      keyPath: 'contentHash'
    });
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  async put(receipt) {
    if (
      !receipt ||
      !HASH.test(receipt.contentHash) ||
      !HASH.test(receipt.blobHash) ||
      !Number.isSafeInteger(receipt.size) ||
      receipt.size < 1 ||
      receipt.size > 2 * 1024 * 1024 ||
      (receipt.provider !== undefined &&
        receipt.provider !== 'https://blossom.primal.net') ||
      (receipt.uploaded !== undefined && typeof receipt.uploaded !== 'boolean')
    )
      throw new Error('Invalid share receipt.');
    const saved = {
      contentHash: receipt.contentHash,
      blobHash: receipt.blobHash,
      size: receipt.size,
      provider: receipt.provider ?? 'https://blossom.primal.net',
      uploaded: receipt.uploaded ?? false
    };
    await this.store.update((records) => {
      const next = [
        ...records.filter((record) => record.contentHash !== saved.contentHash),
        saved
      ];
      if (
        next.length > this.maxRecords ||
        next.reduce((size, record) => size + recordBytes(record), 0) >
          this.maxBytes
      )
        throw new Error(
          'Pending shares are full. Finish or discard a pending share.'
        );
      return next;
    });
    return saved;
  }
  async get(hash) {
    return (
      (await this.list()).find((record) => record.contentHash === hash) || null
    );
  }
  list() {
    return this.store.update();
  }
  delete(hash) {
    return this.store.update((records) =>
      records.filter((record) => record.contentHash !== hash)
    );
  }
  clear() {
    return this.store.clear();
  }
}
