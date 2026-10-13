import test from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Schema } from 'effect';
import { BrowserMeshClient } from '../src/platform/mesh.ts';
import { encodeArticle, decodeArticle } from '../src/domain/article.ts';
import { meshRoutes } from './mesh-fixture.ts';
import { MAX_IPFS_DAG_OVERHEAD } from '../src/domain/cid.ts';

await test('mesh IPC preserves exact file bytes and reserves reader budgets before sending', async () => {
  const encoded = await encodeArticle({url: 'https://example.org/mesh-client', title: 'Fixture', byline: '',
    capturedAt: Date.now(), content: '<p>A private local fixture.</p>'});
  const copy = await decodeArticle(Uint8Array.from([0xef, 0xbb, 0xbf, ...encoded.bytes]));
  const requests: unknown[] = [];
  let badReply = false;
  const runtime = {
    getURL: (path: string) => `chrome-extension://fixture/${path}`,
    getContexts: () => Promise.resolve([{}]),
    sendMessage: (input: unknown) => {
      requests.push(input);
      const command = Schema.decodeUnknownSync(Schema.Struct({action: Schema.String}))(input);
      if (badReply) return Promise.resolve({ok: false, error: 'Offline fixture'});
      return Promise.resolve({ok: true, data: command.action === 'READ'
        ? new TextDecoder('utf-8', {ignoreBOM: true}).decode(copy.bytes) : true});
    },
  };
  Object.defineProperty(globalThis, 'chrome', {value: {runtime}, configurable: true});
  const mesh = new BrowserMeshClient();
  const listing = {...copy.article, id: 'fixture', pubkey: 'a'.repeat(64), createdAt: Date.now(),
    contentHash: copy.contentHash, urlHash: copy.urlHash, blobHash: copy.blobHash, size: copy.size,
    cid: 'fixture', routes: meshRoutes()};
  const budget = {remainingBytes: copy.size + MAX_IPFS_DAG_OVERHEAD};
  const read = await Effect.runPromise(mesh.readEffect(listing, {budget}));
  assert.deepEqual(read.bytes, copy.bytes);
  assert.equal(budget.remainingBytes, 0);
  await assert.rejects(Effect.runPromise(mesh.readEffect(listing, {budget})), /download limit/);
  assert.equal(requests.length, 1);
  badReply = true;
  await assert.rejects(Effect.runPromise(mesh.pauseEffect()), /Offline fixture/);
  assert.equal(requests.length, 2);
});

await test('interrupting a mesh request cancels the corresponding offscreen operation', async () => {
  const {promise: started, resolve: ready} = Promise.withResolvers<string>();
  const {promise: cancelled, resolve: canceled} = Promise.withResolvers<string>();
  const {promise: reply, resolve: finish} = Promise.withResolvers<unknown>();
  Object.defineProperty(globalThis, 'chrome', {configurable: true, value: {runtime: {
    getURL: (path: string) => `chrome-extension://fixture/${path}`,
    getContexts: () => Promise.resolve([{}]),
    sendMessage: (input: unknown) => {
      const request = Schema.decodeUnknownSync(Schema.Struct({action: Schema.String, requestId: Schema.String}))(input);
      if (request.action === 'CANCEL') {canceled(request.requestId); return Promise.resolve({ok: true, data: true});}
      ready(request.requestId);
      return reply;
    },
  }}});
  const controller = new AbortController();
  const mesh = new BrowserMeshClient();
  const pending = Effect.runPromise(mesh.pauseEffect(), {signal: controller.signal});
  const rejected = assert.rejects(pending);
  const requestId = await started;
  controller.abort();
  assert.equal(await cancelled, requestId);
  await rejected;
  finish({ok: true, data: true});
});

await test('mesh requests join pending offscreen creation even after Chrome reports its context', async () => {
  const previousChrome = globalThis.chrome;
  const {promise: creation, resolve: completeCreation} = Promise.withResolvers<void>();
  const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
  const {promise: observed, resolve: markObserved} = Promise.withResolvers<void>();
  let contexts = 0, creations = 0;
  const actions: string[] = [];
  Object.defineProperty(globalThis, 'chrome', {configurable: true, value: {
    runtime: {
      getURL: (path: string) => `chrome-extension://fixture/${path}`,
      getContexts: () => {
        contexts++;
        if (contexts > 1) {markObserved(); return Promise.resolve([{}]);}
        return Promise.resolve([]);
      },
      sendMessage: (input: unknown) => {
        const request = Schema.decodeUnknownSync(Schema.Struct({action: Schema.String}))(input);
        actions.push(request.action);
        return Promise.resolve({ok: true, data: true});
      },
    },
    offscreen: {createDocument: () => {creations++; markStarted(); return creation;}},
  }});
  const mesh = new BrowserMeshClient();
  const first = Effect.runPromise(mesh.pauseEffect());
  await started;
  const second = Effect.runPromise(mesh.clearEffect());
  try {
    await observed;
    await new Promise(setImmediate);
    assert.deepEqual(actions, [], 'Neither command may reach a still-loading document');
    assert.equal(creations, 1);
    const controller = new AbortController();
    const third = Effect.runPromise(mesh.forgetEffect('f'.repeat(64)), {signal: controller.signal});
    const canceled = assert.rejects(third);
    await new Promise(setImmediate);
    controller.abort();
    await canceled;
    assert.deepEqual(actions, [], 'Canceling a waiter cannot dispatch a mesh command or cancel another caller’s creation');
  } finally {
    completeCreation();
    await Promise.all([first, second]);
    Object.defineProperty(globalThis, 'chrome', {configurable: true, value: previousChrome});
  }
  assert.deepEqual(new Set(actions), new Set(['PAUSE', 'CLEAR']));
});

await test('failed offscreen creation releases its shared promise for a later explicit retry', async () => {
  const previousChrome = globalThis.chrome;
  const {promise: creation, reject: failCreation} = Promise.withResolvers<void>();
  const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
  let attempts = 0;
  const actions: string[] = [];
  Object.defineProperty(globalThis, 'chrome', {configurable: true, value: {
    runtime: {
      getURL: (path: string) => `chrome-extension://fixture/${path}`,
      getContexts: () => Promise.resolve([]),
      sendMessage: (input: unknown) => {
        actions.push(Schema.decodeUnknownSync(Schema.Struct({action: Schema.String}))(input).action);
        return Promise.resolve({ok: true, data: true});
      },
    },
    offscreen: {createDocument: () => {attempts++; markStarted(); return attempts === 1 ? creation : Promise.resolve();}},
  }});
  const mesh = new BrowserMeshClient();
  try {
    const first = assert.rejects(Effect.runPromise(mesh.pauseEffect()), /Creation failed/);
    await started;
    const second = assert.rejects(Effect.runPromise(mesh.clearEffect()), /Creation failed/);
    await new Promise(setImmediate);
    failCreation(new Error('Creation failed'));
    await Promise.all([first, second]);
    assert.equal(attempts, 1);
    assert.deepEqual(actions, []);
    await Effect.runPromise(mesh.pauseEffect());
    assert.equal(attempts, 2);
    assert.deepEqual(actions, ['PAUSE']);
  } finally {Object.defineProperty(globalThis, 'chrome', {configurable: true, value: previousChrome});}
});
