import { Effect, Schema } from 'effect';
import { MAX_ARTICLE_BYTES } from '../domain/article.ts';
import { IndexedRecords } from './indexeddb.ts';
import { BoundaryError, IpfsQuotaError } from '../domain/errors.ts';

const reservationSchema = Schema.Struct({
  blobHash: Schema.String,
  size: Schema.Int,
  cid: Schema.optionalKey(Schema.String)
});
type Reservation = typeof reservationSchema.Type;
/** Durable conservative quota accounting, independent of article-cache eviction. */
export class IpfsReservations {
  readonly #records: IndexedRecords<Reservation>;
  constructor({
    name = 'emberpage-ipfs-pins-v1',
    indexedDB = globalThis.indexedDB
  }: { name?: string; indexedDB?: IDBFactory } = {}) {
    this.#records = new IndexedRecords({
      name,
      indexedDB,
      keyPath: 'blobHash'
    });
  }
  reserve(blobHash: string, size: number, cid?: string) {
    return Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const input = Schema.decodeUnknownSync(reservationSchema)({
            blobHash,
            size,
            ...(cid === undefined ? {} : { cid })
          });
          if (
            !/^[a-f0-9]{64}$/.test(blobHash) ||
            size < 1 ||
            size > MAX_ARTICLE_BYTES ||
            (cid !== undefined && cid.length > 128)
          )
            throw new Error('Invalid IPFS reservation.');
          let created = false;
          await this.#records.update((records) => {
            const existing = records.find(
              (record) => record.blobHash === blobHash
            );
            if (existing && existing.size !== size)
              throw new Error('Conflicting IPFS reservation.');
            created = !existing;
            const others = records.filter(
              (record) => record.blobHash !== blobHash
            );
            if (
              others.length >= 100 ||
              others.reduce((sum, record) => sum + record.size, 0) + size >
                16 * 1024 * 1024
            )
              throw new IpfsQuotaError({
                message:
                  'The IPFS mirror limit is full. Remove contributed copies in Manage to free space.'
              });
            return [...others, { ...existing, ...input }];
          });
          return created;
        },
        catch: (cause) =>
          cause instanceof IpfsQuotaError ? cause : BoundaryError.from(cause)
      })
    );
  }
  list() {
    return this.#records.update((records) => records);
  }
  release(blobHash: string) {
    return this.#records
      .update((records) =>
        records.filter((record) => record.blobHash !== blobHash)
      )
      .then(() => undefined);
  }
}
