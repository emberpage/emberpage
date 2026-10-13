import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

void test('Reader keeps votes and browser sharing explicit with recoverable network and listing failures', async (t) => {
  const dom = new JSDOM(await readFile(new URL('../entrypoints/reader.html', import.meta.url), 'utf8'), { url: 'https://extension.example/reader.html?id=snapshot' });
  const previous = { document: globalThis.document, chrome: globalThis.chrome, location: globalThis.location };
  const calls: { action: string; value?: number }[] = [];
  const permissionRequests: chrome.permissions.Permissions[] = [];
  let meshAvailable = false;
  let listingAccepted = false;
  let partialRatings = true;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'location', { configurable: true, value: dom.window.location });
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: {
    permissions: { request(request: chrome.permissions.Permissions) { permissionRequests.push(request); throw new Error('Browser sharing must not request host permissions.'); } },
    runtime: { getURL(path: string) { return `chrome-extension://test-extension/${path}`; }, sendMessage(message: { action: string; value?: number }) {
      calls.push(message);
      if (message.action === 'RATINGS') return Promise.resolve({ok: true, data: {upvotes: 1, downvotes: 0, score: 1, ...(partialRatings ? {warning: 'Some ratings are unavailable. Rankings may be incomplete.'} : {})}});
      if (message.action === 'CONTRIBUTE') return Promise.resolve(meshAvailable
        ? { ok: true, data: { shared: listingAccepted, ...(listingAccepted ? {} : { shareError: 'No relay accepted the listing.' }), pinned: true, cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m', contentHash: 'snapshot' } }
        : { ok: false, error: 'IPFS peers could not be reached.' });
      return Promise.resolve({ ok: true, data: message.action === 'READ'
        ? { article: { title: 'An archived page', byline: '', url: 'https://example.org/page', capturedAt: Date.now(), content: '<p>A readable copy.</p>' }, shared: true, rating: { upvotes: 0, downvotes: 0, score: 0 } }
        : { upvotes: 1, downvotes: 0, score: 1 } });
    } }
  } });
  t.after(() => {
    globalThis.document = previous.document;
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: previous.chrome });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: previous.location });
    dom.window.close();
  });
  await Effect.runPromise(Effect.tryPromise(() => import('../src/pages/reader.ts')));
  await new Promise(setImmediate);
  const support = dom.window.document.querySelector<HTMLElement>('#ratings');
  const helpful = dom.window.document.querySelector<HTMLButtonElement>('#helpful');
  const options = dom.window.document.querySelector<HTMLDetailsElement>('#article-options');
  assert.equal(support?.hidden, false);
  assert.equal(options?.open, false);
  assert.equal(helpful?.closest('details'), null);
  assert.deepEqual(calls.map(call => call.action), ['READ']);
  helpful?.click();
  await new Promise(setImmediate);
  assert.deepEqual(calls.at(-1), { target: 'background', action: 'RATE', id: 'snapshot', value: 1 });
  assert.match(dom.window.document.querySelector('#rating-summary')?.textContent || '', /1 helpful/);
  const refresh = dom.window.document.querySelector<HTMLButtonElement>('#refresh-ratings');
  refresh?.click();
  await new Promise(setImmediate);
  assert.match(dom.window.document.querySelector('#status')?.textContent || '', /Some ratings are unavailable/);
  assert.match(dom.window.document.querySelector('#rating-summary')?.textContent || '', /1 helpful/);
  assert.equal(refresh?.disabled, false);
  partialRatings = false;
  refresh?.click();
  await new Promise(setImmediate);
  assert.equal(dom.window.document.querySelector('#status')?.textContent, 'Ratings updated.');
  const preserve = dom.window.document.querySelector<HTMLButtonElement>('#preserve-ipfs');
  assert.equal(dom.window.document.querySelector<HTMLElement>('#ipfs-preservation')?.hidden, false);
  assert.equal(preserve?.closest('details'), null);
  assert.deepEqual(permissionRequests, [], 'Reading never requests host access');
  assert.equal(calls.some(call => call.action === 'CONTRIBUTE'), false);
  assert.equal(preserve?.textContent, 'Keep available');
  preserve?.click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CONTRIBUTE').length, 1);
  assert.match(dom.window.document.querySelector('#ipfs-status')?.textContent || '', /peers could not be reached.*local copy is still available/);
  assert.match(dom.window.document.querySelector('#article')?.textContent || '', /A readable copy/);
  assert.equal(dom.window.document.querySelector('#ipfs-setup'), null, 'Sharing has no desktop setup instructions');
  assert.equal(preserve?.disabled, false);
  meshAvailable = true;
  preserve?.click();
  await new Promise(setImmediate);
  assert.equal(preserve?.textContent, 'Retry sharing');
  assert.equal(preserve?.disabled, false);
  assert.match(dom.window.document.querySelector('#ipfs-status')?.textContent || '', /Kept in this browser/);
  assert.match(dom.window.document.querySelector('#ipfs-status')?.textContent || '', /Listing not published/);
  listingAccepted = true;
  preserve?.click();
  await new Promise(setImmediate);
  const link = dom.window.document.querySelector<HTMLAnchorElement>('#ipfs-link');
  assert.equal(link?.href, 'ipfs://bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m');
  assert.match(dom.window.document.querySelector('#ipfs-status')?.textContent || '', /This browser keeps the copy and contributes while running/);
  assert.equal(preserve?.textContent, 'Kept available');
  assert.equal(dom.window.document.querySelector('#copy-label')?.textContent, 'Shared copy');
  assert.equal(preserve?.disabled, true);
  assert.match(dom.window.document.querySelector('#ipfs-status')?.textContent || '', /Availability depends on connected peers/);
  assert.deepEqual(permissionRequests, [], 'Sharing never requests desktop or host permissions');
  assert.equal(dom.window.document.querySelector<HTMLElement>('#ipfs-result')?.hidden, false);
  assert.equal(dom.window.document.activeElement?.id, 'copy-ipfs');
  const mirrorCount = calls.filter(call => call.action === 'CONTRIBUTE').length;
  preserve?.click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CONTRIBUTE').length, mirrorCount, 'Successful preservation prevents duplicate clicks');

});
