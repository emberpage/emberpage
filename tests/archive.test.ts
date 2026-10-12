import test from 'node:test';
import { Deferred, Effect } from 'effect';
import type {
  ArticleCopy,
  ArticleNetwork,
  Listing,
  Vote
} from '../src/types.ts';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { ArticleArchive } from '../src/archive.ts';
import { LocalVault, ShareReceipts } from '../src/core/storage.ts';
import { CatalogLedger } from '../src/core/catalog.ts';
import { VoteLedger } from '../src/core/votes.ts';
import { encodeArticle } from '../src/core/article.ts';
import { inspectArticle } from '../src/inspect.ts';
globalThis.document = new JSDOM('<!doctype html>').window.document;
const article = (title: string) => ({
  url: `https://example.org/${title}`,
  title,
  byline: 'Fixture author',
  content: `<p>${'A complete synthetic article explains the observations and evidence clearly. '.repeat(30)}</p>`,
  capturedAt: Date.now() - 90 * 86400000
});
function fixture() {
  const calls: string[] = [];
  const network = {
    listings: [] as Listing[],
    files: new Map<string, ArticleCopy>(),
    failListing: false,
    upload(copy: ArticleCopy) {
      calls.push('upload');
      return Promise.resolve({
        provider: 'https://blossom.primal.net',
        blobHash: copy.blobHash,
        size: copy.size
      });
    },
    publishListing(copy: ArticleCopy): Promise<Listing> {
      calls.push('listing');
      if (this.failListing) throw new Error('Rejected listing');
      return Promise.resolve({
        id: '1'.repeat(64),
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
      });
    },
    queryListings(): Promise<Listing[]> {
      calls.push('query');
      return Promise.resolve(this.listings);
    },
    readArticle(
      listing: Listing,
      {
        budget
      }: {
        budget?: {
          remainingBytes: number;
        };
      } = {}
    ) {
      calls.push('read:' + listing.contentHash);
      const copy = this.files.get(listing.contentHash);
      if (!copy) throw new Error('Missing');
      if (budget) budget.remainingBytes -= copy.size;
      return Promise.resolve(copy);
    },
    queryVotes(): Promise<Vote[]> {
      calls.push('votes');
      return Promise.resolve([]);
    }
  };
  const attempt = <A>(operation: () => Promise<A>) =>
    Effect.tryPromise({
      try: operation,
      catch: (cause) =>
        cause instanceof Error ? cause : new Error('Fixture operation failed')
    });
  const effects: ArticleNetwork = {
    uploadEffect: (copy) => attempt(() => network.upload(copy)),
    publishListingEffect: (copy) => attempt(() => network.publishListing(copy)),
    queryListingsEffect: () => attempt(() => network.queryListings()),
    readArticleEffect: (listing, options) =>
      attempt(() => network.readArticle(listing, options)),
    queryVotesEffect: () => attempt(() => network.queryVotes()),
    publishVoteEffect: () => Effect.fail(new Error('Unexpected fixture vote'))
  };
  const opts = () => ({ name: crypto.randomUUID(), indexedDB });
  const archive = new ArticleArchive({
    network: effects,
    writer: new LocalVault(opts()),
    reader: new LocalVault(opts()),
    receipts: new ShareReceipts(opts()),
    catalog: new CatalogLedger(opts()),
    votes: new VoteLedger(opts()),
    inspect: inspectArticle
  });
  return { archive, network, calls };
}
await test('private cache never calls the network and remains readable beyond24h', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, calls } = fixture();
      const result = await archive.save(article('private'));
      assert.deepEqual(calls, []);
      assert.equal(
        (await archive.read(result.contentHash)).article.title,
        'private'
      );
      assert.deepEqual(await archive.localCatalog(), []);
      assert.equal((await archive.library())[0]?.shared, false);
    })
  ));
await test('share saves locally, uploads first, protects failed listing and retries without another upload', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, network, calls } = fixture();
      network.failListing = true;
      const result = await archive.save(article('pending'), { share: true });
      assert.ok(result.shareError);
      assert.match(result.shareError, /Rejected/);
      assert.deepEqual(calls, ['upload', 'listing']);
      assert.equal((await archive.library())[0]?.pendingShare, true);
      assert.equal(
        (await archive.read(result.contentHash)).article.title,
        'pending'
      );
      network.failListing = false;
      assert.equal((await archive.retry(result.contentHash)).shared, true);
      assert.deepEqual(calls, ['upload', 'listing', 'listing']);
      assert.equal((await archive.library())[0]?.pendingShare, false);
      assert.equal((await archive.localCatalog()).length, 1);
    })
  ));
await test('ineligible article stays private and never uploads or entersPopular', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, calls } = fixture();
      const result = await archive.save(
        { ...article('teaser'), content: '<p>Short teaser</p>' },
        { share: true }
      );
      assert.ok(result.validationError);
      assert.deepEqual(calls, []);
      assert.deepEqual(await archive.localCatalog(), []);
      assert.equal(
        (await archive.read(result.contentHash)).article.content,
        '<p>Short teaser</p>'
      );
    })
  ));
await test('discovery exposes only downloaded filter survivors and keeps reader/contributor records distinct', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, network } = fixture();
      await archive.save(article('private'));
      const copies = await Promise.all([
        encodeArticle(article('complete')),
        encodeArticle({ ...article('short'), content: '<p>Teaser</p>' }),
        encodeArticle(article('missing'))
      ]);
      network.listings = await Promise.all(
        copies.map((copy) => network.publishListing(copy))
      );
      network.files.set(copies[0].contentHash, copies[0]);
      network.files.set(copies[1].contentHash, copies[1]);
      const { entries } = await archive.browse();
      assert.deepEqual(
        entries.map((row) => row.title),
        ['complete']
      );
      const firstEntry = entries[0];
      assert.ok(firstEntry);
      assert.equal(Object.hasOwn(firstEntry, 'article'), false);
      assert.equal(Object.hasOwn(firstEntry, 'bytes'), false);
      const library = await archive.library();
      assert.equal(library.length, 2);
      assert.equal(
        library.find((row) => row.title === 'private')?.source,
        'writer'
      );
      assert.equal(
        library.find((row) => row.title === 'complete')?.source,
        'reader'
      );
    })
  ));
await test('a rating refresh failure keeps validated copies readable and reports the incomplete refresh', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, network } = fixture();
      const copy = await encodeArticle(article('available'));
      network.listings = [await network.publishListing(copy)];
      network.files.set(copy.contentHash, copy);
      network.queryVotes = () => Promise.reject(new Error('Relay unavailable'));
      const result = await archive.browse();
      assert.equal(result.entries.length, 1);
      assert.ok(result.warning);
      assert.match(result.warning, /ratings/);
      await archive.save(article('available'));
      assert.equal(
        (await archive.read(copy.contentHash)).shared,
        true,
        'Private writer copy must not hide a public reader copy of the same content'
      );
    })
  ));
await test('a delayed share inspection protects its copy from concurrent contributor eviction', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, calls } = fixture();
      archive.writer = new LocalVault({
        name: crypto.randomUUID(),
        indexedDB,
        maxRecords: 1
      });
      let releaseInspection: () => void = () => {
        throw new Error('Barrier not initialized');
      };
      const inspectionBarrier = new Promise<void>((resolve) => {
        releaseInspection = resolve;
      });
      let reportInspectionStarted: () => void = () => {
        throw new Error('Barrier not initialized');
      };
      const inspectionStarted = new Promise<void>((resolve) => {
        reportInspectionStarted = resolve;
      });
      let inspections = 0;
      archive.inspect = async (input) => {
        if (input.title === 'protected' && ++inspections === 2) {
          reportInspectionStarted();
          await inspectionBarrier;
        }
        return inspectArticle(input);
      };
      const sharing = archive.save(article('protected'), { share: true });
      await inspectionStarted;
      try {
        const [record] = await archive.writer.listRecords();
        assert.ok(record);
        assert.equal(record.pendingShare, true);
        assert.deepEqual(
          calls,
          [],
          'No upload occurs before the share inspection finishes'
        );
        await assert.rejects(
          archive.save(article('other')),
          /archive is full/i
        );
        assert.deepEqual(
          (await archive.writer.listRecords()).map(
            (record) => record.article.title
          ),
          ['protected']
        );
      } finally {
        releaseInspection();
      }
      const result = await sharing;
      assert.equal(result.shared, true);
      assert.deepEqual(calls, ['upload', 'listing']);
      const completed = await archive.writer.getRecord(result.contentHash);
      assert.ok(completed);
      assert.equal(completed.pendingShare, false);
    })
  ));
await test('a local catalog failure after publication reports accepted sharing and keeps recoverable pending state', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, calls } = fixture();
      const ingest = archive.catalog.ingest.bind(archive.catalog);
      archive.catalog.ingest = () =>
        Promise.reject(new Error('Local catalog write failed'));
      const result = await archive.save(article('accepted'), { share: true });
      assert.equal(result.shared, true);
      assert.equal(result.localSaved, true);
      assert.ok(result.warning);
      assert.match(result.warning, /public share was accepted/i);
      assert.equal(result.shareError, undefined);
      assert.deepEqual(calls, ['upload', 'listing']);
      const record = await archive.writer.getRecord(result.contentHash);
      assert.ok(record);
      assert.equal(record.shared, true);
      assert.equal(record.pendingShare, true);
      const receipt = await archive.receipts.get(result.contentHash);
      assert.ok(receipt);
      assert.equal(receipt.uploaded, true);
      assert.equal(receipt.blobHash, record.blobHash);
      archive.catalog.ingest = ingest;
      assert.equal((await archive.retry(result.contentHash)).shared, true);
      assert.deepEqual(
        calls,
        ['upload', 'listing', 'listing'],
        'Recovery reuses the acknowledged upload'
      );
      const completed = await archive.writer.getRecord(result.contentHash);
      assert.ok(completed);
      assert.equal(completed.pendingShare, false);
      assert.equal(await archive.receipts.get(result.contentHash), null);
    })
  ));
await test('share interruption releases its active lock and keeps the pending copy recoverable', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive } = fixture();
      let announceUpload: () => void = () => {
        throw new Error('Upload barrier not initialized');
      };
      const uploading = new Promise<void>((resolve) => {
        announceUpload = resolve;
      });
      archive.network.uploadEffect = () =>
        Effect.sync(announceUpload).pipe(Effect.andThen(Effect.never));
      const controller = new AbortController();
      const task = Effect.runPromise(
        archive.saveEffect(article('interrupted'), { share: true }),
        { signal: controller.signal }
      );
      await uploading;
      controller.abort();
      await assert.rejects(task);
      assert.equal(archive.activeShares.size, 0);
      const [copy] = await archive.writer.listRecords();
      assert.ok(copy);
      assert.equal(copy.pendingShare, true);
      const receipt = await archive.receipts.get(copy.contentHash);
      assert.ok(receipt);
      assert.equal(receipt.uploaded, false);
      await archive.discardShare(copy.contentHash);
      const canceled = await archive.writer.getRecord(copy.contentHash);
      assert.ok(canceled);
      assert.equal(canceled.pendingShare, false);
      assert.equal(await archive.receipts.get(copy.contentHash), null);
    })
  ));
await test('concurrent explicit browsing shares one discovery operation and allows a later refresh', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const { archive, network, calls } = fixture();
      const gate = Deferred.makeUnsafe<void>();
      const querying = Deferred.makeUnsafe<void>();
      network.queryListings = async () => {
        calls.push('query');
        await Effect.runPromise(Deferred.succeed(querying, undefined));
        await Effect.runPromise(Deferred.await(gate));
        return [];
      };
      const first = archive.browse(),
        second = archive.browse();
      await Effect.runPromise(Deferred.await(querying));
      await Effect.runPromise(Deferred.succeed(gate, undefined));
      assert.deepEqual(await first, await second);
      assert.equal(calls.filter((call) => call === 'query').length, 1);
      network.queryListings = () => {
        calls.push('query');
        return Promise.resolve([]);
      };
      await archive.browse();
      assert.equal(calls.filter((call) => call === 'query').length, 2);
    })
  ));
