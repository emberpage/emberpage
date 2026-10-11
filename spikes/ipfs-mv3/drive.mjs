// Run after building and starting ../ipfs-browser/server.mjs.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { cp, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";

await cp(
  new URL("../ipfs-browser/dist/browser.js", import.meta.url),
  new URL("browser.js", import.meta.url),
);
const extension = resolve("spikes/ipfs-mv3");
const profiles = await mkdtemp(join(tmpdir(), "meshcache-ipfs-mv3-"));
const relay = (await (await fetch("http://127.0.0.1:4328/relay.json")).json())
  .relay;
const contexts = [];
const evidence = {
  at: new Date().toISOString(),
  scope:
    "Isolated MV3 extensions on one host, explicit local relay addresses, no public discovery.",
  steps: [],
  errors: [],
};
function record(name, detail) {
  evidence.steps.push({ name, at: new Date().toISOString(), detail });
  console.log(name, JSON.stringify(detail));
}
async function open(label) {
  const context = await chromium.launchPersistentContext(
    join(profiles, label),
    {
      executablePath:
        process.env.CHROMIUM_EXECUTABLE || undefined,
      headless: true,
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    },
  );
  contexts.push(context);
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const base = worker.url().split("/").slice(0, 3).join("/");
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    evidence.errors.push({ label, error: error.message }),
  );
  await page.goto(`${base}/control.html`);
  await page.waitForFunction(() => window.callNode);
  const call = (action, ...args) =>
    page.evaluate(({ action, args }) => window.callNode(action, ...args), {
      action,
      args,
    });
  await call("start", label, relay);
  const address = async () => {
    for (let i = 0; i < 100; i++) {
      const info = await call("info");
      const value = info.addresses.find((address) =>
        address.includes("/webrtc"),
      );
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("No WebRTC address after 10 seconds");
  };
  return { context, page, base, call, address };
}
try {
  const a = await open("A");
  const bytes = randomBytes(600000);
  const expected = {
    bytes: bytes.length,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
  const cid = await a.call("add", [...bytes]);
  await a.call("pin", cid);
  record("A pinned in MV3 offscreen IndexedDB", {
    cid,
    ...expected,
    info: await a.call("info"),
  });
  const b = await open("B");
  await b.call("dial", await a.address());
  assert.deepEqual(await b.call("get", cid), expected);
  await b.call("pin", cid);
  record("B fetched and pinned from A offscreen", await b.call("info"));
  await a.context.close();
  const bInfo = await b.call("info");
  const bPeer = bInfo.peerId;
  const bAddress = bInfo.addresses.find((address) =>
    address.includes("/webrtc"),
  );
  const serviceWorkers = await b.context.newCDPSession(b.page);
  await serviceWorkers.send("ServiceWorker.enable");
  await serviceWorkers.send("ServiceWorker.stopAllWorkers");
  record("Stopped B service worker through Chrome DevTools", true);
  // Close the control page: the node must continue in its offscreen document.
  await b.page.close();
  const c = await open("C");
  await c.call("dial", bAddress);
  assert.deepEqual(await c.call("get", cid), expected);
  record(
    "C retrieved after A closed, B service worker stopped, B control page closed",
    await c.call("info"),
  );
  await b.context.close();
  await c.context.close();
  const restarted = await open("B");
  const restartedInfo = await restarted.call("info");
  assert.equal(restartedInfo.peerId, bPeer);
  assert.ok(restartedInfo.pins.includes(cid));
  assert.deepEqual(await restarted.call("get", cid), expected);
  record(
    "B browser restart retained offscreen pin identity and bytes",
    restartedInfo,
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
    "docs/research/ipfs-mv3-spike.json",
    JSON.stringify(evidence, null, 2),
  );
  await rm(profiles, { recursive: true, force: true });
}
