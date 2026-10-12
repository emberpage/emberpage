import { chromium } from 'playwright';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createAggregatorServer } from '../aggregator/server.ts';
import { AggregatorStore } from '../aggregator/store.js';
import { hashUrl } from '../src/core/article.js';
import { PROVIDER } from '../src/network/nostr.js';

// Isolated, explicitly named metadata fixtures exercise the actual local HTTP server and UI.
// This test never publishes fixtures to the public relay or retrieves article bodies.
const store = new AggregatorStore();
const calls = [];
const now = Date.now();
const entries = await Promise.all([
  ['https://example.com/fixture-ai', 'Explicit test fixture: AI research', 'a'],
  ['https://example.org/fixture-science', 'Explicit test fixture: Coastal science', 'b'],
].map(async ([url, title, hash]) => ({ id:hash.repeat(64),pubkey:'f'.repeat(64),url,urlHash:await hashUrl(url),contentHash:hash.repeat(64),blobHash:'c'.repeat(64),size:150000,title,byline:'Test writer',capturedAt:now-60*86400_000,createdAt:now,provider:PROVIDER })));
const directory = {
  async queryListings() { calls.push('listings'); return entries; },
  async queryVotes() { calls.push('votes'); return []; },
};
const server = createAggregatorServer({ store, directory, host: '127.0.0.1', port: 0 });
if (!server.listening) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); }
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
async function activate(page, selector) { await page.locator(selector).focus(); await page.keyboard.press('Enter'); }
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.locator('#article-count').filter({ hasText: '0 articles' }).waitFor();
  assert.deepEqual(calls, [], 'Opening the local dashboard must not query the relay.');
  assert.match(await page.locator('#network-label').textContent(), /Idle/);
  await activate(page, '#reload');
  await page.waitForFunction(() => !document.querySelector('#reload').disabled);
  assert.deepEqual(calls, [], 'Show saved results must not query the relay.');
  await store.commitMetadata(entries, []);
  store.appendEvent({ action: 'STORE', kind: 'storage', outcome: 'success', details: { entries: 2 } });
  await activate(page, '#reload');
  await page.locator('#article-list .article-row').first().waitFor();
  assert.equal(await page.locator('#article-list .article-row').count(), 2);
  await page.locator('#search').focus(); await page.keyboard.type('Coastal');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  assert.match(await page.locator('#article-list').textContent(), /Coastal/);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.press('Backspace');
  assert.equal(await page.locator('#article-list .article-row').count(), 2);
  await page.locator('#source').selectOption('example.org');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  await page.locator('#source').selectOption('');
  await page.locator('#category').selectOption('Science');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  await page.locator('#category').selectOption('');
  await page.locator('#ranking').focus(); await page.keyboard.press('n'); await page.keyboard.press('Enter');
  await mkdir('artifacts', { recursive: true });
  for (const width of [360, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['articles', 'activity', 'storage']) {
      await activate(page, `[data-view="${view}"]`);
      assert.equal(await page.locator(`#${view}-view`).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${view} overflows at ${width}px`);
      await page.screenshot({ path: `artifacts/aggregator-${view}-${width}.png`, fullPage: true });
    }
  }
  assert.match(await page.locator('#storage-list').textContent(), /Article listings/);
  assert.match(await page.locator('#storage-list').textContent(), /2 records/);
  await activate(page, '[data-view="activity"]');
  assert.match(await page.locator('#event-list').textContent(), /STORE/);
  await activate(page, '#event-list summary');
  assert.equal(await page.locator('#event-list details').first().getAttribute('open'), '');
  assert.deepEqual(calls, [], 'Local filters, navigation, and storage reads must not query the relay.');
  await activate(page, '[data-view="articles"]');
  await activate(page, '#refresh');
  await page.waitForFunction(() => !document.querySelector('#refresh').disabled);
  assert.match(await page.locator('#status').textContent(), /Update finished/);
  assert.ok(calls.includes('listings') && calls.includes('votes'));
  await activate(page, '[data-view="articles"]');
  const focused = page.locator('#article-list a').first(); await focused.focus();
  const href = await focused.getAttribute('href');
  await page.waitForTimeout(5200);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), href, 'Local polling must preserve article link focus.');
  for (const path of ['/api/requests','/api/check','/api/article/test']) assert.equal((await page.request.get(origin + path)).status(),404);
  assert.equal((await page.locator('[data-view="requests"]').count()),0);
  assert.equal(await page.locator('#trend-list > div').count(),7);
  assert.deepEqual(errors, []);
  console.log('PASS: actual local aggregator HTTP/UI with explicit metadata fixtures; passive reads, keyboard filters/tabs, activity/storage, manual refresh, and 360/800/1280px layouts. No public publishing or body retrieval.');
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close();
}
