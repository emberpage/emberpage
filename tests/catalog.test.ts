import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { hashUrl } from '../src/domain/article.ts';
import {
  CatalogLedger,
  validateCatalogEntry,
  LISTING_WINDOW_MS
} from '../src/storage/catalog.ts';
const now = Date.now(),
  hash = (number: number) => number.toString(16).padStart(64, '0');
async function entry(number: number, createdAt = now) {
  const url = `https://example.org/${number}`;
  return {
    id: hash(number),
    pubkey: hash(999),
    createdAt,
    url,
    urlHash: await hashUrl(url),
    contentHash: hash(number + 100),
    blobHash: hash(number + 200),
    size: 1000,
    title: 'Article',
    byline: 'Writer',
    capturedAt: now - 90 * 86400000,
    provider: 'https://blossom.primal.net'
  };
}
await test('discovery validates metadata identity/window without expiring old article bodies', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const valid = await entry(1);
      assert.equal(await validateCatalogEntry(valid, { now }), true);
      for (const change of [
        { urlHash: hash(2) },
        { provider: 'https://attacker.example' },
        { createdAt: now - LISTING_WINDOW_MS },
        { createdAt: now + 60001 },
        { size: 3 * 1024 * 1024 },
        { title: '' }
      ])
        assert.equal(
          await validateCatalogEntry({ ...valid, ...change }, { now }),
          false
        );
    })
  ));
await test('catalog keeps bounded newest metadata and expires discovery without touching body storage', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      let clock = now;
      const ledger = new CatalogLedger({
        name: crypto.randomUUID(),
        indexedDB,
        now: () => clock,
        maxRecords: 2
      });
      const [a, b, c] = await Promise.all([
        entry(1, now - 2),
        entry(2, now - 1),
        entry(3)
      ]);
      await ledger.ingest([a, b, c, c]);
      assert.deepEqual(
        (await ledger.list()).map((row) => row.id),
        [c.id, b.id]
      );
      const first = (await ledger.list())[0];
      assert.ok(first);
      assert.equal(Object.hasOwn(first, 'bytes'), false);
      clock += LISTING_WINDOW_MS;
      assert.deepEqual(await ledger.list(), []);
    })
  ));
