// Throwaway experiment: local IPFS sockets, real IPNS records, synthetic data.
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,verify,createPublicKey} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {strings} from '@helia/strings';
import {ipns} from '@helia/ipns';
import {CID} from 'multiformats/cid';
import {node} from './node.mjs';
import {encodeArticle,sha256} from '../../src/core/article.js';
import {filterCandidates} from '../../src/core/candidates.js';
import {JSDOM} from 'jsdom';
import {inspectArticle} from '../../src/inspect.js';
import {rankedArticles} from '../../aggregator/indexer.ts';
globalThis.document=new JSDOM('').window.document;
const now=Date.now(),checks=[],nodes=[], encoder=new TextEncoder();
function identity(){const pair=generateKeyPairSync('ed25519');return {...pair,key:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')}}
function signed(body,key){return {body,key:key.key,signature:sign(null,Buffer.from(JSON.stringify(body)),key.privateKey).toString('base64')}}
const maxFeedBytes=65536,maxEvents=100,maxEventBytes=8192;
function verifyFeed(envelope,expectedKey,minimumSequence=0){
 assert(encoder.encode(JSON.stringify(envelope)).length<=maxFeedBytes,'feed byte limit');
 assert.equal(envelope.key,expectedKey,'registered signer');
 assert(verify(null,Buffer.from(JSON.stringify(envelope.body)),createPublicKey({key:Buffer.from(envelope.key,'base64'),format:'der',type:'spki'}),Buffer.from(envelope.signature,'base64')),'signature');
 const body=envelope.body;
 assert.equal(body.format,'emberpage.feed.spike');assert(Number.isSafeInteger(body.sequence)&&body.sequence>=minimumSequence,'sequence rollback');
 assert(Number.isSafeInteger(body.updatedAt)&&body.updatedAt>now-86400000&&body.updatedAt<=now+60000,'stale feed');
 assert(Array.isArray(body.events)&&body.events.length<=maxEvents,'event count');
 const seen=new Set();return body.events.filter(event=>{
 assert(encoder.encode(JSON.stringify(event)).length<=maxEventBytes,'event byte limit');
 assert(/^[a-f0-9]{64}$/.test(event.id)&&/^[a-f0-9]{64}$/.test(event.urlHash)&&/^[a-f0-9]{64}$/.test(event.contentHash),'hash fields');
 assert(Number.isSafeInteger(event.createdAt)&&event.createdAt>now-7*86400000&&event.createdAt<=now+60000,'event time');
 assert(event.type==='listing'||event.type==='rating','event type');
 if(event.type==='listing'){CID.parse(event.cid);assert(Number.isSafeInteger(event.size)&&event.size>0&&event.size<=2097152,'article size');assert(typeof event.title==='string'&&event.title.length>0&&event.title.length<=500,'title');assert(typeof event.byline==='string'&&event.byline.length<=500,'byline');const u=new URL(event.url);assert(u.protocol==='https:'&&!u.username&&!u.password&&event.url.length<=4096,'url');}
 else assert(event.value===1||event.value===-1,'rating');
 if(seen.has(event.id))return false;seen.add(event.id);return true;
 }).map(event=>({...event,pubkey:expectedKey}));
}
async function check(name,action){const start=performance.now();await action();checks.push({name,outcome:'pass',durationMs:Math.round(performance.now()-start)});console.log('PASS',name)}
const a=await node(),aggregator=await node(),reader=await node();nodes.push(a,aggregator,reader);
let server;
try {
 await aggregator.libp2p.dial(a.libp2p.getMultiaddrs());await reader.libp2p.dial(aggregator.libp2p.getMultiaddrs());await new Promise(r=>setTimeout(r,1000));
 const owner=identity(),voter=identity(),aggregatorSigner=identity(),copies=[];
 for(const [title,content] of [['Synthetic technology article','Useful synthetic paragraph. '.repeat(90)],['Short excluded article','Too short.']]){
 const copy=await encodeArticle({url:`https://example.invalid/${copies.length}`,title,byline:'Synthetic author',capturedAt:now,content:`<p>${content}</p>`});const cid=await strings(a).add(new TextDecoder().decode(copy.bytes));copies.push({...copy,cid:cid.toString(),content});}
 const listings=await Promise.all(copies.map(async(copy,i)=>({type:'listing',id:await sha256(`listing-${i}`),cid:copy.cid,url:copy.article.url,title:copy.article.title,byline:copy.article.byline,urlHash:copy.urlHash,contentHash:copy.contentHash,blobHash:copy.blobHash,size:copy.size,createdAt:now-3600000})));
 const rating={type:'rating',id:await sha256('vote-1'),urlHash:copies[0].urlHash,contentHash:copies[0].contentHash,createdAt:now,value:1};
 const feed=signed({format:'emberpage.feed.spike',sequence:1,updatedAt:now,events:[...listings,listings[0]]},owner);
 const voteFeed=signed({format:'emberpage.feed.spike',sequence:1,updatedAt:now,events:[rating,rating]},voter);
 const feedCid=await strings(a).add(JSON.stringify(feed)),voteCid=await strings(a).add(JSON.stringify(voteFeed));
 const feedName=await ipns(a).publish('contributor',feedCid,{ttl:0,lifetime:3600000,upkeep:'none',signal:AbortSignal.timeout(10000)});
 const voteName=await ipns(a).publish('ratings',voteCid,{ttl:0,lifetime:3600000,upkeep:'none',signal:AbortSignal.timeout(10000)});
 const registry=[{name:feedName.publicKey,key:owner.key},{name:voteName.publicKey,key:voter.key}],accepted=[],polled=[];
 await check('Separate aggregator resolves two registered real IPNS names and fetches signed feeds over Bitswap',async()=>{
 for(const entry of registry){let cid;for await(const result of ipns(aggregator).resolve(entry.name,{nocache:true,signal:AbortSignal.timeout(10000)})){cid=CID.parse(new TextDecoder().decode(result.record.value).slice(6));}assert(cid);assert.equal(await aggregator.blockstore.has(cid),false);const json=await strings(aggregator).get(cid,{signal:AbortSignal.timeout(10000)});accepted.push(...verifyFeed(JSON.parse(json),entry.key));polled.push({name:entry.name.toString(),cid:cid.toString(),bytes:Buffer.byteLength(json)});}
 assert.equal(accepted.length,3);
 });
 let snapshot;
 await check('Aggregator deduplicates metadata, reuses existing ranking, and does not fetch article bodies',async()=>{
 const articles=rankedArticles(accepted.filter(e=>e.type==='listing'),accepted.filter(e=>e.type==='rating'),now);assert.equal(articles.length,2);assert.equal(articles[0].rating.upvotes,1);
 for(const copy of copies)assert.equal(await aggregator.blockstore.has(CID.parse(copy.cid)),false);
 snapshot=signed({format:'emberpage.popular.spike',generatedAt:now,feeds:registry.length,articles},aggregatorSigner);
 });
 const snapshotCid=await strings(aggregator).add(JSON.stringify(snapshot)),snapshotName=await ipns(aggregator).publish('popular',snapshotCid,{ttl:0,lifetime:3600000,upkeep:'none',signal:AbortSignal.timeout(10000)});
 await check('Independent reader resolves aggregator IPNS and fetches signed immutable popularity snapshot',async()=>{
 let found;for await(const result of ipns(reader).resolve(snapshotName.publicKey,{nocache:true,signal:AbortSignal.timeout(10000)}))found=CID.parse(new TextDecoder().decode(result.record.value).slice(6));assert.equal(found.toString(),snapshotCid.toString());assert.equal(await reader.blockstore.has(found),false);const received=JSON.parse(await strings(reader).get(found,{signal:AbortSignal.timeout(10000)}));assert(verify(null,Buffer.from(JSON.stringify(received.body)),aggregatorSigner.publicKey,Buffer.from(received.signature,'base64')));assert.deepEqual(received,snapshot);
 });
 await check('Client final full-body filtering excludes short article, beyond aggregator metadata ranking',async()=>{
 await reader.libp2p.dial(a.libp2p.getMultiaddrs());const supplied=[];for(const entry of snapshot.body.articles){const bytes=encoder.encode(await strings(reader).get(CID.parse(entry.cid),{signal:AbortSignal.timeout(10000)}));supplied.push({...entry,bytes});}
 const diagnostics={};const survivors=await filterCandidates(supplied,{now,diagnostics,inspect:inspectArticle});assert.equal(survivors.length,1);assert.equal(diagnostics.reasons.content,1);
 });
 await check('Signed payload tampering rejected',()=>{const bad=structuredClone(feed);bad.body.events[0].title='Poison';assert.throws(()=>verifyFeed(bad,owner.key),/signature/)});
 await check('Unregistered signer rejected',()=>assert.throws(()=>verifyFeed(feed,voter.key),/registered signer/));
 await check('Duplicate listing and rating IDs collapse',()=>{assert.equal(verifyFeed(feed,owner.key).length,2);assert.equal(verifyFeed(voteFeed,voter.key).length,1)});
 await check('Signed but frozen old feed rejected by freshness',()=>assert.throws(()=>verifyFeed(signed({...feed.body,updatedAt:now-86400001},owner),owner.key),/stale/));
 await check('Valid older feed sequence rejected after observing newer one',()=>assert.throws(()=>verifyFeed(feed,owner.key,2),/rollback/));
 await check('Oversized feed rejected before parsing events',()=>assert.throws(()=>verifyFeed(signed({...feed.body,padding:'x'.repeat(maxFeedBytes)},owner),owner.key),/byte limit/));
 await check('Excessive event count rejected',()=>assert.throws(()=>verifyFeed(signed({...feed.body,events:Array(101).fill(rating)},owner),owner.key),/event count/));
 await check('Malformed oversized article and future vote rejected',()=>{assert.throws(()=>verifyFeed(signed({...feed.body,events:[{...listings[0],size:2097153}]},owner),owner.key),/size/);assert.throws(()=>verifyFeed(signed({...feed.body,events:[{...rating,createdAt:now+60001}]},owner),owner.key),/time/)});
 await check('Stable contributor IPNS name updates to a newer signed feed',async()=>{const update=signed({...feed.body,sequence:2,events:listings.slice(0,1)},owner),cid=await strings(a).add(JSON.stringify(update));await ipns(a).publish('contributor',cid,{ttl:0,lifetime:3600000,upkeep:'none',signal:AbortSignal.timeout(10000)});let value;for await(const result of ipns(aggregator).resolve(feedName.publicKey,{nocache:true,signal:AbortSignal.timeout(10000)}))value=new TextDecoder().decode(result.record.value);assert.equal(value,`/ipfs/${cid}`);assert.equal(verifyFeed(JSON.parse(await strings(aggregator).get(cid)),owner.key,2).length,1)});
 await check('Optional HTTP client polls separate aggregator snapshot and health without article hosting',async()=>{server=createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/popular')res.end(JSON.stringify(snapshot));else if(req.url==='/health')res.end(JSON.stringify({feeds:registry.length,generatedAt:now,articleBodiesHosted:0}));else {res.statusCode=404;res.end('{}')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;assert.deepEqual(await (await fetch(`${base}/popular`)).json(),snapshot);assert.equal((await (await fetch(`${base}/health`)).json()).articleBodiesHosted,0);assert.equal((await fetch(`${base}/article/${copies[0].cid}`)).status,404)});
 const evidence={timestamp:new Date().toISOString(),runtime:process.version,network:'Three separate Helia nodes over localhost TCP/Noise/Yamux with private Kademlia protocol; no public bootstrap or HTTP block brokers',ipns:'Real signed IPNS records published and resolved through local libp2p DHT, not a pointer map simulation',versions:{helia:'7.1.16',ipns:'10.2.2'},limits:{maxFeedBytes,maxEvents,maxEventBytes,feedFreshnessMs:86400000},polled,snapshot:{cid:snapshotCid.toString(),name:snapshotName.publicKey.toString(),articles:snapshot.body.articles.length},checks,unverified:['Public DHT long-term durability (short-lived pointer discovery tested separately)','Browser extension transport and sleep lifecycle','Sybil-resistant popularity','Automatically discovering previously unknown feed names','Long-term retention and independent hosting']};await writeFile(new URL('./evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
} finally {if(server)await new Promise(r=>server.close(r));await Promise.all(nodes.map(n=>n.stop()));}
