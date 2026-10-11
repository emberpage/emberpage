# Public network proof and remaining boundary

2026-10-11. The public relay path transferred exact synthetic article bytes. An independent machine on another network has **not** been verified. Production remains unchanged.

## What actually passed

`spikes/ipfs-public/external-check.mjs` created a disposable, bounded libp2p relay behind a Cloudflare Quick Tunnel. Three fresh Chrome profiles used the hardened IndexedDB-backed browser node. For this test, WebRTC was removed from the transport configuration: peer connections contained only the external WSS relay and circuit path, preventing a direct connection on this Mac from supplying the bytes.

Browser A shared a 48,073-byte synthetic JSON fixture. Browser B received the exact SHA-256 and explicitly preserved it. A then closed. Fresh browser C received the exact bytes from B through the external relay. HTTP gateways and HTTP block brokers were absent.

This proves public outbound TLS/circuit transfer and replacement of the original holder. Both endpoints were on this Mac; it does not establish independent NAT traversal, worldwide discovery, direct WebRTC across networks, or relay uptime.

The relay accepted at most eight connections and four reservations, with a 120-second reservation lifetime and 512 KiB / 60-second circuit limits. The tunnel, relay, UI server, and disposable browser profiles were stopped after testing. No router, DNS, NAS, account permissions, or production service was changed. Only synthetic content was offered.

## Public CID discovery from this Mac

A separate read-only native node joined the public TCP DHT, found providers for an official Kubo welcome CID, and retrieved its 309-byte DAG-PB root and 1,102-byte README file block from two external peers over Bitswap. SHA-256 matched both CIDs. Another official raw CID advertised a provider but timed out after 30 seconds. [Recorded public-provider results](ipfs-public-provider-results.json).

This is real external-peer discovery and outbound block retrieval, with no HTTP gateway, uploads, listener ports, or explicitly connected publisher. It does not qualify browser-only routing or establish inbound reachability for our browser holders.

## What failed or remains unqualified

- Two official bootstrap WSS peers accepted connections but refused circuit reservations. Two community relay addresses timed out or failed their WebSocket connection. These results do not qualify a free public relay for production.
- The independent [IPFS Check](https://github.com/ipfs/ipfs-check) backend at `https://ipfs-check-backend.ipfs.io/check` timed out. Its independent retrieval check remains failed in the evidence, even though the browser-to-browser checks passed.
- Quick Tunnel startup briefly returned DNS `ENOTFOUND`. The final test waited for tunnel registration and successful resolution through the configured DNS; no DNS override was installed.
- Public IPNS pointer resolution passed in the separate native DHT experiment. Pointer resolution alone does not prove that a browser can discover a CID provider and download its blocks.

Cloudflare describes [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) as a testing facility without an SLA. This temporary path is a diagnostic, not a proposed production dependency or fallback.

## Evidence and reproduction

- [Final external checks](ipfs-external-check.json): overall `ok: false` because independent backend retrieval failed; exact external circuit transfers are individually recorded.
- [Public relay probes](ipfs-public-relay-probe.json).
- [Earlier mixed-transport run](ipfs-external-mixed-transport.json): retained rather than presented as relay-only evidence.
- [Runner](../../spikes/ipfs-public/external-check.mjs), [relay probe](../../spikes/ipfs-public/probe.mjs).

Run from the repository root with the isolated browser dependencies installed and a local `spikes/ipfs-public/tools/cloudflared` binary obtained from the official Cloudflare release. The runner owns and tears down its test resources. Its nonzero exit currently preserves the unverified independent-backend gate.

## Adoption gate

Before changing MeshCache transport, qualify a maintained relay/routing arrangement and run the complete discover → download → preserve → original offline → fresh reader flow from independently connected machines. A relay reservation and a signed IPNS pointer are insufficient substitutes. No safe experiment can guarantee indefinite free hosting, anonymity, or future independent-holder uptime.
