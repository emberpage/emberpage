import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { inspectArticle } from '../src/inspect.js';
globalThis.indexedDB = indexedDB;
globalThis.document = new JSDOM('<!doctype html>').window.document;
let listener,
  networkCalls = 0;
const local = {},
  session = {},
  opened = [];
let captureFlags = {};
function storage(data) {
  return {
    async get(keys) {
      if (typeof keys === 'string') keys = [keys];
      return Object.fromEntries(keys.map((key) => [key, data[key]]));
    },
    async set(value) {
      Object.assign(data, value);
    },
    async remove(keys) {
      for (const key of typeof keys === 'string' ? [keys] : keys)
        delete data[key];
    }
  };
}
const article = {
  url: 'https://example.org/article',
  title: 'Fixture',
  byline: 'Author',
  capturedAt: Date.now(),
  content: '<p>A local fixture.</p>',
  textContent: 'A local fixture.'
};
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('Unexpected network request');
};
globalThis.chrome = {
  runtime: {
    id: 'test-extension',
    getURL: (path) => `chrome-extension://test-extension/${path}`,
    onMessage: {
      addListener(fn) {
        listener = fn;
      }
    },
    async sendMessage(message) {
      return { ok: true, data: inspectArticle(message.article) };
    }
  },
  storage: { local: storage(local), session: storage(session) },
  offscreen: {
    async hasDocument() {
      return true;
    }
  },
  scripting: { async executeScript() {} },
  tabs: {
    async get(id) {
      return { id, url: article.url, active: true };
    },
    async sendMessage() {
      return { ok: true, article, ...captureFlags };
    },
    async create(value) {
      opened.push(value);
    }
  }
};
const { startBackground } = await import('../src/background.ts');
assert.equal(listener, undefined, 'Importing workflows must not register listeners');
startBackground();
const sender = {
  id: chrome.runtime.id,
  url: chrome.runtime.getURL('popup.html')
};
const message = (action, fields = {}, from = sender) =>
  new Promise((resolve) =>
    listener({ target: 'background', action, ...fields }, from, resolve)
  );
test('only extension pages can authorize actions and consent precedes capture', async () => {
  assert.equal(
    (await message('CAPTURE', { tabId: 1 }, { ...sender, url: article.url }))
      .ok,
    false
  );
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, false);
  assert.equal((await message('ACCEPT')).ok, true);
});
test('sealed preview saves privately withoutnetwork and opening the copy is explicit', async () => {
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, true);
  const id = new URL(opened.at(-1).url).searchParams.get('id');
  session[`draft:${id}`].title = 'Modified';
  assert.equal((await message('SAVE', { id })).ok, false);
  session[`draft:${id}`].title = article.title;
  const saved = await message('SAVE', { id });
  assert.equal(saved.ok, true);
  assert.equal(networkCalls, 0);
  assert.equal(opened.length, 1);
  const read = await message('READ', { id: saved.data.contentHash });
  assert.equal(read.data.article.title, article.title);
  await message('OPEN_COPY', { id: saved.data.contentHash });
  assert.equal(opened.length, 2);
  assert.deepEqual((await message('LOCAL_CATALOG')).data, []);
});
test('page scripts cannot request screenshots outside an authorized capture session', async () => {
  const result = await message(
    'CAPTURE_IMAGE_PIXELS',
    { captureToken: 'invalid' },
    { ...sender, url: article.url, frameId: 0, tab: { id: 1 } }
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /preview/);
});

test('capture preserves sealed overflow state and requires explicit text-only save', async () => {
  captureFlags = {
    imageLimitExceeded: true,
    imageWarning: 'Choose text only.'
  };
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, true);
  const id = new URL(opened.at(-1).url).searchParams.get('id');
  assert.equal(session[`draft:${id}`].imageLimitExceeded, true);
  const blocked = await message('SAVE', { id });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /text only/);
  session[`draft:${id}`].imageLimitExceeded = false;
  assert.match((await message('SAVE', { id })).error, /preview changed/);
  session[`draft:${id}`].imageLimitExceeded = true;
  assert.equal((await message('SAVE', { id, textOnly: true })).ok, true);
  captureFlags = {};
});

test('runtime schemas reject malformed commands before opening pages or writing consent', async () => {
  const before = opened.length;
  assert.equal((await message('CAPTURE', { tabId: '1' })).ok, false);
  assert.equal((await message('SAVE', { id: 'missing', share: 'yes' })).ok, false);
  assert.equal((await message('RATE', { id: 'missing', value: 0 })).ok, false);
  assert.equal((await message('DELETE', { id: 'missing', source: 'unknown' })).ok, false);
  assert.equal(opened.length, before);
  assert.equal(networkCalls, 0);
});
