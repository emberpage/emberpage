import test from 'node:test';
import { Effect } from 'effect';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { ArticleArchive } from '../src/archive.ts';
import { LocalVault, ShareReceipts } from '../src/core/storage.js';
import { CatalogLedger } from '../src/core/catalog.js';
import { VoteLedger } from '../src/core/votes.js';
import { encodeArticle } from '../src/core/article.js';
import { inspectArticle } from '../src/inspect.js';
globalThis.document = new JSDOM('<!doctype html>').window.document;
const article = (title) => ({
  url: `https://example.org/${title}`,
  title,
  byline: 'Fixture author',
  content: `<p>${'A complete synthetic article explains the observations and evidence clearly. '.repeat(30)}</p>`,
  capturedAt: Date.now() - 90 * 86400_000
});
function fixture() {
  const calls = [];
  const network = {
    listings: [],
    files: new Map(),
    failListing: false,
    async upload(copy) {
      calls.push('upload');
      return {
        provider: 'https://blossom.primal.net',
        blobHash: copy.blobHash,
        size: copy.size
      };
    },
    async publishListing(copy) {
      calls.push('listing');
      if (this.failListing) throw new Error('Rejected listing');
      const listing = {
        id: '1'.repeat(64),
        pubkey: '2'.repeat(64),
        createdAt: Date.now(),
        ...copy.article,
        urlHash: copy.urlHash,
        contentHash: copy.contentHash,
        blobHash: copy.blobHash,
        size: copy.size,
        provider: 'https://blossom.primal.net'
      };
      delete listing.content;
      return listing;
    },
    async queryListings() {
      calls.push('query');
      return this.listings;
    },
    async readArticle(listing, { budget }) {
      calls.push(`read:${listing.contentHash}`);
      const copy = this.files.get(listing.contentHash);
      if (!copy) throw new Error('Missing');
      budget.remainingBytes -= copy.size;
      return copy;
    },
    async queryVotes() {
      calls.push('votes');
      return [];
    }
  };
  const opts = () => ({ name: crypto.randomUUID(), indexedDB });
  const archive = new ArticleArchive({
    network: Object.fromEntries(['upload', 'publishListing', 'queryListings', 'readArticle', 'queryVotes', 'publishVote'].map(name => [`${name}Effect`, (...args) => Effect.tryPromise({ try: () => network[name](...args), catch: error => error })])),
    writer: new LocalVault(opts()),
    reader: new LocalVault(opts()),
    receipts: new ShareReceipts(opts()),
    catalog: new CatalogLedger(opts()),
    votes: new VoteLedger(opts()),
    inspect: inspectArticle
  });
  return { archive, network, calls };
}
test('private cache never calls the network and remains readable beyond24h', async () => {
  const { archive, calls } = fixture();
  const result = await archive.save(article('private'));
  assert.deepEqual(calls, []);
  assert.equal(
    (await archive.read(result.contentHash)).article.title,
    'private'
  );
  assert.deepEqual(await archive.localCatalog(), []);
  assert.equal((await archive.library())[0].shared, false);
});
test('share saves locally, uploads first, protects failed listing and retries without another upload', async () => {
  const { archive, network, calls } = fixture();
  network.failListing = true;
  const result = await archive.save(article('pending'), { share: true });
  assert.match(result.shareError, /Rejected/);
  assert.deepEqual(calls, ['upload', 'listing']);
  assert.equal((await archive.library())[0].pendingShare, true);
  assert.equal(
    (await archive.read(result.contentHash)).article.title,
    'pending'
  );
  network.failListing = false;
  assert.equal((await archive.retry(result.contentHash)).shared, true);
  assert.deepEqual(calls, ['upload', 'listing', 'listing']);
  assert.equal((await archive.library())[0].pendingShare, false);
  assert.equal((await archive.localCatalog()).length, 1);
});
test('ineligible article stays private and never uploads or entersPopular', async () => {
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
});
test('discovery exposes only downloaded filter survivors and keeps reader/contributor records distinct', async () => {
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
  assert.equal(entries[0].article, undefined);
  assert.equal(entries[0].bytes, undefined);
  const library = await archive.library();
  assert.equal(library.length, 2);
  assert.equal(library.find((row) => row.title === 'private').source, 'writer');
  assert.equal(
    library.find((row) => row.title === 'complete').source,
    'reader'
  );
});

test('a rating refresh failure keeps validated copies readable and reports the incomplete refresh', async () => {
  const { archive, network } = fixture();
  const copy = await encodeArticle(article('available'));
  network.listings = [await network.publishListing(copy)];
  network.files.set(copy.contentHash, copy);
  network.queryVotes = async () => {
    throw new Error('Relay unavailable');
  };
  const result = await archive.browse();
  assert.equal(result.entries.length, 1);
  assert.match(result.warning, /ratings/);
  await archive.save(article('available'));
  assert.equal(
    (await archive.read(copy.contentHash)).shared,
    true,
    'Private writer copy must not hide a public reader copy of the same content'
  );
});

test('a delayed share inspection protects its copy from concurrent contributor eviction', async () => {
  const { archive, calls } = fixture();
  archive.writer = new LocalVault({
    name: crypto.randomUUID(),
    indexedDB,
    maxRecords: 1
  });
  let releaseInspection;
  const inspectionBarrier = new Promise((resolve) => {
    releaseInspection = resolve;
  });
  let reportInspectionStarted;
  const inspectionStarted = new Promise((resolve) => {
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
    assert.equal(record.pendingShare, true);
    assert.deepEqual(
      calls,
      [],
      'No upload occurs before the share inspection finishes'
    );
    await assert.rejects(archive.save(article('other')), /archive is full/i);
    assert.deepEqual(
      (await archive.writer.listRecords()).map((record) => record.title),
      ['protected']
    );
  } finally {
    releaseInspection();
  }
  const result = await sharing;
  assert.equal(result.shared, true);
  assert.deepEqual(calls, ['upload', 'listing']);
  assert.equal(
    (await archive.writer.getRecord(result.contentHash)).pendingShare,
    false
  );
});

test('a local catalog failure after publication reports accepted sharing and keeps recoverable pending state', async () => {
  const { archive, calls } = fixture();
  const ingest = archive.catalog.ingest.bind(archive.catalog);
  archive.catalog.ingest = async () => {
    throw new Error('Local catalog write failed');
  };
  const result = await archive.save(article('accepted'), { share: true });
  assert.equal(result.shared, true);
  assert.equal(result.localSaved, true);
  assert.match(result.warning, /public share was accepted/i);
  assert.equal(result.shareError, undefined);
  assert.deepEqual(calls, ['upload', 'listing']);
  const record = await archive.writer.getRecord(result.contentHash);
  assert.equal(record.shared, true);
  assert.equal(record.pendingShare, true);
  const receipt = await archive.receipts.get(result.contentHash);
  assert.equal(receipt.uploaded, true);
  assert.equal(receipt.blobHash, record.blobHash);
  archive.catalog.ingest = ingest;
  assert.equal((await archive.retry(result.contentHash)).shared, true);
  assert.deepEqual(
    calls,
    ['upload', 'listing', 'listing'],
    'Recovery reuses the acknowledged upload'
  );
  assert.equal(
    (await archive.writer.getRecord(result.contentHash)).pendingShare,
    false
  );
  assert.equal(await archive.receipts.get(result.contentHash), null);
});

test('share interruption releases its active lock and keeps the pending copy recoverable', async () => {
  const { archive } = fixture();
  let announceUpload;
  const uploading = new Promise(resolve => { announceUpload = resolve; });
  archive.network.uploadEffect = () => Effect.sync(announceUpload).pipe(Effect.andThen(Effect.never));
  const controller = new AbortController();
  const task = Effect.runPromise(archive.saveEffect(article('interrupted'), { share: true }), { signal: controller.signal });
  await uploading;
  controller.abort();
  await assert.rejects(task);
  assert.equal(archive.activeShares.size, 0);
  const [copy] = await archive.writer.listRecords();
  assert.equal(copy.pendingShare, true);
  assert.equal((await archive.receipts.get(copy.contentHash)).uploaded, false);
  await archive.discardShare(copy.contentHash);
  assert.equal((await archive.writer.getRecord(copy.contentHash)).pendingShare, false);
  assert.equal(await archive.receipts.get(copy.contentHash), null);
});

test('concurrent explicit browsing shares one discovery operation and allows a later refresh', async () => {
  const { archive, network, calls } = fixture();
  let release;
  network.queryListings = () => { calls.push('query'); return new Promise(resolve => { release = () => resolve([]); }); };
  const first = archive.browse(), second = archive.browse();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release();
  assert.deepEqual(await first, await second);
  assert.equal(calls.filter(call => call === 'query').length, 1);
  network.queryListings = async () => { calls.push('query'); return []; };
  await archive.browse();
  assert.equal(calls.filter(call => call === 'query').length, 2);
});
