import { IndexedRecords, recordBytes } from './storage.js';
export const VOTE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000,
  POPULARITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HASH = /^[a-f0-9]{64}$/;
function valid(vote, now) {
  return (
    vote &&
    !Array.isArray(vote) &&
    ['id', 'pubkey', 'urlHash', 'contentHash'].every(
      (key) => typeof vote[key] === 'string' && HASH.test(vote[key])
    ) &&
    Number.isSafeInteger(vote.createdAt) &&
    vote.createdAt > now - VOTE_WINDOW_MS &&
    vote.createdAt <= now + 60_000 &&
    (vote.value === 1 || vote.value === -1) &&
    recordBytes(vote) <= 8192
  );
}
function newest(a, b) {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}
/** Caller supplies signature-verified normalized Nostr votes. Keys are not human identities. */
export class VoteLedger {
  constructor({
    name = 'meshcache-votes-v1',
    indexedDB = globalThis.indexedDB,
    now = () => Date.now(),
    maxRecords = 5000,
    maxBytes = 4 * 1024 * 1024
  } = {}) {
    this.store = new IndexedRecords({ name, indexedDB, keyPath: 'key' });
    this.now = now;
    this.maxRecords = maxRecords;
    this.maxBytes = maxBytes;
  }
  update(incoming = []) {
    return this.store.update((records) => {
      const byKey = new Map(records.map((record) => [record.key, record]));
      for (const vote of incoming) {
        const previous = byKey.get(vote.key);
        if (!previous || newest(vote, previous) < 0) byKey.set(vote.key, vote);
      }
      const kept = [];
      let bytes = 0;
      for (const vote of [...byKey.values()]
        .filter((vote) => vote.createdAt > this.now() - VOTE_WINDOW_MS)
        .sort(newest)) {
        const size = recordBytes(vote);
        if (kept.length >= this.maxRecords || bytes + size > this.maxBytes)
          continue;
        kept.push(vote);
        bytes += size;
      }
      return kept;
    });
  }
  async ingest(votes) {
    if (!Array.isArray(votes)) throw new Error('Invalid ratings.');
    const accepted = votes
      .slice(0, 5000)
      .filter((vote) => valid(vote, this.now()))
      .map((vote) => ({
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
  async summarize(contentHash) {
    if (!HASH.test(contentHash)) throw new Error('Invalid rating target.');
    const votes = (await this.update()).filter(
      (vote) =>
        vote.contentHash === contentHash &&
        vote.createdAt > this.now() - POPULARITY_WINDOW_MS
    );
    const upvotes = Math.min(
        50,
        votes.filter((vote) => vote.value === 1).length
      ),
      downvotes = Math.min(
        50,
        votes.filter((vote) => vote.value === -1).length
      );
    const newestAt = votes[0]?.createdAt,
      age = newestAt ? Math.max(0, this.now() - newestAt) / 3_600_000 : 0;
    return {
      upvotes,
      downvotes,
      score: (upvotes - downvotes) / (age + 2) ** 1.5
    };
  }
  async list() {
    return (await this.update()).map(({ key, ...vote }) => vote);
  }
  clear() {
    return this.store.clear();
  }
}
