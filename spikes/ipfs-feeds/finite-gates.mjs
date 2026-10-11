// Finite local gates: kill real collector processes; enforce native stores/peers.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { strings } from "@helia/strings";
import { ipns } from "@helia/ipns";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { Key } from "interface-datastore";
import { multiaddr } from "@multiformats/multiaddr";
import { node } from "./node.mjs";
import { signed, identity } from "./collector.mjs";
import { quota, boundStores, usage } from "./quotas.mjs";
const scratch = await mkdtemp(join(tmpdir(), "emberpage-ipfs-gates-")),
  checks = [],
  publisher = await node(),
  peers = [],
  signer = identity(),
  hash = (s) => createHash("sha256").update(s).digest("hex");
let worker,
  serial = 0;
async function check(name, action) {
  const t = Date.now();
  await action();
  checks.push({ name, outcome: "pass", durationMs: Date.now() - t });
  console.log("PASS", name);
}
async function start(fault) {
  const child = fork(
    new URL("./collector-worker.mjs", import.meta.url),
    [join(scratch, "collector")],
    {
      env: { ...process.env, SPIKE_KILL_PHASE: fault ?? "" },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    },
  );
  let errors = "";
  child.stderr.on("data", (b) => (errors += b));
  const ready = await new Promise((resolve, reject) => {
    child.once("message", resolve);
    child.once("exit", (code) =>
      reject(Error(`Child exit ${code}: ${errors}`)),
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
          reject(Error("IPC timeout"));
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
  const child = worker.child,
    done = once(child, "exit");
  await worker.request("stop");
  const [code] = await done;
  assert.equal(code, 0);
}
async function publish(sequence, title) {
  const now = Date.now(),
    event = {
      type: "listing",
      id: hash("listing"),
      url: "https://example.invalid/gate",
      urlHash: hash("https://example.invalid/gate"),
      contentHash: hash("content"),
      blobHash: hash("blob"),
      cid: article.toString(),
      size: 50,
      title,
      byline: "Synthetic",
      createdAt: now,
    };
  const envelope = signed(
      {
        format: "emberpage.feed.spike",
        sequence,
        updatedAt: now,
        events: [event],
      },
      signer,
    ),
    cid = await strings(publisher).add(JSON.stringify(envelope));
  const result = await ipns(publisher).publish("feed", cid, {
    ttl: 0,
    lifetime: 3600000,
    upkeep: "none",
    signal: AbortSignal.timeout(3000),
  });
  return { cid, result };
}
const article = await strings(publisher).add(
  "Synthetic article body, metadata collector must not download it",
);
let baseline, name;
try {
  worker = await start();
  await worker.request("dial", {
    address: publisher.libp2p.getMultiaddrs()[0].toString(),
  });
  await new Promise((r) => setTimeout(r, 600));
  const first = await publish(1, "Committed original");
  name = first.result.name.slice(6);
  await worker.request("register", { entry: { name, key: signer.publicKey } });
  await worker.request("poll");
  baseline = await worker.request("status");
  await check(
    "Committed active graph pins bounded raw feed and signed snapshot, no article body",
    async () => {
      assert.equal(baseline.pinCids.length, 2);
      assert(baseline.pinCids.includes(baseline.snapshotCid));
      assert(baseline.usage.bytes <= quota.storeBytes);
      assert.equal(
        await worker.request("has", { cid: article.toString() }),
        false,
      );
    },
  );
  for (const [stage, sequence] of [
    ["postblockpin", 2],
    ["precommit", 3],
  ])
    await check(
      `Actual SIGKILL at ${stage} recovers previous committed state and removes orphan graph`,
      async () => {
        await stop();
        worker = await start(stage);
        await worker.request("dial", {
          address: publisher.libp2p.getMultiaddrs()[0].toString(),
        });
        await new Promise((r) => setTimeout(r, 600));
        const updated = await publish(sequence, `Uncommitted ${stage}`);
        const paused = new Promise((resolve) => {
          function handle(message) {
            if (message.fault === stage) {
              worker.child.off("message", handle);
              resolve();
            }
          }
          worker.child.on("message", handle);
        });
        worker.child.send({ id: ++serial, command: "poll" });
        await Promise.race([
          paused,
          new Promise((_, reject) =>
            setTimeout(() => reject(Error("Fault pause timeout")), 7000),
          ),
        ]);
        if (stage === "precommit") {
          const staged = JSON.parse(
            await readFile(join(scratch, "collector", "state.tmp"), "utf8"),
          );
          assert.equal(staged.highwater[name].sequence, sequence);
        }
        const pinned = await worker.request("status"),
          orphans = pinned.pinCids.filter(
            (cid) => !baseline.pinCids.includes(cid),
          );
        assert(orphans.includes(updated.cid.toString()));
        const exited = once(worker.child, "exit");
        worker.child.kill("SIGKILL");
        const [code, signal] = await exited;
        assert.equal(code, null);
        assert.equal(signal, "SIGKILL");
        const state = JSON.parse(
          await readFile(join(scratch, "collector", "state.json"), "utf8"),
        );
        assert.equal(state.highwater[name].sequence, 1);
        assert.deepEqual(state.snapshot, baseline.snapshot);
        worker = await start();
        const recovered = await worker.request("status");
        assert.deepEqual(recovered.highwater, baseline.highwater);
        assert.deepEqual(recovered.snapshot, baseline.snapshot);
        assert.equal(recovered.key, baseline.key);
        assert.deepEqual(new Set(recovered.pinCids), new Set(baseline.pinCids));
        for (const orphan of orphans)
          assert.equal(await worker.request("has", { cid: orphan }), false);
        assert(recovered.usage.bytes <= quota.storeBytes);
        assert.equal(recovered.pins[0].pinned, true);
      },
    );
  await check(
    "Normal recovery commits newer feed and cleans replaced feed/snapshot roots",
    async () => {
      await worker.request("dial", {
        address: publisher.libp2p.getMultiaddrs()[0].toString(),
      });
      await new Promise((r) => setTimeout(r, 600));
      await publish(4, "Recovered latest");
      const result = await worker.request("poll");
      assert.equal(result.outcomes[0].outcome, "success");
      const status = await worker.request("status");
      assert.equal(status.highwater[name].sequence, 4);
      assert.equal(status.snapshot.body.articles[0].title, "Recovered latest");
      assert.equal(status.pinCids.length, 2);
      for (const cid of baseline.pinCids)
        assert.equal(await worker.request("has", { cid }), false);
    },
  );
  await check(
    "Before-put limits reject oversized record and aggregate block/datastore bytes, including concurrent writes",
    async () => {
      const blockstore = new FsBlockstore(join(scratch, "quota-blocks")),
        datastore = new FsDatastore(join(scratch, "quota-metadata"));
      await Promise.all([blockstore.open(), datastore.open()]);
      boundStores(blockstore, datastore);
      const oversized = new Uint8Array(quota.blockBytes + 1),
        cid = CID.createV1(0x55, await sha256.digest(oversized));
      await assert.rejects(blockstore.put(cid, oversized), /record quota/);
      assert.equal(await blockstore.has(cid), false);
      await assert.rejects(
        datastore.put(
          new Key("/oversized"),
          new Uint8Array(quota.metadataBytes + 1),
        ),
        /record quota/,
      );
      const calls = [];
      for (let i = 0; i < 18; i++) {
        const bytes = new Uint8Array(quota.blockBytes).fill(i),
          cid = CID.createV1(0x55, await sha256.digest(bytes));
        calls.push(blockstore.put(cid, bytes));
      }
      const results = await Promise.allSettled(calls);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 16);
      assert.equal(results.filter((r) => r.status === "rejected").length, 2);
      await assert.rejects(
        datastore.put(new Key("/full"), new Uint8Array(1)),
        /Aggregate/,
      );
      const measured = await usage([blockstore.path, datastore.path]);
      assert.equal(measured.bytes, quota.storeBytes);
      assert(measured.files <= quota.storeFiles);
      await Promise.all([blockstore.close(), datastore.close()]);
    },
  );
  await check(
    "Before-put native datastore file-count cap rejects tiny-record flood",
    async () => {
      const blockstore = new FsBlockstore(join(scratch, "count-blocks")),
        datastore = new FsDatastore(join(scratch, "count-metadata"));
      await Promise.all([blockstore.open(), datastore.open()]);
      boundStores(blockstore, datastore);
      for (let i = 0; i < quota.storeFiles; i++)
        await datastore.put(new Key(`/record-${i}`), Uint8Array.of(1));
      await assert.rejects(
        datastore.put(new Key("/extra"), Uint8Array.of(1)),
        /Aggregate/,
      );
      assert.equal(
        (await usage([blockstore.path, datastore.path])).files,
        quota.storeFiles,
      );
      await Promise.all([blockstore.close(), datastore.close()]);
    },
  );
  await check(
    "Native collector maxConnections eight rejects established inbound connections above cap",
    async () => {
      let rejected = 0;
      for (let i = 0; i < 10; i++) {
        const peer = await node();
        peers.push(peer);
        try {
          await peer.libp2p.dial(multiaddr(worker.addresses[0]), {
            signal: AbortSignal.timeout(1800),
          });
        } catch {
          rejected++;
        }
        await new Promise((r) => setTimeout(r, 320));
      }
      const status = await worker.request("status");
      assert.equal(status.connections, 8);
      assert(rejected > 0);
      checks.push({
        name: "Peer cap measurement",
        outcome: "pass",
        connections: status.connections,
        rejected,
        attempted: 10,
      });
    },
  );
  const evidence = {
    timestamp: new Date().toISOString(),
    checks,
    quota,
    maxConnections: 8,
    crashSemantics:
      "Actual child SIGKILL after new feed block pin and before atomic JSON commit; startup derives exact pins from committed immutable references and garbage collects orphan blocks",
    limitations: [
      "File payload bytes/file count, not filesystem allocation slack/inode directory overhead",
      "No fsync/power loss guarantee",
      "No bound on all CPU/network flood attacks",
      "Datastore exhaustion may reject new activity until explicit cleanup; no alternative encoding/store fallback",
      "Durability still needs independent online holders",
    ],
  };
  await writeFile(
    new URL("./finite-gates-evidence.json", import.meta.url),
    JSON.stringify(evidence, null, 2) + "\n",
  );
} finally {
  if (worker?.child.connected)
    await stop().catch(() => worker.child.kill("SIGKILL"));
  await Promise.all(peers.map((peer) => peer.stop()));
  await publisher.stop();
  await rm(scratch, { recursive: true, force: true });
}
