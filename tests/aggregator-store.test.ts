import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AggregatorStore } from '../aggregator/store.ts';
import { DISCOVERY_WINDOW_MS } from '../src/directory/nostr.ts';
import { listing, vote } from './aggregator-fixture.ts';
await test('SQLite persists bounded public fields only and deduplicates signed event ids across refreshes', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const now = Date.now(),
        dir = mkdtempSync(join(tmpdir(), 'emberpage-index-')),
        path = join(dir, 'index.sqlite');
      let store;
      try {
        store = new AggregatorStore({ path, now: () => now });
        const item = await listing(now, {
            content: 'PRIVATE BODY',
            textContent: 'PRIVATE TEXT',
            privateKey: 'PRIVATE KEY'
          }),
          rating = vote(item, { body: 'PRIVATE BODY' });
        await store.commitMetadata([item], [rating]);
        await store.commitMetadata([item], [rating]);
        assert.equal(store.listArticles().length, 1);
        assert.equal(store.listVotes().length, 1);
        assert.doesNotMatch(
          JSON.stringify([store.listArticles(), store.listVotes()]),
          /PRIVATE|content"|textContent|privateKey/
        );
        const persisted = store.listArticles()[0];
        assert.ok(persisted);
        assert.ok(
          persisted.capturedAt < now - DISCOVERY_WINDOW_MS,
          'Old captures are valid when recently listed.'
        );
        const saved = store.listArticles();
        store.close();
        store = new AggregatorStore({ path, now: () => now });
        assert.deepEqual(store.listArticles(), saved);
        assert.equal(store.stats().dbBytes, statSync(path).size);
      } finally {
        store?.close();
        rmSync(dir, { recursive: true, force: true });
      }
    })
  ));
await test('metadata window expires listing events rather than article capture dates and evicts oldest records', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      let now = Date.now();
      const store = new AggregatorStore({ now: () => now, maxArticles: 2 });
      try {
        const first = await listing(now, {
            id: '1'.repeat(64),
            createdAt: now - 2000
          }),
          second = await listing(now, {
            id: '2'.repeat(64),
            createdAt: now - 1000
          }),
          third = await listing(now, { id: '3'.repeat(64) });
        await store.commitMetadata([first, second, third], []);
        assert.deepEqual(
          store.listArticles().map((item) => item.id),
          [third.id, second.id]
        );
        store.maxBytes = new TextEncoder().encode(JSON.stringify(third)).length;
        assert.equal(store.listArticles().length, 1);
        assert.ok(store.stats().catalog.bytes <= store.maxBytes);
        now += DISCOVERY_WINDOW_MS + 1;
        assert.deepEqual(store.listArticles(), []);
      } finally {
        store.close();
      }
    })
  ));
await test('metadata transaction rolls back both collections on an insert failure', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const now = Date.now(),
        store = new AggregatorStore({ now: () => now });
      try {
        const old = await listing(now);
        await store.commitMetadata([old], [vote(old)]);
        const before = [store.listArticles(), store.listVotes()];
        store.db.exec(
          "CREATE TRIGGER reject_rating BEFORE INSERT ON ratings WHEN NEW.id = '1111111111111111111111111111111111111111111111111111111111111111' BEGIN SELECT RAISE(ABORT,'storage failure'); END"
        );
        await assert.rejects(
          store.commitMetadata(
            [{ ...old, id: '2'.repeat(64) }],
            [vote(old, { id: '1'.repeat(64) })]
          ),
          /storage failure/
        );
        assert.deepEqual([store.listArticles(), store.listVotes()], before);
      } finally {
        store.close();
      }
    })
  ));
await test('journal and trend counts retain bounded diagnostics for seven days without remote data', () =>
  Effect.runPromise(
    Effect.sync(() => {
      let now = Date.now();
      const store = new AggregatorStore({ now: () => now, maxEvents: 3 });
      try {
        for (let i = 0; i < 5; i++)
          store.appendEvent({
            action: 'REFRESH',
            kind: 'refresh',
            outcome: 'success',
            details: {
              accepted: i,
              rejected: 1,
              error: 'PRIVATE URL',
              content: 'PRIVATE BODY',
              reasons: { invalid: 1, private: 'SECRET' }
            }
          });
        assert.deepEqual(
          store.events().map((event) => event.details.accepted),
          [4, 3, 2]
        );
        assert.doesNotMatch(JSON.stringify(store.events()), /PRIVATE|SECRET/);
        assert.equal(store.events()[0]?.details.error, 'unknown');
        assert.equal(
          store.trends().reduce((sum, day) => sum + day.runs, 0),
          5
        );
        assert.equal(
          store.trends().reduce((sum, day) => sum + day.accepted, 0),
          10
        );
        assert.equal(store.stats().trends.count, 1);
        assert.ok(store.stats().trends.bytes <= store.stats().trends.maxBytes);
        now += 7 * 86400000 + 1;
        assert.deepEqual(store.events(), []);
        assert.equal(
          store.trends().reduce((sum, day) => sum + day.runs, 0),
          0
        );
        store.saveRefresh({
          accepted: 2,
          startedAt: now,
          finishedAt: 'PRIVATE',
          durationMs: -1,
          content: 'PRIVATE'
        });
        assert.deepEqual(store.lastRefresh(), {
          accepted: 2,
          checkedAt: now,
          startedAt: now
        });
      } finally {
        store.close();
      }
    })
  ));

await test('obsolete provider metadata is pruned without crowding out current IPFS listings', () =>
  Effect.runPromise(Effect.promise(async () => {
    const now = Date.now();
    const store = new AggregatorStore({now:()=>now,maxArticles:1});
    try {
      const current = await listing(now);
      const {cid:_cid,...fields} = current;
      const obsolete = {...fields,id:'9'.repeat(64),createdAt:now+1,provider:'https://blossom.primal.net'};
      store.db.prepare('INSERT INTO directory VALUES(?,?,?)').run(obsolete.id,obsolete.createdAt,JSON.stringify(obsolete));
      await store.commitMetadata([current],[]);
      assert.deepEqual(store.listArticles(),[current]);
    } finally {store.close();}
  })));
