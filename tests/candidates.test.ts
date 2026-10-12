import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { encodeArticle } from '../src/core/article.ts';
import { filterCandidates, rankCandidates } from '../src/core/candidates.ts';
import { inspectArticle } from '../src/inspect.ts';
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
await test('actual body inspection accepts only complete survivors and ignores producer text claims', () =>
  Effect.runPromise(
    Effect.promise(async () => {
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
      const winner = result[0];
      assert.ok(winner);
      assert.equal(winner.contentHash, good.contentHash);
      assert.equal(winner.article.textContent, text.trim());
      assert.deepEqual(winner.bytes, good.bytes);
    })
  ));
await test('deduplication retains earliest listing age, not repeated-copy reputation', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const good = await make(),
        older = await make({ capturedAt: now - 86400000 }, now - 3600000);
      const diagnostics: {
        duplicates?: number;
      } = {};
      const result = await filterCandidates([good, older, good], {
        inspect: inspectArticle,
        now,
        diagnostics
      });
      assert.equal(result.length, 1);
      const winner = result[0];
      assert.ok(winner);
      assert.equal(winner.listedAt, older.listedAt);
      assert.equal(diagnostics.duplicates, 2);
      assert.equal(
        rankCandidates(result, new Map(), now)[0]?.score,
        2 / 3 ** 1.5
      );
    })
  ));
await test('quality bounds remain mandatory while remote resources are removed safely', () =>
  Effect.runPromise(
    Effect.promise(async () => {
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
      assert.ok(safe.article.textContent);
      assert.match(safe.article.textContent, /Unavailable chart/);
      await assert.rejects(filterCandidates([copy], { now }), /inspection/);
    })
  ));
await test('verified rating counts and listing age determine ranking with deterministic ties', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const first = await make(),
        older = await make({ title: 'Different snapshot' }, now - 3600000);
      const ratings = new Map([
        [older.contentHash, { upvotes: 10, downvotes: 0 }],
        [first.contentHash, { upvotes: 0, downvotes: 1 }]
      ]);
      const ranked = rankCandidates([first, older], ratings, now);
      assert.equal(ranked[0]?.contentHash, older.contentHash);
      assert.deepEqual(
        rankCandidates([older, first], ratings, now).map(
          (copy) => copy.contentHash
        ),
        ranked.map((copy) => copy.contentHash)
      );
    })
  ));
