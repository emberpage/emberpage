import { Effect } from 'effect';
type ArticleCopy = import('../types.ts').ArticleCopy;
type StoredArticle = Omit<ArticleCopy, 'article'> & {
  url: string;
  title: string;
  capturedAt: number;
  listedAt: number;
  shared: boolean;
  pendingShare: boolean;
  storedAt: number;
  lastAccessedAt: number;
};
type ShareReceipt = import('../types.ts').ShareReceipt;
import { decodeArticle } from './article.ts';
const MAX_RECORDS = 100,
  MAX_VAULT_BYTES: number = 16 * 1024 * 1024;
const encoder: TextEncoder = new TextEncoder(),
  HASH: RegExp = /^[a-f0-9]{64}$/;
export function recordBytes(record: unknown) {
  const { bytes, ...metadata } = record as {
    bytes?: unknown;
  };
  return (
    encoder.encode(JSON.stringify(metadata)).byteLength +
    (bytes instanceof Uint8Array ? bytes.byteLength : 0)
  );
}
export class IndexedRecords<T> {
  name: string;
  indexedDB: IDBFactory;
  keyPath: keyof T & string;
  dbPromise: Promise<IDBDatabase> | null;
  constructor({
    name,
    indexedDB = globalThis.indexedDB,
    keyPath = 'id' as keyof T & string
  }: {
    name: string;
    indexedDB?: IDBFactory | undefined;
    keyPath?: (keyof T & string) | undefined;
  }) {
    this.name = name;
    this.indexedDB = indexedDB;
    this.keyPath = keyPath;
    this.dbPromise = null;
  }
  open() {
    return (this.dbPromise ??= Effect.runPromise(
      Effect.tryPromise({
        try: () =>
          new Promise<IDBDatabase>(
            (
              resolve: (value: IDBDatabase | PromiseLike<IDBDatabase>) => void,
              reject: (reason?: unknown) => void
            ) => {
              const request: IDBOpenDBRequest = this.indexedDB.open(
                this.name,
                1
              );
              request.onupgradeneeded = () =>
                request.result.createObjectStore('records', {
                  keyPath: this.keyPath
                });
              request.onsuccess = () => resolve(request.result);
              request.onerror = request.onblocked = () => {
                this.dbPromise = null;
                reject(
                  request.error ||
                    new Error(
                      'Close other Ember Page windows to open the archive.'
                    )
                );
              };
            }
          ),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error('Local storage failed.')
      })
    ));
  }
  async update(
    change: ((records: T[]) => T[]) | undefined = (records: T[]) => records
  ) {
    const db: IDBDatabase = await this.open();
    return new Promise(
      (
        resolve: (value: T[] | PromiseLike<T[]>) => void,
        reject: (reason?: unknown) => void
      ) => {
        const tx: IDBTransaction = db.transaction('records', 'readwrite'),
          store: IDBObjectStore = tx.objectStore('records');
        let result: T[] = [];
        let failure: unknown;
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () =>
          reject(
            failure instanceof Error
              ? failure
              : tx.error || new Error('Local storage failed.')
          );
        const request: IDBRequest<unknown[]> = store.getAll();
        request.onsuccess = () => {
          try {
            const records: T[] = request.result as T[];
            result = change(records);
            const old: Map<T[keyof T & string], T> = new Map(
                records.map((record: T) => [record[this.keyPath], record])
              ),
              kept: Set<T[keyof T & string]> = new Set(
                result.map((record: T) => record[this.keyPath])
              );
            for (const key of old.keys())
              if (!kept.has(key)) store.delete(key as IDBValidKey);
            for (const record of result)
              if (old.get(record[this.keyPath]) !== record) store.put(record);
          } catch (error: unknown) {
            failure = error;
            tx.abort();
          }
        };
      }
    );
  }
  clear() {
    return this.update(() => []);
  }
}
function lru(a: StoredArticle, b: StoredArticle) {
  return (
    b.lastAccessedAt - a.lastAccessedAt ||
    b.storedAt - a.storedAt ||
    a.contentHash.localeCompare(b.contentHash)
  );
}
export class LocalVault {
  store: IndexedRecords<StoredArticle>;
  now: () => number;
  maxRecords: number;
  maxBytes: number;
  constructor({
    name = 'emberpage-writer-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = MAX_RECORDS,
    maxBytes = MAX_VAULT_BYTES
  }: {
    name?: string | undefined;
    indexedDB?: IDBFactory | undefined;
    now?: (() => number) | undefined;
    maxRecords?: number | undefined;
    maxBytes?: number | undefined;
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
  bounded(records: StoredArticle[]) {
    const ordered: StoredArticle[] = [...records].sort(
        (a: StoredArticle, b: StoredArticle) =>
          Number(b.pendingShare) - Number(a.pendingShare) || lru(a, b)
      ),
      kept: StoredArticle[] = [];
    let bytes: number = 0;
    for (const record of ordered) {
      const size: number = recordBytes(record);
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
  async saveRecord(
    copy: ArticleCopy,
    {
      shared = false,
      pendingShare = false
    }:
      | {
          shared?: boolean | undefined;
          pendingShare?: boolean | undefined;
        }
      | undefined = {}
  ) {
    const decoded: ArticleCopy = await decodeArticle(copy.bytes, {
      blobHash: copy.blobHash,
      now: this.now()
    });
    if (
      decoded.contentHash !== copy.contentHash ||
      decoded.urlHash !== copy.urlHash ||
      decoded.size !== copy.size
    )
      throw new Error('Archive identity does not match file.');
    let saved: StoredArticle | undefined;
    await this.store.update((records: StoredArticle[]) => {
      const previous: StoredArticle | undefined = records.find(
        (record: StoredArticle) => record.contentHash === copy.contentHash
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
          ...records.map((record: StoredArticle) => record.lastAccessedAt + 1)
        )
      };
      if (recordBytes(saved) > this.maxBytes)
        throw new Error('This article exceeds the local cache size limit.');
      const kept: StoredArticle[] = this.bounded([
        ...records.filter(
          (record: StoredArticle) => record.contentHash !== copy.contentHash
        ),
        saved
      ]);
      if (!kept.includes(saved))
        throw new Error('The archive is full. Existing copies were kept.');
      return kept;
    });
    if (!saved) throw new Error('Local storage did not save this copy.');
    return { ...saved, article: decoded.article };
  }
  async getRecord(contentHash: string) {
    const state: {
      record: StoredArticle | null;
    } = { record: null };
    await this.store.update((records: StoredArticle[]) =>
      this.bounded(
        records.map((record: StoredArticle) => {
          if (record.contentHash !== contentHash) return record;
          state.record = {
            ...record,
            lastAccessedAt: Math.max(
              this.now(),
              ...records.map((item: StoredArticle) => item.lastAccessedAt + 1)
            )
          };
          return state.record;
        })
      )
    );
    const found: StoredArticle | null = state.record;
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
    const records: StoredArticle[] = await this.store.update(
      (records: StoredArticle[]) => this.bounded(records)
    );
    return Promise.all(
      records.map(async (record: StoredArticle) => ({
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
  async flag(
    contentHash: string,
    field: 'shared' | 'pendingShare',
    value: boolean,
    listedAt?: number
  ) {
    let changed: StoredArticle | null = null;
    await this.store.update((records: StoredArticle[]) => {
      const updated: StoredArticle[] = records.map((record: StoredArticle) => {
        if (record.contentHash !== contentHash) return record;
        changed = {
          ...record,
          [field]: value === true,
          ...(listedAt === undefined ? {} : { listedAt })
        };
        return changed;
      });
      const kept: StoredArticle[] = this.bounded(updated);
      if (changed && !kept.includes(changed))
        throw new Error('The archive is full. Existing copies were kept.');
      return kept;
    });
    return changed;
  }
  setShared(hash: string, value: boolean, listedAt?: number) {
    if (
      listedAt !== undefined &&
      (!Number.isSafeInteger(listedAt) ||
        listedAt < 0 ||
        listedAt > this.now() + 60000)
    )
      throw new Error('Invalid listing timestamp.');
    return this.flag(hash, 'shared', value, listedAt);
  }
  setPending(hash: string, value: boolean) {
    return this.flag(hash, 'pendingShare', value);
  }
  deleteRecord(hash: string) {
    return this.store.update((records: StoredArticle[]) =>
      records.filter((record: StoredArticle) => record.contentHash !== hash)
    );
  }
  clear() {
    return this.store.clear();
  }
}
export class ShareReceipts {
  store: IndexedRecords<ShareReceipt>;
  maxRecords: number;
  maxBytes: number;
  constructor({
    name = 'emberpage-receipts-v1',
    indexedDB = globalThis.indexedDB,
    maxRecords = 20,
    maxBytes = 256 * 1024
  }: {
    name?: string | undefined;
    indexedDB?: IDBFactory | undefined;
    maxRecords?: number | undefined;
    maxBytes?: number | undefined;
  } = {}) {
    this.store = new IndexedRecords({
      name,
      indexedDB,
      keyPath: 'contentHash'
    });
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  async put(
    receipt: Omit<ShareReceipt, 'provider' | 'uploaded'> &
      Partial<Pick<ShareReceipt, 'provider' | 'uploaded'>>
  ) {
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
    const saved: {
      contentHash: string;
      blobHash: string;
      size: number;
      provider: string;
      uploaded: boolean;
    } = {
      contentHash: receipt.contentHash,
      blobHash: receipt.blobHash,
      size: receipt.size,
      provider: receipt.provider ?? 'https://blossom.primal.net',
      uploaded: receipt.uploaded ?? false
    };
    await this.store.update((records: ShareReceipt[]) => {
      const next: ShareReceipt[] = [
        ...records.filter(
          (record: ShareReceipt) => record.contentHash !== saved.contentHash
        ),
        saved
      ];
      if (
        next.length > this.maxRecords ||
        next.reduce(
          (size: number, record: ShareReceipt) => size + recordBytes(record),
          0
        ) > this.maxBytes
      )
        throw new Error(
          'Pending shares are full. Finish or discard a pending share.'
        );
      return next;
    });
    return saved;
  }
  async get(hash: string) {
    return (
      (await this.list()).find(
        (record: ShareReceipt) => record.contentHash === hash
      ) || null
    );
  }
  list() {
    return this.store.update();
  }
  delete(hash: string) {
    return this.store.update((records: ShareReceipt[]) =>
      records.filter((record: ShareReceipt) => record.contentHash !== hash)
    );
  }
  clear() {
    return this.store.clear();
  }
}
