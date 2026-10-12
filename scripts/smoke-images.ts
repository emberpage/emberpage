import { Effect, Schema } from 'effect';
import type { BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

declare global {
  var __imageSmokeCaptureErrors: string[];
  var __imageSmokeCaptures: number[];
}

// Two real origins reproduce a normally loaded, canvas-tainted article illustration.
// This regression uses an isolated extension/profile and never publishes articles.
const root = await mkdtemp(join(tmpdir(), 'emberpage-image-smoke-'));
const png = await readFile('public/icons/icon-128.png');
const imageRequests: {path: string | undefined; cookie: string | undefined; origin: string | undefined; referer: string | undefined; mode: string | string[] | undefined}[] = [];
const imageServer = createServer((request, response) => {
  imageRequests.push({ path: request.url, cookie: request.headers.cookie, origin: request.headers.origin, referer: request.headers.referer, mode: request.headers['sec-fetch-mode'] });
  if (request.url === '/missing.png') { response.writeHead(404); response.end('missing'); return; }
  if (request.url?.endsWith('.svg')) {
    response.writeHead(200, { 'content-type': 'image/svg+xml' });
    response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${request.url === '/responsive.svg' ? '#00aa00' : '#0055cc'}"/></svg>`); return;
  }
  response.writeHead(200, { 'content-type': 'image/png', ...(request.url === '/allowed.png' ? { 'access-control-allow-origin': '*' } : {}) });
  response.end(png);
});
await new Promise<void>(resolve => imageServer.listen(0, '127.0.0.1', resolve));
const imageServerAddress = imageServer.address();
assert.ok(imageServerAddress && typeof imageServerAddress === "object");
const imageOrigin = `http://127.0.0.1:${imageServerAddress.port}`;
const title = 'Cross-origin image regression fixture';
const article = `<html><head><title>${title}</title></head><body><article><h1>${title}</h1>`
  + Array.from({ length: 10 }, (_, index) => `<p>Section ${index + 1}. The coastal science notebook records observations of waves, birds, and the weather. Its illustrations help explain the methods used by the research team. This complete article gives readers enough context to understand each field observation and the conclusions drawn from it.</p>`).join('')
  + `<figure><img src="${imageOrigin}/allowed.png" alt="CORS permitted illustration"><figcaption>Public CORS illustration</figcaption></figure>`
  + `<figure><img src="${imageOrigin}/denied.png" alt="CORS denied illustration"><figcaption>Restricted illustration</figcaption></figure>`
  + `<figure><img src="${imageOrigin}/denied.svg" alt="CORS denied SVG illustration"><figcaption>Rendered vector illustration</figcaption></figure>`
  + `<figure><picture><source media="(min-width: 600px)" srcset="${imageOrigin}/responsive.svg"><img src="${imageOrigin}/unselected.png" alt="Responsive selected illustration"></picture><figcaption>Responsive selected pixels</figcaption></figure>`
  + `<figure><img src="${imageOrigin}/missing.png" alt="Genuinely unavailable illustration"></figure>`
  + '</article></body></html>';
const articleServer = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html', 'set-cookie': 'image-smoke-secret=private; Path=/; SameSite=Lax' });
  response.end(article);
});
await new Promise<void>(resolve => articleServer.listen(0, '127.0.0.1', resolve));
const articleServerAddress = articleServer.address();
assert.ok(articleServerAddress && typeof articleServerAddress === "object");
const origin = `http://127.0.0.1:${articleServerAddress.port}`;
let context: BrowserContext | undefined;
try {
  const extension = join(root, 'extension');
  await cp(resolve('.output/chrome-mv3'), extension, { recursive: true });
  const manifest = { ...Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'))) };
  // Only the source page gets the automation substitute for the toolbar activeTab gesture.
  // The image origin has no extension host permission; its own CORS policy must decide access.
  manifest.host_permissions = [`${origin}/*`];
  // Headless navigation cannot grant activeTab. Opt in only for this disposable test copy
  // to exercise captureVisibleTab; production still uses the real toolbar activeTab grant.
  if (process.env.SMOKE_SCREENSHOT_PERMISSION === '1') manifest.host_permissions = ['<all_urls>'];
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await Effect.runPromise(Effect.tryPromise(() => chromium.launchPersistentContext(join(root, 'profile'), {
    headless: true, channel: 'chromium', executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    viewport: { width: 1000, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })));
  context.setDefaultTimeout(30_000);
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  await worker.evaluate(() => {
    const capture = chrome.tabs.captureVisibleTab.bind(chrome.tabs);
    globalThis.__imageSmokeCaptureErrors = [];
    globalThis.__imageSmokeCaptures = [];
    // Anonymous array entry avoids external name helpers in this serialized callback.
    const interceptor = [async (windowId: number, options: chrome.extensionTypes.ImageDetails) => {
      try { globalThis.__imageSmokeCaptures.push(Date.now()); return await capture(windowId, options); }
      catch (error) { globalThis.__imageSmokeCaptureErrors.push(error instanceof Error ? error.message : String(error)); throw error; }
    }][0];
    Object.defineProperty(chrome.tabs, 'captureVisibleTab', {value: interceptor});
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#app').waitFor({ state: 'visible' });
  const unauthorizedRaw: unknown = await popup.evaluate(() => chrome.runtime.sendMessage<unknown>({ target: 'background', action: 'CAPTURE_IMAGE_PIXELS', captureToken: 'not-authorized' }));
  const unauthorizedPixels = Schema.decodeUnknownSync(Schema.Struct({ok: Schema.Boolean}))(unauthorizedRaw);
  assert.equal(unauthorizedPixels.ok, false, 'Screenshot pixels must not be accessible outside an authorized article capture.');
  const source = await context.newPage();
  await source.goto(`${origin}/article`);
  await source.waitForFunction(() => [...document.querySelectorAll('img')].every(img => img.complete && (img.alt === 'Genuinely unavailable illustration' ? img.naturalWidth === 0 : img.naturalWidth === 128)));
  const responsive = await source.locator('img[alt="Responsive selected illustration"]').evaluate((img: HTMLImageElement) => ({ src: img.src, currentSrc: img.currentSrc }));
  assert.ok(responsive.src.endsWith('/unselected.png') && responsive.currentSrc.endsWith('/responsive.svg'));
  await source.evaluate(() => window.scrollTo(0, 120));
  const originalScroll = await source.evaluate(() => ({ x: scrollX, y: scrollY }));
  assert.equal(await source.locator('img').first().getAttribute('crossorigin'), null);
  const canvasError = await source.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const draw = canvas.getContext('2d');
    const image = document.querySelector('img');
    if (!draw || !image) throw new Error('Missing canvas fixture.');
    draw.drawImage(image, 0, 0);
    try { canvas.toDataURL('image/webp'); return null; } catch (error) { return error instanceof Error ? error.name : String(error); }
  });
  assert.equal(canvasError, 'SecurityError', 'Fixture must reproduce the actual cross-origin canvas failure.');
  assert.ok(imageRequests.some(request => request.path === '/allowed.png' && request.cookie?.includes('image-smoke-secret')));
  await popup.reload();
  await popup.waitForFunction(() => document.querySelector<HTMLButtonElement>('#capture')?.disabled === false);
  await popup.locator('#options > summary').click();
  const reviewPromise = context.waitForEvent('page');
  await popup.locator('#previewMenu').click();
  const review = await reviewPromise;
  await review.waitForLoadState();
  await review.waitForFunction(() => document.querySelector<HTMLButtonElement>('#save')?.disabled === false);
  await mkdir('artifacts', { recursive: true });
  await review.screenshot({ path: 'artifacts/cross-origin-images-review.png', fullPage: true });
  assert.equal(await review.locator('#article img[src^="data:image/webp;base64,"]').count(), 4,
    `All four loaded illustrations must survive as inline WebP. Screenshot errors: ${JSON.stringify(await worker.evaluate(() => globalThis.__imageSmokeCaptureErrors))}`);
  await review.waitForFunction(() => (document.querySelector<HTMLImageElement>('#article img')?.naturalWidth ?? 0) > 0);
  assert.equal(await review.locator('#article img[src^="http"]').count(), 0);
  const screenshotTimes = await worker.evaluate(() => globalThis.__imageSmokeCaptures);
  assert.equal(screenshotTimes.length, 3, 'Only the three loaded CORS-denied illustrations should require screenshots.');
  for (let index = 1; index < screenshotTimes.length; index++) assert.ok((screenshotTimes[index] ?? 0) - (screenshotTimes[index - 1] ?? 0) >= 500, 'Screenshot calls must respect Chrome’s two-per-second limit.');
  assert.doesNotMatch(await review.locator('#article').textContent() || '', /\[Image: CORS denied/);
  assert.match(await review.locator('#article').textContent() || '', /\[Image: Genuinely unavailable illustration\]/);
  assert.deepEqual(await source.evaluate(() => ({ x: scrollX, y: scrollY })), originalScroll, 'Image capture must restore the source scroll position.');
  const selectedPixel = await review.locator('#article img[alt="Responsive selected illustration"]').evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const draw = canvas.getContext('2d');
    if (!draw) throw new Error('Missing pixel canvas fixture.');
    draw.drawImage(img, 0, 0, 1, 1);
    return [...draw.getImageData(0, 0, 1, 1).data];
  });
  assert.ok((selectedPixel[1] ?? 0) > 120 && (selectedPixel[0] ?? 255) < 40 && (selectedPixel[2] ?? 255) < 40, `Responsive capture must preserve selected green pixels, received ${selectedPixel.join(", ")}`);
  assert.ok(imageRequests.some(request => request.path === '/allowed.png' && request.mode === 'cors' && !request.cookie && !request.referer),
    'CORS fallback must use an anonymous request without the page cookie or referrer.');
  assert.equal(await worker.evaluate(() => chrome.offscreen.hasDocument()), false, 'Private image capture must not start networking.');
  await review.locator('#save').click();
  await review.waitForURL('**/reader.html?*');
  await review.waitForFunction(() => (document.querySelector('#article')?.textContent?.length ?? 0) > 0);
  assert.equal(await review.locator('#copy-label').textContent(), 'Private copy');
  await popup.reload();
  await popup.locator('[data-view="library"]').click();
  await popup.locator('#library-list .item-main').waitFor();
  const imageCount = imageRequests.length;
  const readerPromise = context.waitForEvent('page');
  await popup.locator('#library-list .item-main').click();
  const reader = await readerPromise;
  await reader.waitForLoadState(); await reader.waitForFunction(() => (document.querySelector('#article')?.textContent?.length ?? 0) > 0);
  assert.equal(await reader.locator('#article img').count(), 4);
  assert.equal(await reader.locator('#article img[src^="http"]').count(), 0);
  await reader.waitForFunction(() => (document.querySelector<HTMLImageElement>('#article img')?.naturalWidth ?? 0) > 0);
  assert.match(await reader.locator('#article').textContent() || '', /\[Image: Genuinely unavailable illustration\]/);
  assert.equal(imageRequests.length, imageCount, 'Reading the cached copy must not contact either remote image endpoint.');
  assert.equal(imageRequests.length, imageCount, 'Local inspection must not reload remote images.');
  await reader.screenshot({ path: 'artifacts/cross-origin-images-reader.png', fullPage: true });
  if (process.env.SMOKE_SCREENSHOT_PERMISSION === '1') console.log('HARNESS: screenshot permission was granted only to a disposable extension copy; this does not verify a real toolbar activeTab grant.');
  console.log('PASS: actual MV3 cross-origin capture, anonymous bounded CORS fallback, safe inline WebP, CORS-denied PNG/SVG screenshot fallback, responsive selected pixels, unavailable placeholder, restored scroll, private save, and reader with no remote image requests.');
} finally {
  await context?.close();
  await Promise.all([new Promise<void>((resolve, reject) => articleServer.close(error => error ? reject(error) : resolve())), new Promise<void>((resolve, reject) => imageServer.close(error => error ? reject(error) : resolve()))]);
  await rm(root, { recursive: true, force: true });
}
