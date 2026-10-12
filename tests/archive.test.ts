import { BoundaryError } from '../src/domain/errors.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Deferred, Effect } from 'effect';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import type {
  Article,
  ArticleCopy,
  ArticleNetwork,
  Inspection,
  Listing
} from '../src/domain/types.ts';
import { ArticleArchive } from '../src/application/archive.ts';
import { LocalVault, ShareReceipts } from '../src/storage/indexeddb.ts';
import { CatalogLedger } from '../src/storage/catalog.ts';
import { VoteLedger } from '../src/storage/votes.ts';
import { encodeArticle } from '../src/domain/article.ts';
import { inspectArticle } from '../src/extraction/inspect.ts';

globalThis.document = new JSDOM('<!doctype html>').window.document;
const article = (title: string): Article => ({
  url: `https://example.org/${title}`,
  title,
  byline: 'Fixture author',
  content: `<p>${'A complete synthetic article explains the observations and evidence clearly. '.repeat(30)}</p>`,
  capturedAt: Date.now() - 90 * 86400000
});
const encode = (input: Article) =>
  Effect.tryPromise(() => encodeArticle(input));
function listingFor(copy: ArticleCopy): Listing {
  return {
    id: copy.blobHash,
    pubkey: '2'.repeat(64),
    createdAt: Date.now(),
    url: copy.article.url,
    title: copy.article.title,
    byline: copy.article.byline,
    capturedAt: copy.article.capturedAt,
    urlHash: copy.urlHash,
    contentHash: copy.contentHash,
    blobHash: copy.blobHash,
    size: copy.size,
    provider: 'https://blossom.primal.net'
  };
}
function fixture(
  options: {
    maxWriterRecords?: number;
    inspect?: (article: Article) => Promise<Inspection> | Inspection;
    uploadEffect?: ArticleNetwork['uploadEffect'];
    queryGate?: Deferred.Deferred<void>;
    queryStarted?: Deferred.Deferred<void>;
  } = {}
) {
  const calls: string[] = [];
  const controls = {
    listings: [] as Listing[],
    files: new Map<string, ArticleCopy>(),
    failListing: false,
    failCatalog: false,
    failVotes: false
  };
  const network: ArticleNetwork = {
    uploadEffect:
      options.uploadEffect ??
      ((copy) =>
        Effect.sync(() => {
          calls.push('upload');
          return {
            provider: 'https://blossom.primal.net',
            blobHash: copy.blobHash,
            size: copy.size
          };
        })),
    publishListingEffect: (copy) =>
      Effect.gen(function* () {
        calls.push('listing');
        if (controls.failListing)
          return yield* Effect.fail(
            BoundaryError.from(new Error('Rejected listing'))
          );
        return listingFor(copy);
      }),
    queryListingsEffect: () =>
      Effect.gen(function* () {
        calls.push('query');
        if (options.queryStarted)
          yield* Deferred.succeed(options.queryStarted, undefined);
        if (options.queryGate) yield* Deferred.await(options.queryGate);
        return controls.listings;
      }),
    readArticleEffect: (listing, { budget } = {}) =>
      Effect.gen(function* () {
        calls.push(`read:${listing.contentHash}`);
        const copy = controls.files.get(listing.contentHash);
        if (!copy)
          return yield* Effect.fail(BoundaryError.from(new Error('Missing')));
        if (budget) budget.remainingBytes -= copy.size;
        return copy;
      }),
    queryVotesEffect: () =>
      Effect.gen(function* () {
        calls.push('votes');
        if (controls.failVotes)
          return yield* Effect.fail(
            BoundaryError.from(new Error('Relay unavailable'))
          );
        return [];
      }),
    publishVoteEffect: () =>
      Effect.fail(BoundaryError.from(new Error('Unexpected fixture vote')))
  };
  const database = () => ({ name: crypto.randomUUID(), indexedDB });
  const writer = new LocalVault({
    ...database(),
    maxRecords: options.maxWriterRecords
  });
  const reader = new LocalVault(database());
  const receipts = new ShareReceipts(database());
  const catalog = new CatalogLedger(database());
  const archive = new ArticleArchive({
    network,
    writer,
    reader,
    receipts,
    catalog: {
      ingest: (listings) =>
        controls.failCatalog
          ? Promise.reject(new Error('Local catalog write failed'))
          : catalog.ingest(listings),
      list: () => catalog.list()
    },
    votes: new VoteLedger(database()),
    inspect: options.inspect ?? inspectArticle
  });
  return { archive, controls, calls, writer, reader, receipts };
}

await test('private cache never calls the network and remains readable beyond24h', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, calls } = fixture();
      const result = yield* archive.saveEffect(article('private'));
      assert.deepEqual(calls, []);
      assert.equal(
        (yield* archive.readEffect(result.contentHash)).article.title,
        'private'
      );
      assert.deepEqual(yield* archive.localCatalogEffect(), []);
      assert.equal((yield* archive.libraryEffect())[0]?.shared, false);
    })
  ));

await test('share saves locally, protects a failed listing and retries without another upload', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, controls, calls } = fixture();
      controls.failListing = true;
      const result = yield* archive.saveEffect(article('pending'), {
        share: true
      });
      assert.ok(result.shareError);
      assert.match(result.shareError, /Rejected/);
      assert.deepEqual(calls, ['upload', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, true);
      assert.equal(
        (yield* archive.readEffect(result.contentHash)).article.title,
        'pending'
      );
      controls.failListing = false;
      assert.equal(
        (yield* archive.retryEffect(result.contentHash)).shared,
        true
      );
      assert.deepEqual(calls, ['upload', 'listing', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, false);
      assert.equal((yield* archive.localCatalogEffect()).length, 1);
    })
  ));

await test('ineligible article stays private and never uploads or enters Popular', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, calls } = fixture();
      const result = yield* archive.saveEffect(
        { ...article('teaser'), content: '<p>Short teaser</p>' },
        { share: true }
      );
      assert.ok(result.validationError);
      assert.deepEqual(calls, []);
      assert.deepEqual(yield* archive.localCatalogEffect(), []);
      assert.equal(
        (yield* archive.readEffect(result.contentHash)).article.content,
        '<p>Short teaser</p>'
      );
    })
  ));

await test('discovery exposes only downloaded survivors and keeps reader and contributor copies distinct', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, controls, calls } = fixture();
      yield* archive.saveEffect(article('private'));
      const complete = yield* encode(article('complete'));
      const short = yield* encode({
        ...article('short'),
        content: '<p>Teaser</p>'
      });
      const missing = yield* encode(article('missing'));
      controls.listings = [complete, short, missing].map(listingFor);
      controls.files.set(complete.contentHash, complete);
      controls.files.set(short.contentHash, short);
      const { entries } = yield* archive.browseEffect();
      assert.deepEqual(
        entries.map((entry) => entry.title),
        ['complete']
      );
      assert.ok(
        calls.includes(`read:${short.contentHash}`),
        'Short body must actually reach validation'
      );
      assert.ok(
        calls.includes(`read:${missing.contentHash}`),
        'Unavailable body must actually be attempted'
      );
      const first = entries[0];
      assert.ok(first);
      assert.equal(Object.hasOwn(first, 'article'), false);
      assert.equal(Object.hasOwn(first, 'bytes'), false);
      const library = yield* archive.libraryEffect();
      assert.equal(library.length, 2);
      assert.equal(
        library.find((entry) => entry.title === 'private')?.source,
        'writer'
      );
      assert.equal(
        library.find((entry) => entry.title === 'complete')?.source,
        'reader'
      );
    })
  ));

await test('rating refresh failure retains validated copies and reports the incomplete refresh', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, controls } = fixture();
      const copy = yield* encode(article('available'));
      controls.listings = [listingFor(copy)];
      controls.files.set(copy.contentHash, copy);
      controls.failVotes = true;
      const result = yield* archive.browseEffect();
      assert.equal(result.entries.length, 1);
      assert.match(result.warning, /ratings/);
      yield* archive.saveEffect(article('available'));
      assert.equal(
        (yield* archive.readEffect(copy.contentHash)).shared,
        true,
        'Private copy must not hide a shared reader copy'
      );
    })
  ));

await test('delayed share inspection protects the pending copy from contributor eviction', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const inspectionStarted = Deferred.makeUnsafe<void>();
      const inspectionGate = Deferred.makeUnsafe<void>();
      let inspections = 0;
      const { archive, calls } = fixture({
        maxWriterRecords: 1,
        inspect: (input) =>
          Effect.runPromise(
            Effect.gen(function* () {
              if (input.title === 'protected' && ++inspections === 2) {
                yield* Deferred.succeed(inspectionStarted, undefined);
                yield* Deferred.await(inspectionGate);
              }
              return inspectArticle(input);
            })
          )
      });
      const sharing = Effect.runPromise(
        archive.saveEffect(article('protected'), { share: true })
      );
      yield* Deferred.await(inspectionStarted);
      yield* Effect.gen(function* () {
        const [record] = yield* archive.libraryEffect();
        assert.ok(record);
        assert.equal(record.pendingShare, true);
        assert.deepEqual(calls, [], 'Inspection precedes upload');
        yield* Effect.promise(() =>
          assert.rejects(
            Effect.runPromise(archive.saveEffect(article('other'))),
            /archive is full/i
          )
        );
        assert.deepEqual(
          (yield* archive.libraryEffect()).map((record) => record.title),
          ['protected']
        );
      }).pipe(Effect.ensuring(Deferred.succeed(inspectionGate, undefined)));
      const result = yield* Effect.promise(() => sharing);
      assert.equal(result.shared, true);
      assert.deepEqual(calls, ['upload', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, false);
    })
  ));

await test('local catalog failure after publication reports accepted sharing and retains recoverable state', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, controls, calls, writer, receipts } = fixture();
      controls.failCatalog = true;
      const result = yield* archive.saveEffect(article('accepted'), {
        share: true
      });
      assert.equal(result.shared, true);
      assert.equal(result.localSaved, true);
      assert.ok(result.warning);
      assert.match(result.warning, /public share was accepted/i);
      assert.equal(result.shareError, undefined);
      assert.deepEqual(calls, ['upload', 'listing']);
      const record = yield* Effect.promise(() =>
        writer.getRecord(result.contentHash)
      );
      assert.ok(record);
      assert.equal(record.shared, true);
      assert.equal(record.pendingShare, true);
      const receipt = yield* Effect.promise(() =>
        receipts.get(result.contentHash)
      );
      assert.ok(receipt);
      assert.equal(receipt.uploaded, true);
      assert.equal(receipt.blobHash, record.blobHash);
      controls.failCatalog = false;
      assert.equal(
        (yield* archive.retryEffect(result.contentHash)).shared,
        true
      );
      assert.deepEqual(calls, ['upload', 'listing', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, false);
      assert.equal(
        yield* Effect.promise(() => receipts.get(result.contentHash)),
        null
      );
    })
  ));

await test('interruption leaves a recoverable pending copy and releases the sharing guard', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const uploading = Deferred.makeUnsafe<void>();
      const { archive, receipts } = fixture({
        uploadEffect: () =>
          Deferred.succeed(uploading, undefined).pipe(
            Effect.andThen(Effect.never)
          )
      });
      const controller = new AbortController();
      const task = Effect.runPromise(
        archive.saveEffect(article('interrupted'), { share: true }),
        { signal: controller.signal }
      );
      yield* Deferred.await(uploading);
      controller.abort();
      yield* Effect.promise(() => assert.rejects(task));
      const [copy] = yield* archive.libraryEffect();
      assert.ok(copy);
      assert.equal(copy.pendingShare, true);
      const receipt = yield* Effect.promise(() =>
        receipts.get(copy.contentHash)
      );
      assert.ok(receipt);
      assert.equal(receipt.uploaded, false);
      yield* archive.discardShareEffect(copy.contentHash);
      assert.equal(
        (yield* archive.libraryEffect())[0]?.pendingShare,
        false,
        'Cancel sharing proves the active guard was released'
      );
      assert.equal(
        yield* Effect.promise(() => receipts.get(copy.contentHash)),
        null
      );
    })
  ));

await test('concurrent browsing shares one discovery and permits a later explicit refresh', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const queryStarted = Deferred.makeUnsafe<void>();
      const queryGate = Deferred.makeUnsafe<void>();
      const { archive, calls } = fixture({ queryStarted, queryGate });
      const first = Effect.runPromise(archive.browseEffect());
      const second = Effect.runPromise(archive.browseEffect());
      yield* Deferred.await(queryStarted);
      yield* Deferred.succeed(queryGate, undefined);
      assert.deepEqual(
        yield* Effect.promise(() => first),
        yield* Effect.promise(() => second)
      );
      assert.equal(calls.filter((call) => call === 'query').length, 1);
      yield* archive.browseEffect();
      assert.equal(calls.filter((call) => call === 'query').length, 2);
    })
  ));
