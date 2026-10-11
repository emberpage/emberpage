// Public service probes. No article gateways, port forwarding, or remote deployment.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const folder = resolve("spikes/ipfs-public");
await build({
  entryPoints: [join(folder, "baseline-browser.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
  nodePaths: [resolve("spikes/ipfs-browser/node_modules")],
  outfile: join(folder, "browser.js"),
});
const services = [
  {
    name: "Amsterdam public bootstrap",
    address:
      "/dns4/lith-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
  },
  {
    name: "Chicago public bootstrap",
    address:
      "/dns4/chic-1-b.bootstrap.ipni.io/tcp/4453/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  },
  {
    name: "Published community production relay",
    address:
      "/dns4/novel-album-spare-host.2n6.me/tcp/443/tls/ws/p2p/12D3KooWM3zr7ES3DUnMbMpHx3GpGMj2Z11GLox5SpY8tfpApPqr",
  },
  {
    name: "Published community development relay",
    address:
      "/dns4/159-69-119-82.k51qzi5uqu5dmesgnxu1wjx2r2rk797fre6yxj284fqhcn2dekq3mar5sz63jx.libp2p.direct/tcp/4002/wss/p2p/12D3KooWSdmKqDDpRftU2ayyGH66svXd3P6zuyH7cMyFV1iXRR4p",
  },
];
const server = createServer(async (req, res) => {
  if (req.url === "/browser.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(await readFile(join(folder, "browser.js")));
  } else
    res.end(
      '<!doctype html><title>Public IPFS test</title><pre></pre><script type="module" src="/browser.js"></script>',
    );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(join(tmpdir(), "emberpage-ipfs-public-"));
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  executablePath:
    process.env.CHROMIUM_EXECUTABLE || undefined,
});
const evidence = {
  at: new Date().toISOString(),
  scope:
    "Browser public WSS circuit-relay admission probes; no port exposure or hosted article gateway.",
  services: [],
};
try {
  for (const service of services) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.spike);
    const started = Date.now();
    const result = await page.evaluate(
      async ({ address, label }) => {
        try {
          const data = await Promise.race([
            window.spike.start(label, address),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Relay admission timeout after 20 seconds")),
                20000,
              ),
            ),
          ]);
          return {
            ok: true,
            peerId: data.peerId,
            addresses: data.addresses,
            connections: data.connections,
          };
        } catch (error) {
          return { ok: false, error: error.message };
        }
      },
      { address: service.address, label: `public-${crypto.randomUUID()}` },
    );
    evidence.services.push({
      ...service,
      ...result,
      durationMs: Date.now() - started,
    });
    console.log(service.name, JSON.stringify(result));
    await page.close();
  }
} finally {
  await context.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
  await writeFile(
    "docs/research/ipfs-public-relay-probe.json",
    JSON.stringify(evidence, null, 2),
  );
}
