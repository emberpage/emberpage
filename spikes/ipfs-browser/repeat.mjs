// Twenty sequential fresh reader profiles; local reachability stress, not Internet proof.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const relay = (await (await fetch("http://127.0.0.1:4328/relay.json")).json())
  .relay;
const directory = await mkdtemp(join(tmpdir(), "meshcache-ipfs-repeat-")),
  contexts = [];
const evidence = {
  at: new Date().toISOString(),
  scope:
    "Twenty sequential separate fresh Chrome profiles on one host, known local relay addresses, exact byte checks, no automatic serving.",
  steps: [],
};
async function open(label) {
  const context = await chromium.launchPersistentContext(
    join(directory, label),
    {
      headless: true,
      executablePath:
        process.env.CHROMIUM_EXECUTABLE || undefined,
    },
  );
  contexts.push(context);
  const page = context.pages()[0];
  await page.goto("http://127.0.0.1:4328");
  await page.waitForFunction(() => window.spike);
  await page.evaluate(({ label, relay }) => window.spike.start(label, relay), {
    label,
    relay,
  });
  return { context, page };
}
try {
  const original = await open("original"),
    bytes = randomBytes(50000),
    expected = {
      bytes: bytes.length,
      hash: createHash("sha256").update(bytes).digest("hex"),
    };
  const cid = await original.page.evaluate(
    (bytes) => window.spike.add(bytes),
    [...bytes],
  );
  const holder = await open("holder");
  await original.page.waitForFunction(() =>
    window.spike.node.libp2p
      .getMultiaddrs()
      .some((a) => a.toString().includes("/webrtc")),
  );
  const originAddress = await original.page.evaluate(() =>
    window.spike.node.libp2p
      .getMultiaddrs()
      .find((a) => a.toString().includes("/webrtc"))
      .toString(),
  );
  await holder.page.evaluate(
    (address) => window.spike.dial(address),
    originAddress,
  );
  assert.deepEqual(
    await holder.page.evaluate((cid) => window.spike.get(cid), cid),
    expected,
  );
  await holder.page.evaluate((cid) => window.spike.serve(cid), cid);
  await original.context.close();
  const address = await holder.page.evaluate(() =>
    window.spike.node.libp2p
      .getMultiaddrs()
      .find((a) => a.toString().includes("/webrtc"))
      .toString(),
  );
  const peers = new Set();
  for (let run = 1; run <= 20; run++) {
    const started = Date.now(),
      reader = await open(`reader-${run}`);
    await reader.page.evaluate(
      (address) => window.spike.dial(address),
      address,
    );
    assert.deepEqual(
      await reader.page.evaluate((cid) => window.spike.get(cid), cid),
      expected,
    );
    const info = await reader.page.evaluate(() => window.spike.info()),
      policy = await reader.page.evaluate(() => window.spike.policyInfo());
    assert.equal(policy.public.count, 0, "Reading must not enable serving");
    assert.equal(policy.read.count, 1);
    assert(!peers.has(info.peerId));
    peers.add(info.peerId);
    const serving = await holder.page.evaluate(() => window.spike.policyInfo());
    assert(serving.public.budget.bytes >= run * expected.bytes,
      "The retained holder must have served each fresh reader's bytes");
    const result = {
      run,
      at: new Date().toISOString(),
      outcome: "pass",
      durationMs: Date.now() - started,
      bytes: expected.bytes,
      hash: expected.hash,
      readerPeer: info.peerId,
      publicCount: policy.public.count,
    };
    evidence.steps.push(result);
    console.log(JSON.stringify(result));
    await reader.context.close();
  }
  evidence.holderPolicy = await holder.page.evaluate(() =>
    window.spike.policyInfo(),
  );
  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.error = error.stack;
  process.exitCode = 1;
  console.error(error);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await writeFile(
    new URL("../../docs/research/ipfs-repeat-drive.json", import.meta.url),
    JSON.stringify(evidence, null, 2),
  );
  await rm(directory, { recursive: true, force: true });
}
