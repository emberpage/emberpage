import { Schema } from 'effect';
import { base64url } from 'multiformats/bases/base64';
import { base58btc } from 'multiformats/bases/base58';
import { decode as decodeDigest } from 'multiformats/hashes/digest';

export const PUBLIC_BOOTSTRAP_ROUTES = Object.freeze([
  '/dns4/chic-1-b.bootstrap.ipni.io/tcp/4453/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dns4/lith-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dns4/sing-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
] as const);

const PeerId = Schema.String.check(Schema.makeFilter(value => {
  if (value.length > 128) return false;
  try {
    const bytes = base58btc.decode(`z${value}`);
    const digest = decodeDigest(bytes);
    return base58btc.encode(bytes).slice(1) === value &&
      ((digest.code === 0x12 && digest.size === 32) ||
        (digest.code === 0 && digest.size > 0 && digest.size <= 64));
  } catch { return false; }
}));
const isPeerId = Schema.is(PeerId);
const PublicIpv4 = Schema.String.check(Schema.makeFilter(value => {
  const octets = value.split('-').map(Number);
  const [a,b,c] = octets;
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255) ||
      octets.join('-') !== value || a === undefined || b === undefined || c === undefined) return false;
  return a > 0 && a < 224 && a !== 10 && a !== 127 &&
    !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) &&
    !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) &&
    !(a === 203 && b === 0 && c === 113);
}));
const isPublicIpv4 = Schema.is(PublicIpv4);

/** Only public WSS relay routes are dialable; the final peer is authenticated by libp2p. */
const SnapshotRoute = Schema.String.check(Schema.makeFilter(value => {
  if (value.length > 512) return false;
  const match = /^(.*)\/p2p-circuit(?:\/webrtc)?\/p2p\/([^/]+)$/.exec(value);
  const relay = match?.[1], peer = match?.[2];
  if (!relay || !peer || !isPeerId(peer)) return false;
  if (PUBLIC_BOOTSTRAP_ROUTES.some(address => address === relay)) return true;
  const dynamic = /^\/dns4\/([0-9]+-[0-9]+-[0-9]+-[0-9]+)\.(k[0-9a-z]{1,62})\.libp2p\.direct\/tcp\/([0-9]+)\/tls\/ws\/p2p\/([^/]+)$/.exec(relay);
  const ip = dynamic?.[1], port = dynamic?.[3], relayPeer = dynamic?.[4];
  return ip !== undefined && isPublicIpv4(ip) && port !== undefined &&
    String(Number(port)) === port && Number(port) >= 1 && Number(port) <= 65535 &&
    relayPeer !== undefined && isPeerId(relayPeer);
}));
export const isSnapshotRoute = Schema.is(SnapshotRoute);
const distinct = Schema.makeFilter((routes: readonly string[]) => new Set(routes).size === routes.length);
export const SnapshotRoutes = Schema.Array(SnapshotRoute).check(Schema.isMinLength(1), Schema.isMaxLength(3), distinct);
export const ReaderRoutes = Schema.Array(SnapshotRoute).check(Schema.isMinLength(1), Schema.isMaxLength(12), distinct);
export const isSnapshotRoutes = Schema.is(SnapshotRoutes);

const CertificateHash = Schema.String.check(Schema.makeFilter(value => {
  try {
    const bytes = base64url.decode(value);
    const hash = decodeDigest(bytes);
    return base64url.encode(bytes) === value && hash.code === 0x12 && hash.size === 32;
  } catch { return false; }
}));
const isCertificateHash = Schema.is(CertificateHash);
const PUBLIC_RETRIEVAL_HOSTS = new Set([
  'bitswap.pinata.cloud', 'bitswap-v3.pinata.cloud', 'bitswap.filebase.io',
]);
const PublicPeerAddress = Schema.String.check(Schema.makeFilter(value => {
  if (value.length > 1024) return false;
  const circuit: boolean = isSnapshotRoute(value);
  if (circuit) return true;
  const peerSuffix = /\/p2p\/([^/]+)$/.exec(value);
  const peer = peerSuffix?.[1];
  if (peer !== undefined && !isPeerId(peer)) return false;
  const endpoint = peerSuffix ? value.slice(0,peerSuffix.index) : value;
  if (PUBLIC_BOOTSTRAP_ROUTES.some(address => address.slice(0,address.lastIndexOf('/p2p/')) === endpoint)) return true;
  const direct = /^\/dns4\/([0-9]+-[0-9]+-[0-9]+-[0-9]+)\.(k[0-9a-z]{1,62})\.libp2p\.direct\/tcp\/([0-9]+)\/tls\/ws$/.exec(endpoint);
  const ip = direct?.[1], port = direct?.[3];
  if (ip !== undefined && isPublicIpv4(ip) && port !== undefined &&
    String(Number(port)) === port && Number(port) >= 1 && Number(port) <= 65535) return true;
  const webtransport = /^\/ip4\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\/udp\/([0-9]+)\/quic-v1\/webtransport((?:\/certhash\/u[0-9A-Za-z_-]+){1,2})$/.exec(endpoint);
  const address = webtransport?.[1], udpPort = webtransport?.[2], certificates = webtransport?.[3];
  if (address !== undefined && isPublicIpv4(address.replaceAll('.','-')) && udpPort !== undefined &&
    String(Number(udpPort)) === udpPort && Number(udpPort) >= 1 && Number(udpPort) <= 65535 && certificates !== undefined &&
    certificates.split('/certhash/').slice(1).every(isCertificateHash)) return true;
  const provider = /^\/dns[46]\/([^/]+)\/tcp\/443\/wss$/.exec(endpoint)?.[1];
  return provider !== undefined && PUBLIC_RETRIEVAL_HOSTS.has(provider);
}));
/** Public transport addresses for bootstrap, relay and delegated provider connections. */
export const isPublicPeerAddress = Schema.is(PublicPeerAddress);
