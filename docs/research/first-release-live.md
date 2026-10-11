# First-release synthetic transport verification

Date: 2026-10-11T09:54:47.788Z

Actual disposable MV3 extension origin using production MeshNetwork and plain JSON encode/decode. One original synthetic article; no copied publication. Fresh reader page has no author key.

- upload: observed {"blobHash":"6083ea63d68632e2e83c038061031f6d47dd694208a788be78fdbbe177493ee5","size":9564,"provider":"https://blossom.primal.net"}
- listingAck: observed {"id":"a94142c408ae9ac829949d117d0c32bb87c47e6f83d1c2dda438c3f5a4554a5e","pubkey":"a244177c1f033a94b7296b99273c31a941db28dee9bd9c068ba65433cda48aea","createdAt":1791712489000,"url":"https://example.com/meshcache-first-release/b4220dbd-4ce2-4e61-921c-0ee954c04d8b","urlHash":"6ea6b652841a9c49871cc890809a072c4b22add2efc5f91f60c6b020bdcda2f2","contentHash":"f65710a176ae46eeb3ee1ce9af3d41dc7f6192eaf6d3f27dc5ef9da9b65d8c9e","blobHash":"6083ea63d68632e2e83c038061031f6d47dd694208a788be78fdbbe177493ee5","size":9564,"title":"Synthetic MeshCache verification b4220dbd-4ce2-4e61-921c-0ee954c04d8b","byline":"MeshCache test fixture","capturedAt":1791712488510,"provider":"https://blossom.primal.net"}
- freshExactListing: observed {"id":"a94142c408ae9ac829949d117d0c32bb87c47e6f83d1c2dda438c3f5a4554a5e","pubkey":"a244177c1f033a94b7296b99273c31a941db28dee9bd9c068ba65433cda48aea","createdAt":1791712489000,"url":"https://example.com/meshcache-first-release/b4220dbd-4ce2-4e61-921c-0ee954c04d8b","urlHash":"6ea6b652841a9c49871cc890809a072c4b22add2efc5f91f60c6b020bdcda2f2","contentHash":"f65710a176ae46eeb3ee1ce9af3d41dc7f6192eaf6d3f27dc5ef9da9b65d8c9e","blobHash":"6083ea63d68632e2e83c038061031f6d47dd694208a788be78fdbbe177493ee5","size":9564,"title":"Synthetic MeshCache verification b4220dbd-4ce2-4e61-921c-0ee954c04d8b","byline":"MeshCache test fixture","capturedAt":1791712488510,"provider":"https://blossom.primal.net"}
- freshReader: observed {"size":9564,"blobHash":"6083ea63d68632e2e83c038061031f6d47dd694208a788be78fdbbe177493ee5","contentHash":"f65710a176ae46eeb3ee1ce9af3d41dc7f6192eaf6d3f27dc5ef9da9b65d8c9e","eligible":true,"images":1,"allImagesInline":true}
- ratingAck: observed {"id":"654c4d2d5f49d05dc3fba454b57ddeb630411758f65c337e9893c896baedad72","pubkey":"a244177c1f033a94b7296b99273c31a941db28dee9bd9c068ba65433cda48aea","createdAt":1791712491000,"urlHash":"6ea6b652841a9c49871cc890809a072c4b22add2efc5f91f60c6b020bdcda2f2","contentHash":"f65710a176ae46eeb3ee1ce9af3d41dc7f6192eaf6d3f27dc5ef9da9b65d8c9e","value":1}
- indexedDiscovery: observed {"listingPresent":true,"validListings":1,"votes":[{"id":"654c4d2d5f49d05dc3fba454b57ddeb630411758f65c337e9893c896baedad72","value":1}]}
- cleanup: observed {"deletionAck":{"accepted":true},"deleteError":"signal is aborted without reason"}
- cleanupObserved: observed {"cdn":{"status":404,"type":"basic"},"canonical":{"status":0,"type":"opaqueredirect"},"relayRemaining":[]}

Deletion observations concern this provider and relay at this time; they do not prove global erasure, retention duration, independent voters, or future service availability. A private recovery journal is retained whenever cleanup is unresolved.

Read-only cleanup reconciliation: canonical provider returned HTTP302 to r2a.primal.net with the exact expected file hash/path. Its redirect target returned HTTP404; media.primal.net already returned404. Private recovery journal removed after these observations and relay event absence.
