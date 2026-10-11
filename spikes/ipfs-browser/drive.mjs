import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const relay = (await (await fetch('http://127.0.0.1:4328/relay.json')).json()).relay;
const profile = await mkdtemp(join(tmpdir(), 'meshcache-ipfs-spike-'));
const contexts = [];
const evidence = { at: new Date().toISOString(), relay, scope: 'Actual Chrome on one host, local circuit relay and WebRTC; no public discovery or gateway.', steps: [], requests: [] };
const step = (name, detail) => { evidence.steps.push({ name, at: new Date().toISOString(), detail }); console.log(name, JSON.stringify(detail)); };
async function open(label) {
  const context = await chromium.launchPersistentContext(join(profile, label), { executablePath: process.env.CHROME_BIN || undefined, headless: true }); contexts.push(context);
  await context.addInitScript(() => { window.__spikeRTC = []; const NativeRTC = window.RTCPeerConnection; window.RTCPeerConnection = class extends NativeRTC { constructor(...args) { super(...args); window.__spikeRTC.push(this); } }; });
  const page = context.pages()[0]; page.on('console', m => { if (m.type() === 'error') console.log(label, 'console', m.text().slice(0, 300)); }); page.on('pageerror', e => console.log(label, 'error', e.message));
  page.on('request', r => evidence.requests.push({ label, url: r.url(), method: r.method(), type: r.resourceType() }));
  await page.goto('http://127.0.0.1:4328'); await page.waitForFunction(() => window.spike);
  const info = await page.evaluate(({ label, relay }) => window.spike.start(label, relay), { label, relay }); step(`start ${label}`, info);
  return { context, page, info };
}
function address(info) { return info.addresses.find(a => a.includes('/webrtc')); }
async function info(page) { return page.evaluate(() => window.spike.info()); }
try {
  const a = await open('A'); const image = await a.page.evaluate(async () => { const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#007aff'; ctx.fillRect(0, 0, 32, 32); const uri = canvas.toDataURL('image/webp', 0.8); const bitmap = await createImageBitmap(await (await fetch(uri)).blob()); if (bitmap.width !== 32 || bitmap.height !== 32) throw new Error('WebP decode failed'); return uri; }); step('Canvas WebP decoded in Chrome', { width: 32, height: 32, imageBytes: image.length });
  const bytes = Buffer.from(JSON.stringify({ format: 'meshcache-ipfs-spike', title: 'Synthetic article', content: randomBytes(380000).toString('base64'), image: image }));
  const expected = { bytes: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') };
  const cid = await a.page.evaluate(data => window.spike.add(data), Array.from(bytes)); await a.page.evaluate(cid => window.spike.pin(cid), cid); step('A imports and pins', { cid, ...expected });
  const b = await open('B');
  await a.page.waitForFunction(() => window.spike.node.libp2p.getMultiaddrs().some(a => a.toString().includes('/webrtc'))); a.info = await info(a.page);
  step('B dials A', await b.page.evaluate(addr => window.spike.dial(addr), address(a.info)));
  const fromA = await b.page.evaluate(cid => window.spike.get(cid), cid); assert.deepEqual(fromA, expected); await b.page.evaluate(cid => window.spike.pin(cid), cid); step('B retrieves and pins', await info(b.page));
  const envelope = { format: 'meshcache-ipfs-spike', title: 'Two MiB synthetic article', content: '', image: image }; const bodySize = 2 * 1024 * 1024 - Buffer.byteLength(JSON.stringify(envelope)); envelope.content = randomBytes(Math.ceil(bodySize / 2)).toString('hex').slice(0, bodySize); const large = Buffer.from(JSON.stringify(envelope)); assert.equal(large.length, 2 * 1024 * 1024); const largeExpected = { bytes: large.length, hash: createHash('sha256').update(large).digest('hex') }; const largeCid = await a.page.evaluate(data => window.spike.add(data), Array.from(large)); await a.page.evaluate(cid => window.spike.pin(cid), largeCid); assert.ok(largeCid.startsWith('bafy')); assert.deepEqual(await b.page.evaluate(cid => window.spike.get(cid), largeCid), largeExpected); await b.page.evaluate(cid => window.spike.pin(cid), largeCid); const bStats = await info(b.page); step('RTC stats before assertion', bStats.rtc); assert.ok(bStats.rtc.some(pc => pc.state === 'connected' && pc.stats.some(stat => stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.bytesReceived >= large.length))); step('Native UnixFS multi-block 2 MiB transfer over WebRTC', { cid: largeCid, expected: largeExpected, info: bStats });
  await a.page.evaluate(() => window.spike.stop()); await a.context.close(); step('A fully closed', true);
  const bBefore = await info(b.page); await b.context.close(); const bRestart = await open('B');
  assert.equal(bRestart.info.peerId, bBefore.peerId); assert.ok(bRestart.info.pins.includes(cid)); assert.deepEqual(await bRestart.page.evaluate(cid => window.spike.get(cid), cid), expected); step('B identity, pin, bytes survive browser restart', await info(bRestart.page));
  const c = await open('C'); await bRestart.page.waitForFunction(() => window.spike.node.libp2p.getMultiaddrs().some(a => a.toString().includes('/webrtc')));
  step('C dials B with A offline', await c.page.evaluate(addr => window.spike.dial(addr), address(await info(bRestart.page)))); assert.deepEqual(await c.page.evaluate(cid => window.spike.get(cid), cid), expected); assert.deepEqual(await c.page.evaluate(cid => window.spike.get(cid), largeCid).catch(async err => { step('Diagnostic failed C large retrieval source', await info(bRestart.page)); step('Diagnostic failed C large retrieval reader', await info(c.page)); throw err; }), largeExpected); step('C retrieves article and 2 MiB multi-block file from B', await info(c.page));
  const fresh = randomBytes(64000); const freshExpected = { bytes: fresh.length, hash: createHash('sha256').update(fresh).digest('hex') }; const freshCid = await bRestart.page.evaluate(data => window.spike.add(data), Array.from(fresh)); for (const holder of [bRestart, c]) { await holder.page.evaluate(async () => { for (const conn of window.spike.node.libp2p.getConnections()) if (!conn.remoteAddr.toString().includes('/webrtc')) await conn.close(); }); const disconnected = await info(holder.page); assert.ok(disconnected.connections.every(conn => conn.address.includes('/webrtc'))); step('Close relay connections, retain established WebRTC', disconnected); } assert.deepEqual(await c.page.evaluate(cid => window.spike.get(cid), freshCid), freshExpected); step('New uncached file transfers after relay connections close', { cid: freshCid, ...freshExpected, info: await info(c.page) });
  await bRestart.context.close(); await c.context.close(); const d = await open('D');
  const failure = await d.page.evaluate(async cid => { const started = performance.now(); try { await window.spike.get(cid, 3000); return { ok: true }; } catch (err) { return { ok: false, error: err.name + ': ' + err.message, elapsedMs: Math.round(performance.now() - started) }; } }, cid); assert.equal(failure.ok, false); step('All holders offline fails boundedly', failure);
  assert.ok(evidence.requests.every(r => r.url.startsWith('http://127.0.0.1:4328') || r.url.startsWith('data:image/webp'))); evidence.ok = true;
} catch (err) { evidence.ok = false; evidence.error = err.stack; console.error(err); process.exitCode = 1; }
finally { for (const context of contexts) await context.close().catch(() => {}); await mkdir('../../docs/research', { recursive: true }); await writeFile('../../docs/research/ipfs-browser-spike.json', JSON.stringify(evidence, null, 2)); await rm(profile, { recursive: true, force: true }); }
