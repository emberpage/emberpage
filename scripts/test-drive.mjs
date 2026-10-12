// RUN_TEST_DRIVES=1 node scripts/test-drive.mjs. Without the flag, print the prepared scenario inventory.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAggregatorServer } from '../aggregator/server.ts';
import { AggregatorStore } from '../aggregator/store.js';
import { hashUrl } from '../src/core/article.js';

const prose =
  'This original synthetic field notebook explains observations, methods, and conclusions in enough detail for an independent reader. ';
const content = `<p>${prose.repeat(30)}</p>`;
const results = [];
const recheck = (process.env.TEST_DRIVE_RECHECK || '')
  .split(',')
  .filter(Boolean)
  .map(Number);
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const priorLog = await readFile('docs/TEST-DRIVE.md', 'utf8').catch(() => '');
let buildHash;
let context,
  popup,
  base,
  origin,
  directory,
  fixtureServer,
  pendingHash,
  lastPage;
const actionLog = [];
const publicRequests = [];
function record(action) {
  actionLog.push(action);
}
async function activate(page, selector) {
  lastPage = page;
  record(`Keyboard Enter: ${selector}`);
  const target = page.locator(selector).first();
  const closed = target.locator('xpath=ancestor::details[not(@open)]');
  while (!(await target.isVisible()) && await closed.count()) {
    await closed.first().locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
  }
  await target.focus();
  await page.keyboard.press('Enter');
}
async function call(action, fields = {}, page = popup) {
  record(`Extension message: ${action}`);
  return page.evaluate(
    (message) =>
      chrome.runtime.sendMessage({ target: 'background', ...message }),
    { action, ...fields }
  );
}
async function successful(action, fields = {}, page = popup) {
  const result = await call(action, fields, page);
  assert.equal(result?.ok, true, JSON.stringify(result));
  return result.data;
}
async function draft({
  title = 'Original test fixture',
  html = content,
  url
} = {}) {
  const id = crypto.randomUUID();
  record('Seed a sealed original synthetic preview (edge-state setup only)');
  await popup.evaluate(
    async ({ id, title, html, url }) => {
      const article = {
        url,
        title,
        byline: 'Synthetic test writer',
        capturedAt: Date.now(),
        content: html,
        textContent: html.replace(/<[^>]*>/g, '')
      };
      const input = JSON.stringify([
        article.url,
        article.title,
        article.byline,
        article.content,
        article.textContent,
        article.capturedAt,
        article.imageLimitExceeded === true,
        article.imageWarning || ''
      ]);
      const digest = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
      );
      const seal = [...digest]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      await chrome.storage.session.set({
        ['draft:' + id]: article,
        ['seal:' + id]: seal
      });
    },
    { id, title, html, url: url || `https://example.org/test-drive-${id}` }
  );
  return id;
}
async function seededSave(options = {}) {
  return successful('SAVE', { id: await draft(options), share: false });
}
async function reviewDraft(options) {
  const id = await draft(options);
  const page = await context.newPage();
  await page.goto(`${base}/review.html?id=${id}`);
  await page.waitForFunction(() => !document.querySelector('#save').disabled);
  lastPage = page;
  return { page, id };
}
async function reset() {
  await context.setOffline(false);
  await successful('CLEAR');
  await popup.evaluate(() => chrome.storage.session.clear());
  for (const page of context.pages()) if (page !== popup) await page.close();
  await popup.reload();
  await popup.locator('#app').waitFor({ state: 'visible' });
}
async function capture(path = '/article', action = 'previewMenu') {
  record(`Open local original article: ${path}`);
  const source = await context.newPage();
  await source.goto(origin + path);
  await source.bringToFront();
  await popup.reload();
  await popup.waitForFunction(
    () => !document.querySelector('#capture').disabled
  );
  const opened = context.waitForEvent('page');
  await activate(popup, `#${action}`);
  const review = await opened;
  await review.waitForLoadState();
  await review.waitForFunction(
    () => !document.querySelector('#text-only').disabled
  );
  lastPage = review;
  return review;
}
async function waitForReader(page) {
  await page.waitForURL('**/reader.html?*');
  await page.waitForFunction(() => document.querySelector('#article')?.textContent.length > 0);
}
async function readSaved() {
  await popup.reload();
  await activate(popup, '[data-view="library"]');
  await popup.locator('#library-list .item-main').first().waitFor();
  const opened = context.waitForEvent('page');
  await activate(popup, '#library-list .item-main');
  const reading = await opened;
  await reading.waitForLoadState();
  await reading.waitForFunction(() => document.querySelector('#article')?.textContent.length > 0);
  lastPage = reading;
  return reading;
}
const scenarios = [
  {
    name: 'First launch opens the archive without contacting public services',
    reset: false,
    async run() {
      await popup.locator('#library-list .empty').waitFor();
      assert.equal(await popup.locator('#app').isVisible(), true);
      assert.equal(await popup.locator('#welcome,#accept').count(), 0);
      assert.equal(await popup.locator('#options').getAttribute('open'), null);
      assert.match(await popup.locator('#options').textContent(), /public/);
      assert.deepEqual(publicRequests, []);
      return ['Local saved list opens directly', 'Options closed', 'No automatic network publication or queries'];
    }
  },
  {
    name: 'Keyboard navigation loads Community only when selected',
    reset: false,
    async run() {
      assert.equal(await popup.locator('[data-view]').count(), 2);
      await activate(popup, '#options > summary');
      assert.equal(await popup.locator('#options').getAttribute('open'), '');
      await activate(popup, '#options > summary');
      await activate(popup, '[data-view="library"]');
      await context.setOffline(true);
      await popup.keyboard.press('Tab');
      assert.equal(await popup.evaluate(() => document.activeElement.dataset.view), 'read');
      await popup.keyboard.press('Enter');
      await popup.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
      await activate(popup, '[data-view="library"]');
      await context.setOffline(false);
      return ['Archive and Community are keyboard reachable', 'Community selection starts the bounded search without a second button'];
    }
  },
  {
    name: 'Unsupported browser pages disable capture',
    async run() {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.bringToFront();
      await popup.reload();
          assert.equal(await popup.locator('#capture').isDisabled(), true);
      return ['Invalid source has a clear disabled action'];
    }
  },
  {
    name: 'Actual local article capture opens safe image preview',
    async run() {
      const review = await capture();
      await review.waitForFunction(
        () => document.querySelector('#article img')?.naturalWidth === 128
      );
      assert.ok(
        (await review.locator('#article').textContent()).length >= 1000
      );
      assert.equal(
        await review.locator('#article img[src^="http"]').count(),
        0
      );
      return ['Actual content-script extraction', 'Visible inline WebP'];
    }
  },
  {
    name: 'Private save and offline reading retain the image',
    async run() {
      const source = await context.newPage();
      await source.goto(origin + '/article');
      await source.bringToFront();
      await popup.reload();
      await popup.waitForFunction(() => !document.querySelector('#capture').disabled);
      const opened = context.waitForEvent('page');
      await activate(popup, '#capture');
      const savedReader = await opened;
      await waitForReader(savedReader);
      assert.equal(await savedReader.locator('#review-controls').count(), 0, 'One Save action opens the reader without a preview step');
      assert.equal(await savedReader.locator('#copy-label').textContent(), 'Private copy');
      await context.setOffline(true);
      const reading = await readSaved();
      await reading.waitForFunction(
        () => document.querySelector('#article img')?.naturalWidth === 128
      );
      assert.equal(await reading.locator('#ratings').isVisible(), false);
      assert.deepEqual(
        publicRequests,
        [],
        'Private capture and reading do not contact a public provider'
      );
      return [
        'Private copy readable offline',
        'Private copies have no public rating controls'
      ];
    }
  },
  {
    name: 'Image overflow blocks saves until explicit text-only choice',
    async run() {
      const review = await capture('/overflow', 'capture');
      assert.equal(await review.locator('#save').isDisabled(), true);
      assert.equal(await review.locator('#share').isDisabled(), true);
      assert.match(
        await review.locator('#status').textContent(),
        /image budget/i
      );
      await review.locator('#review-controls summary').focus();
      await review.keyboard.press('Tab');
      assert.equal(
        await review.evaluate(() => document.activeElement.id),
        'text-only'
      );
      await review.keyboard.press('Space');
      assert.equal(await review.locator('#article img').count(), 0);
      await activate(review, '#save');
      await waitForReader(review);
      const reading = await readSaved();
      assert.equal(await reading.locator('#article img').count(), 0);
      assert.ok(
        (await reading.locator('#article').textContent()).length >= 1000
      );
      return [
        'Actual11-image capture preserves overflow flags',
        'Text-only is the next keyboard stop and restores saving'
      ];
    }
  },
  {
    name: 'Discard removes a preview without caching',
    async run() {
      const review = await capture();
      const id = new URL(review.url()).searchParams.get('id');
      await activate(review, '#discard');
      await review.getByText(/Preview discarded/).waitFor();
      assert.equal((await call('DRAFT', { id })).ok, false);
      assert.deepEqual(await successful('LIBRARY'), []);
      return ['Discard leaves no draft or saved article'];
    }
  },
  {
    name: 'Short copies remain private and cannot be shared',
    async run() {
      const { page } = await reviewDraft({ html: `<p>${prose.repeat(2)}</p>` });
      await activate(page, '#share');
      await page.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.match(await page.locator('#status').textContent(), /too short or incomplete to share/);
      assert.equal((await successful('LIBRARY'))[0].shared, false);
      assert.deepEqual(await successful('LOCAL_CATALOG'), []);
      return [
        'Short body rejected for Popular',
        'Local copy retained with clear explanation'
      ];
    }
  },
  {
    name: 'Empty source reports a capture error and recovers controls',
    async run() {
      const source = await context.newPage();
      await source.goto(origin + '/empty');
      await source.bringToFront();
      await popup.reload();
          await popup.waitForFunction(
        () => !document.querySelector('#capture').disabled
      );
      await activate(popup, '#capture');
      await popup.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.match(
        await popup.locator('#status').textContent(),
        /article|text/i
      );
      assert.equal(await popup.locator('#capture').isDisabled(), false);
      return ['No phantom article', 'Error leaves capture usable'];
    }
  },
  {
    name: 'Missing previews and removed records explain recovery',
    async run() {
      const review = await context.newPage();
      await review.goto(`${base}/review.html?id=missing`);
      await review.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.match(
        await review.locator('#status').textContent(),
        /expired|Capture/i
      );
      const reader = await context.newPage();
      await reader.goto(`${base}/reader.html?id=${'0'.repeat(64)}`);
      await reader.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.match(
        await reader.locator('#status').textContent(),
        /removed|capture/i
      );
      return ['Both missing-state pages explain next action'];
    }
  },
  {
    name: 'Malicious markup and remote resources remain inert',
    async run() {
      const html = `${content}<script>document.body.dataset.poison='yes'</script><iframe src="https://example.org/evil"></iframe><img src="https://example.org/tracker" onerror="document.body.dataset.poison='yes'"><a href="javascript:alert(1)">unsafe link</a>`;
      const { page } = await reviewDraft({ html });
      assert.equal(
        await page
          .locator(
            '#article script,#article iframe,#article img[src^="http"],#article [onerror],#article a[href^="javascript:"]'
          )
          .count(),
        0
      );
      assert.equal(
        await page.evaluate(() => document.body.dataset.poison),
        undefined
      );
      await activate(page, '#save');
      await waitForReader(page);
      const reader = await readSaved();
      assert.equal(
        await reader
          .locator('#article script,#article iframe,#article img[src^="http"]')
          .count(),
        0
      );
      return [
        'Sanitized preview and retained reader',
        'No executable or remote image content'
      ];
    }
  },
  {
    name: 'Long title and wide table work on narrow keyboard UI',
    async run() {
      const title = 'Original long fixture title '.repeat(17);
      const html =
        content +
        '<table><tbody><tr>' +
        '<td>VeryLongColumnHeadingAndValue</td>'.repeat(16) +
        '</tr></tbody></table>';
      const { page } = await reviewDraft({ title, html });
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme: 'dark' });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      );
      assert.equal(
        await page.locator('#article table').getAttribute('tabindex'),
        '0'
      );
      await activate(page, '#save');
      await waitForReader(page);
      return [
        'No document overflow at360px',
        'Table and save remain keyboard accessible'
      ];
    }
  },
  {
    name: 'Duplicate share operations stay bounded when offline',
    async run() {
      const id = await draft({ title: 'Original pending fixture' });
      await context.setOffline(true);
      record('Two explicit SAVE requests exercise overlapping operation state');
      const outcomes = await Promise.all([
        call('SAVE', { id, share: true }),
        call('SAVE', { id, share: true })
      ]);
      assert.ok(outcomes.some((result) => result.ok && result.data.shareError));
      const records = await successful('LIBRARY');
      assert.equal(records.length, 1);
      assert.equal(records[0].pendingShare, true);
      pendingHash = records[0].contentHash;
      return [
        'One retained pending copy',
        'No unbounded duplicate operation or false public success'
      ];
    }
  },
  {
    name: 'Pending share retry preserves local recovery on network failure',
    reset: false,
    async run() {
      await context.setOffline(true);
      await popup.reload();
      await activate(popup, '[data-view="library"]');
      await activate(popup, '#manage');
      await popup.getByRole('button', { name: 'Retry sharing' }).waitFor();
      await activate(popup, '#library-list .item-actions button:first-child');
      await popup.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.equal((await successful('LIBRARY'))[0].pendingShare, true);
      assert.equal(
        await popup.getByRole('button', { name: 'Retry sharing' }).isDisabled(),
        false
      );
      return ['Retry fails honestly and stays recoverable'];
    }
  },
  {
    name: 'Cancel pending sharing keeps the local copy',
    reset: false,
    async run() {
      await popup.getByRole('button', { name: 'Cancel sharing' }).focus();
      await popup.keyboard.press('Enter');
      await popup.waitForFunction(() =>
        /canceled/.test(document.querySelector('#status').textContent)
      );
      const records = await successful('LIBRARY');
      assert.equal(records.length, 1);
      assert.equal(records[0].pendingShare, false);
      assert.equal(records[0].contentHash, pendingHash);
      assert.match(
        await popup.locator('#status').textContent(),
        /may still be public/
      );
      return [
        'Cancellation preserves local bytes and warns about public retention'
      ];
    }
  },
  {
    name: 'Contributor count and byte limits evict whole old copies',
    async run() {
      for (let index = 0; index < 102; index++)
        await seededSave({ title: `Original count fixture ${index}` });
      const records = await successful('LIBRARY');
      assert.equal(records.length, 100);
      assert.equal(
        records.some((record) => record.title === 'Original count fixture 0'),
        false
      );
      await successful('CLEAR');
      for (let index = 0; index < 9; index++)
        await seededSave({
          title: `Original byte fixture ${index}`,
          html: `<p>${'Original bounded test prose. '.repeat(70_000)}</p>`
        });
      const large = await successful('LIBRARY');
      assert.ok(large.length < 9 && large.length > 0);
      assert.equal(
        large.some((record) => record.title === 'Original byte fixture 0'),
        false
      );
      return [
        '100-record quota enforced',
        '16MiB quota evicts oldest whole records'
      ];
    }
  },
  {
    name: 'Offline Community reports failure and restores its action',
    async run() {
      await context.setOffline(true);
      await activate(popup, '#browse');
      await popup.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.match(
        await popup.locator('#status').textContent(),
        /relay|connect|network/i
      );
      assert.equal(await popup.locator('#browse').isDisabled(), false);
      assert.equal(await popup.locator('#catalog-list .item').count(), 0);
      return ['No metadata-only cards', 'Clear recoverable network error'];
    }
  },
  {
    name: 'Offline rating refresh shows an error without losing the readable copy',
    async run() {
      const saved = await seededSave({
        title: 'Original rating-state fixture'
      });
      record(
        'Seed only shared-reader-facing status in disposable writer IDB for offline-rating UI; no publication claim'
      );
      await popup.evaluate(
        (hash) =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open('emberpage-writer-v1', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result,
                transaction = db.transaction('records', 'readwrite'),
                store = transaction.objectStore('records');
              const read = store.get(hash);
              read.onsuccess = () =>
                store.put({ ...read.result, shared: true });
              transaction.oncomplete = () => {
                db.close();
                resolve();
              };
              transaction.onabort = () => reject(transaction.error);
            };
          }),
        saved.contentHash
      );
      await context.setOffline(true);
      const reading = await readSaved();
      await activate(reading, '#refresh-ratings');
      await reading.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.ok(
        (await reading.locator('#article').textContent()).length >= 1000
      );
      assert.equal(
        await reading.locator('#refresh-ratings').isDisabled(),
        false
      );
      await activate(reading, '#helpful');
      await reading.waitForFunction(() =>
        document.querySelector('#status').classList.contains('error')
      );
      assert.doesNotMatch(
        await reading.locator('#status').textContent(),
        /Rating sent/
      );
      return ['Refresh and vote fail clearly', 'Local body remains readable'];
    }
  },
  {
    name: 'Saved removal and clear update the library',
    async run() {
      await seededSave({ title: 'Original removal fixture' });
      await seededSave({ title: 'Original clear fixture' });
      await activate(popup, '[data-view="library"]');
      await popup.locator('#library-list .item').first().waitFor();
      await activate(popup, '#manage');
      await popup
        .getByRole('button', { name: /^Remove / })
        .first()
        .focus();
      await popup.keyboard.press('Enter');
      await popup.waitForFunction(
        () => document.querySelectorAll('#library-list .item').length === 1
      );
      const focusAfterRemove = await popup.evaluate(() => ({
        tag: document.activeElement.tagName,
        id: document.activeElement.id
      }));
      record('Focus after removal: ' + JSON.stringify(focusAfterRemove));
      await activate(popup, '#clear');
      await popup.locator('#library-list .empty').waitFor();
      const focusAfterClear = await popup.evaluate(() => ({
        tag: document.activeElement.tagName,
        id: document.activeElement.id
      }));
      record('Focus after clear: ' + JSON.stringify(focusAfterClear));
      assert.deepEqual(await successful('LIBRARY'), []);
      if (recheck.length) {
        assert.notEqual(
          focusAfterRemove.tag,
          'BODY',
          'Removing a row must preserve keyboard focus'
        );
        assert.notEqual(
          focusAfterClear.tag,
          'BODY',
          'Clearing rows must preserve keyboard focus'
        );
      }
      return [
        'Removal and clear reflect actual local storage',
        'Focus observations are recorded for final audit'
      ];
    }
  },
  {
    name: 'Dashboard navigation and rolling trends stay metadata-only',
    async run() {
      const store = new AggregatorStore();
      const calls = [];
      const server = createAggregatorServer({
        store,
        directory: {
          async queryListings() {
            calls.push('listing');
            return [];
          },
          async queryVotes() {
            calls.push('rating');
            return [];
          }
        }
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const url = 'https://example.org/original-dashboard-fixture',
        now = Date.now();
      try {
        await store.commitMetadata(
          [
            {
              id: 'a'.repeat(64),
              pubkey: 'b'.repeat(64),
              url,
              urlHash: await hashUrl(url),
              contentHash: 'c'.repeat(64),
              blobHash: 'd'.repeat(64),
              size: 5000,
              title: 'Original dashboard metadata fixture',
              byline: 'Synthetic test',
              capturedAt: now,
              createdAt: now,
              provider: 'https://blossom.primal.net'
            }
          ],
          []
        );
        store.appendEvent({
          action: 'TEST_DRIVE',
          kind: 'storage',
          outcome: 'success',
          details: { entries: 1 }
        });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.locator('#article-list .article-row').waitFor();
        for (const view of ['activity', 'storage', 'articles']) {
          await activate(page, `[data-view="${view}"]`);
          assert.equal(await page.locator(`#${view}-view`).isVisible(), true);
        }
        assert.equal(await page.locator('#trend-list > div').count(), 7);
        await page.setViewportSize({ width: 360, height: 800 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        );
        assert.deepEqual(calls, [], 'Navigation never queries the directory');
        return [
          'Actual localhost dashboard',
          'Seven trend buckets and narrow navigation',
          'No article body or public network activity'
        ];
      } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        store.close();
      }
    }
  }
];
assert.equal(scenarios.length, 20);
async function logResults() {
  const rows = results.map(
    (result) =>
      `## ${result.number}. ${result.name}\n\n- Timestamp: ${result.startedAt}\n- Duration: ${result.durationMs}ms\n- Result: **${result.passed ? 'PASS' : 'FAIL'}**${result.error ? '\n- Failure: ' + result.error : ''}\n- Actions: ${result.actions.join('; ')}\n- Assertions: ${result.assertions.join('; ') || 'Stopped at the recorded failure'}\n- Evidence: ${result.evidence ? '`' + result.evidence + '` (local generated artifact)' : 'No screenshot available'}\n`
  );
  await writeFile(
    'docs/TEST-DRIVE.md',
    priorLog +
      (priorLog ? '\n---\n\n' : '') +
      (recheck.length
        ? priorLog.includes('# Final audit')
          ? '## Focused recheck run ' +
            runStamp +
            '\n\nBuild background SHA256: '
          : '# Final audit\n\nBuild background SHA256: '
        : '# Twenty sequential browser test drives\n\nBuild background SHA256: ') +
      buildHash +
      '\n\n' +
      'Actual built MV3 extension in a disposable Chrome profile. Original local fixtures; public network failures are deliberately offline. Source-only localhost permission substitutes the automation toolbar grant; production CSP is retained. Sealed-draft and status seeding are labeled edge setup, not live publication evidence. No public uploads occur in this suite. Initial failures remain recorded; fixes are rerun separately.\n\n' +
      rows.join('\n') +
      '\n'
  );
  await writeFile(
    recheck.length
      ? `artifacts/test-drive-recheck-${runStamp}.json`
      : 'artifacts/test-drive-results.json',
    JSON.stringify(results, null, 2)
  );
}
if (process.env.RUN_TEST_DRIVES !== '1') {
  console.log(
    scenarios
      .map((scenario, index) => `${index + 1}. ${scenario.name}`)
      .join('\n')
  );
  console.log(
    'Prepared20 scenarios; no browser or network started. Wait for the final UI build before RUN_TEST_DRIVES=1.'
  );
} else {
  buildHash = (await import('node:crypto'))
    .createHash('sha256')
    .update(await readFile('.output/chrome-mv3/background.js'))
    .digest('hex');
  directory = await mkdtemp(join(tmpdir(), 'emberpage-test-drives-'));
  const icon = await readFile('public/icons/icon-128.png');
  fixtureServer = createServer((request, response) => {
    if (request.url === '/image.png') {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(icon);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(
      request.url === '/empty'
        ? '<html><head><title>Empty original fixture</title></head><body></body></html>'
        : `<html><head><title>Original coastal test fixture</title></head><body><article><h1>Original coastal test fixture</h1>${content}${'<figure><img src="/image.png" alt="Original fixture illustration"></figure>'.repeat(request.url === '/overflow' ? 11 : 1)}</article></body></html>`
    );
  });
  await new Promise((resolve) => fixtureServer.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${fixtureServer.address().port}`;
  try {
    const extension = join(directory, 'extension');
    await cp(resolve('.output/chrome-mv3'), extension, { recursive: true });
    const manifest = JSON.parse(
      await readFile(join(extension, 'manifest.json'), 'utf8')
    );
    manifest.host_permissions = [origin + '/*'];
    await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(
      join(directory, 'profile'),
      {
        headless: true,
        channel: 'chromium',
        executablePath:
          process.env.CHROMIUM_EXECUTABLE || undefined,
        viewport: { width: 420, height: 800 },
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`
        ]
      }
    );
    context.setDefaultTimeout(20_000);
    context.on('request', (request) => {
      if (/primal\.net/.test(request.url())) publicRequests.push(request.url());
    });
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent('serviceworker'));
    base = worker.url().split('/').slice(0, 3).join('/');
    popup = await context.newPage();
    await popup.goto(`${base}/popup.html`);
    await mkdir('artifacts/test-drives', { recursive: true });
    if (recheck.length) {
      await popup.locator('#app').waitFor({ state: 'visible' });
    }
    for (let index = 0; index < scenarios.length; index++) {
      if (recheck.length && !recheck.includes(index + 1)) continue;
      const scenario = scenarios[index],
        started = Date.now();
      actionLog.length = 0;
      lastPage = popup;
      const result = {
        number: index + 1,
        name: scenario.name,
        startedAt: new Date(started).toISOString(),
        actions: actionLog,
        assertions: [],
        passed: false
      };
      try {
        if (scenario.reset !== false) await reset();
        result.assertions = await scenario.run();
        result.passed = true;
      } catch (error) {
        result.error = error.message;
      }
      result.actions = [...actionLog];
      result.durationMs = Date.now() - started;
      const evidencePage = lastPage || popup;
      try {
        result.evidence = `artifacts/test-drives/${recheck.length ? 'recheck-' + runStamp + '-' : ''}${String(index + 1).padStart(2, '0')}.png`;
        await evidencePage.screenshot({ path: result.evidence });
      } catch {
        result.evidence = null;
      }
      results.push(result);
      await logResults();
      await context.setOffline(false);
      console.log(
        `${result.number}/20 ${result.passed ? 'PASS' : 'FAIL'} ${scenario.name}${result.error ? ': ' + result.error : ''}`
      );
    }
    if (results.some((result) => !result.passed)) process.exitCode = 1;
  } finally {
    await context?.close();
    await new Promise((resolve) => fixtureServer.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}
