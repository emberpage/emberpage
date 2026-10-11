import test from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function listening() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}
function child(port, database) {
  return fork(
    new URL("./aggregator-main-fixture.mjs", import.meta.url),
    ["--port", String(port), "--database", database, "--interval", "30"],
    { execArgv: ["--import", "tsx"], stdio: ["ignore", "pipe", "pipe", "ipc"] },
  );
}
test("scoped aggregator runtime handles SIGTERM, aborts its scheduled query and exits cleanly", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberpage-runtime-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reservation = await listening(),
    port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const process = child(port, join(directory, "metadata.sqlite"));
  t.after(() => {
    if (process.exitCode === null) process.kill("SIGKILL");
  });
  let aborted = false,
    stderr = "";
  process.stderr.on("data", (chunk) => (stderr += chunk));
  process.on("message", (message) => {
    if (message.queryAborted) aborted = true;
  });
  await new Promise((resolve, reject) => {
    process.on("message", (message) => {
      if (message.queryStarted) resolve();
    });
    process.once("exit", (code) =>
      reject(new Error(`Premature process exit ${code}: ${stderr}`)),
    );
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/status`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).pending, 1);
  const finished = once(process, "exit");
  process.kill("SIGTERM");
  const [code, signal] = await finished;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.equal(aborted, true);
  assert.equal(stderr, "");
  const rebound = createServer();
  rebound.listen(port, "127.0.0.1");
  await once(rebound, "listening");
  await new Promise((resolve) => rebound.close(resolve));
});
test("startup bind failure closes acquired resources and reports the local port conflict", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "emberpage-runtime-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const occupied = await listening();
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  const process = child(
    occupied.address().port,
    join(directory, "metadata.sqlite"),
  );
  let stderr = "",
    queries = 0;
  process.stderr.on("data", (chunk) => (stderr += chunk));
  process.on("message", (message) => {
    if (message.queryStarted) queries++;
  });
  const [code] = await once(process, "exit");
  assert.equal(code, 1);
  assert.match(stderr, /already in use/);
  assert.equal(queries, 0);
});
