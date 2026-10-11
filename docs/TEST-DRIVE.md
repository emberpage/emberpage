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
