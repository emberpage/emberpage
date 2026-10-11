// Deliberate crash of this runner's own disposable Chrome profile only.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { cp, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
await cp(
  new URL("../ipfs-browser/dist/browser.js", import.meta.url),
  new URL("browser.js", import.meta.url),
);
const profile = await mkdtemp(join(tmpdir(), "meshcache-ipfs-crash-"));
const extension = resolve("spikes/ipfs-mv3"),
  relay = (await (await fetch("http://127.0.0.1:4328/relay.json")).json())
    .relay;
const evidence = {
  at: new Date().toISOString(),
  scope:
    "Disposable MV3 browser on this host. Actual abrupt process termination, not simulated offline.",
  steps: [],
};
let context, page;
function record(name, detail) {
  evidence.steps.push({ name, detail, at: new Date().toISOString() });
  console.log(name, JSON.stringify(detail));
}
async function open() {
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath:
      process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  page = await context.newPage();
  await page.goto(
    worker.url().split("/").slice(0, 3).join("/") + "/control.html",
  );
  await page.waitForFunction(() => window.callNode);
  await call("start", "lifecycle", relay);
  return call("info");
}
function call(action, ...args) {
  return page.evaluate(({ action, args }) => window.callNode(action, ...args), {
    action,
    args,
  });
}
try {
  const start = await open(),
    bytes = randomBytes(150000),
    expected = {
      bytes: bytes.length,
      hash: createHash("sha256").update(bytes).digest("hex"),
    };
  const privateCid = await call("privateAdd", [...bytes]);
  assert.equal((await call("policyInfo")).public.records.length, 0);
  const cid = await call("add", [...bytes]);
  assert.equal(cid, privateCid);
  const originalPolicy = await call("policyInfo");
  record("Committed private bytes and explicit serving pin", {
    cid,
    peerId: start.peerId,
    policy: originalPolicy,
  });
  await call("closeOffscreen");
  const restarted = await call("start", "lifecycle", relay);
  assert.equal(restarted.peerId, start.peerId);
  assert.deepEqual(await call("get", cid), expected);
  record(
    "Offscreen close and recreation retained exact pinned bytes and identity",
    await call("policyInfo"),
  );
  const browserSession = await context.browser().newBrowserCDPSession();
  const processes = (await browserSession.send("SystemInfo.getProcessInfo"))
    .processInfo;
  const pid = processes.find((info) => info.type === "browser").id;
  const command = execFileSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  assert(
    command.includes(basename(profile)),
    "Refuse to terminate any browser outside this disposable profile",
  );
  const closed = context.waitForEvent("close", { timeout: 15000 });
  process.kill(pid, "SIGKILL");
  await closed;
  context = undefined;
  record("Abruptly terminated verified disposable Chrome process", {
    signal: "SIGKILL",
    profileVerified: true,
  });
  const recovered = await open();
  assert.equal(recovered.peerId, start.peerId);
  assert.ok(recovered.pins.includes(cid));
  assert.deepEqual(await call("get", cid), expected);
  record(
    "Crash restart recovered identity pins exact bytes and policy",
    await call("policyInfo"),
  );
  await call("revoke", cid);
  assert.equal((await call("policyInfo")).public.records.length, 0);
  await call("closeOffscreen");
  await call("start", "lifecycle", relay);
  assert.equal((await call("policyInfo")).public.records.length, 0);
  assert.deepEqual(await call("get", privateCid), expected);
  record(
    "Revocation survives offscreen restart while private copy remains readable",
    await call("policyInfo"),
  );
  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.error = error.stack;
  process.exitCode = 1;
  console.error(error);
} finally {
  await context?.close().catch(() => {});
  await writeFile(
    "docs/research/ipfs-mv3-lifecycle.json",
    JSON.stringify(evidence, null, 2),
  );
  await rm(profile, { recursive: true, force: true });
}
