import {Schema} from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { inspectArticle } from '../src/inspect.ts';
globalThis.indexedDB = indexedDB;
globalThis.document = new JSDOM('<!doctype html>').window.document;
type Handler=(message:unknown,sender:chrome.runtime.MessageSender,respond:(response:unknown)=>void)=>unknown;
let listener:Handler|undefined;
let networkCalls=0;
const local:Record<string,unknown>={},session:Record<string,unknown>={},opened:Array<{url:string}>=[];
let captureFlags:{imageLimitExceeded?:boolean,imageWarning?:string}={};
const replySchema=Schema.Struct({ok:Schema.Boolean,data:Schema.optionalKey(Schema.Unknown),error:Schema.optionalKey(Schema.String)});
const copySchema=Schema.Struct({contentHash:Schema.String});
const draftSchema=Schema.Struct({url:Schema.String,title:Schema.mutableKey(Schema.String),byline:Schema.String,capturedAt:Schema.Number,content:Schema.String,textContent:Schema.String,imageLimitExceeded:Schema.mutableKey(Schema.optionalKey(Schema.Boolean)),imageWarning:Schema.optionalKey(Schema.String)});
function newestDraft() {
  const openedPage=opened.at(-1);assert(openedPage);const id=new URL(openedPage.url).searchParams.get('id');assert(id);
  const draft=session[`draft:${id}`];assert(Schema.is(draftSchema)(draft));return {id,draft};
}
function storage(data:Record<string,unknown>) {
  return {
    get(keys:string|string[]) {
      if (typeof keys === 'string') keys = [keys];
      return Promise.resolve(Object.fromEntries(keys.map((key) => [key, data[key]])));
    },
    set(value:Record<string,unknown>) {
      Object.assign(data, value); return Promise.resolve();
    },
    remove(keys:string|string[]) {
      for (const key of typeof keys === 'string' ? [keys] : keys)
        delete data[key];
      return Promise.resolve();
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
globalThis.fetch = () => {networkCalls++;return Promise.reject(new Error('Unexpected network request'));};
const fakeChrome = {
  runtime: {
    id: 'test-extension',
    getURL: (path:string) => `chrome-extension://test-extension/${path}`,
    onMessage: {
      addListener(fn:Handler) {
        listener = fn;
      }
    },
    sendMessage(message:unknown) {
      const input=Schema.decodeUnknownSync(Schema.Struct({article:Schema.Struct({content:Schema.String,url:Schema.String})}))(message);
      return Promise.resolve({ ok: true, data: inspectArticle(input.article) });
    }
  },
  storage: { local: storage(local), session: storage(session) },
  offscreen: {
    hasDocument() {
      return Promise.resolve(true);
    }
  },
  scripting: { executeScript: ():Promise<unknown[]> => Promise.resolve([]) },
  tabs: {
    get(id:number) {
      return Promise.resolve({ id, url: article.url, active: true });
    },
    sendMessage() {
      return Promise.resolve({ ok: true, article, ...captureFlags });
    },
    create(value:{url:string}) {
      opened.push(value); return Promise.resolve();
    }
  }
};
Object.defineProperty(globalThis,'chrome',{value:fakeChrome,writable:true,configurable:true});
const { startBackground } = await import('../src/background.ts');
assert.equal(listener, undefined, 'Importing workflows must not register listeners');
startBackground();
const sender = {
  id: fakeChrome.runtime.id,
  url: fakeChrome.runtime.getURL('popup.html')
};
const message = async (action:string, fields:Record<string,unknown> = {}, from:chrome.runtime.MessageSender = sender) => {
  assert(listener);
  const raw=await new Promise<unknown>(resolve => listener?.({target:'background',action,...fields},from,resolve));
  return Schema.decodeUnknownSync(replySchema)(raw);
};
await test('only extension pages can authorize actions and consent precedes capture', async () => {
  assert.equal(
    (await message('CAPTURE', { tabId: 1 }, { ...sender, url: article.url }))
      .ok,
    false
  );
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, false);
  assert.equal((await message('ACCEPT')).ok, true);
});
await test('sealed preview saves privately withoutnetwork and opening the copy is explicit', async () => {
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, true);
  const {id,draft}=newestDraft();
  draft.title = 'Modified';
  assert.equal((await message('SAVE', { id })).ok, false);
  draft.title = article.title;
  const saved = await message('SAVE', { id });
  assert.equal(saved.ok, true);
  assert.equal(networkCalls, 0);
  assert.equal(opened.length, 1);
  const savedCopy=Schema.decodeUnknownSync(copySchema)(saved.data);
  const read = await message('READ', { id: savedCopy.contentHash });
  assert.equal(Schema.decodeUnknownSync(Schema.Struct({article:Schema.Struct({title:Schema.String})}))(read.data).article.title,article.title);
  await message('OPEN_COPY', { id: savedCopy.contentHash });
  assert.equal(opened.length, 2);
  assert.deepEqual((await message('LOCAL_CATALOG')).data, []);
});
await test('page scripts cannot request screenshots outside an authorized capture session', async () => {
  const result = await message(
    'CAPTURE_IMAGE_PIXELS',
    { captureToken: 'invalid' },
    { ...sender, url: article.url, frameId: 0, tab: {id:1,index:0,pinned:false,highlighted:false,windowId:1,active:true,incognito:false,frozen:false,selected:true,discarded:false,autoDiscardable:true,groupId:-1,lastAccessed:0} }
  );
  assert.equal(result.ok, false);
  assert.match(result.error || '', /preview/);
});

await test('capture preserves sealed overflow state and requires explicit text-only save', async () => {
  captureFlags = {
    imageLimitExceeded: true,
    imageWarning: 'Choose text only.'
  };
  assert.equal((await message('CAPTURE', { tabId: 1 })).ok, true);
  const {id,draft}=newestDraft();
  assert.equal(draft.imageLimitExceeded, true);
  const blocked = await message('SAVE', { id });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error || '', /text only/);
  draft.imageLimitExceeded = false;
  assert.match((await message('SAVE', { id })).error || '', /preview changed/);
  draft.imageLimitExceeded = true;
  assert.equal((await message('SAVE', { id, textOnly: true })).ok, true);
  captureFlags = {};
});

await test('runtime schemas reject malformed commands before opening pages or writing consent', async () => {
  const before = opened.length;
  assert.equal((await message('CAPTURE', { tabId: '1' })).ok, false);
  assert.equal((await message('SAVE', { id: 'missing', share: 'yes' })).ok, false);
  assert.equal((await message('RATE', { id: 'missing', value: 0 })).ok, false);
  assert.equal((await message('DELETE', { id: 'missing', source: 'unknown' })).ok, false);
  assert.equal(opened.length, before);
  assert.equal(networkCalls, 0);
});


await test('same-tab capture reserves before injection and releases after failure', async () => {
  const original = fakeChrome.scripting.executeScript;
  const {promise:ready,resolve:started}=Promise.withResolvers<void>();
  const {promise:gate,resolve:release}=Promise.withResolvers<void>();
  fakeChrome.scripting.executeScript = async () => {started();await gate;return [];};
  const before = opened.length;
  try {
    const first = message('CAPTURE',{tabId:1});
    await ready;
    const second = await message('CAPTURE',{tabId:1});
    assert.equal(second.ok,false);
    assert.match(second.error || '',/already being prepared/);
    release();
    assert.equal((await first).ok,true);
    assert.equal(opened.length,before+1);
    fakeChrome.scripting.executeScript = ()=>Promise.reject(new Error('Fixture injection failure'));
    assert.equal((await message('CAPTURE',{tabId:1})).ok,false);
    fakeChrome.scripting.executeScript=original;
    assert.equal((await message('CAPTURE',{tabId:1})).ok,true);
  }finally{release();fakeChrome.scripting.executeScript=original;}
});
