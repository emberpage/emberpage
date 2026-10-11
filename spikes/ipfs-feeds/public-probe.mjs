// Synthetic short-lived IPNS pointer on the public DHT; no article bytes.
import {createHeliaLight} from 'helia';
import {withLibp2pLight} from '@helia/libp2p';
import {withBitswap} from '@helia/bitswap';
import {tcp} from '@libp2p/tcp';
import {noise} from '@libp2p/noise';
import {yamux} from '@libp2p/yamux';
import {identify} from '@libp2p/identify';
import {keychain} from '@libp2p/keychain';
import {ping} from '@libp2p/ping';
import {kadDHT} from '@libp2p/kad-dht';
import {strings} from '@helia/strings';
import {ipns} from '@helia/ipns';
import {multiaddr} from '@multiformats/multiaddr';
import {generateKeyPairSync,sign} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const bootstraps=['/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN','/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'];
async function node(){return withBitswap(withLibp2pLight(createHeliaLight(),{addresses:{listen:['/ip4/0.0.0.0/tcp/0']},transports:[tcp()],connectionEncrypters:[noise()],streamMuxers:[yamux()],services:{identify:identify(),keychain:keychain(),ping:ping(),dht:kadDHT({clientMode:true})}})).start()}
const start=Date.now(),evidence={timestamp:new Date().toISOString(),bootstraps,protocol:'/ipfs/kad/1.0.0',httpRouting:false,explicitPublisherDial:false,recordLifetimeMs:60000,upkeep:'none',steps:[]};
const nodes=[];
async function step(name,action){const t=Date.now();try{const value=await action();evidence.steps.push({name,outcome:'pass',durationMs:Date.now()-t,value});console.log('PASS',name);return value}catch(e){evidence.steps.push({name,outcome:'fail',durationMs:Date.now()-t,error:e.message});console.log('FAIL',name,e.message);return null}}
try{
 const publisher=await node();nodes.push(publisher);
 await step('Publisher connects public bootstrap peers',async()=>{await Promise.all(bootstraps.map(address=>publisher.libp2p.dial(multiaddr(address),{signal:AbortSignal.timeout(12000)})));await new Promise(r=>setTimeout(r,1500));return {peers:publisher.libp2p.getPeers().length}});
 const pair=generateKeyPairSync('ed25519'),body={format:'emberpage.feed.spike',sequence:1,updatedAt:Date.now(),events:[],synthetic:true};const envelope={body,key:pair.publicKey.export({format:'der',type:'spki'}).toString('base64'),signature:sign(null,Buffer.from(JSON.stringify(body)),pair.privateKey).toString('base64')};
 const cid=await strings(publisher).add(JSON.stringify(envelope));evidence.cid=cid.toString();
 const published=await step('Publish real short-lived signed IPNS to public DHT',async()=>{const result=await ipns(publisher).publish('synthetic-feed',cid,{ttl:0,lifetime:60000,upkeep:'none',signal:AbortSignal.timeout(15000)});evidence.name=result.publicKey.toString();return result});
 if(published){const resolver=await node();nodes.push(resolver);await step('Fresh resolver connects bootstrap peers without publisher dial',async()=>{await Promise.all(bootstraps.map(address=>resolver.libp2p.dial(multiaddr(address),{signal:AbortSignal.timeout(12000)})));await new Promise(r=>setTimeout(r,1500));return {peers:resolver.libp2p.getPeers().length}});await step('Fresh resolver retrieves public DHT IPNS pointer',async()=>{let value;for await(const result of ipns(resolver).resolve(published.publicKey,{nocache:true,signal:AbortSignal.timeout(15000)}))value=new TextDecoder().decode(result.record.value);if(value!==`/ipfs/${cid}`)throw Error('Unexpected resolved value');return {value,publisherConnectedAtEnd:resolver.libp2p.getPeers().some(peer=>peer.toString()===publisher.libp2p.peerId.toString())}});}
}finally{await Promise.all(nodes.map(n=>n.stop()));evidence.durationMs=Date.now()-start;if(evidence.steps.some(step=>step.outcome==='fail'))process.exitCode=1;evidence.cleanup='Nodes stopped, in-memory keys and blocks discarded. Published synthetic pointer expires after 60 seconds; no global erasure guarantee.';await writeFile(new URL('./public-evidence.json',import.meta.url),JSON.stringify(evidence,(key,value)=>key==='publicKey'||key==='record'?undefined:value,2)+'\n')}
