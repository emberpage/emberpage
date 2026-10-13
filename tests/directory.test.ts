import { meshRoutes } from './mesh-fixture.ts';
import { Effect, Schema } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeEvent } from 'nostr-tools/pure';
import { hashUrl } from '../src/domain/article.ts';
import { NostrDirectory, RELAYS, LISTING_KIND, LISTING_TAG, validateListingEvent, validateVoteEvent } from '../src/directory/nostr.ts';
import type { NostrSocketConstructor } from '../src/directory/nostr.ts';

const cid = 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m';
const secret = new Uint8Array(32).fill(7);
async function listing(number = 1) {
  const url = `https://example.com/article/${number}`;
  const urlHash = await hashUrl(url);
  const contentHash = number.toString(16).padStart(64,'0');
  return finalizeEvent({kind:LISTING_KIND,created_at:Math.floor(Date.now()/1000),tags:[['t',LISTING_TAG],['u',urlHash],['x',contentHash]],content:JSON.stringify({version:2,url,urlHash,contentHash,blobHash:'d'.repeat(64),cid,routes:meshRoutes(),size:405,title:'An archived article',byline:'A writer',capturedAt:Date.now()})},secret);
}
function sockets(answer:(relay:string,frame:unknown[],reply:(frame:unknown[])=>void)=>void) {
  const opened:string[] = [];
  const closed:string[] = [];
  class Socket {
    readyState = 0;
    onopen: (()=>void)|null = null;
    onclose: (()=>void)|null = null;
    onerror: (()=>void)|null = null;
    onmessage: ((event:{data:string})=>void)|null = null;
    constructor(readonly relay:string) {
      opened.push(relay);
      queueMicrotask(()=>{this.readyState=1;this.onopen?.();});
    }
    send(data:string) {
      const frame:unknown = JSON.parse(data);
      assert.ok(Array.isArray(frame));
      if(frame[0] !== 'CLOSE') answer(this.relay,frame as unknown[],reply=>{if(this.readyState===1)this.onmessage?.({data:JSON.stringify(reply)});});
    }
    close() { this.readyState=3;closed.push(this.relay); }
  }
  return {Socket:Socket as NostrSocketConstructor,opened,closed};
}
await test('relay replication publishes identical signed bytes and distinguishes partial acknowledgement',()=>Effect.runPromise(Effect.promise(async()=>{
  const event = await listing();
  const network = sockets((relay,frame,reply)=>{
    assert.equal(JSON.stringify(frame),JSON.stringify(['EVENT',event]));
    reply(['OK',event.id,relay===RELAYS[0], 'restricted: test rejection']);
  });
  const receipt = await new NostrDirectory({WebSocket:network.Socket}).publish(event);
  assert.equal(receipt.accepted,true);
  assert.equal(receipt.relays.filter(relay=>relay.outcome==='success').length,1);
  assert.match(receipt.warning ?? '',/Public listing saved/);
  assert.deepEqual(network.opened,RELAYS);
  assert.equal(network.closed.length,3);
})));
await test('discovery unions independent relays, deduplicates signatures, and reports an unavailable relay',()=>Effect.runPromise(Effect.promise(async()=>{
  const first = await listing(), second = await listing(2);
  const network = sockets((relay,frame,reply)=>{
    if(relay===RELAYS[2]) {reply(['CLOSED',frame[1],'restricted: test rejection']);return;}
    reply(['EVENT',frame[1],first]);
    if(relay===RELAYS[1]) reply(['EVENT',frame[1],second]);
    reply(['EOSE',frame[1]]);
  });
  const directory = new NostrDirectory({WebSocket:network.Socket});
  const {records, diagnostics} = await directory.queryListings();
  assert.deepEqual(new Set(records.map(record=>record.id)),new Set([first.id,second.id]));
  assert.equal(diagnostics.duplicates,1);
  assert.equal(diagnostics.relays?.filter(relay=>relay.outcome==='failure').length,1);
  assert.equal(network.closed.length,3);
})));
await test('listing validation rejects old Blossom payloads and unsupported CID encodings',()=>Effect.runPromise(Effect.promise(async()=>{
  const event = await listing();
  assert.ok(await validateListingEvent(event));
  const content:unknown = JSON.parse(event.content);
  assert.ok(typeof content==='object' && content!==null);
  for(const change of [{version:1},{cid:'https://attacker.example/file'},{cid:'QmInvalid'},{cid:''},{routes:[]},{routes:['http://127.0.0.1:5001']},{routes:[...meshRoutes(),...meshRoutes()]}]) {
    const invalid=finalizeEvent({...event,content:JSON.stringify({...content,...change})},secret);
    assert.equal(await validateListingEvent(invalid),null);
  }
})));
await test('all rejected relays fail sharing and an aborted query closes every active socket',()=>Effect.runPromise(Effect.promise(async()=>{
  const event = await listing();
  const rejected = sockets((_relay,_frame,reply)=>reply(['OK',event.id,false,'test refusal']));
  await assert.rejects(new NostrDirectory({WebSocket:rejected.Socket}).publish(event),/test refusal/);
  const controller = new AbortController();
  const silent = sockets(()=>controller.abort());
  await assert.rejects(new NostrDirectory({WebSocket:silent.Socket}).queryListings(controller.signal),/canceled/);
  assert.equal(silent.closed.length,3);
})));

await test('concurrent listing queries keep records and relay diagnostics bound to their own URL', async () => {
  const first = await listing(1), second = await listing(2);
  const firstHash = await hashUrl('https://example.com/article/1');
  const secondHash = await hashUrl('https://example.com/article/2');
  const network = sockets((relay, frame, reply) => {
    const filter = Schema.decodeUnknownSync(Schema.Struct({'#u': Schema.Array(Schema.String)}))(frame[2]);
    const partial = filter['#u'][0] === firstHash;
    if (partial && relay === RELAYS[2]) {reply(['CLOSED', frame[1], 'restricted: test rejection']); return;}
    reply(['EVENT', frame[1], partial ? first : second]);
    reply(['EOSE', frame[1]]);
  });
  const directory = new NostrDirectory({WebSocket: network.Socket});
  const [partial, complete] = await Promise.all([
    directory.queryListings(undefined, firstHash), directory.queryListings(undefined, secondHash),
  ]);
  assert.deepEqual(partial.records.map(record => record.id), [first.id]);
  assert.deepEqual(complete.records.map(record => record.id), [second.id]);
  assert.equal(partial.diagnostics.relays?.filter(relay => relay.outcome === 'failure').length, 1);
  assert.equal(complete.diagnostics.relays?.filter(relay => relay.outcome === 'failure').length, 0);
  await directory.queryVotes([]);
  assert.equal(partial.diagnostics.action, 'listings');
  assert.equal(partial.diagnostics.relays?.filter(relay => relay.outcome === 'failure').length, 1);
  assert.equal(network.closed.length, 6);
});

await test('Directory publishes verified signed ratings and rejects invalid metadata before opening relays', async () => {
  const target = {urlHash: 'a'.repeat(64), contentHash: 'b'.repeat(64), value: -1};
  const network = sockets((_relay, frame, reply) => {
    assert.equal(frame[0], 'EVENT');
    const vote = validateVoteEvent(frame[1]);
    assert.ok(vote, 'The emitted event has valid tags, payload and signature');
    assert.equal(vote.urlHash, target.urlHash);
    assert.equal(vote.contentHash, target.contentHash);
    assert.equal(vote.value, target.value);
    reply(['OK', vote.id, true]);
  });
  const directory = new NostrDirectory({WebSocket: network.Socket});
  const vote = await Effect.runPromise(directory.publishVoteEffect(target, secret));
  assert.equal(vote.value, -1);
  assert.equal(network.opened.length, 3);
  const before = network.opened.length;
  await assert.rejects(Effect.runPromise(directory.publishVoteEffect({...target, value: 2}, secret)), /Invalid signed rating/);
  const source = await validateListingEvent(await listing());
  assert.ok(source);
  await assert.rejects(Effect.runPromise(directory.publishListingEffect({...source, title: ''}, secret)), /cannot be listed/);
  assert.equal(network.opened.length, before, 'Invalid publication opens no relays');
});

await test('listing publication serializes metadata only even when its caller supplies extra article fields', async () => {
  const metadata = await validateListingEvent(await listing());
  assert.ok(metadata);
  const network = sockets((_relay, frame, reply) => {
    const event = Schema.decodeUnknownSync(Schema.Struct({id: Schema.String, content: Schema.String}))(frame[1]);
    const payload = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(JSON.parse(event.content));
    assert.equal(Object.hasOwn(payload, 'content'), false);
    assert.equal(Object.hasOwn(payload, 'textContent'), false);
    reply(['OK', event.id, true]);
  });
  const directory = new NostrDirectory({WebSocket: network.Socket});
  const input = {...metadata, content: 'Private article body', textContent: 'Private extracted text'};
  const accepted = await Effect.runPromise(directory.publishListingEffect(input, secret));
  assert.equal(accepted.url, metadata.url);
  assert.equal(network.opened.length, 3);
});
