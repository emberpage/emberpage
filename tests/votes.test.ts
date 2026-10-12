import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import {
  VoteLedger,
  VOTE_WINDOW_MS,
  POPULARITY_WINDOW_MS
} from '../src/core/votes.ts';
const now = Date.now(),
  hash = (number: number) => number.toString(16).padStart(64, '0');
const vote = (
  number: number,
  fields: Partial<import('../src/types.ts').Vote> = {}
) => ({
  id: hash(number),
  pubkey: hash(number + 100),
  createdAt: now,
  urlHash: hash(900),
  contentHash: hash(901),
  value: 1,
  ...fields
});
await test('newest verified vote per signing key and snapshot wins without duplicate inflation', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const ledger = new VoteLedger({
          name: crypto.randomUUID(),
          indexedDB,
          now: () => now
        }),
        older = vote(1, { createdAt: now - 1000 }),
        newer = vote(2, { pubkey: older.pubkey, value: -1 });
      await ledger.ingest([older, older, newer]);
      assert.deepEqual(await ledger.summarize(hash(901)), {
        upvotes: 0,
        downvotes: 1,
        score: -1 / 2 ** 1.5
      });
      // Altering the redundant URL target cannot manufacture another vote for one content hash/key.
      await ledger.ingest([
        vote(3, {
          pubkey: older.pubkey,
          urlHash: hash(999),
          createdAt: now - 500
        })
      ]);
      assert.equal((await ledger.list()).length, 1);
    })
  ));
await test('rating retention and popularity windows are separate and malformed metadata is ignored', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      let clock = now;
      const ledger = new VoteLedger({
        name: crypto.randomUUID(),
        indexedDB,
        now: () => clock
      });
      await ledger.ingest([
        vote(1, { createdAt: now - POPULARITY_WINDOW_MS - 1 }),
        vote(2),
        vote(3, { value: 0 }),
        vote(4, { createdAt: now + 60001 })
      ]);
      assert.equal((await ledger.list()).length, 2);
      assert.equal((await ledger.summarize(hash(901))).upvotes, 1);
      clock += VOTE_WINDOW_MS;
      assert.deepEqual(await ledger.list(), []);
    })
  ));
await test('rating count and byte budgets are enforced and ranking counts cap each direction', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const ledger = new VoteLedger({
        name: crypto.randomUUID(),
        indexedDB,
        now: () => now,
        maxRecords: 200
      });
      await ledger.ingest(
        Array.from({ length: 120 }, (_, index) =>
          vote(index + 1, { value: index < 60 ? 1 : -1 })
        )
      );
      const rating = await ledger.summarize(hash(901));
      assert.equal(rating.upvotes, 50);
      assert.equal(rating.downvotes, 50);
      const bounded = new VoteLedger({
        name: crypto.randomUUID(),
        indexedDB,
        now: () => now,
        maxRecords: 2,
        maxBytes: 1000
      });
      await bounded.ingest([vote(1), vote(2), vote(3)]);
      assert.ok((await bounded.list()).length <= 2);
    })
  ));
