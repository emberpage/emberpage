import type {ArticleCopy,RatingTarget} from '../src/types.ts';
import type {Event,EventTemplate} from 'nostr-tools';
import test from 'node:test';
import { Effect, Schema } from 'effect';
import assert from 'node:assert/strict';
import { finalizeEvent, generateSecretKey, verifyEvent } from 'nostr-tools/pure';
import { EmberNetwork, PROVIDER, createBlossomAuthorization } from '../src/network.ts';
import { NostrDirectory, LISTING_KIND, RATING_KIND, LISTING_TAG, RATING_TAG,
  validateListingEvent, validateVoteEvent, DISCOVERY_WINDOW_MS } from '../src/network/nostr.ts';
import { encodeArticle } from '../src/core/article.ts';

const secret = generateSecretKey();
const now = Date.now();
async function fixture() {
  return encodeArticle({ url: 'https://example.com/article', title: 'A complete article', byline: 'A writer',
    capturedAt: now, content: `<p>${'A carefully observed article contains enough visible text for a reader. '.repeat(25)}</p>` });
}
function listingEvent(copy:ArticleCopy, overrides:Record<string,unknown> = {}) {
  const value = { version: 1, url: copy.article.url, urlHash: copy.urlHash, contentHash: copy.contentHash,
    blobHash: copy.blobHash, size: copy.size, title: copy.article.title, byline: copy.article.byline,
    capturedAt: copy.article.capturedAt, provider: PROVIDER, ...overrides };
  return finalizeEvent({ kind: LISTING_KIND, created_at: Math.floor(now / 1000),
    tags: [['t', LISTING_TAG], ['u', copy.urlHash], ['x', copy.contentHash]], content: JSON.stringify(value) }, secret);
}
function voteEvent(target:RatingTarget, value = 1, overrides:Partial<EventTemplate> = {}) {
  return finalizeEvent({ kind: RATING_KIND, created_at: Math.floor(now / 1000),
    tags: [['t', RATING_TAG], ['u', target.urlHash], ['x', target.contentHash]],
    content: JSON.stringify({ version: 1, ...target, value }), ...overrides }, secret);
}
const eventSchema=Schema.Struct({id:Schema.String,pubkey:Schema.String,kind:Schema.Int,created_at:Schema.Int,sig:Schema.String,content:Schema.String,tags:Schema.Array(Schema.Array(Schema.String))});
function decodedEvent(input:unknown):Event {const value=Schema.decodeUnknownSync(eventSchema)(input);return {...value,tags:value.tags.map(tag=>[...tag])};}
function signedFrame(frame:readonly unknown[]) {return decodedEvent(frame[1]);}
function queryFrame(frame:readonly unknown[]) {return Schema.decodeUnknownSync(Schema.Struct({limit:Schema.Int,'#t':Schema.optionalKey(Schema.Array(Schema.String))}))(frame[2]);}
function relay(handler:(frame:readonly unknown[],reply:(message:unknown)=>void)=>void, trace:Array<readonly unknown[]> = []) {
  const sockets:Socket[]=[];
  class Socket {
    readyState=0;
    onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
    constructor(readonly url:string){sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.onopen?.();});}
    send(raw:string){const frame=Schema.decodeUnknownSync(Schema.Array(Schema.Unknown))(JSON.parse(raw));trace.push(frame);if(frame[0]!=='CLOSE')queueMicrotask(()=>handler(frame,message=>this.onmessage?.({data:JSON.stringify(message)})));}
    close(){this.readyState=3;this.onclose?.();}
  }
  return {Socket,trace,sockets};
}
function uploadResponse(copy:ArticleCopy) {
  return Response.json({ url: `${PROVIDER}/${copy.blobHash}.json`, sha256: copy.blobHash, size: copy.size, type: 'application/json', uploaded: Math.floor(now / 1000) });
}

await test('sharing uploads exact plain JSON before signing a metadata-only acknowledged listing', async () => {
  const copy = await fixture();
  const trace: string[] = [];
  const network = relay((frame, reply) => { trace.push('relay'); assert.equal(verifyEvent(signedFrame(frame)), true); reply(['OK', signedFrame(frame).id, true, '']); });
  const mesh = new EmberNetwork({ WebSocket: network.Socket, identity: () => Promise.resolve(secret), now: () => now,
    fetch: (url, options) => {
      assert(options);
      trace.push('upload'); assert.equal(url, `${PROVIDER}/upload`); assert.deepEqual(options.body, copy.bytes);
      assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
      const authorization = decodedEvent(JSON.parse(atob((new Headers(options.headers).get('Authorization') || '').slice(6))));
      assert.equal(verifyEvent(authorization), true);
      assert.ok(authorization.tags.some(tag => tag[0] === 'x' && tag[1] === copy.blobHash));
      return Promise.resolve(uploadResponse(copy));
    } });
  const listing = await mesh.publishArticle(copy);
  assert.deepEqual(trace, ['upload', 'relay']);
  assert.equal(listing.contentHash, copy.contentHash);
  assert.equal(Object.hasOwn(listing, 'content'), false);
  assert.equal(Object.hasOwn(Schema.decodeUnknownSync(Schema.Record(Schema.String,Schema.Unknown))(JSON.parse(signedFrame(network.trace[0] || []).content)), 'content'), false);
  assert.ok(network.sockets.every(socket => socket.readyState === 3));
});

await test('a failed listing can be retried with the upload receipt without uploading twice', async () => {
  const copy = await fixture(); let uploads = 0, publishes = 0;
  const network = relay((frame, reply) => { publishes++; reply(['OK', signedFrame(frame).id, publishes > 1, 'restricted: testing partial failure']); });
  const mesh = new EmberNetwork({ WebSocket: network.Socket, identity: () => Promise.resolve(secret), now: () => now,
    fetch: () => { uploads++; return Promise.resolve(uploadResponse(copy)); } });
  const receipt = await mesh.upload(copy);
  await assert.rejects(mesh.publishListing(copy, receipt), /restricted: testing partial failure/);
  assert.equal((await mesh.publishListing(copy, receipt)).blobHash, copy.blobHash);
  assert.equal(uploads, 1); assert.equal(publishes, 2);
  await assert.rejects(mesh.publishListing(copy, { ...receipt, blobHash: 'f'.repeat(64) }), /receipt does not match/);
  assert.equal(publishes, 2);
});

await test('provider receipts must match exact file hash, byte size, MIME and configured host', async () => {
  const copy = await fixture();
  for (const change of [{ sha256: 'f'.repeat(64) }, { size: copy.size + 1 }, { type: 'text/html' }, { url: `https://untrusted.example/${copy.blobHash}.json` }]) {
    const mesh = new EmberNetwork({ identity: () => Promise.resolve(secret), fetch: async () => {
      const receipt = Schema.decodeUnknownSync(Schema.Record(Schema.String,Schema.Unknown))(await uploadResponse(copy).json()); return Response.json({ ...receipt, ...change });
    } });
    await assert.rejects(mesh.upload(copy), /receipt does not match/);
  }
});

await test('reader uses only the qualified CDN path, verifies file bytes and binds all listing metadata', async () => {
  const copy = await fixture();
  const listing = await validateListingEvent(listingEvent(copy)); assert(listing);
  const budget = { remainingBytes: copy.size * 2 };
  const mesh = new EmberNetwork({ fetch: (url, options) => {
      assert(options);
    assert.equal(url, `https://media.primal.net/uploads2/${copy.blobHash[0]}/${copy.blobHash.slice(1, 3)}/${copy.blobHash.slice(3, 5)}/${copy.blobHash}.json`);
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); return Promise.resolve(new Response(new Uint8Array(copy.bytes)));
  } });
  assert.deepEqual((await mesh.readArticle(listing, { budget })).article, copy.article);
  assert.equal(budget.remainingBytes, copy.size);
  await assert.rejects(mesh.readArticle({ ...listing, title: 'A forged title' }), /metadata does not match/);
  await assert.rejects(mesh.readArticle({ ...listing, contentHash: 'f'.repeat(64) }), /file does not match/);
});

await test('reader rejects corrupt bytes before parsing and refuses provider or budget violations before fetching', async () => {
  const copy = await fixture(); const listing = await validateListingEvent(listingEvent(copy)); assert(listing);
  let calls = 0;
  const mesh = new EmberNetwork({ fetch: () => { calls++; const bytes = copy.bytes.slice(); bytes[0] = (bytes[0] || 0) ^ 1; return Promise.resolve(new Response(bytes)); } });
  await assert.rejects(mesh.readArticle(listing), /hash|integrity/i);
  await assert.rejects(mesh.readArticle({ ...listing, provider: 'https://untrusted.example' }), /Invalid article file reference/);
  await assert.rejects(mesh.readArticle(listing, { budget: { remainingBytes: listing.size - 1 } }), /search reached its download limit/);
  assert.equal(calls, 1);
});

await test('streamed response limits apply even without a trustworthy Content-Length', async () => {
  const copy = await fixture(); const listing = await validateListingEvent(listingEvent(copy)); assert(listing);
  let cancelled = false;
  const mesh = new EmberNetwork({ fetch: () => Promise.resolve(new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(listing.size + 1)); },
    cancel() { cancelled = true; },
  }))) });
  await assert.rejects(mesh.readArticle(listing), /response exceeds the file limit/);
  assert.equal(cancelled, true);
});

await test('auth tokens are explicitly Primal standard Base64 with action/hash/domain/expiry binding', () => {
  const header = createBlossomAuthorization(secret, { action: 'delete', blobHash: 'a'.repeat(64), now });
  const event = decodedEvent(JSON.parse(atob(header.slice(6))));
  assert.equal(verifyEvent(event), true);
  assert.equal(event.kind, 24242);
  assert.deepEqual(event.tags.slice(0, 3), [['t', 'delete'], ['x', 'a'.repeat(64)], ['server', 'blossom.primal.net']]);
  assert.ok(Number(event.tags[3]?.[1]) > now / 1000);
  assert.throws(() => createBlossomAuthorization(secret, { action: 'list', blobHash: 'a'.repeat(64) }), /Invalid blob authorization/);
});

await test('signed listing validation rejects forgery, conflicting tags and provider mismatches; optional fields remain inert', async () => {
  const copy = await fixture(); const event = listingEvent(copy, { ratingUpvotes: 10000, content: '<script>bad()</script>' });
  const listing = await validateListingEvent(event); assert(listing);
  assert.equal(listing.title, copy.article.title);
  assert.equal(Object.hasOwn(listing, 'ratingUpvotes'), false); assert.equal(Object.hasOwn(listing, 'content'), false);
  assert.equal(await validateListingEvent({ ...event, content: event.content.replace(copy.article.title, 'Forged title') }), null);
  assert.equal(await validateListingEvent(listingEvent(copy, { provider: 'https://evil.example' })), null);
  assert.equal(await validateListingEvent(finalizeEvent({ ...event, tags: [...event.tags, ['u', copy.urlHash]] }, secret)), null);
  assert.equal(await validateListingEvent(finalizeEvent({ ...event, created_at: Math.floor((now - DISCOVERY_WINDOW_MS - 1000) / 1000) }, secret), { now }), null);
  assert.equal(await validateListingEvent(listingEvent(copy, { version: 2 })), null);
});

await test('read-only discovery needs no identity, bounds results at 100 and closes its subscription', async () => {
  const copy = await fixture(); const event = listingEvent(copy); const network = relay((frame, reply) => {
    assert.equal(frame[0], 'REQ'); assert.equal(queryFrame(frame).limit, 100); assert.deepEqual(queryFrame(frame)['#t'], [LISTING_TAG]);
    for (let index = 0; index < 120; index++) reply(['EVENT', frame[1], event]);
    reply(['EOSE', frame[1]]);
  });
  const mesh = new EmberNetwork({ WebSocket: network.Socket, identity: () => { throw new Error('Read must not access signing key.'); } });
  assert.equal((await mesh.queryListings()).length, 1);
  assert.ok(network.trace.some(frame => frame[0] === 'CLOSE'));
  assert.equal(network.sockets[0]?.readyState, 3);
});

await test('rating queries verify signed targets and never accept an unintended filter cross-product', async () => {
  const a = { urlHash: 'a'.repeat(64), contentHash: 'b'.repeat(64) };
  const b = { urlHash: 'c'.repeat(64), contentHash: 'd'.repeat(64) };
  const matching = voteEvent(a);
  const unrelated = voteEvent({ urlHash: a.urlHash, contentHash: b.contentHash });
  const forged = { ...matching, content: matching.content.replace('"value":1', '"value":-1') };
  assert.equal(validateVoteEvent(forged), null);
  const network = relay((frame, reply) => {
    assert.equal(queryFrame(frame).limit, 5000);
    for (const event of [matching, unrelated, forged, matching]) reply(['EVENT', frame[1], event]);
    reply(['EOSE', frame[1]]);
  });
  const directory = new NostrDirectory({ WebSocket: network.Socket });
  const votes = await directory.queryVotes([a, b]);
  assert.equal(votes.length, 1); assert.equal(votes[0]?.contentHash, a.contentHash);
});

await test('empty completed discovery differs from a refused or timed-out query', async () => {
  const empty = relay((frame, reply) => reply(['EOSE', frame[1]]));
  assert.deepEqual(await new NostrDirectory({ WebSocket: empty.Socket }).queryListings(), []);
  const blocked = relay((frame, reply) => reply(['CLOSED', frame[1], 'restricted: query denied']));
  await assert.rejects(new NostrDirectory({ WebSocket: blocked.Socket }).queryListings(), /query denied/);
  const silent = relay(() => {});
  await assert.rejects(new NostrDirectory({ WebSocket: silent.Socket, timeoutMs: 10 }).queryListings(), /directory took too long to respond/);
  assert.equal(silent.sockets[0]?.readyState, 3);
});

await test('default browser fetch retains its global receiver', () => {
  const previous = globalThis.fetch;
  globalThis.fetch = function () {
    assert.equal(this, globalThis);
    throw new Error('receiver verified');
  };
  try {
    const network = new EmberNetwork();
    assert.throws(() => network.fetch('https://example.com'), /receiver verified/);
  } finally { globalThis.fetch = previous; }
});

await test('listing field limits match the canonical article and ledger contract', async () => {
  const copy = await fixture();
  for (const extras of [{ title: 't'.repeat(501) }, { byline: 'b'.repeat(501) },
    { url: 'https://example.com/' + 'a'.repeat(4096) }]) {
    assert.equal(await validateListingEvent(listingEvent(copy, extras), { now }), null);
  }
  assert.ok(await validateListingEvent(listingEvent(copy, { title:'t'.repeat(500),byline:'b'.repeat(500) }),{now}));
});

await test('rejected HTTP responses abort the download even before reading its body', async () => {
  const copy = await fixture();
  const listing = await validateListingEvent(listingEvent(copy), { now }); assert(listing);
  let signal:AbortSignal|undefined;
  const network = new EmberNetwork({ now:()=>now, fetch: (_url,options)=>{
    signal=options?.signal ?? undefined;
    return Promise.resolve(new Response('too large',{headers:{'Content-Length':String(copy.size+1)}}));
  }});
  await assert.rejects(network.readArticle(listing), /file limit/);
  assert.equal(signal?.aborted,true);
});

await test('interrupting a streamed download cancels its reader and aborts the fetch scope', async () => {
  const copy = await fixture();
  const listing = await validateListingEvent(listingEvent(copy), { now }); assert(listing);
  let signal:AbortSignal|undefined,response:Response|undefined,cancelled=false;
  const {promise:reading,resolve:announceRead}=Promise.withResolvers<void>();
  const network = new EmberNetwork({ fetch: (_url, options) => {
    assert(options);
    signal = options?.signal ?? undefined;
    response = new Response(new ReadableStream({ pull() { announceRead(); }, cancel() { cancelled = true; } }));
    return Promise.resolve(response);
  } });
  const controller = new AbortController();
  const result = Effect.runPromise(network.readArticleEffect(listing), { signal: controller.signal });
  await reading;
  controller.abort();
  await assert.rejects(result);
  assert.equal(signal?.aborted, true);
  assert.equal(cancelled, true);
  assert.equal(response?.body?.locked, false);
});

await test('a timed-out upload aborts its pending HTTP request and preserves the user-facing error', async () => {
  const copy = await fixture();
  let signal:AbortSignal|undefined;
  const network = new EmberNetwork({ identity: () => Promise.resolve(secret), timeoutMs: 5, fetch: (_url, options) => {
    signal = options?.signal ?? undefined;
    const currentSignal=signal;assert(currentSignal);
    return new Promise<Response>((_resolve, reject) => currentSignal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  } });
  await assert.rejects(network.upload(copy), /Sharing took too long.*copy is saved on this device/);
  assert.equal(signal?.aborted, true);
});

await test('interrupting discovery closes the relay socket and subscription immediately', async () => {
  const transport = relay(() => {});
  const network = new EmberNetwork({ WebSocket: transport.Socket });
  const controller = new AbortController();
  const result = Effect.runPromise(network.queryListingsEffect(), { signal: controller.signal });
  while (!transport.trace.length) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(result);
  assert.equal(transport.sockets[0]?.readyState, 3);
  assert.ok(transport.trace.some(frame => frame[0] === 'CLOSE'));
});

await test('empty rating lookup clears previous listing diagnostics without another relay request',async()=>{
  const transport=relay((frame,reply)=>{
    reply(['EVENT',frame[1],{invalid:true}]);
    reply(['EOSE',frame[1]]);
  });
  const directory=new NostrDirectory({WebSocket:transport.Socket,now:()=>now});
  assert.deepEqual(await directory.queryListings(),[]);
  assert.equal(directory.lastQuery?.rejected,1);
  const connections=transport.sockets.length;
  assert.deepEqual(await directory.queryVotes([]),[]);
  assert.deepEqual(directory.lastQuery,{action:'ratings',received:0,accepted:0,rejected:0,duplicates:0,reasons:{invalid:0,target:0},observedAt:now});
  assert.equal(transport.sockets.length,connections);
});
