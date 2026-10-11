# IPFS feeds: bounds, restart, stale state and optional client spike

2026-10-11. Isolated code in `spikes/ipfs-feeds`; no production extension change. Run `npm run spike:hardening --prefix spikes/ipfs-feeds` after its isolated install and the root project's existing dependencies. Synthetic data only; localhost TCP/Noise/Yamux, Bitswap and real IPNS over private Kademlia. The previous public IPNS discovery probe was not repeated.

## Result

The collector is a **separate Node process** with filesystem Helia block storage, filesystem datastore for pin/IPNS metadata, and atomic JSON application state. Actual process exits and fresh PIDs preserve the signing key, explicit feed registry, sequence/body-digest high-water marks, cached events, signed popularity snapshot and pinned metadata blocks. The optional HTTP client verifies a configured collector key, signature, freshness, schema/count/byte limits and CID-only article references before accepting results. This establishes the separation from the reader; it is not a deployed site or browser implementation.

## Bounded feed transport

Metadata feeds deliberately use one raw SHA-256 block. DAG-CBOR/DAG-PB and all other codecs are rejected before retrieving a block. We do not traverse DAGs for feeds; this eliminates feed fanout and depth rather than writing another DAG walker. Real stored adversarial fixtures include a 1,000-link DAG and a 120-level DAG, each published under a genuine IPNS feed pointer. The collector rejects those roots before fetching them.

The collector configures actual Bitswap **incoming and outgoing frame ceilings of 67,584 bytes**, four streams per direction, a native **soft wantlist trim target** of 32, serial send concurrency, four queued block sends, and 1,800 ms message/stream/application retrieval deadlines. Installed Bitswap's decoder applies length-prefixed `maxDataLength` before protobuf decoding. The subsequent raw-block reader caps data at 65,536 bytes before UTF-8 decode or JSON parsing. A real 200,000-byte raw block is rejected over Bitswap, and its CID is absent from the collector's persistent blockstore. An actual peer sends a length-prefixed incomplete frame; its stream times out/resets instead of remaining open.

Final source audit found that the installed TypeScript declaration names `maxWantlistSize`, while the actual runtime reads `maxWantListSize`. The collector now sets the runtime spelling. Native trimming excludes wants already being sent, so **this is not a strict 32-entry total ledger or per-message ingress ceiling**; no such ceiling is claimed or measured for this collector. The real 67,584-byte frame ceiling bounds each decoded message/vector, but does not by itself bound accumulated in-flight want state under sustained traffic.

This bounds accepted frames/blocks and active streams, not every allocation inside the TCP/libp2p stack. It also does not promise a strict bandwidth cap across retransmissions or hostile unsolicited network traffic.

## Discovery, indexing and storage limits

Registration is explicit, at most four feeds, with bounded IPNS names and Ed25519 public keys; duplicates and malformed entries fail. Concurrent poll requests are rejected. Each poll is serial, has a six-second deadline, at most four feed outcomes and a 256 KiB accepted-block budget. Feed envelopes allow at most 100 events, 8 KiB each, a 24-hour freshness window and seven-day event window. Event IDs deduplicate; ratings remain one identity's attestations, not proof of unique humans.

Valid feeds are pinned. Replaced feeds are unpinned; garbage collection runs after a poll, removing unpinned rejected/old blocks. Only the current accepted metadata blocks are protected by pins. Application cache/state is bounded by four feeds times their event/byte ceilings. Popularity output is capped at 100 article references and 64 KiB; lower-ranked entries are removed until the byte budget fits. These are experimental limits and do not alter production article retention.

The collector never fetches the referenced article body. Tests inspect the body CID's presence after indexing, restart and later crawl; it remains absent. Body qualification remains the separate reader's job. The prior feed spike exercises the real production inspector and candidate filter; this hardening spike reuses the production metadata ranking function.

## Verified failures and recovery

Genuine IPNS updates are used for signed-body equivocation at an unchanged application sequence, rollback after sequence two, expired feed content, oversized blocks and missing blocks. The application digest plus monotonic sequence reject rollback/equivocation even when IPNS itself points to a newer signed routing record. These high-water marks survive the collector process restart.

When retrieval fails, the previous valid ranking stays available in a newly signed envelope explicitly marked `stale`; its `observedAt` remains the last successful observation. Publisher shutdown followed by collector restart exercises this path. Restarting the publisher and publishing a newer valid feed replaces the cached result and restores `fresh`. A stale label is not a claim that the contributor's old data has disappeared from IPFS.

The actual HTTP optional client rejects tampered snapshots, a different signing identity, old generation time, count floods, arbitrary resource-URL fields and oversized chunked response bytes. Raw or UnixFS DAG-PB article CIDs are accepted as references without fetching their blocks; only metadata feed roots require raw blocks. Article data endpoints return 404. The client only fetches the explicitly supplied aggregator endpoint; accepted article entries contain CIDs, not resource URLs.

## Evidence and remaining limits

`spikes/ipfs-feeds/hardening-evidence.json` records sequential checks, timings, process IDs, configured ceilings and limitations. The script exits nonzero on any failed assertion and stops child processes/nodes and removes scratch private state afterward.

Still unproven: public browser transport/lifecycle; power loss and untargeted native-datastore interruption points; filesystem allocation overhead; hostile sustained connection floods; robust global discovery; Sybil resistance; retention when all independent holders disappear. Atomic JSON replacement is not an operating-system transaction across all stores; the additional gates below prove targeted abrupt process termination by deriving pins from the committed immutable graph. Node filesystem pins establish persistence here; browser IndexedDB pins are a separate experiment.

Dependency additions are isolated `blockstore-fs`, `datastore-fs` and the DAG-CBOR fixture codec. Current isolated installation audit reports high-severity transitive findings; the separate dependency review records versions, reachability and disposition. This remains spike code, not a production security claim.

Primary implementation references: [Helia](https://github.com/ipfs/helia), [Bitswap limits](https://github.com/ipfs/helia/tree/main/packages/bitswap), [IPNS semantics](https://docs.ipfs.tech/concepts/ipns/). Actual installed decoder code and TypeScript declarations were inspected; measured behavior is documented separately from defaults.

## Additional finite gates: filesystem quota and abrupt process termination

Run `npm run spike:gates --prefix spikes/ipfs-feeds`. Evidence is in `spikes/ipfs-feeds/finite-gates-evidence.json`.

The two native filesystem stores now have serialized **before-put** admission checks: 1 MiB combined file payload, 512 files including the native atomic writer's temporary file, 64 KiB per raw block and 16 KiB per datastore record. Replacement checks reserve the entire incoming value while the old file still exists, rather than subtracting the old value before rename. This can reject a replacement near a full quota; there is no alternate store/encoding. Application state is separately capped at 512 KiB; its old file and staged `state.tmp` together with the stores have a 2 MiB maximum payload. These are strict payload/file-count ceilings for this process, not filesystem allocation slack or directory inode overhead, and do not defend against another process modifying the scratch directory.

The committed graph now includes the signed raw popularity snapshot block as well as current feed roots. Each poll clones the committed state, keeps old pins while pinning candidate blocks, writes bounded staged JSON, atomically renames it, then reconciles pins and garbage collects from the newly committed references. On startup, the collector discards uncommitted staged JSON, verifies locally present committed blocks, restores required pins, removes orphan pins and garbage collects. An absent committed block is an explicit startup error; there is no alternate decoder or backup snapshot.

Actual child-process SIGKILL tests pause (1) after the newly fetched feed block is pinned, and (2) after candidate `state.tmp` is written but before it is renamed. Fresh child processes recover exactly the previous committed snapshot, signing identity and sequence/digest high-water marks, keep its graph pinned, and remove the uncommitted feed/snapshot graph. A later normal poll commits the newer feed and removes replaced roots. This proves the targeted process-crash ordering. It does not establish disk fsync or power-loss durability, nor every possible libp2p/datastore interruption point.

The native libp2p connection manager is capped at eight connections. The probe paces inbound attempts below the separate per-host rate limiter, reaches eight established collector connections, and observes further dials rejected. This bounds the tested established-connection gate; it is not protection from every CPU, handshake, socket or network-flood attack.

The finite checks also fill the two stores with concurrent block writes to the aggregate byte ceiling, reject further datastore/block writes before persistence, and fill the datastore with tiny records to prove the file-count ceiling. Garbage collection runs on startup and in the poll's finally path, including failures, so uncommitted unpinned blocks are cleaned. Long-term availability still requires independent holders remaining online.
