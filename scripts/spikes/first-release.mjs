// One explicitly authorized synthetic publication; no production extension files are changed.
// LIVE_FIRST_RELEASE=1 node scripts/spikes/first-release.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

if (process.env.LIVE_FIRST_RELEASE !== '1') throw new Error('Live publication requires LIVE_FIRST_RELEASE=1.');
const temporary = await mkdtemp(join(tmpdir(), 'emberpage-first-release-'));
const journalPath = resolve('.emberpage/first-release-cleanup.json');
const resultPath = resolve('docs/research/first-release-live.json');
const results = { startedAt: new Date().toISOString(), runtime: 'Disposable Chrome MV3 extension page', operations: [] };
let context, author, reader, journal, journalOwned = false;
const browserSource = `
import {EmberNetwork,createBlossomAuthorization,PROVIDER} from './src/network.ts';
import {NostrDirectory,validateListingEvent} from './src/network/nostr.js';
import {encodeArticle} from './src/core/article.js';
import {filterCandidates} from './src/core/candidates.js';
import {inspectArticle} from './src/inspect.js';
import {generateSecretKey,finalizeEvent} from 'nostr-tools/pure';
let secret,copy,network;
window.prepare=async()=>{
 secret=generateSecretKey();
 const runId=crypto.randomUUID();
 const canvas=document.createElement('canvas'); canvas.width=320;canvas.height=160;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#263b32';ctx.fillRect(0,0,320,160);ctx.fillStyle='#ecf2dd';ctx.font='bold 24px sans-serif';ctx.fillText('Ember Page synthetic',24,85);
 const image=canvas.toDataURL('image/webp',.8);
 const prose='This is an explicitly published synthetic article for validating Ember Page transport. It contains original test prose and an original canvas illustration, with no copied publication. ';
 copy=await encodeArticle({url:'https://example.com/emberpage-first-release/'+runId,title:'Synthetic Ember Page verification '+runId,byline:'Ember Page test fixture',capturedAt:Date.now(),content:'<article><h1>Synthetic transport verification</h1><p>'+prose.repeat(30)+'</p><figure><img src="'+image+'" alt="Original synthetic illustration"></figure></article>'});
 network=new EmberNetwork({identity:async()=>secret});
 const publish=network.directory.publish.bind(network.directory);
 network.directory.publish=async event=>{await window.persistEvent({id:event.id,kind:event.kind});return publish(event);};
 return {runId,secretKey:[...secret],blobHash:copy.blobHash,contentHash:copy.contentHash,urlHash:copy.urlHash,size:copy.size};
};
window.upload=()=>network.upload(copy);
window.list=receipt=>network.publishListing(copy,receipt);
window.vote=()=>network.publishVote({urlHash:copy.urlHash,contentHash:copy.contentHash,value:1});
window.read=async listing=>{
 const fresh=new EmberNetwork({identity:async()=>{throw new Error('Reader requested a signing key');}});
 const fetched=await fresh.readArticle(listing,{budget:{remainingBytes:16*1024*1024}});
 const candidates=await filterCandidates([{...fetched,listedAt:listing.createdAt}],{inspect:inspectArticle});
 const parsed=document.createElement('div');parsed.innerHTML=candidates[0]?.article.content||'';
 return {size:fetched.size,blobHash:fetched.blobHash,contentHash:fetched.contentHash,eligible:candidates.length===1,images:parsed.querySelectorAll('img').length,allImagesInline:[...parsed.querySelectorAll('img')].every(img=>img.getAttribute('src').startsWith('data:image/webp;base64,'))};
};
window.discover=async(id,target)=>{
 const fresh=new EmberNetwork({identity:async()=>{throw new Error('Reader requested a signing key');}});
 const listings=await fresh.queryListings();const votes=await fresh.queryVotes([target]);
 return {listingPresent:listings.some(item=>item.id===id),validListings:listings.length,votes:votes.filter(item=>item.contentHash===target.contentHash).map(item=>({id:item.id,value:item.value}))};
};
window.exact=async id=>{
 const directory=new NostrDirectory();const events=await directory.exchange(['REQ',crypto.randomUUID(),{ids:[id],limit:1}],{limit:1});
 return events.length ? await validateListingEvent(events[0]) : null;
};
window.cleanup=async ids=>{
 const out={};
 const event=finalizeEvent({kind:5,created_at:Math.floor(Date.now()/1000),tags:ids.map(id=>['e',id]),content:'Remove my explicitly synthetic Ember Page verification events'},secret);
 await window.persistEvent({id:event.id,kind:5});
 if(ids.length){try{out.deletionAck=await network.directory.publish(event);}catch(error){out.deletionError=error.message;}}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(PROVIDER+'/'+copy.blobHash,{method:'DELETE',headers:{Authorization:createBlossomAuthorization(secret,{action:'delete',blobHash:copy.blobHash})},credentials:'omit',redirect:'error',signal:controller.signal});out.deleteStatus=response.status;}catch(error){out.deleteError=error.message;}finally{clearTimeout(timer);}
 return out;
};
window.checkRemoval=async(hash,ids)=>{
 const result={};const url='https://media.primal.net/uploads2/'+hash[0]+'/'+hash.slice(1,3)+'/'+hash.slice(3,5)+'/'+hash+'.json';
 for(const [name,address] of [['cdn',url],['canonical',PROVIDER+'/'+hash+'.json']]){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(address,{credentials:'omit',redirect:'manual',cache:'no-store',signal:controller.signal});result[name]={status:response.status,type:response.type};await response.body?.cancel();}catch(error){result[name]={error:error.message};}finally{clearTimeout(timer);}}
 const directory=new NostrDirectory();
 try{const events=await directory.exchange(['REQ',crypto.randomUUID(),{ids,limit:ids.length}],{limit:ids.length});result.relayRemaining=events.map(event=>event.id);}catch(error){result.relayError=error.message;}
 return result;
};
window.ready=true;
`;
async function operation(name, fn) {
 const started = Date.now();
 try { const data = await fn(); results.operations.push({ name, ok:true, elapsedMs:Date.now()-started, data }); console.log(name, JSON.stringify(data)); return data; }
 catch(error){results.operations.push({name,ok:false,elapsedMs:Date.now()-started,error:error.message});console.log(name,error.message);throw error;}
}
try {
 const extension=join(temporary,'extension');await mkdir(extension);
 await writeFile(join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Ember Page explicit synthetic verification',version:'0.0.1',host_permissions:['https://blossom.primal.net/*','https://media.primal.net/*'],content_security_policy:{extension_pages:"script-src 'self'; object-src 'self'; connect-src https://blossom.primal.net https://media.primal.net wss://relay.primal.net"},background:{service_worker:'background.js'}}));
 await writeFile(join(extension,'background.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
 await writeFile(join(extension,'test.html'),'<script src="test.js"></script>');
 await build({stdin:{contents:browserSource,resolveDir:resolve('.')},bundle:true,format:'iife',platform:'browser',outfile:join(extension,'test.js')});
 context=await chromium.launchPersistentContext(join(temporary,'profile'),{headless:true,channel:'chromium',executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--disable-extensions-except='+extension,'--load-extension='+extension]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const base=worker.url().split('/').slice(0,3).join('/');
 author=await context.newPage();await author.goto(base+'/test.html');await author.waitForFunction(()=>window.ready);
 const preparation=await author.evaluate(()=>window.prepare());
 journal={...preparation,createdAt:new Date().toISOString(),provider:'https://blossom.primal.net',relay:'wss://relay.primal.net',events:[]};
 await mkdir(resolve('.emberpage'),{recursive:true});
 await writeFile(journalPath,JSON.stringify(journal,null,2),{flag:'wx',mode:0o600});
 journalOwned=true;
 await author.exposeFunction('persistEvent',async event=>{journal.events.push(event);await writeFile(journalPath,JSON.stringify(journal,null,2),{mode:0o600});});
 const {secretKey,...publicPreparation}=preparation;results.fixture=publicPreparation;
 const receipt=await operation('upload',()=>author.evaluate(()=>window.upload()));
 const listing=await operation('listingAck',()=>author.evaluate(receipt=>window.list(receipt),receipt));
 reader=await context.newPage();await reader.goto(base+'/test.html');await reader.waitForFunction(()=>window.ready);
 const byId=await operation('freshExactListing',()=>reader.evaluate(id=>window.exact(id),listing.id));
 if(!byId)throw new Error('Acknowledged listing was not available by exact ID.');
 const body=await operation('freshReader',()=>reader.evaluate(listing=>window.read(listing),byId));
 if(!body.eligible||body.images!==1||!body.allImagesInline)throw new Error('Fresh reader article/image eligibility failed.');
 await operation('ratingAck',()=>author.evaluate(()=>window.vote()));
 await operation('indexedDiscovery',()=>reader.evaluate(({id,target})=>window.discover(id,target),{id:listing.id,target:listing}));
} catch(error){results.error=error.message;process.exitCode=1;}
finally {
 if(journalOwned&&author){
 const ids=journal.events.filter(event=>event.kind!==5).map(event=>event.id);
 try{await operation('cleanup',()=>author.evaluate(ids=>window.cleanup(ids),ids));}catch{}
 try{const removal=await operation('cleanupObserved',()=>author.evaluate(({hash,ids})=>window.checkRemoval(hash,ids),{hash:journal.blobHash,ids}));
 let canonicalGone=removal.canonical?.status===404;
 if(!canonicalGone){
 const response=await fetch('https://blossom.primal.net/'+journal.blobHash+'.json',{redirect:'manual',signal:AbortSignal.timeout(10000)});
 const hash=journal.blobHash,path='/uploads2/'+hash[0]+'/'+hash.slice(1,3)+'/'+hash.slice(3,5)+'/'+hash+'.json';
 const location=response.headers.get('location');await response.body?.cancel();
 const reconciliation={status:response.status,targetStatus:null,qualified:false};
 canonicalGone=response.status===404;
 if(location=== 'https://r2a.primal.net'+path || location==='https://media.primal.net'+path){
 reconciliation.qualified=true;const target=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(10000),cache:'no-store'});
 reconciliation.targetStatus=target.status;canonicalGone=target.status===404;await target.body?.cancel();}
 results.operations.push({name:'canonicalCleanupReconciliation',ok:true,data:reconciliation});
 }
 if(removal.cdn?.status===404&&canonicalGone&&!removal.relayError&&removal.relayRemaining?.length===0){await rm(journalPath);results.cleanupJournalRemoved=true;}else results.cleanupJournalRetained=true;
 }catch{results.cleanupJournalRetained=true;}
 }
 results.finishedAt=new Date().toISOString();
 await mkdir(resolve('docs/research'),{recursive:true});await writeFile(resultPath,JSON.stringify(results,null,2));
 await context?.close();await rm(temporary,{recursive:true,force:true});
 const lines=results.operations.map(item=>'- '+item.name+': '+(item.ok?'observed '+JSON.stringify(item.data):item.error));
 await writeFile(resolve('docs/research/first-release-live.md'),'# First-release synthetic transport verification\n\nDate: '+results.startedAt+'\n\nActual disposable MV3 extension origin using production EmberNetwork and plain JSON encode/decode. One original synthetic article; no copied publication. Fresh reader page has no author key.\n\n'+lines.join('\n')+'\n\n'+(results.error?'Run failed: '+results.error+'\n\n':'')+'Deletion observations concern this provider and relay at this time; they do not prove global erasure, retention duration, independent voters, or future service availability. A private recovery journal is retained whenever cleanup is unresolved.\n');
 console.log('Results:',resultPath);
}
