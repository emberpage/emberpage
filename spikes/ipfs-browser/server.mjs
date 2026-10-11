import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { identify } from '@libp2p/identify';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
const relay = await createLibp2p({ addresses: { listen: ['/ip4/127.0.0.1/tcp/4329/ws'] }, transports: [webSockets()], connectionEncrypters: [noise()], streamMuxers: [yamux()], services: { identify: identify(), relay: circuitRelayServer({ reservations: { maxReservations: 256 }, defaultDataLimit: 16 * 1024 * 1024, defaultDurationLimit: 120000 }) } });
const relayAddress = relay.getMultiaddrs()[0].toString();
await mkdir('dist', { recursive: true }); await writeFile('dist/relay.json', JSON.stringify({ relay: relayAddress }));
createServer(async (req, res) => {
  try {
    if (req.url === '/relay.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ relay: relayAddress })); return; }
    if (req.url === '/ui.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile('ui.js')); return; }
    if (req.url === '/browser.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile('dist/browser.js')); return; }
    res.setHeader('Content-Type', 'text/html'); res.end(await readFile('index.html'));
  } catch (err) { res.statusCode = 500; res.end(err.message); }
}).listen(4328, '127.0.0.1');
console.log(JSON.stringify({ page: 'http://127.0.0.1:4328', relay: relayAddress }));
