import { Effect } from 'effect';
import { control, element, type Replies } from '../src/pages/ui.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

void test('Popup saves and finds only the current page; full archive requires Manage', async (t) => {
  const dom = new JSDOM(await readFile(new URL('../entrypoints/popup.html', import.meta.url), 'utf8'));
  const previousDocument = globalThis.document;
  const previousChrome = globalThis.chrome;
  const permissionRequests: chrome.permissions.Permissions[] = [];
  const calls: {action: string; tabId?: number; url?: string}[] = [];
  let records: Replies['LIBRARY'] = [];
  let ready: (tabs: Partial<chrome.tabs.Tab>[]) => void = () => { throw new Error('Tab fixture is not initialized.'); };
  const selectedTab = new Promise<Partial<chrome.tabs.Tab>[]>(resolve => { ready = resolve; });
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: {
    permissions: { request(request: chrome.permissions.Permissions) { permissionRequests.push(request); return Promise.resolve(true); } },
    storage: { local: { get() { return Promise.resolve({ accepted: true }); } } },
    tabs: { query() { return selectedTab; } },
    runtime: { sendMessage(message: {action: string; tabId?: number; url?: string}) {
      calls.push(message);
      if (message.action === 'CLEAR' || message.action === 'DELETE') records = [];
      return Promise.resolve({ ok: true, data: message.action === 'CATALOG' ? { entries: [] } : message.action === 'LIBRARY' ? records : [] });
    } }
  }});
  t.after(() => {
    globalThis.document = previousDocument;
    Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: previousChrome });
    dom.window.close();
  });
  await Effect.runPromise(Effect.tryPromise(() => import('../src/pages/popup.ts')));
  await new Promise(setImmediate);
  const capture = control('#capture', 'button');
  assert.equal(control('#previewMenu', 'button').disabled, true);
  assert.equal(capture.disabled, true, 'Preview must remain disabled while tab information is loading');
  assert.equal(control('#browse', 'button').disabled, true);
  assert.equal(calls.length, 0, 'No lookup starts before the selected URL is known');
  ready([{ id: 77, url: 'https://example.org/article', title: 'Selected article' }]);
  await new Promise(setImmediate);
  assert.equal(capture.disabled, false);
  assert.equal(element('#page-title').textContent, 'Selected article');
  capture.click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'SAVE_PAGE').length, 1);
  assert.equal(calls.at(-1)?.tabId, 77);
  control('#previewMenu', 'button').click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CAPTURE').length, 1, 'Preview remains an explicit separate action');
  assert.equal(calls.some(call => call.action === 'CATALOG'), false, 'Initialization only reads local data');
  assert.deepEqual(calls.filter(call => ['LOCAL_CATALOG', 'LIBRARY'].includes(call.action)).map(call => [call.action, call.url]), [['LOCAL_CATALOG', 'https://example.org/article'], ['LIBRARY', 'https://example.org/article']]);
  assert.equal(document.querySelector('[data-view]'), null, 'There is no unrelated browsing navigation');
  assert.deepEqual(permissionRequests, [], 'Private initialization, saving, and preview require no additional permissions');
  control('#browse', 'button').click();
  assert.deepEqual(permissionRequests, [], 'Browser discovery requires no desktop permissions');
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CATALOG').length, 1, 'Find saved copies starts an explicit current-page lookup');
  assert.equal(calls.at(-1)?.url, 'https://example.org/article');
  assert.equal(element('#read-view').hidden, false);
  control('#manage', 'button').click();
  await new Promise(setImmediate);
  assert.equal(calls.at(-1)?.action, 'LIBRARY');
  assert.equal(calls.at(-1)?.url, undefined, 'Manage alone opens the full archive');
  assert.equal(element('#library-title').textContent, 'Your archive');
  assert.equal(document.activeElement, control('#done', 'button'), 'Empty archive management focuses its visible Done action');
  control('#done', 'button').click();
  await new Promise(setImmediate);
  assert.equal(calls.at(-1)?.url, 'https://example.org/article');
  assert.equal(element('#library-title').textContent, 'Saved for this page');
  const options = control('#options', 'details');
  const summary = control('#options > summary', 'summary');
  assert.equal(options.open, false);
  assert.equal(document.activeElement, summary, 'Done returns focus to the visible Options summary, not a button inside closed options');

  options.open = true;
  const beforePause = calls.length;
  control('#pause-contribution', 'button').click();
  await new Promise(setImmediate);
  assert.deepEqual(calls.slice(beforePause).map(call => call.action), ['STOP_MESH'], 'Pausing only stops contribution; it never clears or deletes saved articles');
  assert.match(element('#status').textContent || '', /Contribution paused. Saved copies stay on this device./);
  assert.equal(options.open, false);
  assert.equal(document.activeElement, summary);
  assert.deepEqual(permissionRequests, [], 'Pausing contribution requires no host permissions');

  const record = { contentHash: 'fixture', url: 'https://example.org/article', title: 'Saved fixture', capturedAt: 1, source: 'writer', shared: false, pendingShare: false };
  records = [record];
  options.open = true;
  control('#manage', 'button').click();
  await new Promise(setImmediate);
  control('#library-list .item-actions button', 'button').click();
  await new Promise(setImmediate);
  assert.equal(document.activeElement, summary, 'Removing the last copy keeps focus on a visible control');
  assert.equal(options.open, false);

  records = [{contentHash: 'b'.repeat(64), url: '', title: 'Retained contribution · bbbbbbbb', capturedAt: 0, source: 'mesh', shared: true, pendingShare: false}];
  options.open = true;
  control('#manage', 'button').click();
  await new Promise(setImmediate);
  assert.equal(document.querySelector('#library-list button.item-main'), null, 'A retained pin without an article has no broken Open action');
  assert.match(element('#library-list').textContent || '', /free space/);
  assert.equal(document.querySelectorAll('#library-list button').length, 1, 'Only explicit removal is offered');
  control('#library-list .item-actions button', 'button').click();
  await new Promise(setImmediate);
  assert.equal(calls.at(-2)?.action, 'DELETE');
  assert.deepEqual(permissionRequests, []);

  records = [record];
  options.open = true;
  control('#manage', 'button').click();
  await new Promise(setImmediate);
  options.open = true;
  control('#clear', 'button').click();
  await new Promise(setImmediate);
  assert.equal(records.length, 0);
  assert.equal(options.open, false);
  assert.equal(document.activeElement, summary, 'Clear closes options and focuses its visible summary');
});
