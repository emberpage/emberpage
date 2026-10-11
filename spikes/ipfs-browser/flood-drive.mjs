import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const relay = (await (await fetch('http://127.0.0.1:4328/relay.json')).json()).relay;
const profile = await mkdtemp(join(tmpdir(), 'meshcache-ipfs-spike-'));
const contexts = [];
const buildHash = createHash('sha256').update(await readFile('dist/browser.js')).digest('hex');
const evidence = { buildHash, at: new Date().toISOString(), relay, scope: 'Real Chrome/WebRTC hostile peer tests, private/public consent and resource policy; localhost relay only.', steps: [], requests: [] };
const step = (name, detail) => { evidence.steps.push({ name, at: new Date().toISOString(), detail }); console.log(name, JSON.stringify(detail)); };
async function open(label, limits = {}, hostile = false) {
  const context = await chromium.launchPersistentContext(join(profile, label), { executablePath: process.env.CHROME_BIN || undefined, headless: true }); contexts.push(context);
  await context.addInitScript(() => { window.__spikeRTC = []; const NativeRTC = window.RTCPeerConnection; window.RTCPeerConnection = class extends NativeRTC { constructor(...args) { super(...args); window.__spikeRTC.push(this); } }; });
  const page = context.pages()[0]; page.on('console', m => { if (m.type() === 'error') console.log(label, 'console', m.text().slice(0, 300)); }); page.on('pageerror', e => console.log(label, 'error', e.message));
  page.on('request', r => evidence.requests.push({ label, url: r.url(), method: r.method(), type: r.resourceType() }));
  await page.goto('http://127.0.0.1:4328'); await page.waitForFunction(() => window.spike);
  const info = await page.evaluate(({ label, relay, limits, hostile }) => window.spike.start(label, relay, limits, hostile), { label, relay, limits, hostile }); step(`start ${label}`, info);
  return { context, page, info };
}
function address(info) { return info.addresses.find(a => a.includes('/webrtc')); }
async function info(page) { return page.evaluate(() => window.spike.info()); }
async function denied(page, cid, timeout = 1000) { return page.evaluate(async ({ cid, timeout }) => { const at = performance.now(); try { await window.spike.get(cid, timeout); return { denied: false }; } catch (err) { return { denied: true, error: err.name + ': ' + err.message, elapsedMs: Math.round(performance.now() - at) }; } }, { cid, timeout }); }
async function connect(reader, holder) { await reader.page.evaluate(addr => window.spike.dial(addr), address(await info(holder.page))); }
try {
  const floodHolder = await open('Flood-holder'); const floodCid = await floodHolder.page.evaluate(data => window.spike.add(data), Array.from(randomBytes(50000))); const floodPeer = await open('Flood-peer', {}, true); await connect(floodPeer, floodHolder); const floodInput = await floodPeer.page.evaluate(({ address, cid }) => window.spike.attackFlood(address, cid), { address: address(await info(floodHolder.page)), cid: floodCid }); await floodHolder.page.waitForFunction(() => window.spike.protocolInfo().rejectedMessages >= 16); assert.equal((await floodHolder.page.evaluate(() => window.spike.protocolInfo())).ledgers.length, 0); assert.equal((await floodHolder.page.evaluate(() => window.spike.policyInfo())).public.budget.bytes, 0); const legitimate = await floodPeer.page.evaluate(cid => window.spike.get(cid), floodCid); assert.equal(legitimate.bytes, 50000); const floodState = await floodHolder.page.evaluate(() => ({ protocol: window.spike.protocolInfo(), policy: window.spike.policyInfo() })); step('Flood diagnostic before bound assertion', floodState); assert.equal(floodState.protocol.rejectedMessages, 16); assert.ok(floodState.protocol.ledgers.every(ledger => ledger.pendingWants <= 32 && ledger.totalWants <= 33 && ledger.sendQueue <= 2)); assert.ok(floodState.policy.public.budget.bytes <= floodState.policy.public.limits.servedBytes); assert.equal(floodState.policy.read.bytes, 0); step('Finite actual Bitswap flood bounds active wants and queued responses', { input: floodInput, state: floodState });
 evidence.ok=true;

} catch (err) { evidence.ok = false; evidence.error = err.stack; console.error(err); process.exitCode = 1; }
finally { for (const context of contexts) await context.close().catch(() => {}); await mkdir('../../docs/research', { recursive: true }); await writeFile('../../docs/research/ipfs-browser-flood.json', JSON.stringify(evidence, null, 2)); await rm(profile, { recursive: true, force: true }); }
