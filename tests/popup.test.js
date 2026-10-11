import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('Preview waits for the selected tab and never captures automatically', async (t) => {
  const dom = new JSDOM(await readFile(new URL('../entrypoints/popup.html', import.meta.url), 'utf8'));
  const previousDocument = globalThis.document;
  const previousChrome = globalThis.chrome;
  const calls = [];
  let ready;
  const selectedTab = new Promise(resolve => { ready = resolve; });
  globalThis.document = dom.window.document;
  globalThis.chrome = {
    storage: { local: { async get() { return { accepted: true }; } } },
    tabs: { query() { return selectedTab; } },
    runtime: { async sendMessage(message) { calls.push(message); return { ok: true, data: [] }; } }
  };
  t.after(() => {
    globalThis.document = previousDocument;
    globalThis.chrome = previousChrome;
    dom.window.close();
  });
  await import('../src/popup.js');
  await new Promise(setImmediate);
  const capture = document.querySelector('#capture');
  assert.equal(capture.disabled, true, 'Preview must remain disabled while tab information is loading');
  assert.deepEqual(calls.map(call => call.action), ['LOCAL_CATALOG']);
  ready([{ id: 77, url: 'https://example.org/article', title: 'Selected article' }]);
  await new Promise(setImmediate);
  assert.equal(capture.disabled, false);
  assert.equal(document.querySelector('#page-title').textContent, 'Selected article');
  capture.click();
  await new Promise(setImmediate);
  assert.equal(calls.filter(call => call.action === 'CAPTURE').length, 1);
  assert.equal(calls.at(-1).tabId, 77);
});
