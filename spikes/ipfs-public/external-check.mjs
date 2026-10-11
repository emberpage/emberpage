// Disposable outbound tunnel + capped relay. Only synthetic browser blocks.
import { createLibp2p } from "../ipfs-browser/node_modules/libp2p/dist/src/index.js";
import { webSockets } from "../ipfs-browser/node_modules/@libp2p/websockets/dist/src/index.js";
import { circuitRelayServer } from "../ipfs-browser/node_modules/@libp2p/circuit-relay-v2/dist/src/index.js";
import { identify } from "../ipfs-browser/node_modules/@libp2p/identify/dist/src/index.js";
import { noise } from "../ipfs-browser/node_modules/@chainsafe/libp2p-noise/dist/src/index.js";
import { yamux } from "../ipfs-browser/node_modules/@chainsafe/libp2p-yamux/dist/src/index.js";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { build } from "esbuild";

const folder = resolve("spikes/ipfs-public"),
  contexts = [],
  evidence = {
    at: new Date().toISOString(),
    scope:
      "Independent public IPFS Check backend retrieves a synthetic block from a NATed browser through a disposable outbound Cloudflare WSS tunnel and capped libp2p circuit relay.",
    checks: [],
  };
let relay,
  tunnel,
  http,
  directory,
  tunnelLogs = "";
const abort = new AbortController(),
  deadline = setTimeout(
    () => abort.abort(new Error("External spike deadline")),
    180000,
  );
async function check(name, action) {
  const started = Date.now();
  try {
    const data = await action();
    evidence.checks.push({
      name,
      outcome: "pass",
      durationMs: Date.now() - started,
      data,
    });
    console.log(name, JSON.stringify(data));
    return data;
  } catch (error) {
    evidence.checks.push({
      name,
      outcome: "fail",
      durationMs: Date.now() - started,
      error: error.message,
    });
    throw error;
  }
}
async function open(label, relayAddress) {
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
  await page.goto(`http://127.0.0.1:${http.address().port}`);
  await page.waitForFunction(() => window.spike);
  const info = await page.evaluate(
    ({ label, relayAddress }) => window.spike.start(label, relayAddress),
    { label, relayAddress },
  );
  return { context, page, info };
}
async function remoteCheck(cid, address) {
  const url = new URL("https://ipfs-check-backend.ipfs.io/check");
  url.searchParams.set("cid", cid);
  url.searchParams.set("multiaddr", address);
  url.searchParams.set("timeoutSeconds", "25");
  const response = await fetch(url, {
    signal: AbortSignal.any([abort.signal, AbortSignal.timeout(35000)]),
  });
  const text = await response.text();
  if (!response.ok)
    throw Error(`Diagnostic HTTP ${response.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}
try {
  // This separate diagnostic mode permits circuit transfer only, so a local
  // WebRTC connection cannot make the WAN-path assertion accidentally pass.
  const source = (await readFile("spikes/ipfs-browser/browser.js", "utf8"))
    .replace("[`${relay}/p2p-circuit`, '/webrtc']", "[`${relay}/p2p-circuit`]")
    .replace(
      "webSockets(), circuitRelayTransport(), webRTC({ rtcConfiguration: { iceServers: [] } })",
      "webSockets(), circuitRelayTransport()",
    );
  if (source.includes("webRTC({"))
    throw Error("Relay-only source selection failed");
  await writeFile(join(folder, "relay-only-browser.js"), source);
  await build({
    stdin: {contents: source, resolveDir: resolve('spikes/ipfs-browser'), sourcefile: 'relay-only-browser.js', loader: 'js'},
    bundle: true,
    format: "esm",
    platform: "browser",
    minify: true,
    nodePaths: [resolve("spikes/ipfs-browser/node_modules")],
    outfile: join(folder, "browser.js"),
  });
  relay = await createLibp2p({
    addresses: { listen: ["/ip4/127.0.0.1/tcp/0/ws"] },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionManager: { maxConnections: 8 },
    services: {
      identify: identify(),
      relay: circuitRelayServer({
        reservations: {
          maxReservations: 4,
          reservationTtl: 120000,
          defaultDataLimit: 524288n,
          defaultDurationLimit: 60000,
        },
        maxInboundHopStreams: 4,
        maxOutboundStopStreams: 4,
      }),
    },
  });
  const listen = relay.getMultiaddrs()[0].toString(),
    port = Number(listen.match(/\/tcp\/(\d+)/)[1]);
  tunnel = spawn(
    join(folder, "tools/cloudflared"),
    [
      "tunnel",
      "--url",
      `http://127.0.0.1:${port}`,
      "--no-autoupdate",
      "--protocol",
      "http2",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  tunnel.stdout.on("data", (data) => {
    tunnelLogs += data;
  });
  tunnel.stderr.on("data", (data) => {
    tunnelLogs += data;
  });
  const host = await check("Disposable outbound tunnel created", async () => {
    for (let i = 0; i < 300; i++) {
      const match = tunnelLogs.match(
        /https:\/\/([a-z0-9-]+\.trycloudflare\.com)/,
      );
      if (match && tunnelLogs.includes("Registered tunnel connection"))
        return match[1];
      if (tunnel.exitCode !== null)
        throw Error("Tunnel exited before admission");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error("Tunnel startup timeout");
  });
  evidence.readiness = [];
  await check("Public tunnel DNS and upstream are ready", async () => {
    const end = Date.now() + 80000;
    while (Date.now() < end) {
      try {
        const response = await fetch(`https://${host}/`, {
          signal: AbortSignal.timeout(5000),
        });
        const text = await response.text();
        evidence.readiness.push({
          status: response.status,
          text: text.slice(0, 150),
        });
        if (
          response.status === 400 ||
          response.status === 404 ||
          response.status === 200
        )
          return { status: response.status, text: text.slice(0, 150) };
      } catch (error) {
        evidence.readiness.push({
          error: error.message,
          cause: error.cause?.message,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw Error("Public tunnel readiness failed after 80 seconds");
  });
  const address = `/dns4/${host}/tcp/443/wss/p2p/${relay.peerId}`;
  directory = await mkdtemp(join(tmpdir(), "emberpage-ipfs-external-"));
  http = createServer(async (req, res) => {
    if (req.url === "/browser.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(await readFile(join(folder, "browser.js")));
    } else
      res.end(
        '<!doctype html><pre></pre><script type="module" src="/browser.js"></script>',
      );
  });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  const a = await check("Browser reserves externally reachable relay", () =>
    open("A", address).then((value) => {
      globalThis.publisher = value;
      return { peerId: value.info.peerId };
    }),
  );
  const bytes = Buffer.from(
    JSON.stringify({
      synthetic: true,
      title: "Disposable Ember Page external test",
      body: randomBytes(24000).toString("hex"),
    }),
  );
  const cid = await publisher.page.evaluate(
    (bytes) => window.spike.add(bytes),
    [...bytes],
  );
  await publisher.page.evaluate((cid) => window.spike.pin(cid), cid);
  const expected = {
    bytes: bytes.length,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
  const provider = `${address}/p2p-circuit/p2p/${a.peerId}`;
  try {
    await check(
      "Independent public backend retrieves browser block through WSS circuit",
      async () => {
        const result = await remoteCheck(cid, provider);
        if (!result.DataAvailableOverBitswap?.Found)
          throw Error(JSON.stringify(result));
        return result;
      },
    );
  } catch (error) {
    evidence.externalDiagnosticUnavailable = error.message;
  }
  const b = await open("B", address);
  await b.page.evaluate((address) => window.spike.dial(address), provider);
  await check(
    "Exact browser-to-browser transfer over external WSS circuit",
    async () => {
      const received = await b.page.evaluate(
        (cid) => window.spike.get(cid),
        cid,
      );
      if (received.hash !== expected.hash || received.bytes !== expected.bytes)
        throw Error("Browser copy mismatch");
      const connections = (await b.page.evaluate(() => window.spike.info()))
        .connections;
      if (
        connections.some((connection) => connection.address.includes("/webrtc"))
      )
        throw Error("Unexpected direct WebRTC path");
      return { received, connections };
    },
  );
  await b.page.evaluate((cid) => window.spike.pin(cid), cid);
  await publisher.context.close();
  const c = await open("C", address);
  await c.page.evaluate(
    (address) => window.spike.dial(address),
    `${address}/p2p-circuit/p2p/${b.info.peerId}`,
  );
  await check(
    "Fresh browser retrieves reader-held copy over external circuit after publisher closes",
    async () => {
      const received = await c.page.evaluate(
        (cid) => window.spike.get(cid),
        cid,
      );
      if (received.hash !== expected.hash || received.bytes !== expected.bytes)
        throw Error("Reader holder mismatch");
      return {
        received,
        connections: (await c.page.evaluate(() => window.spike.info()))
          .connections,
      };
    },
  );
  evidence.cid = cid;
  evidence.expected = expected;
  evidence.transferProven = true;
  evidence.ok = evidence.checks.every((result) => result.outcome === "pass");
  if (!evidence.ok) process.exitCode = 1;
} catch (error) {
  evidence.ok = false;
  evidence.error = error.stack;
  process.exitCode = 1;
  console.error(error);
} finally {
  clearTimeout(deadline);
  for (const context of contexts) await context.close().catch(() => {});
  if (http) await new Promise((resolve) => http.close(resolve));
  await relay?.stop().catch(() => {});
  tunnel?.kill("SIGTERM");
  if (directory) await rm(directory, { recursive: true, force: true });
  evidence.cleanup =
    "Own browser profiles, relay, HTTP server, and outbound tunnel stopped. No router or production service configuration changed.";
  await writeFile(
    "docs/research/ipfs-external-check.json",
    JSON.stringify(evidence, null, 2),
  );
  await writeFile("spikes/ipfs-public/tunnel.log", tunnelLogs);
}
