import {Deferred, Effect, Schema} from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { inspectArticle } from '../src/extraction/inspect.ts';
import { createCaptureModule } from '../src/platform/capture.ts';
import { BoundaryError } from '../src/domain/errors.ts';
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
    getContexts: () => Promise.resolve([{}]),
    onStartup: {addListener() {}, removeListener() {}},
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
      return Promise.resolve({ id, url: article.url, active: true, windowId:1 });
    },
    sendMessage(this:void,_id:number,_request:{captureToken:string}) {
      return Promise.resolve({ ok: true, article, ...captureFlags });
    },
    query(this:void,_options:{active:boolean,windowId:number}) {return Promise.resolve([{id:1,url:article.url,active:true,windowId:1}]);},
    captureVisibleTab(this:void,_windowId:number,_options:{format:string}) {return Promise.resolve("data:image/png;base64,AAAA");},
    create(value:{url:string}) {
      opened.push(value); return Promise.resolve();
    }
  }
};
Object.defineProperty(globalThis,'chrome',{value:fakeChrome,writable:true,configurable:true});
const { startBackground } = await import('../src/extension.ts');
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
  assert.equal((await message('DRAFT', { id })).ok, false, 'Changed previews cannot be displayed either');
  assert.equal((await message('SAVE', { id })).ok, false);
  draft.title = article.title;
  assert.equal((await message('DRAFT', { id })).ok, true);
  const saved = await message('SAVE', { id });
  assert.equal(saved.ok, true);
  assert.equal(networkCalls, 0);
  assert.equal(opened.length, 1);
  const savedCopy=Schema.decodeUnknownSync(copySchema)(saved.data);
  const read = await message('READ', { id: savedCopy.contentHash });
  assert.equal(Schema.decodeUnknownSync(Schema.Struct({article:Schema.Struct({title:Schema.String})}))(read.data).article.title,article.title);
  await message('OPEN_COPY', { id: savedCopy.contentHash });
  assert.equal(opened.length, 2);
  assert.deepEqual((await message('LOCAL_CATALOG', {url:article.url})).data, []);
});
await test('page scripts cannot request screenshots outside an authorized capture session', async () => {
  const result = await message(
    'CAPTURE_IMAGE_PIXELS',
    { captureToken: 'invalid' },
    { ...sender, url: article.url, frameId: 0, tab: {id:1,index:0,pinned:false,highlighted:false,windowId:1,active:true,incognito:false,frozen:false,selected:true,discarded:false,autoDiscardable:true,groupId:-1,lastAccessed:0} }
  );
  assert.equal(result.ok, false);
  assert.match(result.error || '', /preparing this page/);
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

await test('authorized screenshot quota is confined to the active capture and its token expires on completion',async()=>{
  const originalSend=fakeChrome.tabs.sendMessage,originalPixels=fakeChrome.tabs.captureVisibleTab,originalNow=Date.now;
  let clock=originalNow(),shots=0,token='';
  const pageSender={...sender,url:article.url,frameId:0,tab:{id:1,index:0,pinned:false,highlighted:false,windowId:1,active:true,incognito:false,frozen:false,selected:true,discarded:false,autoDiscardable:true,groupId:-1,lastAccessed:0}};
  try{
    Date.now=()=>clock;
    fakeChrome.tabs.captureVisibleTab=()=>{shots++;clock+=550;return Promise.resolve('data:image/png;base64,AAAA');};
    fakeChrome.tabs.sendMessage=async(_id,request)=>{
      token=request.captureToken;
      for(let index=0;index<10;index++)assert.equal((await message('CAPTURE_IMAGE_PIXELS',{captureToken:token},pageSender)).ok,true);
      const over=await message('CAPTURE_IMAGE_PIXELS',{captureToken:token},pageSender);assert.equal(over.ok,false);assert.match(over.error || '',/preparing this page/);
      return originalSend(_id,request);
    };
    assert.equal((await message('CAPTURE',{tabId:1})).ok,true);
    assert.equal(shots,10);
    assert.equal((await message('CAPTURE_IMAGE_PIXELS',{captureToken:token},pageSender)).ok,false);
    assert.equal(shots,10);
  }finally{Date.now=originalNow;fakeChrome.tabs.sendMessage=originalSend;fakeChrome.tabs.captureVisibleTab=originalPixels;}
});

await test('navigation during a screenshot rejects the pixels rather than returning another page',async()=>{
  const originalSend=fakeChrome.tabs.sendMessage,originalQuery=fakeChrome.tabs.query,originalPixels=fakeChrome.tabs.captureVisibleTab,originalNow=Date.now;
  let navigated=false;const clock=originalNow()+10_000;
  const pageSender={...sender,url:article.url,frameId:0,tab:{id:1,index:0,pinned:false,highlighted:false,windowId:1,active:true,incognito:false,frozen:false,selected:true,discarded:false,autoDiscardable:true,groupId:-1,lastAccessed:0}};
  try{
    Date.now=()=>clock;
    fakeChrome.tabs.query=()=>Promise.resolve([{id:1,url:navigated?'https://example.org/another-page':article.url,active:true,windowId:1}]);
    fakeChrome.tabs.captureVisibleTab=()=>{navigated=true;return Promise.resolve('data:image/png;base64,AAAA');};
    fakeChrome.tabs.sendMessage=async(_id,request)=>{
      const pixels=await message('CAPTURE_IMAGE_PIXELS',{captureToken:request.captureToken},pageSender);
      assert.equal(pixels.ok,false);assert.match(pixels.error || '',/changed during image capture/);assert.equal(pixels.data,undefined);
      return originalSend(_id,request);
    };
    assert.equal((await message('CAPTURE',{tabId:1})).ok,true);
  }finally{Date.now=originalNow;fakeChrome.tabs.sendMessage=originalSend;fakeChrome.tabs.query=originalQuery;fakeChrome.tabs.captureVisibleTab=originalPixels;}
});

await test('discovery requires an explicit URL and scoped library omits other pages',async()=>{
  for(const action of ['CATALOG','LOCAL_CATALOG']){
    assert.equal((await message(action)).ok,false,'Missing URL must be rejected before discovery');
    assert.equal((await message(action,{url:'chrome://settings'})).ok,false,'Unsupported URL must be rejected');
  }
  assert.deepEqual((await message('LIBRARY',{url:'https://example.org/not-saved'})).data,[]);
  assert.equal((await message('LIBRARY',{url:'chrome://settings'})).ok,false);
  const all=Schema.decodeUnknownSync(Schema.Array(Schema.Unknown))((await message('LIBRARY')).data);
  assert.ok(all.length>0,'Full management library remains available');
});

await test('IPFS sharing requires an existing saved copy before starting the mesh',async()=>{
  const before=networkCalls;
    const missing=await message('CONTRIBUTE',{id:'missing'});
    assert.equal(missing.ok,false);assert.match(missing.error || '',/removed/);
    assert.equal(networkCalls,before);
});

await test('capture owns preview save/discard ordering across tabs and releases the guard after failure', async () => {
  const started = Deferred.makeUnsafe<void>();
  const gate = Deferred.makeUnsafe<void>();
  let saves = 0;
  let fail = false;
  const capture = createCaptureModule({
    saveArticle: () => Effect.gen(function* () {
      saves++;
      if (fail) return yield* BoundaryError.from(new Error('Fixture save failed'));
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(gate);
      return {contentHash: 'c'.repeat(64), shared: false};
    }),
    openPage: (page, id) => Effect.sync(() => {opened.push({url: fakeChrome.runtime.getURL(`${page}.html?id=${id}`)});}),
  });
  await Effect.runPromise(capture.captureEffect(1));
  const {id} = newestDraft();
  const saving = Effect.runPromise(capture.saveEffect(id));
  try {
    await Effect.runPromise(Deferred.await(started));
    await assert.rejects(Effect.runPromise(capture.discardEffect(id)), /current action/);
    await assert.rejects(Effect.runPromise(capture.saveEffect(id)), /current action/);
    assert.ok(session[`draft:${id}`]);
    assert.equal(saves, 1);
  } finally {
    await Effect.runPromise(Deferred.succeed(gate, undefined));
    await saving;
  }
  assert.equal(session[`draft:${id}`], undefined);
  await Effect.runPromise(capture.captureEffect(1));
  const next = newestDraft();
  fail = true;
  await assert.rejects(Effect.runPromise(capture.saveEffect(next.id)), /Fixture save failed/);
  assert.ok(session[`draft:${next.id}`], 'Failed saving keeps the sealed preview for recovery');
  await Effect.runPromise(capture.discardEffect(next.id));
  assert.equal(session[`draft:${next.id}`], undefined);
});
