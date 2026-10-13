import { meshRoutes } from './mesh-fixture.ts';
import type {ArticleCopy,RatingTarget} from '../src/domain/types.ts';
import type {Event,EventTemplate} from 'nostr-tools';
import test from 'node:test';
import { Effect, Schema } from 'effect';
import assert from 'node:assert/strict';
import { finalizeEvent, generateSecretKey, verifyEvent } from 'nostr-tools/pure';
import { installationIdentity } from '../src/platform/identity.ts';
import { EmberNetwork } from '../src/transport/network.ts';
import { NostrDirectory, LISTING_KIND, RATING_KIND, LISTING_TAG, RATING_TAG,
  validateListingEvent, validateVoteEvent, DISCOVERY_WINDOW_MS } from '../src/directory/nostr.ts';
import { BoundaryError } from '../src/domain/errors.ts';
import { encodeArticle } from '../src/domain/article.ts';

const secret = generateSecretKey();
const now = Date.now();
async function fixture() {
  return encodeArticle({ url: 'https://example.com/article', title: 'A complete article', byline: 'A writer',
    capturedAt: now, content: `<p>${'A carefully observed article contains enough visible text for a reader. '.repeat(25)}</p>` });
}
function listingEvent(copy:ArticleCopy, overrides:Record<string,unknown> = {}) {
  const value = { version: 2, url: copy.article.url, urlHash: copy.urlHash, contentHash: copy.contentHash,
    blobHash: copy.blobHash, size: copy.size, title: copy.article.title, byline: copy.article.byline,
    capturedAt: copy.article.capturedAt, routes: meshRoutes(), cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m', ...overrides };
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
function relay(handler:(frame:readonly unknown[],reply:(message:unknown)=>void,url:string)=>void, trace:Array<readonly unknown[]> = []) {
  const sockets:Socket[]=[];
  class Socket {
    readyState=0;
    onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
    constructor(readonly url:string){sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.onopen?.();});}
    send(raw:string){const frame=Schema.decodeUnknownSync(Schema.Array(Schema.Unknown))(JSON.parse(raw));trace.push(frame);if(frame[0]!=='CLOSE')queueMicrotask(()=>handler(frame,message=>this.onmessage?.({data:JSON.stringify(message)}),this.url));}
    close(){this.readyState=3;this.onclose?.();}
  }
  return {Socket,trace,sockets};
}
const unusedIpfs = {
  pauseEffect: () => Effect.fail(BoundaryError.from(new Error('Unexpected pause'))),
  forgetEffect: () => Effect.fail(BoundaryError.from(new Error('Unexpected forget'))),
  clearEffect: () => Effect.fail(BoundaryError.from(new Error('Unexpected clear'))),
  mirrorEffect: () => Effect.fail(BoundaryError.from(new Error('Unexpected pin'))),
  readEffect: () => Effect.fail(BoundaryError.from(new Error('Unexpected read')))
};

await test('sharing pins before publishing a metadata-only CID listing and retries without repinning', async () => {
  const copy = await fixture();
  const cid = 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m';
  let pins = 0;
  const network = relay((frame, reply) => {
    const event = signedFrame(frame);
    assert(verifyEvent(event));
    const value = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(JSON.parse(event.content));
    assert.equal(value.version, 2);
    assert.equal(value.cid, cid);
    assert.equal(Object.hasOwn(value, 'content'), false);
    reply(['OK', event.id, true, '']);
  });
  const mesh = new EmberNetwork({ipfs: {...unusedIpfs, mirrorEffect: () => Effect.sync(() => {pins++; return {cid, routes: meshRoutes(), uri: `ipfs://${cid}`, size: copy.size};})},
    WebSocket: network.Socket, identity: () => Promise.resolve(secret), now: () => now});
  const receipt = await Effect.runPromise(mesh.pinEffect(copy));
  assert.equal((await Effect.runPromise(mesh.publishListingEffect(copy, receipt))).cid, cid);
  assert.equal((await Effect.runPromise(mesh.publishListingEffect(copy, receipt))).blobHash, copy.blobHash);
  assert.equal(pins, 1);
  await assert.rejects(Effect.runPromise(mesh.publishListingEffect(copy, {...receipt, blobHash: 'f'.repeat(64)})), /receipt does not match/);
});

await test('a refused listing retry keeps the confirmed pin receipt without pinning again', async () => {
  const copy = await fixture();
  let pins = 0, refused = true;
  const transport = relay((frame, reply) => reply(['OK', signedFrame(frame).id, !refused, 'restricted: test refusal']));
  const mesh = new EmberNetwork({ipfs: {...unusedIpfs, mirrorEffect: () => Effect.sync(() => {
    pins++; return {routes: meshRoutes(), cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m', uri: 'ipfs://fixture', size: copy.size};
  })}, WebSocket: transport.Socket, identity: () => Promise.resolve(secret), now: () => now});
  const receipt = await Effect.runPromise(mesh.pinEffect(copy));
  await assert.rejects(Effect.runPromise(mesh.publishListingEffect(copy, receipt)), /refusal/);
  refused = false;
  assert.equal((await Effect.runPromise(mesh.publishListingEffect(copy, receipt))).blobHash, copy.blobHash);
  assert.equal(pins, 1);
});

await test('reading delegates to the IPFS adapter without using a signing key', async () => {
  const copy = await fixture();
  const entry = await validateListingEvent(listingEvent(copy)); assert(entry);
  const budget = {remainingBytes: copy.size};
  const mesh = new EmberNetwork({identity: () => {throw new Error('Read must not access identity');},
    ipfs: {...unusedIpfs, readEffect: (value, options) => Effect.sync(() => {
      assert.equal(value, entry); assert.equal(options?.budget, budget); return copy;
    })}});
  assert.equal(await Effect.runPromise(mesh.readArticleEffect(entry, {budget})), copy);
});

await test('signed listing validation rejects forgery, conflicting tags and invalid CIDs; optional fields remain inert', async () => {
  const copy = await fixture(); const event = listingEvent(copy, { ratingUpvotes: 10000, content: '<script>bad()</script>' });
  const listing = await validateListingEvent(event); assert(listing);
  assert.equal(listing.title, copy.article.title);
  assert.equal(Object.hasOwn(listing, 'ratingUpvotes'), false); assert.equal(Object.hasOwn(listing, 'content'), false);
  assert.equal(await validateListingEvent({ ...event, content: event.content.replace(copy.article.title, 'Forged title') }), null);
  assert.equal(await validateListingEvent(listingEvent(copy, { cid: 'https://evil.example' })), null);
  assert.equal(await validateListingEvent(finalizeEvent({ ...event, tags: [...event.tags, ['u', copy.urlHash]] }, secret)), null);
  assert.equal(await validateListingEvent(finalizeEvent({ ...event, created_at: Math.floor((now - DISCOVERY_WINDOW_MS - 1000) / 1000) }, secret), { now }), null);
  assert.equal(await validateListingEvent(listingEvent(copy, { version: 1 })), null);
});

await test('read-only discovery needs no identity, bounds results at 100 and closes its subscription', async () => {
  const copy = await fixture(); const event = listingEvent(copy); const network = relay((frame, reply) => {
    assert.equal(frame[0], 'REQ'); assert.equal(queryFrame(frame).limit, 100); assert.deepEqual(queryFrame(frame)['#t'], [LISTING_TAG]);
    for (let index = 0; index < 120; index++) reply(['EVENT', frame[1], event]);
    reply(['EOSE', frame[1]]);
  });
  const mesh = new EmberNetwork({ipfs: unusedIpfs, WebSocket: network.Socket, identity: () => { throw new Error('Read must not access signing key.'); } });
  assert.equal((await Effect.runPromise(mesh.queryListingsEffect())).records.length, 1);
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
  const {records: votes} = await directory.queryVotes([a, b]);
  assert.equal(votes.length, 1); assert.equal(votes[0]?.contentHash, a.contentHash);
});

await test('empty completed discovery differs from a refused or timed-out query', async () => {
  const empty = relay((frame, reply) => reply(['EOSE', frame[1]]));
  assert.deepEqual((await new NostrDirectory({ WebSocket: empty.Socket }).queryListings()).records, []);
  const blocked = relay((frame, reply) => reply(['CLOSED', frame[1], 'restricted: query denied']));
  await assert.rejects(new NostrDirectory({ WebSocket: blocked.Socket }).queryListings(), /query denied/);
  const silent = relay(() => {});
  await assert.rejects(new NostrDirectory({ WebSocket: silent.Socket, timeoutMs: 10 }).queryListings(), /directory took too long to respond/);
  assert.equal(silent.sockets[0]?.readyState, 3);
});

await test('Chrome identity rejects corruption, resets failed writes and coalesces successful persistence', async () => {
  const previous = globalThis.chrome;
  let stored: unknown = 'damaged';
  let failWrite = true, reads = 0, writes = 0;
  Object.defineProperty(globalThis, 'chrome', {configurable: true, writable: true, value: {
    storage: {local: {
      get(key: string) { reads++; return Promise.resolve({[key]: stored}); },
      set(value: Record<string, unknown>) {
        writes++;
        if (failWrite) return Promise.reject(new Error('Fixture storage write failed.'));
        stored = value.emberpageSigningKey;
        return Promise.resolve();
      },
    }},
  }});
  try {
    await assert.rejects(installationIdentity(), /identity is damaged/);
    assert.equal(writes, 0);
    stored = undefined;
    await assert.rejects(installationIdentity(), /storage write failed/);
    failWrite = false;
    const [first, second] = await Promise.all([installationIdentity(), installationIdentity()]);
    assert(first && second);
    assert.deepEqual(first, second);
    assert.equal(first.length, 32);
    assert.equal(stored, [...first].map(byte => byte.toString(16).padStart(2, '0')).join(''));
    assert.equal(reads, 3);
    assert.equal(writes, 2);
    assert.deepEqual(await installationIdentity(), first);
    assert.equal(reads, 3);
  } finally {
    Object.defineProperty(globalThis, 'chrome', {configurable: true, writable: true, value: previous});
  }
});

await test('listing field limits match the canonical article and ledger contract', async () => {
  const copy = await fixture();
  for (const extras of [{ title: 't'.repeat(501) }, { byline: 'b'.repeat(501) },
    { url: 'https://example.com/' + 'a'.repeat(4096) }]) {
    assert.equal(await validateListingEvent(listingEvent(copy, extras), { now }), null);
  }
  assert.ok(await validateListingEvent(listingEvent(copy, { title:'t'.repeat(500),byline:'b'.repeat(500) }),{now}));
});

await test('interrupting discovery closes the relay socket and subscription immediately', async () => {
  const transport = relay(() => {});
  const network = new EmberNetwork({ipfs: unusedIpfs, identity: () => Promise.resolve(secret), WebSocket: transport.Socket });
  const controller = new AbortController();
  const result = Effect.runPromise(network.queryListingsEffect(), { signal: controller.signal });
  while (!transport.trace.length) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(result);
  assert.equal(transport.sockets[0]?.readyState, 3);
  assert.ok(transport.trace.some(frame => frame[0] === 'CLOSE'));
});

await test('empty rating lookup owns its diagnostics without another relay request',async()=>{
  const transport=relay((frame,reply)=>{
    reply(['EVENT',frame[1],{invalid:true}]);
    reply(['EOSE',frame[1]]);
  });
  const directory=new NostrDirectory({WebSocket:transport.Socket,now:()=>now});
  const listings = await directory.queryListings();
  assert.deepEqual(listings.records,[]);
  assert.equal(listings.diagnostics.rejected,transport.sockets.length);
  const connections=transport.sockets.length;
  const votes = await directory.queryVotes([]);
  assert.deepEqual(votes.records,[]);
  assert.deepEqual(votes.diagnostics,{action:'ratings',received:0,accepted:0,rejected:0,duplicates:0,reasons:{invalid:0,target:0},observedAt:now});
  assert.equal(listings.diagnostics.action, 'listings');
  assert.equal(listings.diagnostics.rejected, transport.sockets.length);
  assert.equal(transport.sockets.length,connections);
});

await test('current URL listing queries include the normalized URL hash and reject foreign signed results',async()=>{
  const copy=await fixture();
  const foreign=await encodeArticle({...copy.article,url:'https://example.com/foreign'});
  const network=relay((frame,reply)=>{
    const filter=Schema.decodeUnknownSync(Schema.Struct({'#u':Schema.Array(Schema.String)}))(frame[2]);
    assert.deepEqual(filter['#u'],[copy.urlHash]);
    reply(['EVENT',frame[1],listingEvent(foreign)]);
    reply(['EVENT',frame[1],listingEvent(copy)]);
    reply(['EOSE',frame[1]]);
  });
  const mesh=new EmberNetwork({ipfs: unusedIpfs,WebSocket:network.Socket,identity:()=>{throw new Error('Discovery must not access identity');}});
  const found=await Effect.runPromise(mesh.queryListingsEffect(`${copy.article.url}?utm_source=test#section`));
  assert.deepEqual(found.records.map(entry=>entry.url),[copy.article.url]);
  assert.equal(network.sockets[0]?.readyState,3);
});

await test('explicit pin removal delegates only to the local mesh and preserves typed failures', async () => {
  const calls:string[] = [];
  const blobHash = 'a'.repeat(64);
  const network = new EmberNetwork({identity:()=>{throw new Error('Removal must not read signing identity');},ipfs:{...unusedIpfs,
    forgetEffect:(hash)=>Effect.sync(()=>{calls.push(hash);}),
    clearEffect:()=>Effect.sync(()=>{calls.push('clear');})
  }});
  await Effect.runPromise(network.forgetEffect(blobHash));
  await Effect.runPromise(network.clearPinsEffect());
  assert.deepEqual(calls,[blobHash,'clear']);
  await assert.rejects(Effect.runPromise(network.forgetEffect('invalid')),/Invalid article file hash/);
  assert.deepEqual(calls,[blobHash,'clear']);
  const failing = new EmberNetwork({identity:()=>Promise.resolve(secret),ipfs:unusedIpfs});
  await assert.rejects(Effect.runPromise(failing.forgetEffect(blobHash)),/Unexpected forget/);
  await assert.rejects(Effect.runPromise(failing.clearPinsEffect()),/Unexpected clear/);
});

await test('network preserves partial rating coverage with verified votes and clears it on healthy refresh', async () => {
  const copy = await fixture();
  const target = {urlHash: copy.urlHash, contentHash: copy.contentHash};
  const vote = voteEvent(target);
  let partial = true;
  let failingRelay: string | undefined;
  const transport = relay((frame, reply, url) => {
    failingRelay ??= url;
    if (partial && url === failingRelay) {reply(['CLOSED', frame[1], 'restricted: fixture']); return;}
    reply(['EVENT', frame[1], vote]);
    reply(['EOSE', frame[1]]);
  });
  const network = new EmberNetwork({ipfs: unusedIpfs, identity: () => Promise.resolve(secret), WebSocket: transport.Socket, now: () => now});
  const first = await Effect.runPromise(network.queryVotesEffect([target]));
  assert.equal(first.records.length, 1);
  assert.equal(first.records[0]?.id, vote.id);
  assert.match(first.warning || '', /ratings.*unavailable/);
  partial = false;
  const second = await Effect.runPromise(network.queryVotesEffect([target]));
  assert.equal(second.records.length, 1);
  assert.equal(second.warning, undefined);
  assert.match(first.warning || '', /ratings.*unavailable/, 'Later refresh cannot mutate prior coverage');
});
