import type { Replies } from '../src/ui.ts';
import { Effect, Schema } from 'effect';
import type { BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const root = await mkdtemp(join(tmpdir(), 'emberpage-smoke-'));
const title = `The coastal field notebook ${crypto.randomUUID().slice(0, 8)}`;
const fixture = `<html><head><title>${title}</title></head><body><article><h1>${title}</h1>`
  + Array.from({ length: 12 }, (_, index) => `<p>Observation ${index + 1}. Along the coast, a team of researchers records the rhythm of the tides, the changing weather, and the seabirds that return each season. Their field notes reveal how carefully watching a place helps us understand its patterns over time.</p>`).join('')
  + '<h2>Field methods</h2><p>Researchers use repeatable observations to compare seasons.</p><ul><li>Record the weather.</li><li>Return at the same tide.</li></ul><blockquote><p>A useful record survives the original link.</p></blockquote><pre><code>const tide = &quot;low&quot;;</code></pre>'
  + '<figure><img src="/figure.png" alt="A sample illustration"><figcaption>The article illustration.</figcaption></figure><table><tbody><tr>'
  + Array.from({ length: 12 }, (_, index) => `<td>LongColumnHeading${index}</td>`).join('')
  + '</tr></tbody></table><script>window.fixtureScript=true</script><img src="https://example.com/tracker.gif"></article></body></html>';
const figure = await readFile('public/icons/icon-128.png');
const server = createServer((request, response) => {
  if (request.url === '/figure.png') {
    response.writeHead(200, { 'content-type': 'image/png' }); response.end(figure);
  } else {
    response.writeHead(200, { 'content-type': 'text/html' }); response.end(fixture);
  }
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const serverAddress = server.address();
assert.ok(serverAddress && typeof serverAddress === "object");
const origin = `http://127.0.0.1:${serverAddress.port}`;
let context: BrowserContext | undefined;
const publicNetworkCalls: string[] = [];

async function call<A extends keyof Replies>(page: Page, action: A, fields: Record<string, unknown> = {}): Promise<Replies[A]> {
  const raw: unknown = await page.evaluate(message => chrome.runtime.sendMessage<unknown>({ target: 'background', ...message }), { action, ...fields });
  const response = Schema.decodeUnknownSync(Schema.Struct({ok: Schema.Boolean, data: Schema.optionalKey(Schema.Unknown), error: Schema.optionalKey(Schema.String)}))(raw);
  assert.equal(response?.ok, true, JSON.stringify(response));
  return response.data as Replies[A];
}
async function keyboardActivate(page: Page, selector: string) {
  const target = page.locator(selector).first();
  const closed = target.locator('xpath=ancestor::details[not(@open)]');
  while (!(await target.isVisible()) && await closed.count()) {
    await closed.first().locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
  }
  await target.focus();
  await page.keyboard.press('Enter');
}

try {
  const extension = join(root, 'extension');
  await cp(resolve('.output/chrome-mv3'), extension, { recursive: true });
  const manifest = { ...Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'))) };
  assert.equal(Schema.decodeUnknownSync(Schema.Array(Schema.String))(manifest.permissions).includes('alarms'), false, 'The shipped extension must not schedule background actions.');
  // Automation substitutes a temporary local-fixture permission for the toolbar's activeTab gesture.
  manifest.host_permissions = [`${origin}/*`];
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await Effect.runPromise(Effect.tryPromise(() => chromium.launchPersistentContext(join(root, 'profile'), {
    headless: true, channel: 'chromium', executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    viewport: { width: 1000, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })));
  context.setDefaultTimeout(90_000);
  context.on('request', request => { if (/primal\.net/.test(request.url())) publicNetworkCalls.push(request.url()); });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#library-list .empty').waitFor();
  assert.equal(await popup.locator('#options').getAttribute('open'), null);
  assert.deepEqual(publicNetworkCalls, []);
  const articlePage = await context.newPage();
  await articlePage.goto(`${origin}/article?utm_source=test&id=42`);
  await articlePage.waitForFunction(() => (document.querySelector<HTMLImageElement>('img[src="/figure.png"]')?.naturalWidth ?? 0) > 0);
  await popup.reload();
  await popup.locator('#app').waitFor({ state: 'visible' });
  await popup.waitForFunction(() => document.querySelector<HTMLButtonElement>('#capture')?.disabled === false);
  assert.equal(await worker.evaluate(() => chrome.offscreen.hasDocument()), false, 'Opening the archive must not start a network session.');
  const reviewPromise = context.waitForEvent('page');
  await keyboardActivate(popup, '#previewMenu');
  const review = await reviewPromise;
  await review.waitForLoadState();
  await review.waitForFunction(() => document.querySelector<HTMLButtonElement>('#save')?.disabled === false);
  assert.ok((await review.locator('#article').textContent() || '').length >= 1000);
  assert.equal(await review.locator('#article h2,#article ul,#article blockquote,#article pre').count(), 4);
  assert.equal(await review.locator('#article script,#article img[src^="http"]').count(), 0);
  assert.equal(await review.locator('#article img[src^="data:image/webp;base64,"]').count(), 1);
  await review.waitForFunction(() => (document.querySelector<HTMLImageElement>('#article img')?.naturalWidth ?? 0) > 0);
  await mkdir('artifacts', { recursive: true });
  assert.equal(await review.evaluate(async () => {
    await document.fonts.load('18px Geist');
    return document.fonts.check('18px Geist') && document.querySelector('#article')?.classList.contains('typeset');
  }), true, 'Article uses local Geist and Typeset');
  for (const colorScheme of ['light', 'dark'] as const) {
    await review.emulateMedia({ colorScheme });
    await review.setViewportSize({ width: 800, height: 800 });
    assert.equal(await review.locator('#article').evaluate(el => getComputedStyle(el).fontSize), '18px');
    assert.equal(await review.evaluate(() => getComputedStyle(document.documentElement).colorScheme), colorScheme);
    await review.screenshot({ path: `artifacts/review-${colorScheme}.png`, fullPage: true });
  }
  await review.emulateMedia({ colorScheme: 'light' });

  for (const width of [360, 800, 1280]) {
    await review.setViewportSize({ width, height: 800 });
    assert.equal(await review.evaluate(() => document.body.scrollWidth <= innerWidth), true, `Review overflows at ${width}`);
    await review.screenshot({ path: `artifacts/review-${width}.png`, fullPage: true });
  }
  await review.setViewportSize({ width: 1000, height: 800 });
  await review.screenshot({ path: 'artifacts/review.png', fullPage: true });
  await keyboardActivate(review, '#article-options > summary');
  await review.locator('#text-only').focus();
  assert.equal(await review.evaluate(() => document.activeElement?.id), 'text-only');
  await review.keyboard.press('Space');
  assert.equal(await review.locator('#text-only').isChecked(), true);
  await keyboardActivate(review, '#save');
  await review.waitForURL('**/reader.html?*');
  await review.waitForFunction(() => (document.querySelector('#article')?.textContent?.length ?? 0) > 0);
  assert.equal(await review.locator('#copy-label').textContent(), 'Private copy');
  await popup.reload();
  await popup.locator('#app').waitFor({ state: 'visible' });
  await keyboardActivate(popup, '[data-view="library"]');
  await popup.locator('#library-list .item-title').waitFor();
  assert.match(await popup.locator('#library-list .item-detail').textContent() || '', /Saved on this device/);
  await popup.screenshot({ path: 'artifacts/popup-saved.png' });
  const readerPromise = context.waitForEvent('page');
  await keyboardActivate(popup, '#library-list .item-main');
  const reader = await readerPromise;
  await reader.waitForLoadState();
  await reader.waitForFunction(() => (document.querySelector('#article')?.textContent?.length ?? 0) > 0);
  assert.match(await reader.locator('#article').textContent() || '', /Observation 12/);
  assert.equal(await reader.locator('#article img,#article script').count(), 0);
  assert.equal(await reader.locator('#source').getAttribute('href'), `${origin}/article?id=42`);
  await reader.screenshot({ path: 'artifacts/reader.png', fullPage: true });

  assert.equal(publicNetworkCalls.length, 0, 'Private caching and reading must not publish or query a provider.');
  assert.equal((await call(popup, 'LOCAL_CATALOG')).length, 0, 'Private copies must not enter the popular list.');
  await keyboardActivate(popup, '#manage');
  await popup.locator('#library-list').getByRole('button', { name: /^Remove / }).click();
  await popup.locator('#library-list .empty').waitFor();

  console.log('PASS: keyboard direct preview/Archive/Community, private saving, safe images and text-only mode, 360/800/1280px review, local reading, removal, and no automatic networking.');
} finally {
  await context?.close();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await rm(root, { recursive: true, force: true });
}
