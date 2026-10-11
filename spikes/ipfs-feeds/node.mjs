import { createHeliaLight } from "helia";
import { withBitswap } from "@helia/bitswap";
import { withLibp2pLight } from "@helia/libp2p";
import { tcp } from "@libp2p/tcp";
import { noise } from "@libp2p/noise";
import { yamux } from "@libp2p/yamux";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { keychain } from "@libp2p/keychain";
import { kadDHT } from "@libp2p/kad-dht";
export async function node({
  helia = {},
  bitswap = {},
  maxConnections = 8,
} = {}) {
  return withBitswap(
    withLibp2pLight(createHeliaLight(helia), {
      connectionManager: { maxConnections },
      addresses: { listen: ["/ip4/127.0.0.1/tcp/0"] },
      transports: [tcp()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: {
        ping: ping(),
        identify: identify(),
        keychain: keychain(),
        dht: kadDHT({
          clientMode: false,
          protocol: "/meshcache/spike/kad/1.0.0",
          peerInfoMapper: (p) => p,
          allowQueryWithZeroPeers: true,
        }),
      },
    }),
    bitswap,
  ).start();
}
