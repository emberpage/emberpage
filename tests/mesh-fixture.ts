import { Schema } from 'effect';
import { SnapshotRoutes } from '../src/domain/routes.ts';

/** Synthetic peer routes are never dialed by unit fixtures. */
export const meshRoutes = () => [...Schema.decodeUnknownSync(SnapshotRoutes)([
  '/dns4/chic-1-b.bootstrap.ipni.io/tcp/4453/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/webrtc/p2p/12D3KooWMocyng496prG1FhQmEAxZARZBpBpdxG9qn4CrKJA5pab'
])];
