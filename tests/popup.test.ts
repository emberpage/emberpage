import { Effect } from 'effect';
import { control, element } from '../src/pages/ui.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

void test('Save and preview wait for the selected tab; Popular loads only on request', async (t) => {
  const dom = new JSDOM(await readFile(new URL('../entrypoints/popup.html', import.meta.url), 'utf8'));
  const previousDocument = globalThis.document;
  const previousChrome = globalThis.chrome;
  const calls: {action: string; tabId?: number}[] = [];
  let ready: (tabs: Partial<chrome.tabs.Tab>[]) => void = () => { throw new Error('Tab fixture is not initialized.'); };
  const selectedTab = new Promise<Partial<chrome.tabs.Tab>[]>(resolve => { ready = resolve; });
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: {
    storage: { local: { get() { return Promise.resolve({ accepted: true }); } } },
    tabs: { query() { return selectedTab; } },
    runtime: { sendMessage(message: {action: string; tabId?: number}) { calls.push(message); return Promise.resolve({ ok: true, data: message.action === 'CATALOG' ? { entries: [] } : [] }); } }
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
  assert.deepEqual(calls.map(call => call.action), ['LOCAL_CATALOG']);
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
  control('[data-view=read]', 'button').click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CATALOG').length, 1, 'Selecting Popular starts discovery without a second button');
  assert.equal(element('#read-view').hidden, false);
});
