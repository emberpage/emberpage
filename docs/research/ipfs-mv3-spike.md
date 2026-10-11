# IPFS in a separate MV3 extension: measured spike

2026-10-11. This is an isolated test extension in `spikes/ipfs-mv3`, not a change to MeshCache. It imports the browser spike's bundled Helia implementation into a Chrome offscreen document with the `WEB_RTC` reason. The manifest allows only the local experiment's WebSocket relay; there is no article gateway broker or public bootstrap.

## Result

The final run passed five sequential checks in actual Chrome for Testing with separate persistent browser profiles:

1. Publisher A imported and pinned a 600,000-byte synthetic binary file in offscreen IndexedDB.
2. Reader B retrieved the exact bytes through Bitswap from A, checked SHA-256, and explicitly pinned the copy.
3. Chrome DevTools stopped B's service worker.
4. With A's browser closed and B's control page closed, fresh C connected to B's offscreen node and retrieved the exact bytes. No B control message was sent between worker shutdown and C's retrieval.
5. After B's entire browser closed and reopened, its node identity, pin, and exact file bytes were retained.

[Final machine-readable log](ipfs-mv3-spike.json). This proves the offscreen transport can outlive a control page and deliberate service-worker shutdown. It does not prove behavior during computer sleep, extension updates, or public Internet discovery. Actual crash recovery was subsequently tested below. The fixture is a transport test; extraction and article rendering are not part of it.

One earlier repeated run failed while starting C because the local relay refused another reservation. Its 20 reservation slots accumulated across temporary profiles. [Retained failure log](ipfs-mv3-reservation-failure.json). The final run used a freshly started test relay with 256 slots, rather than suppressing the error or trying another transport. Production needs a deliberate relay-capacity and reservation-lifecycle policy; this spike does not implement it.

## Abrupt termination and revocation

The later [five-step lifecycle run](ipfs-mv3-lifecycle.json) used the hardened two-store node. It committed a 150,000-byte file privately and explicitly authorized serving, closed and recreated the offscreen document, then verified identity and exact bytes. The runner queried Chrome's process ID and verified its disposable profile path before sending `SIGKILL`. A fresh browser recovered the committed pin, serving policy, identity, and exact file. Revocation then survived another offscreen restart: public storage was empty while the private copy remained readable.

This is an actual process crash, not an operating-system power-loss or fsync guarantee. Interrupted promotion before the public consent commit is covered separately by [browser hardening](ipfs-browser-hardening.md). An earlier revocation hang is preserved in [the failed run](ipfs-mv3-lifecycle-revoke-failure.json); the corrected implementation passed the rerun.

## Reproduce

Install and build `spikes/ipfs-browser` using its report, then start its local server on ports 4328/4329. From the repository root:

```sh
node spikes/ipfs-mv3/drive.mjs
node spikes/ipfs-mv3/lifecycle.mjs
```

The runner copies the experimental browser bundle, creates disposable profiles, records results, closes the contexts, and removes those temporary profiles. The executable path currently selects the installed Chrome-for-Testing build on this host. The generated bundle is experimental and is not shipped in the production ZIP.

## Visible test drive

Codex computer use also drove the local browser spike's controls in a visible Chrome window: Start node, keyboard activation of Publish synthetic article, a second node with a separately named IndexedDB store, Fetch copy from the explicitly supplied peer address, and Pin copy. The reader displayed verified **513,156 bytes**, SHA-256 `2894d5846c920c7f5e4421c4cd5759ccf74e31ca09e4068ebe833ec09cd5acad`, then **Pinned in IndexedDB**. That earlier synthetic image fixture was not a valid decoded WebP, so this visible run proves byte transfer and pinning only. The separate browser experiment later verified an actual canvas-produced WebP. These visible nodes were separate tabs in one browser profile; the automated transport and MV3 runs above supply the stronger profile-isolation evidence.

## Implementation limits

The controller is intentionally tiny: runtime messages invoke the offscreen node's spike methods. The hardened node now has explicit serving consent, quotas, and startup reconciliation; the controller still has no production reader library or permission UX. The user explicitly starts every test action. It does not justify integrating a background server into the production extension yet.

[Chrome offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen) documents the WebRTC reason and the offscreen runtime-API restriction. [Browser spike](ipfs-browser-spike.md) records the actual Bitswap transport and browser persistence checks. [Architecture constraints](ipfs-architecture-spike.md) describe the remaining public discovery, privacy, quota, and availability gates.
