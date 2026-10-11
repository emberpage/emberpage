// Real subprocess restarts and network exchanges; synthetic metadata only.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createServer } from "node:http";
import { strings } from "@helia/strings";
import { ipns } from "@helia/ipns";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import { sha256 as cidHash } from "multiformats/hashes/sha2";
import { createHash } from "node:crypto";
import { multiaddr } from "@multiformats/multiaddr";
import { node } from "./node.mjs";
import {
  identity,
  signed,
  limits,
  validateFeed,
  verifySnapshot,
  readHttpSnapshot,
  boundedBlock,
  rawCid,
} from "./collector.mjs";
const checks = [],
  now = Date.now(),
  hash = (s) => createHash("sha256").update(s).digest("hex"),
  scratch = await mkdtemp(join(tmpdir(), "emberpage-ipfs-feeds-")),
  owner = identity(),
  bodyNode = await node();
let publisher = bodyNode,
  worker,
  reader,
  server,
  serial = 0;
async function start() {
  const child = fork(
    new URL("./collector-worker.mjs", import.meta.url),
    [scratch],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  let stderr = "";
  child.stderr.on("data", (b) => (stderr += b));
  const ready = await new Promise((resolve, reject) => {
    child.once("message", resolve);
    child.once("exit", (code) =>
      reject(Error(`Collector exited ${code}: ${stderr}`)),
    );
  });
  return {
    child,
    ...ready,
    request(command, extra = {}) {
      const id = ++serial;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          child.off("message", handle);
          reject(Error(`Worker timeout ${command}`));
        }, 10000);
        function handle(msg) {
          if (msg.id !== id) return;
          clearTimeout(timer);
          child.off("message", handle);
          msg.error ? reject(Error(msg.error)) : resolve(msg.value);
        }
        child.on("message", handle);
        child.send({ id, command, ...extra });
      });
    },
  };
}
async function stop() {
  const child = worker.child;
  await worker.request("stop");
  const [code] = await once(child, "exit");
  assert.equal(code, 0);
}
async function check(name, action) {
  const t = Date.now();
  await action();
  checks.push({ name, outcome: "pass", durationMs: Date.now() - t });
  console.log("PASS", name);
}
async function publish(feed, publicationOptions = {}) {
  const cid = await strings(publisher).add(JSON.stringify(feed));
  const result = await ipns(publisher).publish("feed", cid, {
    ttl: 0,
    lifetime: 3600000,
    upkeep: "none",
    signal: AbortSignal.timeout(3000),
    ...publicationOptions,
  });
  return { cid, result };
}
let name, articleCid, goodFeed, latest, originalKey, firstPid, lastSnapshot;
try {
  worker = await start();
  firstPid = worker.pid;
  await worker.request("dial", {
    address: publisher.libp2p.getMultiaddrs()[0].toString(),
  });
  await new Promise((r) => setTimeout(r, 700));
  articleCid = await strings(publisher).add(
    "Private-to-spike synthetic article body, collector must never request it",
  );
  const url = "https://example.invalid/spike";
  const event = {
    type: "listing",
    id: hash("listing"),
    cid: articleCid.toString(),
    url,
    urlHash: hash(url),
    contentHash: hash("content"),
    blobHash: hash("blob"),
    size: 79,
    title: "Synthetic science article",
    byline: "Synthetic",
    createdAt: now,
  };
  goodFeed = signed(
    {
      format: "emberpage.feed.spike",
      sequence: 1,
      updatedAt: now,
      events: [event],
    },
    owner,
  );
  latest = await publish(goodFeed);
  name = latest.result.name.slice(6);
  await check(
    "Explicit registered IPNS feed fetched, signed, pinned and ranked by separate process",
    async () => {
      await worker.request("register", {
        entry: { name, key: owner.publicKey },
      });
      const result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "success");
      assert.equal(result.snapshot.body.articles.length, 1);
      assert.equal(result.snapshot.body.status, "fresh");
      assert.equal(
        await worker.request("has", { cid: articleCid.toString() }),
        false,
      );
      const state = await worker.request("status");
      assert.equal(state.pins[0].pinned, true);
      originalKey = state.key;
      lastSnapshot = result.snapshot;
    },
  );
  await check(
    "Actual optional HTTP client verifies bound collector identity, freshness and signed snapshot",
    async () => {
      const snapshot = await readHttpSnapshot(
        `${worker.http}/popular`,
        originalKey,
      );
      assert.equal(snapshot.status, "fresh");
      assert.equal(snapshot.articles[0].cid, articleCid.toString());
      assert.equal(
        (await fetch(`${worker.http}/article/${articleCid}`)).status,
        404,
      );
    },
  );
  await check(
    "Full process exit and new PID preserves registry, sequence/hash cache, identity and metadata pin",
    async () => {
      await stop();
      worker = await start();
      assert.notEqual(worker.pid, firstPid);
      const state = await worker.request("status");
      assert.equal(state.key, originalKey);
      assert.equal(state.registry[0].name, name);
      assert.equal(state.highwater[name].sequence, 1);
      assert.equal(state.pins[0].pinned, true);
      assert.deepEqual(state.snapshot, lastSnapshot);
      assert.equal(
        await worker.request("has", { cid: articleCid.toString() }),
        false,
      );
    },
  );
  await worker.request("dial", {
    address: publisher.libp2p.getMultiaddrs()[0].toString(),
  });
  await new Promise((r) => setTimeout(r, 700));
  await check(
    "Real IPNS update with same application sequence and changed signed body rejected as equivocation",
    async () => {
      await publish(
        signed(
          {
            ...goodFeed.body,
            events: [{ ...event, title: "Conflicting poison title" }],
          },
          owner,
        ),
      );
      const result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "failure");
      assert.match(result.outcomes[0].error, /equivocation/);
      assert.equal(result.snapshot.body.articles[0].title, event.title);
      assert.equal(result.snapshot.body.status, "stale");
    },
  );
  await check(
    "Real newer IPNS pointer to older signed sequence rejected after observed sequence two",
    async () => {
      await publish(
        signed(
          {
            ...goodFeed.body,
            sequence: 2,
            events: [{ ...event, title: "Recovered science article" }],
          },
          owner,
        ),
      );
      let result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "success");
      await publish(goodFeed);
      result = await worker.request("poll");
      assert.match(result.outcomes[0].error, /rollback/);
      assert.equal(
        result.snapshot.body.articles[0].title,
        "Recovered science article",
      );
    },
  );
  await check(
    "Real signed stale feed via updated IPNS pointer rejected without replacing cached ranking",
    async () => {
      await publish(
        signed(
          {
            ...goodFeed.body,
            sequence: 3,
            updatedAt: now - limits.freshnessMs - 1,
          },
          owner,
        ),
      );
      const result = await worker.request("poll");
      assert.match(result.outcomes[0].error, /stale/);
      assert.equal(
        result.snapshot.body.articles[0].title,
        "Recovered science article",
      );
    },
  );
  await check(
    "Oversized raw feed over actual Bitswap rejected before JSON parse and not persisted",
    async () => {
      const huge = await strings(publisher).add("x".repeat(200000));
      await ipns(publisher).publish("feed", huge, {
        ttl: 0,
        lifetime: 3600000,
        upkeep: "none",
        signal: AbortSignal.timeout(3000),
      });
      const result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "failure");
      assert.equal(
        await worker.request("has", { cid: huge.toString() }),
        false,
      );
      assert(result.outcomes[0].durationMs < 3000);
    },
  );
  await check(
    "DAG fanout/depth and invalid CID rejected before any block request",
    async () => {
      const digest = await cidHash.digest(
        new TextEncoder().encode("synthetic"),
      );
      const fanout = CID.createV1(0x71, digest),
        depth = CID.createV1(0x70, digest);
      assert.throws(() => rawCid(fanout.toString()), /DAG/);
      assert.throws(() => rawCid(depth.toString()), /DAG/);
      assert.throws(() => rawCid("https://attacker.invalid/x"), /Invalid CID/);
      await assert.rejects(
        boundedBlock(
          {
            blockstore: {
              get() {
                throw Error("Network must not run");
              },
            },
          },
          fanout.toString(),
        ),
        /DAG/,
      );
    },
  );
  await check(
    "Actual stored fanout and deep DAG IPNS feed pointers rejected before fetching any DAG blocks",
    async () => {
      async function dag(value) {
        const data = dagCbor.encode(value),
          cid = CID.createV1(dagCbor.code, await cidHash.digest(data));
        await publisher.blockstore.put(cid, data);
        return cid;
      }
      const fanout = await dag({ links: Array(1000).fill(articleCid) });
      let deep = articleCid;
      for (let i = 0; i < 120; i++) deep = await dag({ next: deep });
      for (const root of [fanout, deep]) {
        await ipns(publisher).publish("feed", root, {
          ttl: 0,
          lifetime: 3600000,
          upkeep: "none",
          signal: AbortSignal.timeout(3000),
        });
        const result = await worker.request("poll");
        assert.match(result.outcomes[0].error, /DAG/);
        assert.equal(
          await worker.request("has", { cid: root.toString() }),
          false,
        );
      }
    },
  );
  await check(
    "Unavailable slow peer block has bounded retrieval timeout and stale previous snapshot",
    async () => {
      const absent = CID.createV1(
        0x55,
        await cidHash.digest(new TextEncoder().encode("missing payload")),
      );
      await ipns(publisher).publish("feed", absent, {
        ttl: 0,
        lifetime: 3600000,
        upkeep: "none",
        signal: AbortSignal.timeout(3000),
      });
      const t = Date.now(),
        result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "failure");
      assert(Date.now() - t < 3000);
      assert.equal(result.snapshot.body.status, "stale");
      assert.equal(
        result.snapshot.body.articles[0].title,
        "Recovered science article",
      );
      lastSnapshot = result.snapshot;
    },
  );
  await check(
    "Actual fragmented Bitswap frame from peer is timed out/reset",
    async () => {
      const stream = await publisher.libp2p.dialProtocol(
        multiaddr(worker.addresses[0]),
        "/ipfs/bitswap/1.2.0",
        { signal: AbortSignal.timeout(1800) },
      );
      let closed = false;
      stream.addEventListener("close", () => (closed = true));
      stream.send(Uint8Array.from([0x80, 0x01, 1, 2, 3]));
      await new Promise((r) => setTimeout(r, 2300));
      assert(
        closed || stream.status !== "open",
        "Slow incomplete frame must not remain open",
      );
    },
  );
  await check(
    "Publisher offline plus collector process restart preserves signed previous snapshot as stale",
    async () => {
      await publisher.stop();
      await stop();
      worker = await start();
      const result = await worker.request("poll");
      assert.equal(result.snapshot.body.status, "stale");
      assert.equal(
        result.snapshot.body.articles[0].title,
        "Recovered science article",
      );
      assert.equal(
        result.snapshot.body.observedAt,
        lastSnapshot.body.observedAt,
      );
      assert.equal(
        await worker.request("has", { cid: articleCid.toString() }),
        false,
      );
      assert.equal((await worker.request("status")).pins[0].pinned, true);
      assert.equal(
        (await readHttpSnapshot(`${worker.http}/popular`, originalKey)).status,
        "stale",
      );
    },
  );
  // Feed identity stays stable through IPNS private-key import on a fresh publisher.
  await publisher.start();
  await worker.request("dial", {
    address: publisher.libp2p.getMultiaddrs()[0].toString(),
  });
  await new Promise((r) => setTimeout(r, 700));
  await check(
    "Recovered online publisher replaces stale cache with newer verified signed feed",
    async () => {
      await publish(
        signed(
          {
            ...goodFeed.body,
            sequence: 3,
            updatedAt: Date.now(),
            events: [{ ...event, title: "Latest recovered science article" }],
          },
          owner,
        ),
      );
      const result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "success");
      assert.equal(result.snapshot.body.status, "fresh");
      assert.equal(
        result.snapshot.body.articles[0].title,
        "Latest recovered science article",
      );
      assert.equal(
        (await worker.request("status")).highwater[name].sequence,
        3,
      );
      lastSnapshot = result.snapshot;
    },
  );
  await check(
    "Registration deduplicates and bounds feed count and malformed input",
    async () => {
      await assert.rejects(
        worker.request("register", { entry: { name, key: owner.publicKey } }),
        /Duplicate/,
      );
      await assert.rejects(
        worker.request("register", {
          entry: { name: "x".repeat(129), key: owner.publicKey },
        }),
        /fields/,
      );
      for (let i = 0; i < 3; i++) {
        const key = identity(),
          cid = await strings(publisher).add(
            JSON.stringify(
              signed(
                {
                  format: "emberpage.feed.spike",
                  sequence: 1,
                  updatedAt: Date.now(),
                  events: [],
                },
                key,
              ),
            ),
          );
        const result = await ipns(publisher).publish(`extra-${i}`, cid, {
          ttl: 0,
          lifetime: 3600000,
          upkeep: "none",
          signal: AbortSignal.timeout(3000),
        });
        await worker.request("register", {
          entry: { name: result.name.slice(6), key: key.publicKey },
        });
      }
      const cid = await strings(publisher).add("fifth"),
        result = await ipns(publisher).publish("fifth", cid, {
          ttl: 0,
          lifetime: 3600000,
          upkeep: "none",
          signal: AbortSignal.timeout(3000),
        });
      await assert.rejects(
        worker.request("register", {
          entry: { name: result.name.slice(6), key: identity().publicKey },
        }),
        /count/,
      );
    },
  );
  await check(
    "Feed envelope rejects excessive events and individual event bytes before state mutation",
    () => {
      assert.throws(
        () =>
          validateFeed(
            signed({ ...goodFeed.body, events: Array(101).fill(event) }, owner),
            owner.publicKey,
            null,
            Date.now(),
          ),
        /Event count/,
      );
      assert.throws(
        () =>
          validateFeed(
            signed(
              {
                ...goodFeed.body,
                events: [{ ...event, padding: "x".repeat(8200) }],
              },
              owner,
            ),
            owner.publicKey,
            null,
            Date.now(),
          ),
        /Event bytes/,
      );
    },
  );
  await check(
    "Actual HTTP rejects tamper, unknown signer, stale snapshot, count flood, resource URLs and streamed bytes",
    async () => {
      const malicious = identity();
      const variants = [
        {
          name: "tamper",
          value: { ...lastSnapshot, body: { ...lastSnapshot.body, feeds: 0 } },
          pattern: /signature/,
        },
        {
          name: "unknown",
          value: signed(lastSnapshot.body, malicious),
          pattern: /signature/,
        },
        {
          name: "stale",
          value: signed(
            {
              ...lastSnapshot.body,
              generatedAt: now - 400000,
              observedAt: now - 400000,
            },
            {
              publicKey: originalKey,
              privateKey: JSON.parse(
                await (
                  await import("node:fs/promises")
                ).readFile(`${scratch}/state.json`, "utf8"),
              ).identity.privateKey,
            },
          ),
          pattern: /freshness/,
        },
      ];
      const disk = JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(`${scratch}/state.json`, "utf8"),
      );
      variants.push(
        {
          name: "count",
          value: signed(
            {
              ...lastSnapshot.body,
              articles: Array(101).fill(lastSnapshot.body.articles[0]),
            },
            disk.identity,
          ),
          pattern: /schema/,
        },
        {
          name: "url",
          value: signed(
            {
              ...lastSnapshot.body,
              articles: [
                {
                  ...lastSnapshot.body.articles[0],
                  resourceUrl: "https://attacker.invalid",
                },
              ],
            },
            disk.identity,
          ),
          pattern: /resource URL/,
        },
      );
      server = createServer((req, res) => {
        if (req.url === "/huge") {
          res.write("x".repeat(40000));
          res.end("x".repeat(40000));
          return;
        }
        const variant = variants.find((v) => req.url === `/${v.name}`);
        res.end(JSON.stringify(variant.value));
      });
      await new Promise((r) => server.listen(0, "127.0.0.1", r));
      const url = `http://127.0.0.1:${server.address().port}`;
      variants.push({
        name: "rating",
        value: signed(
          {
            ...lastSnapshot.body,
            articles: [
              {
                ...lastSnapshot.body.articles[0],
                rating: { upvotes: 51, downvotes: 0 },
              },
            ],
          },
          disk.identity,
        ),
        pattern: /schema/,
      });
      for (const v of variants)
        await assert.rejects(
          readHttpSnapshot(`${url}/${v.name}`, originalKey),
          v.pattern,
        );
      await assert.rejects(
        readHttpSnapshot(`${url}/huge`, originalKey),
        /streamed size/,
      );
    },
  );
  await check(
    "HTTP client accepts UnixFS DAG article reference without fetching its blocks",
    async () => {
      const disk = JSON.parse(
          await (
            await import("node:fs/promises")
          ).readFile(`${scratch}/state.json`, "utf8"),
        ),
        dag = CID.createV1(
          0x70,
          await cidHash.digest(new TextEncoder().encode("article DAG pointer")),
        ),
        snapshot = signed(
          {
            ...lastSnapshot.body,
            articles: [
              { ...lastSnapshot.body.articles[0], cid: dag.toString() },
            ],
          },
          disk.identity,
        );
      const endpoint = createServer((req, res) =>
        res.end(JSON.stringify(snapshot)),
      );
      await new Promise((r) => endpoint.listen(0, "127.0.0.1", r));
      try {
        assert.equal(
          (
            await readHttpSnapshot(
              `http://127.0.0.1:${endpoint.address().port}/popular`,
              originalKey,
            )
          ).articles[0].cid,
          dag.toString(),
        );
        assert.equal(
          await worker.request("has", { cid: dag.toString() }),
          false,
        );
      } finally {
        await new Promise((r) => endpoint.close(r));
      }
    },
  );
  await check(
    "Registered feed crawl total time, bytes, and serial concurrency stay bounded",
    async () => {
      const t = Date.now(),
        result = await worker.request("poll");
      assert(Date.now() - t < limits.pollTimeoutMs + 1000);
      assert(result.totalBytes <= limits.totalBytes);
      assert(result.outcomes.length <= limits.feeds);
      assert.equal(limits.concurrency, 1);
      assert.equal(
        await worker.request("has", { cid: articleCid.toString() }),
        false,
      );
    },
  );
  await check(
    "Concurrent poll requests are rejected and do not double crawl",
    async () => {
      const first = worker.request("poll");
      await assert.rejects(worker.request("poll"), /already running/);
      await first;
    },
  );
  const evidence = {
    timestamp: new Date().toISOString(),
    runtime: process.version,
    checks,
    limits,
    firstPid,
    restartedPid: worker.pid,
    transport:
      "Real localhost Helia TCP/Noise/Yamux/Bitswap plus IPNS/private DHT; collector lives in separately restarted process",
    wireLimit: {
      incomingMessageBytes: limits.feedBytes + 2048,
      decoder:
        "Bitswap network uses length-prefixed maxDataLength before protobuf decode",
    },
    persistence:
      "Filesystem blockstore, filesystem datastore for pins/IPNS, atomic JSON registry/high-water/bodyhash/cache/snapshot/Ed25519 signing identity",
    unverified: [
      "Public browser network",
      "Sybil resistance",
      "DHT global disappearance",
      "Power loss and untargeted native-datastore interruption points",
      "Filesystem allocated-block/directory overhead (strict file payload quotas tested separately)",
    ],
  };
  await writeFile(
    new URL("./hardening-evidence.json", import.meta.url),
    JSON.stringify(evidence, null, 2) + "\n",
  );
} finally {
  if (server) await new Promise((r) => server.close(r));
  if (worker?.child.connected) await stop().catch(() => worker.child.kill());
  await publisher.stop();
  await reader?.stop();
  await rm(scratch, { recursive: true, force: true });
}
