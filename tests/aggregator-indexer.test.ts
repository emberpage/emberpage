import type {MetadataDirectory} from '../aggregator/types.ts';
import type {RatingTarget} from '../src/domain/types.ts';
import test from "node:test";
import { Effect, Predicate } from "effect";
import assert from "node:assert/strict";
import { AggregatorStore } from "../aggregator/store.ts";
import { MetadataIndexer, rankedArticles } from "../aggregator/indexer.ts";
import { listing, vote, queryResult } from "./aggregator-fixture.ts";

await test("indexer uses only metadata interface, records rejected counts and preserves prior state on network failure", async () => {
  const now = Date.now(),
    store = new AggregatorStore({ now: () => now });
  try {
    const item = await listing(now);
    const calls: Array<string|readonly RatingTarget[]> = [];
    const directory: MetadataDirectory = {
      queryListings() {
        calls.push("listings");
        return Promise.resolve(queryResult([item], {
          received: 3, accepted: 1, rejected: 1, duplicates: 1,
        }));
      },
      queryVotes(targets) {
        calls.push(targets);
        return Promise.resolve(queryResult([vote(item)]));
      },
    };
    const indexer = new MetadataIndexer({ store, directory, now: () => now });
    const result = await indexer.refresh();
    assert.deepEqual(calls, [
      "listings",
      [{ urlHash: item.urlHash, contentHash: item.contentHash }],
    ]);
    assert.equal(result.rejected, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(store.listArticles().length, 1);
    const before = store.listArticles();
    directory.queryVotes = () => Promise.reject(new Error("secret relay failure"));
    await assert.rejects(indexer.refresh(), /previous index/);
    assert.deepEqual(store.listArticles(), before);
    assert.doesNotMatch(JSON.stringify(store.events()), /secret relay/);
    assert.equal(
      (await indexer.status()).connected,
      false,
      "One-shot query sockets are closed.",
    );
  } finally {
    store.close();
  }
});

await test("metadata query records and diagnostics are validated together before indexing", async () => {
  const store = new AggregatorStore();
  const item = await listing();
  const indexer = new MetadataIndexer({
    store,
    directory: {
      queryListings() {
        return Promise.resolve(queryResult([item], { rejected: -1 }));
      },
      queryVotes() {
        throw new Error("Votes must not start after invalid query diagnostics");
      },
    },
  });
  try {
    await assert.rejects(indexer.refresh(), /previous index/);
    assert.equal(store.listArticles().length, 0);
    assert.equal(store.events().find(event => event.action === "LISTINGS")?.outcome, "failure");
  } finally {
    await Effect.runPromise(indexer.shutdownEffect());
    store.close();
  }
});

await test("ranking uses newest signed-key choice, independent caps and earliest listing rather than capture or replication time", async () => {
  const now = Date.now(),
    item = await listing(now, { createdAt: now - 3600_000 }),
    replica = { ...item, id: "1".repeat(64), createdAt: now };
  const old = vote(item, { createdAt: now - 1000 }),
    replacement = vote(item, { id: "2".repeat(64), createdAt: now, value: -1 });
  const expired = vote(item, {
    id: "3".repeat(64),
    pubkey: "3".repeat(64),
    createdAt: now - 8 * 86400_000,
  });
  const [record] = rankedArticles(
    [item, replica],
    [old, replacement, expired],
    now,
  );
  assert(record);
  assert.equal(record.listedAt, item.createdAt);
  assert.deepEqual(record.rating, { upvotes: 0, downvotes: 1 });
  assert.equal(record.category, "Science");
  assert.equal(record.score, 1 / 3 ** 1.5);
  const many = Array.from({ length: 120 }, (_, i) =>
    vote(item, {
      id: i.toString(16).padStart(64, "0"),
      pubkey: i.toString(16).padStart(64, "0"),
      value: i < 60 ? 1 : -1,
    }),
  );
  const capped=rankedArticles([item], many, now)[0]; assert(capped);
  assert.deepEqual(capped.rating, {
    upvotes: 50,
    downvotes: 50,
  });
});

await test("rolling scheduler is explicitly started, never overlaps and stops cleanly", async (t) => {
  const store = new AggregatorStore();
  t.after(() => store.close());
  let runs=0;
  const {promise:gate,resolve:release}=Promise.withResolvers<void>();
  const {promise:ready,resolve:started}=Promise.withResolvers<void>();
  const directory = {
    async queryListings() {
      runs++;
      started();
      if (runs === 1) await gate;
      return queryResult([]);
    },
    queryVotes() {
      return Promise.resolve(queryResult([]));
    },
  };
  const indexer = new MetadataIndexer({ store, directory, intervalMs: 20 });
  t.after(() => indexer.stopScheduler());
  assert.equal(runs, 0);
  indexer.startScheduler();
  indexer.startScheduler();
  await ready;
  assert.equal(runs, 1);
  await assert.rejects(indexer.refresh(), (error:unknown) => Predicate.isObject(error) && error.status === 409);
  release();
  await new Promise((resolve) => setTimeout(resolve, 60));
  await indexer.stopScheduler();
  const stopped = runs;
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(runs, stopped);
  assert.ok(runs >= 2);
  assert.equal(indexer.nextRunAt, null);
});

await test("interrupting a scheduled metadata query aborts its transport and clears pending before store shutdown", async () => {
  const store = new AggregatorStore();
  let aborted=false;
  const {promise:ready,resolve:began}=Promise.withResolvers<void>();
  const directory = {
    queryListings(signal?:AbortSignal) {
      assert(signal);
      began();
      return new Promise<unknown>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new Error("Aborted query"));
          },
          { once: true },
        );
      });
    },
    queryVotes() {
      return Promise.reject(new Error("Votes must not start after interruption"));
    },
  };
  const indexer = new MetadataIndexer({ store, directory, intervalMs: 20 });
  try {
    indexer.startScheduler();
    await ready;
    await indexer.stopScheduler();
    assert.equal(aborted, true);
    assert.equal(indexer.pending, false);
    assert.equal(indexer.indexing, false);
    assert.equal(indexer.nextRunAt, null);
    assert.equal(store.listArticles().length, 0);
  } finally {
    await Effect.runPromise(indexer.shutdownEffect());
    store.close();
  }
});

await test("shutdown joins manual metadata query interruption and prevents future refreshes", async () => {
  const store = new AggregatorStore();
  let aborted=false;
  const {promise:ready,resolve:began}=Promise.withResolvers<void>();
  const indexer = new MetadataIndexer({
    store,
    directory: {
      queryListings(signal?:AbortSignal) {
      assert(signal);
        began();
        return new Promise<unknown>((_resolve, reject) =>
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(new Error("Aborted"));
            },
            { once: true },
          ),
        );
      },
      queryVotes() {
        return Promise.resolve(queryResult([]));
      },
    },
  });
  const pending = indexer.refresh();
  const observed = pending.catch((error:unknown) => error);
  try {
    await ready;
    await Effect.runPromise(indexer.shutdownEffect());
    await observed;
    assert.equal(aborted, true);
    assert.equal(indexer.pending, false);
    await assert.rejects(indexer.refresh(), (error:unknown) => Predicate.isObject(error) && error.status === 503);
    assert.equal(store.listArticles().length, 0);
  } finally {
    store.close();
  }
});

await test("typed relay timeout keeps its error code through metadata decoding and failure logging", async () => {
  const store = new AggregatorStore();
  const indexer = new MetadataIndexer({
    store,
    directory: {
      queryListings() {
        return Promise.reject(Object.assign(new Error("Directory request exceeded its deadline"), {code:"timeout"}));
      },
      queryVotes() {
        return Promise.resolve(queryResult([]));
      },
    },
  });
  try {
    await assert.rejects(
      indexer.refresh(),
      (error:unknown) => Predicate.isObject(error) && error.code === "timeout" && error.status === 502,
    );
    assert.equal((await indexer.status()).error, "timeout");
    assert.equal(store.listArticles().length, 0);
    assert.equal(
      store.events().find((event) => event.action === "REFRESH")?.details.error,
      "timeout",
    );
  } finally {
    await Effect.runPromise(indexer.shutdownEffect());
    store.close();
  }
});


await test('actual directory timeout keeps a stable code without matching message prose', async () => {
  const {NostrDirectory} = await import('../src/directory/nostr.ts');
  class SilentSocket {
    readyState = 1;
    onopen:(()=>void)|null=null; onclose:(()=>void)|null=null; onerror:(()=>void)|null=null; onmessage:((event:{data:unknown})=>void)|null=null;
    constructor() { queueMicrotask(() => this.onopen?.()); }
    send() {}
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const store = new AggregatorStore();
  const indexer = new MetadataIndexer({store, directory:new NostrDirectory({WebSocket:SilentSocket,timeoutMs:10})});
  try {
    await assert.rejects(indexer.refresh(), (error:unknown) => Predicate.isObject(error) && error.code === 'timeout');
    assert.equal(store.events().find(event=>event.action==='REFRESH')?.details.error,'timeout');
  } finally {await Effect.runPromise(indexer.shutdownEffect());store.close();}
});

await test('refresh coverage preserves failures from either phase, survives empty votes and resets on recovery', async () => {
  const store = new AggregatorStore();
  const item = await listing();
  let listingFailed = true, votesFailed = false, votesSkipped = false;
  const outcomes = (failed: boolean) => [
    {relay: 'fixture-a', outcome: 'success' as const},
    failed ? {relay: 'fixture-b', outcome: 'failure' as const, error: 'timeout' as const}
      : {relay: 'fixture-b', outcome: 'success' as const},
  ];
  const indexer = new MetadataIndexer({store, directory: {
    queryListings: () => Promise.resolve(queryResult([item], {relays: outcomes(listingFailed)})),
    queryVotes: () => Promise.resolve(queryResult([], {relays: votesSkipped ? [] : outcomes(votesFailed)})),
  }});
  try {
    for (const [listFailure, voteFailure, skipVotes, expected] of [
      [true, false, false, 'failure'],
      [false, true, false, 'failure'],
      [true, false, true, 'failure'],
      [false, false, true, 'success'],
      [false, false, false, 'success'],
    ] as const) {
      listingFailed = listFailure; votesFailed = voteFailure; votesSkipped = skipVotes;
      await indexer.refresh();
      const status = await indexer.status();
      assert.equal(status.lastQuerySucceeded, true, 'Partial coverage still commits usable metadata');
      assert.equal(status.relays.length, 2, 'One combined result per relay');
      assert.equal(status.relays.find(relay => relay.relay === 'fixture-b')?.outcome, expected);
      assert.equal(store.listArticles().length, 1);
    }
  } finally {await Effect.runPromise(indexer.shutdownEffect()); store.close();}
});
