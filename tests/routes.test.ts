import { Schema } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSnapshotRoute, isSnapshotRoutes, isPublicPeerAddress, ReaderRoutes, PUBLIC_BOOTSTRAP_ROUTES } from '../src/domain/routes.ts';
import { meshRoutes } from './mesh-fixture.ts';
const peer = '12D3KooWMocyng496prG1FhQmEAxZARZBpBpdxG9qn4CrKJA5pab';
const relayPeer = '12D3KooWDtriqtMijHEy3hCQgs4a51riY4JrL9yWoH8RMX9owyMo';
const dynamic = `/dns4/51-255-28-214.k51qzi5uqu5dhoy596y39w8vyevr4rots6q0kqymc42er6b36dr3qe921n5izq.libp2p.direct/tcp/4001/tls/ws/p2p/${relayPeer}/p2p-circuit/webrtc/p2p/${peer}`;
await test('mesh routes accept bounded public relay paths with canonical peer identifiers',()=>{
  assert.equal(isSnapshotRoute(meshRoutes()[0]),true);
  assert.equal(isSnapshotRoute(dynamic),true);
  assert.equal(isSnapshotRoute(dynamic.replace('/webrtc','')),true);
  assert.equal(isSnapshotRoutes(meshRoutes()),true);
});
await test('mesh routes reject private destinations, arbitrary DNS and unbound transport syntax',()=>{
  for(const ip of ['0-0-0-0','10-1-2-3','127-0-0-1','100-64-1-1','169-254-1-1','172-16-1-1','192-168-1-1','198-18-1-1','203-0-113-1','224-1-1-1','256-1-1-1','051-255-28-214'])
    assert.equal(isSnapshotRoute(dynamic.replace('51-255-28-214',ip)),false,ip);
  for(const invalid of [
    dynamic.replace('.libp2p.direct','.attacker.example'),
    dynamic.replace('/dns4/','/dns6/'),
    dynamic.replace('/4001/','/0/'),
    dynamic.replace('/4001/','/65536/'),
    dynamic.replace('/4001/','/04001/'),
    dynamic.replace('/tls/ws/','/ws/'),
    dynamic.replace(`/p2p/${peer}`, '/p2p/not-a-peer'),
    dynamic + '/http',
    'http://127.0.0.1:5001/api/v0/cat',
    `/ip4/127.0.0.1/tcp/443/wss/p2p/${relayPeer}/p2p-circuit/p2p/${peer}`
  ]) assert.equal(isSnapshotRoute(invalid),false,invalid);
});
await test('signed announcements allow three unique routes; internal readers allow twelve',()=>{
  const routes = PUBLIC_BOOTSTRAP_ROUTES.flatMap(relay=>[
    `${relay}/p2p-circuit/p2p/${peer}`,
    `${relay}/p2p-circuit/webrtc/p2p/${peer}`,
    `${relay}/p2p-circuit/p2p/${relayPeer}`,
    `${relay}/p2p-circuit/webrtc/p2p/${relayPeer}`
  ]);
  assert.equal(isSnapshotRoutes([]),false);
  assert.equal(isSnapshotRoutes([dynamic,dynamic]),false);
  assert.equal(isSnapshotRoutes(routes.slice(0,3)),true);
  assert.equal(isSnapshotRoutes(routes.slice(0,4)),false);
  assert.equal(Schema.is(ReaderRoutes)(routes),true);
  assert.equal(Schema.is(ReaderRoutes)([...routes,dynamic]),false);
});

await test('connection gating permits known public direct providers without broad DNS access',()=>{
  assert.equal(isPublicPeerAddress(dynamic),true);
  assert.equal(isPublicPeerAddress(dynamic.slice(0,dynamic.indexOf('/p2p-circuit'))),true);
  assert.equal(isPublicPeerAddress('/dns4/bitswap.pinata.cloud/tcp/443/wss'),true);
  const transport = '/ip4/46.224.1.55/udp/4001/quic-v1/webtransport/certhash/uEiBWRbgKVT27T0oia1HCrOQEtZT8OgLQEecPfvmdxGuEBA';
  assert.equal(isPublicPeerAddress(transport),true);
  assert.equal(isPublicPeerAddress(transport.replace('46.224.1.55','169.254.1.1')),false);
  assert.equal(isPublicPeerAddress(transport.replace('uEiBWRbgKVT27T0oia1HCrOQEtZT8OgLQEecPfvmdxGuEBA','uInvalid')),false);
  assert.equal(isPublicPeerAddress(`/dns6/bitswap.filebase.io/tcp/443/wss/p2p/${peer}`),true);
  for(const blocked of ['/dns4/localhost/tcp/443/wss','/dns4/attacker.example/tcp/443/wss','/ip4/127.0.0.1/tcp/443/wss',dynamic.replace('51-255-28-214','10-1-2-3')])
    assert.equal(isPublicPeerAddress(blocked),false,blocked);
});
