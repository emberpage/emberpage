import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {createAggregatorServer} from '../aggregator/server.ts';
import {AggregatorStore} from '../aggregator/store.js';
import {listing} from './aggregator-fixture.js';

async function fixture(t,overrides={}){
  const store=new AggregatorStore(),item=await listing(),calls=[];
  const directory={async queryListings(){calls.push('listings');return [item];},async queryVotes(){calls.push('votes');return [];},...overrides};
  const server=createAggregatorServer({store,directory});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();});
  const refresh=options=>fetch(`${origin}/api/refresh`,{method:'POST',headers:{Origin:origin,'X-EmberPage-Action':'refresh',...options?.headers},body:options?.body});
  return {store,item,directory,server,origin,calls,refresh};
}

test('HTTP reads expose metadata only, do not query relay and omit removed body/request/check endpoints',async t=>{
  const {store,item,origin,calls}=await fixture(t);await store.commitMetadata([{...item,content:'SECRET BODY',privateKey:'SECRET KEY'}],[]);
  for(const path of ['/api/dashboard','/api/articles','/api/status']){
    const response=await fetch(origin+path);assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/SECRET|"content"|privateKey/);assert.equal(response.headers.get('access-control-allow-origin'),null);
  }
  assert.deepEqual(calls,[]);
  for(const path of ['/api/requests','/api/check?url='+item.urlHash,'/api/article/'+item.urlHash])assert.equal((await fetch(origin+path)).status,404);
  const snapshot=await (await fetch(origin+'/api/dashboard')).json();assert.equal(snapshot.network.indexing,false);assert.equal(snapshot.trends.length,7);assert.ok(!('requests' in snapshot));
});

test('refresh requires loopback Host, matching Origin, explicit header and bounded input',async t=>{
  const {origin,calls,refresh}=await fixture(t);
  const forged=await new Promise((resolve,reject)=>{const request=httpRequest(origin+'/api/dashboard',{headers:{Host:'attacker.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});assert.equal(forged,403);
  assert.equal((await refresh({headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await fetch(origin+'/api/refresh',{method:'POST',headers:{Origin:origin}})).status,403);
  assert.equal((await refresh({body:'x'.repeat(16385)})).status,413);assert.deepEqual(calls,[]);
  assert.equal((await refresh()).status,200);assert.deepEqual(calls,['listings','votes']);
});

test('concurrent refresh is rejected and failed query preserves the previous committed metadata',async t=>{
  let started,release;const gate=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>started=resolve);
  const {store,item,directory,origin,refresh}=await fixture(t,{async queryListings(){started();await gate;return [item];}});
  const old={...item,id:'1'.repeat(64),title:'Earlier metadata'};await store.commitMetadata([old],[]);
  const pending=refresh();await ready;assert.equal((await refresh()).status,409);
  assert.match(JSON.stringify(await (await fetch(origin+'/api/articles')).json()),/Earlier metadata/);release();assert.equal((await pending).status,200);
  const before=store.listArticles();directory.queryVotes=async()=>{throw new Error('SECRET failure detail');};assert.equal((await refresh()).status,502);assert.deepEqual(store.listArticles(),before);
  assert.doesNotMatch(JSON.stringify(await (await fetch(origin+'/api/dashboard')).json()),/SECRET/);
});
