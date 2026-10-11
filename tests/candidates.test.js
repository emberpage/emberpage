import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { encodeArticle } from '../src/core/article.js';
import { filterCandidates, rankCandidates } from '../src/core/candidates.js';
import { inspectArticle } from '../src/inspect.js';
globalThis.document = new JSDOM('').window.document;
const now = Date.now(),
  text =
    'Complete observations describe coastal wildlife, tides and weather, preserving useful detail for readers. '.repeat(
      20
    );
const article = {
  url: 'https://example.org/article',
  title: 'Coastal notebook',
  byline: 'Writer',
  capturedAt: now,
  content: `<p>${text}</p>`
};
const make = async (fields = {}, listedAt = now) => ({
  ...(await encodeArticle({ ...article, ...fields }, { now })),
  listedAt
});
test('actual body inspection accepts only complete survivors and ignores producer text claims', async () => {
  const good = await make({ textContent: 'Stale claim' }),
    short = await make({
      content: '<p>A short excerpt.</p>',
      textContent: text
    });
  const hidden = await make({
    content: `<p>A short excerpt.</p><div hidden>${text}</div>`
  });
  const damaged = { ...good, blobHash: '0'.repeat(64) };
  const result = await filterCandidates([short, hidden, damaged, good], {
    inspect: inspectArticle,
    now
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].contentHash, good.contentHash);
  assert.equal(result[0].article.textContent, text.trim());
  assert.deepEqual(result[0].bytes, good.bytes);
});
test('deduplication retains earliest listing age, not repeated-copy reputation', async () => {
  const good = await make(),
    older = await make({ capturedAt: now - 86400000 }, now - 3600000);
  const diagnostics = {};
  const result = await filterCandidates([good, older, good], {
    inspect: inspectArticle,
    now,
    diagnostics
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].listedAt, older.listedAt);
  assert.equal(diagnostics.duplicates, 2);
  assert.equal(result[0].score, 2 / 3 ** 1.5);
});
test('quality bounds remain mandatory while remote resources are removed safely', async () => {
  const copy = await make();
  const valid = inspectArticle(article);
  for (const change of [
    { textContent: 'Short' },
    { blocks: 0 },
    { images: 11 },
    { textDensity: 0.09 },
    { textDensity: NaN }
  ])
    assert.deepEqual(
      await filterCandidates([copy], {
        now,
        inspect: () => ({ ...valid, ...change })
      }),
      []
    );
  const compatible = await make({
    content: `<future-wrapper><p>${text}</p><img src="https://example.org/unavailable.png" alt="Unavailable chart"><script>poison()</script></future-wrapper>`
  });
  const [safe] = await filterCandidates([compatible], {
    now,
    inspect: inspectArticle
  });
  assert.ok(safe);
  assert.ok(!safe.article.content.includes('poison'));
  assert.match(safe.article.textContent, /Unavailable chart/);
  await assert.rejects(filterCandidates([copy], { now }), /inspection/);
});
test('verified rating counts and listing age determine ranking with deterministic ties', async () => {
  const first = await make(),
    older = await make({ title: 'Different snapshot' }, now - 3600000);
  const ratings = new Map([
    [older.contentHash, { upvotes: 10, downvotes: 0 }],
    [first.contentHash, { upvotes: 0, downvotes: 1 }]
  ]);
  const ranked = rankCandidates([first, older], ratings, now);
  assert.equal(ranked[0].contentHash, older.contentHash);
  assert.deepEqual(
    rankCandidates([older, first], ratings, now).map(
      (copy) => copy.contentHash
    ),
    ranked.map((copy) => copy.contentHash)
  );
});
