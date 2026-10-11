import test from "node:test";
import { Effect } from "effect";
import assert from "node:assert/strict";
import { AggregatorStore } from "../aggregator/store.js";
import { MetadataIndexer, rankedArticles } from "../aggregator/indexer.ts";
import { listing, vote } from "./aggregator-fixture.js";

test("indexer uses only metadata interface, records rejected counts and preserves prior state on network failure", async () => {
  const now = Date.now(),
    store = new AggregatorStore({ now: () => now });
  try {
    const item = await listing(now);
    const calls = [];
    const directory = {
      lastQuery: null,
      async queryListings() {
        calls.push("listings");
        this.lastQuery = {
          received: 3,
          accepted: 1,
          rejected: 1,
          duplicates: 1,
        };
        return [item];
      },
      async queryVotes(targets) {
        calls.push(targets);
        this.lastQuery = {
          received: 1,
          accepted: 1,
          rejected: 0,
          duplicates: 0,
        };
        return [vote(item)];
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
    directory.queryVotes = async () => {
      throw new Error("secret relay failure");
    };
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

test("ranking uses newest signed-key choice, independent caps and earliest listing rather than capture or replication time", async () => {
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
  assert.deepEqual(rankedArticles([item], many, now)[0].rating, {
    upvotes: 50,
    downvotes: 50,
  });
});

test("rolling scheduler is explicitly started, never overlaps and stops cleanly", async (t) => {
  const store = new AggregatorStore();
  t.after(() => store.close());
  let release,
    started,
    runs = 0;
  const gate = new Promise((resolve) => (release = resolve)),
    ready = new Promise((resolve) => (started = resolve));
  const directory = {
    async queryListings() {
      runs++;
      started();
      if (runs === 1) await gate;
      return [];
    },
    async queryVotes() {
      return [];
    },
  };
  const indexer = new MetadataIndexer({ store, directory, intervalMs: 20 });
  t.after(() => indexer.stopScheduler());
  assert.equal(runs, 0);
  indexer.startScheduler();
  indexer.startScheduler();
  await ready;
  assert.equal(runs, 1);
  await assert.rejects(indexer.refresh(), (error) => error.status === 409);
  release();
  await new Promise((resolve) => setTimeout(resolve, 60));
  await indexer.stopScheduler();
  const stopped = runs;
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(runs, stopped);
  assert.ok(runs >= 2);
  assert.equal(indexer.nextRunAt, null);
});

test("interrupting a scheduled metadata query aborts its transport and clears pending before store shutdown", async () => {
  const store = new AggregatorStore();
  let began,
    aborted = false;
  const ready = new Promise((resolve) => (began = resolve));
  const directory = {
    queryListings(signal) {
      began();
      return new Promise((resolve, reject) => {
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
    async queryVotes() {
      throw new Error("Votes must not start after interruption");
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

test("shutdown joins manual metadata query interruption and prevents future refreshes", async () => {
  const store = new AggregatorStore();
  let began,
    aborted = false;
  const ready = new Promise((resolve) => (began = resolve));
  const indexer = new MetadataIndexer({
    store,
    directory: {
      queryListings(signal) {
        began();
        return new Promise((resolve, reject) =>
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
      async queryVotes() {
        return [];
      },
    },
  });
  const pending = indexer.refresh();
  const observed = pending.catch((error) => error);
  try {
    await ready;
    await Effect.runPromise(indexer.shutdownEffect());
    await observed;
    assert.equal(aborted, true);
    assert.equal(indexer.pending, false);
    await assert.rejects(indexer.refresh(), (error) => error.status === 503);
    assert.equal(store.listArticles().length, 0);
  } finally {
    store.close();
  }
});

test("typed relay timeout keeps its error code through metadata decoding and failure logging", async () => {
  const store = new AggregatorStore();
  const indexer = new MetadataIndexer({
    store,
    directory: {
      async queryListings() {
        throw new Error("Discovery relay timed out");
      },
      async queryVotes() {
        return [];
      },
    },
  });
  try {
    await assert.rejects(
      indexer.refresh(),
      (error) => error.code === "timeout" && error.status === 502,
    );
    assert.equal((await indexer.status()).error, "timeout");
    assert.equal(store.listArticles().length, 0);
    assert.equal(
      store.events().find((event) => event.action === "REFRESH").details.error,
      "timeout",
    );
  } finally {
    await Effect.runPromise(indexer.shutdownEffect());
    store.close();
  }
});
