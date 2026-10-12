# Twenty sequential browser test drives

Build background SHA256: bf4b6a9896ad8de6c342c19427a8ce95bac345398908f1ce8afda1f0cdc2c9d0

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-11T10:11:04.492Z
- Duration: 18ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-11T10:11:04.541Z
- Duration: 40ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Cache, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-11T10:11:04.781Z
- Duration: 336ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-11T10:11:05.133Z
- Duration: 315ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-11T10:11:05.464Z
- Duration: 493ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-11T10:11:05.973Z
- Duration: 473ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-11T10:11:06.464Z
- Duration: 285ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-11T10:11:06.764Z
- Duration: 326ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-11T10:11:07.104Z
- Duration: 234ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-11T10:11:07.356Z
- Duration: 251ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-11T10:11:07.616Z
- Duration: 320ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T10:11:07.960Z
- Duration: 177ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-11T10:11:08.162Z
- Duration: 653ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-11T10:11:08.835Z
- Duration: 79ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-11T10:11:08.935Z
- Duration: 12ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-11T10:11:08.968Z
- Duration: 1513ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-11T10:11:10.503Z
- Duration: 70ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-11T10:11:10.593Z
- Duration: 180ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T10:11:10.795Z
- Duration: 143ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #clear; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-11T10:11:10.952Z
- Duration: 208ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)


---

# Final audit

Build background SHA256: bf4b6a9896ad8de6c342c19427a8ce95bac345398908f1ce8afda1f0cdc2c9d0

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T10:12:08.060Z
- Duration: 166ms
- Result: **FAIL**
- Failure: Removing a row must preserve keyboard focus
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BODY","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BODY","id":""}; Extension message: LIBRARY
- Assertions: Stopped at the recorded failure
- Evidence: `artifacts/test-drives/recheck-2026-10-11T10-12-07-450Z-19.png` (local generated artifact)


## Repairs before the final build

- Capture now retains the image-overflow flag and warning in the sealed preview; the seal covers both fields. Scenario6 verified the actual11-image capture and explicit text-only recovery.
- Extraction rejects author-like navigation guesses such as “show Authority control databases,” while retaining genuine author metadata.
- Browse controls avoid a duplicated label. Review copy and controls are concise, with sharing/privacy details available on demand.
- The focused19 follow-up found BODY focus after removal and clear. The final build moves focus to a surviving saved item or Saved tab, and gives the post-save reading button more space above the title.

---

## Focused recheck run 2026-10-11T10-12-49-061Z

Build background SHA256: bf4b6a9896ad8de6c342c19427a8ce95bac345398908f1ce8afda1f0cdc2c9d0

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T10:12:49.738Z
- Duration: 198ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/recheck-2026-10-11T10-12-49-061Z-12.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T10:12:49.957Z
- Duration: 104ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/recheck-2026-10-11T10-12-49-061Z-19.png` (local generated artifact)


## Native computer-use confirmation

Codex computer use reloaded the final unpacked extension in visible Chrome for Testing, then used the actual toolbar and keyboard to capture the Wikipedia article. The portrait remained visible in the refined dark review. Private saving moved keyboard focus directly to Read saved copy. A fresh capture after the byline repair displayed only en.wikipedia.org, with the bogus authority-control author removed. No public sharing was performed in this native follow-up.

---

# Twenty sequential browser test drives

Build background SHA256: 25fa0b6e5d11df4f23b606f97952e3d19748cbc92ce3c9a36da588522701106d

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-11T23:14:22.987Z
- Duration: 20ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-11T23:14:23.396Z
- Duration: 61ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Cache, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-11T23:14:23.837Z
- Duration: 283ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-11T23:14:24.222Z
- Duration: 185ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-11T23:14:24.430Z
- Duration: 328ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-11T23:14:24.946Z
- Duration: 328ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-11T23:14:25.321Z
- Duration: 192ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-11T23:14:25.525Z
- Duration: 281ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-11T23:14:25.843Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-11T23:14:25.976Z
- Duration: 166ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-11T23:14:26.168Z
- Duration: 225ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T23:14:26.428Z
- Duration: 125ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-11T23:14:26.596Z
- Duration: 629ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-11T23:14:27.236Z
- Duration: 52ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-11T23:14:27.310Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-11T23:14:27.343Z
- Duration: 1446ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-11T23:14:28.802Z
- Duration: 40ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-11T23:14:28.860Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T23:14:29.032Z
- Duration: 79ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-11T23:14:29.140Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 03bbea82ed4a864929f47d79103aafa513bde8f99c5aeb872a9952a0416a610b

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-11T23:32:20.846Z
- Duration: 24ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-11T23:32:20.916Z
- Duration: 47ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Cache, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-11T23:32:20.999Z
- Duration: 317ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-11T23:32:21.340Z
- Duration: 161ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-11T23:32:21.533Z
- Duration: 279ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-11T23:32:21.849Z
- Duration: 423ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-11T23:32:22.315Z
- Duration: 158ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-11T23:32:22.495Z
- Duration: 113ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-11T23:32:22.646Z
- Duration: 124ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-11T23:32:22.793Z
- Duration: 135ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-11T23:32:22.955Z
- Duration: 181ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T23:32:23.182Z
- Duration: 106ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-11T23:32:23.329Z
- Duration: 828ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-11T23:32:24.170Z
- Duration: 55ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-11T23:32:24.263Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-11T23:32:24.297Z
- Duration: 1440ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-11T23:32:25.754Z
- Duration: 45ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-11T23:32:25.830Z
- Duration: 137ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T23:32:25.998Z
- Duration: 104ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-11T23:32:26.128Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)


---

# Twenty sequential browser test drives

Build background SHA256: cef278ab93cba2ec651a556d1b997410cfc36a1d3643126c64b7f5b122578000

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-11T23:36:17.646Z
- Duration: 40ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-11T23:36:17.720Z
- Duration: 53ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Cache, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-11T23:36:17.799Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-11T23:36:17.947Z
- Duration: 260ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-11T23:36:18.234Z
- Duration: 314ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-11T23:36:18.590Z
- Duration: 341ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-11T23:36:18.968Z
- Duration: 202ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-11T23:36:19.182Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-11T23:36:19.333Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-11T23:36:19.497Z
- Duration: 181ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-11T23:36:19.687Z
- Duration: 239ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T23:36:19.954Z
- Duration: 142ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-11T23:36:20.138Z
- Duration: 602ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-11T23:36:20.749Z
- Duration: 38ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-11T23:36:20.815Z
- Duration: 12ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-11T23:36:20.849Z
- Duration: 1469ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-11T23:36:22.334Z
- Duration: 39ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-11T23:36:22.399Z
- Duration: 151ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T23:36:22.590Z
- Duration: 128ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-11T23:36:22.750Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: cef278ab93cba2ec651a556d1b997410cfc36a1d3643126c64b7f5b122578000

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-11T23:52:43.264Z
- Duration: 19ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-11T23:52:43.314Z
- Duration: 38ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Cache, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-11T23:52:43.377Z
- Duration: 74ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-11T23:52:43.464Z
- Duration: 146ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-11T23:52:43.651Z
- Duration: 294ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-11T23:52:43.983Z
- Duration: 267ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-11T23:52:44.282Z
- Duration: 148ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-11T23:52:44.459Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-11T23:52:44.623Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-11T23:52:44.759Z
- Duration: 135ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-11T23:52:44.920Z
- Duration: 219ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-11T23:52:45.181Z
- Duration: 108ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-11T23:52:45.314Z
- Duration: 628ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-11T23:52:45.956Z
- Duration: 52ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-11T23:52:46.030Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-11T23:52:46.064Z
- Duration: 1514ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-11T23:52:47.593Z
- Duration: 47ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-11T23:52:47.679Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-11T23:52:47.833Z
- Duration: 101ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-11T23:52:47.961Z
- Duration: 123ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: f54d4dbeac1ef455c7cb430690cab6953eb5192c2d93d1ab85628099a59ca94b

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-12T00:01:30.018Z
- Duration: 53ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-12T00:01:30.133Z
- Duration: 64ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Save, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T00:01:30.232Z
- Duration: 132ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T00:01:30.388Z
- Duration: 499ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T00:01:30.917Z
- Duration: 365ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T00:01:31.383Z
- Duration: 372ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T00:01:31.800Z
- Duration: 156ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T00:01:31.978Z
- Duration: 98ms
- Result: **FAIL**
- Failure: The input did not match the regular expression /1,000/. Input:

'This copy is too short or incomplete to share. You can keep it on this device. Saved on this device.'

- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share
- Assertions: Stopped at the recorded failure
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T00:01:32.116Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T00:01:32.252Z
- Duration: 131ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T00:01:32.399Z
- Duration: 192ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T00:01:32.635Z
- Duration: 106ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T00:01:32.782Z
- Duration: 605ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T00:01:33.398Z
- Duration: 46ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T00:01:33.482Z
- Duration: 13ms
- Result: **FAIL**
- Failure: The input did not match the regular expression /may remain public/. Input:

'Sharing canceled. An already uploaded copy may still be public.'

- Actions: Extension message: LIBRARY
- Assertions: Stopped at the recorded failure
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T00:01:33.516Z
- Duration: 1351ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-12T00:01:34.903Z
- Duration: 42ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T00:01:34.982Z
- Duration: 165ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T00:01:35.183Z
- Duration: 120ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T00:01:35.339Z
- Duration: 138ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)


---

# Twenty sequential browser test drives

Build background SHA256: f54d4dbeac1ef455c7cb430690cab6953eb5192c2d93d1ab85628099a59ca94b

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch is quiet and explains public sharing

- Timestamp: 2026-10-12T00:02:04.240Z
- Duration: 34ms
- Result: **PASS**
- Actions:
- Assertions: Consent precedes archive actions; No automatic publication
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard consent opens the three simple sections

- Timestamp: 2026-10-12T00:02:04.319Z
- Duration: 52ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="cache"]; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="read"]
- Assertions: Popular, Save, Saved are keyboard reachable
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T00:02:04.410Z
- Duration: 201ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T00:02:04.622Z
- Duration: 192ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T00:02:04.844Z
- Duration: 326ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T00:02:05.215Z
- Duration: 289ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T00:02:05.546Z
- Duration: 155ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T00:02:05.724Z
- Duration: 99ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T00:02:05.861Z
- Duration: 111ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="cache"]; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T00:02:05.992Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T00:02:06.133Z
- Duration: 203ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T00:02:06.380Z
- Duration: 106ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T00:02:06.512Z
- Duration: 595ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T00:02:07.116Z
- Duration: 56ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T00:02:07.211Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T00:02:07.244Z
- Duration: 1350ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-12T00:02:08.604Z
- Duration: 48ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T00:02:08.693Z
- Duration: 143ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T00:02:08.882Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T00:02:09.025Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: f54d4dbeac1ef455c7cb430690cab6953eb5192c2d93d1ab85628099a59ca94b

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch shows saved articles without contacting public services

- Timestamp: 2026-10-12T00:13:28.096Z
- Duration: 42ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Popular only when selected

- Timestamp: 2026-10-12T00:13:28.162Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Saved and Popular are keyboard reachable; Popular selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T00:13:28.310Z
- Duration: 86ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T00:13:28.416Z
- Duration: 166ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #capture
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T00:13:28.617Z
- Duration: 322ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T00:13:28.963Z
- Duration: 310ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T00:13:29.310Z
- Duration: 197ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #capture; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T00:13:29.539Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T00:13:29.695Z
- Duration: 142ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T00:13:29.858Z
- Duration: 170ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T00:13:30.046Z
- Duration: 246ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T00:13:30.327Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T00:13:30.514Z
- Duration: 619ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T00:13:31.144Z
- Duration: 58ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T00:13:31.241Z
- Duration: 12ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T00:13:31.275Z
- Duration: 1558ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-12T00:13:32.848Z
- Duration: 48ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T00:13:32.926Z
- Duration: 130ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T00:13:33.086Z
- Duration: 151ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T00:13:33.278Z
- Duration: 120ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)


---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch shows saved articles without contacting public services

- Timestamp: 2026-10-12T00:16:40.732Z
- Duration: 44ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Popular only when selected

- Timestamp: 2026-10-12T00:16:40.818Z
- Duration: 44ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Saved and Popular are keyboard reachable; Popular selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T00:16:40.882Z
- Duration: 77ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T00:16:40.973Z
- Duration: 170ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T00:16:41.183Z
- Duration: 282ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T00:16:41.503Z
- Duration: 325ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T00:16:41.867Z
- Duration: 155ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T00:16:42.049Z
- Duration: 131ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T00:16:42.217Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T00:16:42.367Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T00:16:42.514Z
- Duration: 250ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T00:16:42.801Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T00:16:42.983Z
- Duration: 595ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T00:16:43.601Z
- Duration: 76ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T00:16:43.699Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T00:16:43.732Z
- Duration: 1455ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Popular reports failure and restores its action

- Timestamp: 2026-10-12T00:16:45.215Z
- Duration: 53ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T00:16:45.296Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T00:16:45.467Z
- Duration: 157ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T00:16:45.662Z
- Duration: 131ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T00:54:41.233Z
- Duration: 39ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T00:54:41.305Z
- Duration: 29ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T00:54:41.371Z
- Duration: 87ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T00:54:41.467Z
- Duration: 151ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T00:54:41.652Z
- Duration: 283ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T00:54:41.956Z
- Duration: 259ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T00:54:42.239Z
- Duration: 167ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T00:54:42.420Z
- Duration: 95ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T00:54:42.552Z
- Duration: 109ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T00:54:42.682Z
- Duration: 122ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T00:54:42.822Z
- Duration: 194ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T00:54:43.053Z
- Duration: 126ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T00:54:43.221Z
- Duration: 621ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T00:54:43.872Z
- Duration: 57ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T00:54:43.969Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T00:54:44.003Z
- Duration: 1367ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T00:54:45.402Z
- Duration: 46ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T00:54:45.485Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T00:54:45.624Z
- Duration: 154ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T00:54:45.826Z
- Duration: 122ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T01:11:22.205Z
- Duration: 39ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T01:11:22.269Z
- Duration: 36ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T01:11:22.314Z
- Duration: 3036ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T01:11:25.468Z
- Duration: 334ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T01:11:25.835Z
- Duration: 246ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T01:11:26.122Z
- Duration: 257ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T01:11:26.415Z
- Duration: 156ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T01:11:26.612Z
- Duration: 117ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T01:11:26.768Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T01:11:26.906Z
- Duration: 128ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T01:11:27.052Z
- Duration: 194ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T01:11:27.268Z
- Duration: 124ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T01:11:27.432Z
- Duration: 633ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T01:11:28.085Z
- Duration: 58ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T01:11:28.183Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T01:11:28.214Z
- Duration: 1252ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T01:11:29.498Z
- Duration: 45ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T01:11:29.565Z
- Duration: 113ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T01:11:29.714Z
- Duration: 132ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T01:11:29.880Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T01:21:23.646Z
- Duration: 42ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T01:21:23.712Z
- Duration: 27ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T01:21:23.759Z
- Duration: 80ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T01:21:23.854Z
- Duration: 143ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T01:21:24.027Z
- Duration: 247ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T01:21:24.309Z
- Duration: 262ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T01:21:24.595Z
- Duration: 156ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T01:21:24.774Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T01:21:24.926Z
- Duration: 107ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T01:21:25.056Z
- Duration: 125ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T01:21:25.204Z
- Duration: 170ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T01:21:25.410Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T01:21:25.544Z
- Duration: 640ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T01:21:26.200Z
- Duration: 70ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T01:21:26.292Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T01:21:26.326Z
- Duration: 1236ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T01:21:27.573Z
- Duration: 45ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T01:21:27.658Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T01:21:27.809Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T01:21:27.975Z
- Duration: 120ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T01:32:31.735Z
- Duration: 40ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T01:32:31.815Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T01:32:31.878Z
- Duration: 80ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T01:32:31.972Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T01:32:32.145Z
- Duration: 234ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T01:32:32.400Z
- Duration: 259ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T01:32:32.698Z
- Duration: 155ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T01:32:32.895Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T01:32:33.047Z
- Duration: 108ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T01:32:33.176Z
- Duration: 124ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T01:32:33.324Z
- Duration: 187ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T01:32:33.546Z
- Duration: 120ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T01:32:33.699Z
- Duration: 619ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T01:32:34.334Z
- Duration: 56ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T01:32:34.431Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T01:32:34.465Z
- Duration: 1255ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T01:32:35.729Z
- Duration: 42ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T01:32:35.797Z
- Duration: 113ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T01:32:35.946Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T01:32:36.112Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T01:41:21.990Z
- Duration: 38ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T01:41:22.061Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T01:41:22.121Z
- Duration: 79ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T01:41:22.214Z
- Duration: 145ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T01:41:22.392Z
- Duration: 233ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T01:41:22.645Z
- Duration: 260ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T01:41:22.945Z
- Duration: 163ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T01:41:23.137Z
- Duration: 100ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T01:41:23.274Z
- Duration: 110ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T01:41:23.406Z
- Duration: 125ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T01:41:23.553Z
- Duration: 185ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T01:41:23.775Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T01:41:23.911Z
- Duration: 626ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T01:41:24.551Z
- Duration: 52ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T01:41:24.626Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T01:41:24.658Z
- Duration: 1212ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T01:41:25.879Z
- Duration: 42ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T01:41:25.940Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T01:41:26.092Z
- Duration: 134ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T01:41:26.257Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T01:51:21.404Z
- Duration: 38ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T01:51:21.461Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T01:51:21.509Z
- Duration: 76ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T01:51:21.599Z
- Duration: 146ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T01:51:21.793Z
- Duration: 248ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T01:51:22.079Z
- Duration: 277ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T01:51:22.392Z
- Duration: 161ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T01:51:22.575Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T01:51:22.727Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T01:51:22.865Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T01:51:23.029Z
- Duration: 180ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T01:51:23.246Z
- Duration: 120ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T01:51:23.413Z
- Duration: 616ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T01:51:24.046Z
- Duration: 58ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T01:51:24.144Z
- Duration: 9ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T01:51:24.178Z
- Duration: 1265ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T01:51:25.458Z
- Duration: 43ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T01:51:25.541Z
- Duration: 115ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T01:51:25.693Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T01:51:25.875Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T02:01:23.676Z
- Duration: 41ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T02:01:23.756Z
- Duration: 29ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T02:01:23.819Z
- Duration: 77ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T02:01:23.909Z
- Duration: 147ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T02:01:24.088Z
- Duration: 265ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T02:01:24.389Z
- Duration: 262ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T02:01:24.687Z
- Duration: 154ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T02:01:24.852Z
- Duration: 98ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T02:01:24.988Z
- Duration: 108ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T02:01:25.117Z
- Duration: 123ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T02:01:25.262Z
- Duration: 173ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T02:01:25.470Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T02:01:25.641Z
- Duration: 624ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T02:01:26.280Z
- Duration: 69ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T02:01:26.389Z
- Duration: 8ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T02:01:26.423Z
- Duration: 1250ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T02:01:27.686Z
- Duration: 42ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T02:01:27.754Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T02:01:27.905Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T02:01:28.070Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T02:11:22.859Z
- Duration: 40ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T02:11:22.944Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T02:11:23.006Z
- Duration: 83ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T02:11:23.103Z
- Duration: 150ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T02:11:23.289Z
- Duration: 233ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T02:11:23.544Z
- Duration: 259ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T02:11:23.840Z
- Duration: 162ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T02:11:24.023Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T02:11:24.172Z
- Duration: 110ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T02:11:24.303Z
- Duration: 131ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T02:11:24.451Z
- Duration: 185ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T02:11:24.674Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T02:11:24.843Z
- Duration: 715ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T02:11:25.596Z
- Duration: 54ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T02:11:25.690Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T02:11:25.723Z
- Duration: 1370ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T02:11:27.106Z
- Duration: 45ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T02:11:27.191Z
- Duration: 128ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T02:11:27.357Z
- Duration: 156ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T02:11:27.539Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T02:21:37.095Z
- Duration: 39ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T02:21:37.167Z
- Duration: 26ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T02:21:37.214Z
- Duration: 79ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T02:21:37.309Z
- Duration: 143ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T02:21:37.496Z
- Duration: 233ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T02:21:37.749Z
- Duration: 250ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T02:21:38.030Z
- Duration: 151ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T02:21:38.211Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T02:21:38.364Z
- Duration: 107ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T02:21:38.493Z
- Duration: 129ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T02:21:38.658Z
- Duration: 184ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T02:21:38.883Z
- Duration: 125ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T02:21:39.045Z
- Duration: 614ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T02:21:39.676Z
- Duration: 65ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T02:21:39.781Z
- Duration: 9ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T02:21:39.813Z
- Duration: 1202ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T02:21:41.027Z
- Duration: 43ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T02:21:41.096Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T02:21:41.246Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T02:21:41.409Z
- Duration: 110ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T02:31:43.815Z
- Duration: 38ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T02:31:43.872Z
- Duration: 27ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T02:31:43.919Z
- Duration: 82ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T02:31:44.011Z
- Duration: 152ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T02:31:44.205Z
- Duration: 231ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T02:31:44.453Z
- Duration: 252ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T02:31:44.735Z
- Duration: 153ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T02:31:44.914Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T02:31:45.068Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T02:31:45.203Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T02:31:45.348Z
- Duration: 182ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T02:31:45.570Z
- Duration: 124ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T02:31:45.739Z
- Duration: 640ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T02:31:46.395Z
- Duration: 69ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T02:31:46.485Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T02:31:46.518Z
- Duration: 1224ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T02:31:47.751Z
- Duration: 42ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T02:31:47.819Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T02:31:47.968Z
- Duration: 128ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T02:31:48.132Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 0efa3b082a87cd77cce43997adb80d7da155ac8570ad0ba06dd702e0500a0f5a

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T02:41:32.817Z
- Duration: 41ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T02:41:32.882Z
- Duration: 26ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T02:41:32.928Z
- Duration: 80ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T02:41:33.024Z
- Duration: 143ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T02:41:33.193Z
- Duration: 232ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T02:41:33.462Z
- Duration: 262ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T02:41:33.748Z
- Duration: 164ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T02:41:33.940Z
- Duration: 116ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T02:41:34.094Z
- Duration: 109ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T02:41:34.224Z
- Duration: 127ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T02:41:34.371Z
- Duration: 167ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T02:41:34.578Z
- Duration: 126ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T02:41:34.748Z
- Duration: 608ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T02:41:35.372Z
- Duration: 68ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T02:41:35.463Z
- Duration: 8ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T02:41:35.496Z
- Duration: 1226ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T02:41:36.731Z
- Duration: 41ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T02:41:36.795Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T02:41:36.945Z
- Duration: 134ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T02:41:37.110Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 864dfbde455579e07950892129dd2d296e907b20c0d10ee9840978c66787279b

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T03:26:34.776Z
- Duration: 41ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T03:26:34.843Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T03:26:34.890Z
- Duration: 80ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T03:26:34.981Z
- Duration: 159ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T03:26:35.176Z
- Duration: 256ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T03:26:35.474Z
- Duration: 286ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T03:26:35.790Z
- Duration: 167ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T03:26:35.989Z
- Duration: 113ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T03:26:36.141Z
- Duration: 136ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T03:26:36.299Z
- Duration: 131ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T03:26:36.446Z
- Duration: 190ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T03:26:36.675Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T03:26:36.857Z
- Duration: 625ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T03:26:37.492Z
- Duration: 59ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T03:26:37.590Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T03:26:37.624Z
- Duration: 1404ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T03:26:39.058Z
- Duration: 50ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T03:26:39.124Z
- Duration: 132ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T03:26:39.290Z
- Duration: 139ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T03:26:39.456Z
- Duration: 121ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 8b41a2a30cf310d225631a238da368dfd1ac8a61e4f4f472975b1fba093ad950

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T03:50:29.235Z
- Duration: 46ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T03:50:29.323Z
- Duration: 32ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T03:50:29.383Z
- Duration: 91ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T03:50:29.499Z
- Duration: 191ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T03:50:29.723Z
- Duration: 278ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T03:50:30.042Z
- Duration: 308ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T03:50:30.386Z
- Duration: 183ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T03:50:30.601Z
- Duration: 119ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T03:50:30.755Z
- Duration: 130ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T03:50:30.910Z
- Duration: 144ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T03:50:31.078Z
- Duration: 225ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T03:50:31.340Z
- Duration: 138ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T03:50:31.518Z
- Duration: 637ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T03:50:32.169Z
- Duration: 60ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T03:50:32.252Z
- Duration: 11ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T03:50:32.286Z
- Duration: 1459ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T03:50:33.757Z
- Duration: 55ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T03:50:33.851Z
- Duration: 135ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T03:50:34.023Z
- Duration: 146ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T03:50:34.207Z
- Duration: 192ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: a698b788b0a2290c96186b8b6976d2e1e6f0c41776f8943980cc6b85d5e8781c

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T03:56:14.652Z
- Duration: 51ms
- Result: **PASS**
- Actions:
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T03:56:14.736Z
- Duration: 41ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T03:56:14.814Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T03:56:14.955Z
- Duration: 203ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T03:56:15.199Z
- Duration: 320ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T03:56:15.557Z
- Duration: 378ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T03:56:15.974Z
- Duration: 274ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T03:56:16.279Z
- Duration: 135ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T03:56:16.448Z
- Duration: 122ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T03:56:16.596Z
- Duration: 165ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T03:56:16.787Z
- Duration: 292ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T03:56:17.126Z
- Duration: 152ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T03:56:17.314Z
- Duration: 601ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T03:56:17.934Z
- Duration: 58ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T03:56:18.032Z
- Duration: 12ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T03:56:18.066Z
- Duration: 1429ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T03:56:19.510Z
- Duration: 53ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T03:56:19.598Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T03:56:19.738Z
- Duration: 151ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T03:56:19.920Z
- Duration: 192ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: 3890f6f2540c69e9768beb22c00be96011167efe7e842f9dd374eee910fc80cc

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T04:30:22.390Z
- Duration: 48ms
- Result: **PASS**
- Actions: None (initial state)
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T04:30:22.486Z
- Duration: 35ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T04:30:22.564Z
- Duration: 88ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T04:30:22.677Z
- Duration: 187ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T04:30:22.897Z
- Duration: 265ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T04:30:23.202Z
- Duration: 328ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T04:30:23.567Z
- Duration: 197ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T04:30:23.781Z
- Duration: 112ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T04:30:23.930Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T04:30:24.067Z
- Duration: 148ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T04:30:24.227Z
- Duration: 234ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T04:30:24.498Z
- Duration: 124ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T04:30:24.666Z
- Duration: 604ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T04:30:25.282Z
- Duration: 60ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T04:30:25.381Z
- Duration: 10ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T04:30:25.417Z
- Duration: 1369ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T04:30:26.832Z
- Duration: 46ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T04:30:26.913Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T04:30:27.070Z
- Duration: 147ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T04:30:27.237Z
- Duration: 207ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)

---

# Twenty sequential browser test drives

Build background SHA256: c73bd8bb44de4b47ca17856515b858569f495882b7c4e40d676cbf39e9244877

Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.

## 1. First launch opens the archive without contacting public services

- Timestamp: 2026-10-12T04:40:32.380Z
- Duration: 38ms
- Result: **PASS**
- Actions: None (initial state)
- Assertions: Local saved list opens directly; Options closed; No automatic network publication or queries
- Evidence: `artifacts/test-drives/01.png` (local generated artifact)

## 2. Keyboard navigation loads Community only when selected

- Timestamp: 2026-10-12T04:40:32.451Z
- Duration: 28ms
- Result: **PASS**
- Actions: Keyboard Enter: #options > summary; Keyboard Enter: #options > summary; Keyboard Enter: [data-view="library"]; Keyboard Enter: [data-view="library"]
- Assertions: Archive and Community are keyboard reachable; Community selection starts the bounded search without a second button
- Evidence: `artifacts/test-drives/02.png` (local generated artifact)

## 3. Unsupported browser pages disable capture

- Timestamp: 2026-10-12T04:40:32.497Z
- Duration: 79ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Invalid source has a clear disabled action
- Evidence: `artifacts/test-drives/03.png` (local generated artifact)

## 4. Actual local article capture opens safe image preview

- Timestamp: 2026-10-12T04:40:32.588Z
- Duration: 164ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu
- Assertions: Actual content-script extraction; Visible inline WebP
- Evidence: `artifacts/test-drives/04.png` (local generated artifact)

## 5. Private save and offline reading retain the image

- Timestamp: 2026-10-12T04:40:32.782Z
- Duration: 262ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Private copy readable offline; Private copies have no public rating controls
- Evidence: `artifacts/test-drives/05.png` (local generated artifact)

## 6. Image overflow blocks saves until explicit text-only choice

- Timestamp: 2026-10-12T04:40:33.082Z
- Duration: 281ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /overflow; Keyboard Enter: #capture; Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Actual11-image capture preserves overflow flags; Text-only is the next keyboard stop and restores saving
- Evidence: `artifacts/test-drives/06.png` (local generated artifact)

## 7. Discard removes a preview without caching

- Timestamp: 2026-10-12T04:40:33.397Z
- Duration: 175ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Open local original article: /article; Keyboard Enter: #previewMenu; Keyboard Enter: #discard; Extension message: DRAFT; Extension message: LIBRARY
- Assertions: Discard leaves no draft or saved article
- Evidence: `artifacts/test-drives/07.png` (local generated artifact)

## 8. Short copies remain private and cannot be shared

- Timestamp: 2026-10-12T04:40:33.595Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #share; Extension message: LIBRARY; Extension message: LOCAL_CATALOG
- Assertions: Short body rejected for Popular; Local copy retained with clear explanation
- Evidence: `artifacts/test-drives/08.png` (local generated artifact)

## 9. Empty source reports a capture error and recovers controls

- Timestamp: 2026-10-12T04:40:33.746Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #capture
- Assertions: No phantom article; Error leaves capture usable
- Evidence: `artifacts/test-drives/09.png` (local generated artifact)

## 10. Missing previews and removed records explain recovery

- Timestamp: 2026-10-12T04:40:33.883Z
- Duration: 140ms
- Result: **PASS**
- Actions: Extension message: CLEAR
- Assertions: Both missing-state pages explain next action
- Evidence: `artifacts/test-drives/10.png` (local generated artifact)

## 11. Malicious markup and remote resources remain inert

- Timestamp: 2026-10-12T04:40:34.033Z
- Duration: 179ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main
- Assertions: Sanitized preview and retained reader; No executable or remote image content
- Evidence: `artifacts/test-drives/11.png` (local generated artifact)

## 12. Long title and wide table work on narrow keyboard UI

- Timestamp: 2026-10-12T04:40:34.232Z
- Duration: 125ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Keyboard Enter: #save
- Assertions: No document overflow at360px; Table and save remain keyboard accessible
- Evidence: `artifacts/test-drives/12.png` (local generated artifact)

## 13. Duplicate share operations stay bounded when offline

- Timestamp: 2026-10-12T04:40:34.396Z
- Duration: 643ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Two explicit SAVE requests exercise overlapping operation state; Extension message: SAVE; Extension message: SAVE; Extension message: LIBRARY
- Assertions: One retained pending copy; No unbounded duplicate operation or false public success
- Evidence: `artifacts/test-drives/13.png` (local generated artifact)

## 14. Pending share retry preserves local recovery on network failure

- Timestamp: 2026-10-12T04:40:35.065Z
- Duration: 92ms
- Result: **PASS**
- Actions: Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Keyboard Enter: #library-list .item-actions button:first-child; Extension message: LIBRARY
- Assertions: Retry fails honestly and stays recoverable
- Evidence: `artifacts/test-drives/14.png` (local generated artifact)

## 15. Cancel pending sharing keeps the local copy

- Timestamp: 2026-10-12T04:40:35.181Z
- Duration: 9ms
- Result: **PASS**
- Actions: Extension message: LIBRARY
- Assertions: Cancellation preserves local bytes and warns about public retention
- Evidence: `artifacts/test-drives/15.png` (local generated artifact)

## 16. Contributor count and byte limits evict whole old copies

- Timestamp: 2026-10-12T04:40:35.216Z
- Duration: 1336ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY; Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Extension message: LIBRARY
- Assertions: 100-record quota enforced; 16MiB quota evicts oldest whole records
- Evidence: `artifacts/test-drives/16.png` (local generated artifact)

## 17. Offline Community reports failure and restores its action

- Timestamp: 2026-10-12T04:40:36.579Z
- Duration: 44ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: #browse
- Assertions: No metadata-only cards; Clear recoverable network error
- Evidence: `artifacts/test-drives/17.png` (local generated artifact)

## 18. Offline rating refresh shows an error without losing the readable copy

- Timestamp: 2026-10-12T04:40:36.663Z
- Duration: 114ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim; Keyboard Enter: [data-view="library"]; Keyboard Enter: #library-list .item-main; Keyboard Enter: #refresh-ratings; Keyboard Enter: #helpful
- Assertions: Refresh and vote fail clearly; Local body remains readable
- Evidence: `artifacts/test-drives/18.png` (local generated artifact)

## 19. Saved removal and clear update the library

- Timestamp: 2026-10-12T04:40:36.815Z
- Duration: 133ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Seed a sealed original synthetic preview (edge-state setup only); Extension message: SAVE; Keyboard Enter: [data-view="library"]; Keyboard Enter: #manage; Focus after removal: {"tag":"BUTTON","id":""}; Keyboard Enter: #clear; Focus after clear: {"tag":"BUTTON","id":""}; Extension message: LIBRARY
- Assertions: Removal and clear reflect actual local storage; Focus observations are recorded for final audit
- Evidence: `artifacts/test-drives/19.png` (local generated artifact)

## 20. Dashboard navigation and rolling trends stay metadata-only

- Timestamp: 2026-10-12T04:40:36.978Z
- Duration: 168ms
- Result: **PASS**
- Actions: Extension message: CLEAR; Keyboard Enter: [data-view="activity"]; Keyboard Enter: [data-view="storage"]; Keyboard Enter: [data-view="articles"]
- Assertions: Actual localhost dashboard; Seven trend buckets and narrow navigation; No article body or public network activity
- Evidence: `artifacts/test-drives/20.png` (local generated artifact)
