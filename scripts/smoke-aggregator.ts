import { Effect } from 'effect';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createAggregatorServer } from '../aggregator/server.ts';
import { AggregatorStore } from '../aggregator/store.ts';
import { hashUrl } from '../src/domain/article.ts';
import { PROVIDER } from '../src/directory/nostr.ts';

// Isolated, explicitly named metadata fixtures exercise the actual local HTTP server and UI.
// This test never publishes fixtures to the public relay or retrieves article bodies.
const store = new AggregatorStore();
const calls: string[] = [];
const now = Date.now();
const entries = await Promise.all(([
  ['https://example.com/fixture-ai', 'Explicit test fixture: AI research', 'a'],
  ['https://example.org/fixture-science', 'Explicit test fixture: Coastal science', 'b'],
] as [string, string, string][]).map(async ([url, title, hash]) => ({ id:hash.repeat(64),pubkey:'f'.repeat(64),url,urlHash:await hashUrl(url),contentHash:hash.repeat(64),blobHash:'c'.repeat(64),size:150000,title,byline:'Test writer',capturedAt:now-60*86400_000,createdAt:now,provider:PROVIDER })));
const directory = {
  queryListings() { calls.push('listings'); return Promise.resolve(entries); },
  queryVotes() { calls.push('votes'); return Promise.resolve([]); },
};
const server = createAggregatorServer({ store, directory });
if (!server.listening) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); }
const serverAddress = server.address();
assert.ok(serverAddress && typeof serverAddress === "object");
const origin = `http://127.0.0.1:${serverAddress.port}`;
let browser: Browser | undefined;
async function activate(page: Page, selector: string) {
  const target = page.locator(selector).first();
  const closed = target.locator('xpath=ancestor::details[not(@open)]');
  while (!(await target.isVisible()) && await closed.count()) {
    await closed.first().locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
  }
  await target.focus(); await page.keyboard.press('Enter');
}
try {
  browser = await Effect.runPromise(Effect.tryPromise(() => chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined })));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.locator('#article-count').filter({ hasText: '0 articles' }).waitFor();
  assert.equal(calls.length, 0, 'Opening the local dashboard must not query the relay.');
  assert.match(await page.locator('#network-label').textContent() || '', /Idle/);
  await activate(page, '#reload');
  await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('#reload')?.disabled === false);
  assert.equal(calls.length, 0, 'Show saved results must not query the relay.');
  await store.commitMetadata(entries, []);
  store.appendEvent({ action: 'STORE', kind: 'storage', outcome: 'success', details: { entries: 2 } });
  await activate(page, '#reload');
  await page.locator('#article-list .article-row').first().waitFor();
  assert.equal(await page.locator('#article-list .article-row').count(), 2);
  await page.locator('#search').focus(); await page.keyboard.type('Coastal');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  assert.match(await page.locator('#article-list').textContent() || '', /Coastal/);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.press('Backspace');
  assert.equal(await page.locator('#article-list .article-row').count(), 2);
  await activate(page, '#filters > summary');
  await page.locator('#source').selectOption('example.org');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  await page.locator('#source').selectOption('');
  await page.locator('#category').selectOption('Science');
  assert.equal(await page.locator('#article-list .article-row').count(), 1);
  await page.locator('#category').selectOption('');
  await page.locator('#ranking').focus(); await page.keyboard.press('n'); await page.keyboard.press('Enter');
  await activate(page, '#filters > summary');
  await mkdir('artifacts', { recursive: true });
  assert.equal((await page.request.get(`${origin}/fonts/geist-sans.woff2`)).headers()['content-type'], 'font/woff2');
  assert.equal(await page.evaluate(async () => {
    await document.fonts.load('14px Geist');
    return document.fonts.check('14px Geist');
  }), true, 'Dashboard font loads locally');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), colorScheme);
    await page.screenshot({ path: `artifacts/aggregator-${colorScheme}.png`, fullPage: true });
  }
  await page.emulateMedia({ colorScheme: 'light' });

  for (const width of [360, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['articles', 'activity', 'storage']) {
      await activate(page, `[data-view="${view}"]`);
      assert.equal(await page.locator(`#${view}-view`).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${view} overflows at ${width}px`);
      await page.screenshot({ path: `artifacts/aggregator-${view}-${width}.png`, fullPage: true });
    }
  }
  await activate(page, '#tools > summary');
  await page.locator('#show-article-details').focus(); await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => document.body.classList.contains('show-article-details')), true);
  await activate(page, '#tools > summary');
  assert.match(await page.locator('#storage-list').textContent() || '', /Article listings/);
  assert.match(await page.locator('#storage-list').textContent() || '', /2 records/);
  await activate(page, '[data-view="activity"]');
  assert.match(await page.locator('#event-list').textContent() || '', /STORE/);
  await activate(page, '#event-list summary');
  assert.equal(await page.locator('#event-list details').first().getAttribute('open'), '');
  assert.equal(calls.length, 0, 'Local filters, navigation, and storage reads must not query the relay.');
  await activate(page, '[data-view="articles"]');
  await activate(page, '#refresh');
  await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('#refresh')?.disabled === false);
  assert.match(await page.locator('#status').textContent() || '', /Update finished/);
  assert.ok(calls.includes('listings') && calls.includes('votes'));
  await activate(page, '[data-view="articles"]');
  const focused = page.locator('#article-list a').first(); await focused.focus();
  const href = await focused.getAttribute('href');
  await page.waitForTimeout(5200);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), href, 'Local polling must preserve article link focus.');
  for (const path of ['/api/requests','/api/check','/api/article/test']) assert.equal((await page.request.get(origin + path)).status(),404);
  assert.equal((await page.locator('[data-view="requests"]').count()),0);
  assert.equal(await page.locator('#trend-list > div').count(),7);
  assert.deepEqual(errors, []);
  console.log('PASS: actual local aggregator HTTP/UI with explicit metadata fixtures; passive reads, keyboard filters/tabs, activity/storage, manual refresh, and 360/800/1280px layouts. No public publishing or body retrieval.');
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); store.close();
}
