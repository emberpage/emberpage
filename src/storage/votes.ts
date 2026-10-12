import { Predicate } from 'effect';
type Vote = import('../domain/types.ts').Vote;
type StoredVote = Vote & {
  key: string;
};
import { IndexedRecords, recordBytes } from './indexeddb.ts';
export const VOTE_WINDOW_MS: number = 30 * 24 * 60 * 60 * 1000,
  POPULARITY_WINDOW_MS: number = 7 * 24 * 60 * 60 * 1000;
const HASH: RegExp = /^[a-f0-9]{64}$/;
function valid(vote: Vote, now: number) {
  return (
    vote &&
    !Array.isArray(vote) &&
    (['id', 'pubkey', 'urlHash', 'contentHash'] as Array<keyof Vote>).every(
      (key: keyof Vote) => Predicate.isString(vote[key]) && HASH.test(vote[key])
    ) &&
    Number.isSafeInteger(vote.createdAt) &&
    vote.createdAt > now - VOTE_WINDOW_MS &&
    vote.createdAt <= now + 60000 &&
    (vote.value === 1 || vote.value === -1) &&
    recordBytes(vote) <= 8192
  );
}
function newest(a: Vote, b: Vote) {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}
export class VoteLedger {
  store: IndexedRecords<StoredVote>;
  now: () => number;
  maxRecords: number;
  maxBytes: number;
  constructor({
    name = 'emberpage-votes-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = 5000,
    maxBytes = 4 * 1024 * 1024
  }: {
    name?: string | undefined;
    indexedDB?: IDBFactory | undefined;
    now?: (() => number) | undefined;
    maxRecords?: number | undefined;
    maxBytes?: number | undefined;
  } = {}) {
    this.store = new IndexedRecords({ name, indexedDB, keyPath: 'key' });
    this.now = now;
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  update(incoming: StoredVote[] | undefined = []) {
    return this.store.update((records: StoredVote[]) => {
      const byKey: Map<string, StoredVote> = new Map(
        records.map((record: StoredVote) => [record.key, record])
      );
      for (const vote of incoming) {
        const previous: StoredVote | undefined = byKey.get(vote.key);
        if (!previous || newest(vote, previous) < 0) byKey.set(vote.key, vote);
      }
      const kept: StoredVote[] = [];
      let bytes: number = 0;
      for (const vote of [...byKey.values()]
        .filter(
          (vote: StoredVote) => vote.createdAt > this.now() - VOTE_WINDOW_MS
        )
        .sort(newest)) {
        const size: number = recordBytes(vote);
        if (kept.length >= this.maxRecords || bytes + size > this.maxBytes)
          continue;
        kept.push(vote);
        bytes += size;
      }
      return kept;
    });
  }
  async ingest(votes: Vote[]) {
    if (!Array.isArray(votes)) throw new Error('Invalid ratings.');
    const accepted: {
      id: string;
      pubkey: string;
      createdAt: number;
      urlHash: string;
      contentHash: string;
      value: number;
      key: string;
    }[] = votes
      .slice(0, 5000)
      .filter((vote: Vote) => valid(vote, this.now()))
      .map((vote: Vote) => ({
        id: vote.id,
        pubkey: vote.pubkey,
        createdAt: vote.createdAt,
        urlHash: vote.urlHash,
        contentHash: vote.contentHash,
        value: vote.value,
        key: `${vote.pubkey}:${vote.contentHash}`
      }));
    await this.update(accepted);
    return accepted.length;
  }
  async summarize(contentHash: string) {
    if (!HASH.test(contentHash)) throw new Error('Invalid rating target.');
    const votes: StoredVote[] = (await this.update()).filter(
      (vote: StoredVote) =>
        vote.contentHash === contentHash &&
        vote.createdAt > this.now() - POPULARITY_WINDOW_MS
    );
    const upvotes: number = Math.min(
        50,
        votes.filter((vote: StoredVote) => vote.value === 1).length
      ),
      downvotes: number = Math.min(
        50,
        votes.filter((vote: StoredVote) => vote.value === -1).length
      );
    const newestAt = votes[0]?.createdAt,
      age: number = newestAt ? Math.max(0, this.now() - newestAt) / 3600000 : 0;
    return {
      upvotes,
      downvotes,
      score: (upvotes - downvotes) / (age + 2) ** 1.5
    };
  }
  async list() {
    return (await this.update()).map(
      ({ key: _key, ...vote }: StoredVote) => vote
    );
  }
  clear() {
    return this.store.clear();
  }
}
