# IPFS spikes — isolated experiments

These experiments answer architecture questions. They do not change the installed Ember Page extension, publish real articles, or replace the current release plan.

## Questions and acceptance

1. **Browser storage and transfer:** can browser A import an article into an IndexedDB-backed Helia blockstore, pin it, and transfer its exact bytes to browser B using IPFS peer protocols? Can fresh browser C retrieve from B after A stops? Does B retain blocks and pins after restart? Does retrieval fail clearly when every holder stops?
2. **Feeds and aggregation:** can signed listings and ratings travel as IPFS files, with real IPNS pointers updated and polled by a separate aggregator? Can an optional client poll its output without making the core extension depend on that aggregator?
3. **Limits of the result:** distinguish directly connected local nodes from public routing, a browser page from an MV3 offscreen document, persistent storage from online availability, and metadata trends from reader-qualified article candidates.

Only synthetic fixtures are used. No gateway may silently supply bytes in a claimed peer-transfer test. Every test must state how peers and feed addresses were discovered. Pinning must be checked separately from announcing, transferring, and replication. Signature checks do not establish unique human voters.

The production aggregator remains metadata-only. The reader must still download, verify, sanitize, and apply all existing eligibility filters before presenting a readable Popular candidate.

## Evidence

- [Browser transport experiment](../docs/research/ipfs-browser-spike.md)
- [Feed and aggregator experiment](../docs/research/ipfs-feeds-spike.md)
- [Separate MV3 offscreen experiment](../docs/research/ipfs-mv3-spike.md)
- [Browser consent and resource hardening](../docs/research/ipfs-browser-hardening.md)
- [Collector adversarial and crash hardening](../docs/research/ipfs-feeds-hardening.md)
- [Public relay path and remaining adoption gates](../docs/research/ipfs-public-network-proof.md)
- [Twenty sequential fresh-reader transfers](../docs/research/ipfs-repeat-drive.json)
- [Architecture and operational constraints](../docs/research/ipfs-architecture-spike.md)

Each experiment has its own package manifest and lockfile. Use the commands in its report; the root production dependency list is unchanged.
