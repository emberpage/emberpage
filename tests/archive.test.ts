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
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';
import { PUBLIC_BOOTSTRAP_ROUTES } from '../src/domain/routes.ts';
import { inspectArticle } from '../src/extraction/inspect.ts';

globalThis.document = new JSDOM('<!doctype html>').window.document;
const article = (title: string): Article => ({
  url: "https://example.org/article",
  title,
  byline: 'Fixture author',
  content: `<p>${'A complete synthetic article explains the observations and evidence clearly. '.repeat(30)}</p>`,
  capturedAt: Date.now() - 90 * 86400000
});
const encode = (input: Article) =>
  Effect.tryPromise(() => encodeArticle(input));
const cidFor = (copy: ArticleCopy) => CID.createV1(0x55, createDigest(0x12, Uint8Array.from(Buffer.from(copy.blobHash, 'hex')))).toString();
const routes = [`${PUBLIC_BOOTSTRAP_ROUTES[0]}/p2p-circuit/webrtc/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`];
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
    cid: cidFor(copy), routes
  };
}
function fixture(
  options: {
    maxWriterRecords?: number;
    inspect?: (article: Article) => Promise<Inspection> | Inspection;
    pinEffect?: ArticleNetwork['pinEffect'];
    pauseEffect?: ArticleNetwork['pauseEffect'];
    clearPinsEffect?: ArticleNetwork['clearPinsEffect'];
    forgetEffect?: ArticleNetwork['forgetEffect'];
    queryGate?: Deferred.Deferred<void>;
    queryStarted?: Deferred.Deferred<void>;
  } = {}
) {
  const calls: string[] = [];
  const retained = new Map<string, {blobHash: string; size: number}>();
  const controls = {
    listings: [] as Listing[],
    files: new Map<string, ArticleCopy>(),
    failListing: false,
    failCatalog: false,
    failVotes: false,
    listingWarning: undefined as string | undefined,
    votesWarning: undefined as string | undefined,
    queriedUrls: [] as (string | undefined)[],
    reads: [] as Listing[],
    readRoutes: [] as (readonly string[] | undefined)[],
    forgotten: [] as string[],
    failForget: false
  };
  const network: ArticleNetwork = {
    pauseEffect: options.pauseEffect ?? (() => Effect.sync(() => {calls.push('pause');})),
    forgetEffect: options.forgetEffect ?? (hash => Effect.suspend(() => {
      controls.forgotten.push(hash);
      if (controls.failForget) return Effect.fail(BoundaryError.from(new Error("Pin removal failed")));
      retained.delete(hash);
      return Effect.void;
    })),
    clearPinsEffect: options.clearPinsEffect ?? (() => Effect.sync(() => {retained.clear();})),
    pinEffect:
      options.pinEffect ??
      ((copy) =>
        Effect.sync(() => {
          calls.push('pin');
          retained.set(copy.blobHash, {blobHash: copy.blobHash, size: copy.size});
          return {
            cid: cidFor(copy),
            blobHash: copy.blobHash,
            size: copy.size, routes
          };
        })),
    publishListingEffect: (copy) =>
      Effect.gen(function* () {
        calls.push('listing');
        if (controls.failListing)
          return yield* Effect.fail(
            BoundaryError.from(new Error('Rejected listing'))
          );
        return { ...listingFor(copy), warning: controls.listingWarning };
      }),
    queryListingsEffect: (url) =>
      Effect.gen(function* () {
        calls.push('query');
        controls.queriedUrls.push(url);
        if (options.queryStarted)
          yield* Deferred.succeed(options.queryStarted, undefined);
        if (options.queryGate) yield* Deferred.await(options.queryGate);
        return {records: controls.listings};
      }),
    readArticleEffect: (listing, { budget, routes } = {}) =>
      Effect.gen(function* () {
        calls.push(`read:${listing.contentHash}`);
        controls.reads.push(listing);
        controls.readRoutes.push(routes);
        const copy = controls.files.get(listing.blobHash) ?? controls.files.get(listing.contentHash);
        if (!copy)
          return yield* Effect.fail(BoundaryError.from(new Error('Missing')));
        if (copy.blobHash !== listing.blobHash || copy.article.title !== listing.title)
          return yield* BoundaryError.from(new Error('Listing does not match file'));
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
        return {records: [], warning: controls.votesWarning};
      }),
    publishVoteEffect: () =>
      Effect.fail(BoundaryError.from(new Error('Unexpected fixture vote')))
  };
  const database = () => ({ name: crypto.randomUUID(), indexedDB });
  const writer = new LocalVault({
    ...database(),
    retainedFiles: () => Promise.resolve([...retained.keys()]),
    maxRecords: options.maxWriterRecords
  });
  const reader = new LocalVault(database());
  const receipts = new ShareReceipts(database());
  const catalog = new CatalogLedger(database());
  const archive = new ArticleArchive({
    network,
    contributions: {list: () => Promise.resolve([...retained.values()])},
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
  return { archive, controls, calls, writer, reader, receipts, retained };
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
      assert.deepEqual(yield* archive.localCatalogEffect(article("fixture").url), []);
      assert.equal((yield* archive.libraryEffect())[0]?.shared, false);
    })
  ));

await test('saved copies are newest first across both stores and remain scoped to the current URL', () =>
  Effect.runPromise(Effect.gen(function* () {
    const { archive, writer, reader } = fixture();
    const capturedAt = Date.now() - 86400000;
    const records = [
      { title: 'oldest writer', capturedAt, store: writer, source: 'writer' },
      { title: 'older reader', capturedAt: capturedAt + 1000, store: reader, source: 'reader' },
      { title: 'newer writer', capturedAt: capturedAt + 2000, store: writer, source: 'writer' },
      { title: 'newest reader', capturedAt: capturedAt + 3000, store: reader, source: 'reader' },
    ];
    const expected = [];
    for (const record of records) {
      const copy = yield* encode({ ...article(record.title), capturedAt: record.capturedAt });
      yield* Effect.promise(() => record.store.saveRecord(copy));
      expected.unshift({ title: record.title, contentHash: copy.contentHash, source: record.source });
    }
    const foreign = yield* encode({ ...article('other page'), url: 'https://example.org/other', capturedAt: capturedAt + 4000 });
    yield* Effect.promise(() => reader.saveRecord(foreign));
    const copies = yield* archive.libraryEffect(`${article('fixture').url}?utm_source=fixture#section`);
    assert.deepEqual(copies.map(({ title, contentHash, source }) => ({ title, contentHash, source })), expected);
    assert.deepEqual((yield* archive.libraryEffect()).map(copy => copy.title), ['other page', ...expected.map(copy => copy.title)]);
  })));

await test('a damaged article stays manageable without being accepted for reading or contribution', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, writer, controls, calls} = fixture();
    const saved = yield* archive.saveEffect(article('damaged saved copy'));
    const original = yield* Effect.promise(() => writer.getRecord(saved.contentHash));
    assert.ok(original);
    yield* Effect.promise(() => writer.store.update(records => records.map(record => {
      if (record.contentHash !== saved.contentHash) return record;
      const bytes = record.bytes.slice();
      bytes[0] = (bytes[0] ?? 0) ^ 1;
      return {...record, bytes};
    })));
    const listed = yield* archive.libraryEffect(original.article.url);
    assert.deepEqual(listed.map(copy => copy.title), ['damaged saved copy']);
    assert.equal('article' in (listed[0] ?? {}), false);
    assert.equal('bytes' in (listed[0] ?? {}), false);
    yield* Effect.promise(async () => {
      await assert.rejects(Effect.runPromise(archive.readEffect(saved.contentHash)), /hash/);
      await assert.rejects(Effect.runPromise(archive.contributeEffect(saved.contentHash)), /hash/);
    });
    assert.deepEqual(calls, [], 'Metadata listing does not authorize a public pin or publication');
    yield* archive.removeEffect(saved.contentHash, 'writer');
    assert.deepEqual(controls.forgotten, [original.blobHash]);
    assert.deepEqual(yield* archive.libraryEffect(), []);
  })));

await test('share saves locally, protects a failed listing and refreshes live routes on retry without duplicating the local pin', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { archive, controls, calls, receipts } = fixture();
      controls.failListing = true;
      const result = yield* archive.saveEffect(article('pending'), {
        share: true
      });
      assert.ok(result.shareError);
      assert.match(result.shareError, /Rejected/);
      assert.equal(result.pinned, true);
      const receipt = yield* Effect.promise(() => receipts.get(result.contentHash));
      assert.equal(receipt?.pinned, true);
      assert.equal(receipt?.cid, result.cid);
      assert.deepEqual(calls, ['pin', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, true);
      assert.equal(
        (yield* archive.readEffect(result.contentHash)).article.title,
        'pending'
      );
      controls.failListing = false;
      assert.equal(
        (yield* archive.contributeEffect(result.contentHash)).shared,
        true
      );
      assert.deepEqual(calls, ['pin', 'listing', 'pin', 'listing']);
      assert.equal((yield* archive.libraryEffect())[0]?.pendingShare, false);
      assert.equal((yield* archive.localCatalogEffect(article("fixture").url)).length, 1);
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
      assert.deepEqual(yield* archive.localCatalogEffect(article("fixture").url), []);
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
      const { entries } = yield* archive.browseEffect(article("fixture").url);
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
      const result = yield* archive.browseEffect(article("fixture").url);
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
        assert.deepEqual(calls, [], 'Inspection precedes pinning');
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
      assert.deepEqual(calls, ['pin', 'listing']);
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
      assert.match(result.warning, /shared publicly/i);
      assert.equal(result.shareError, undefined);
      assert.deepEqual(calls, ['pin', 'listing']);
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
      assert.equal(receipt.pinned, true);
      assert.equal(receipt.blobHash, record.blobHash);
      controls.failCatalog = false;
      assert.equal(
        (yield* archive.contributeEffect(result.contentHash)).shared,
        true
      );
      assert.deepEqual(calls, ['pin', 'listing', 'pin', 'listing']);
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
        pinEffect: () =>
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
      assert.equal(receipt.pinned, false);
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
      const first = Effect.runPromise(archive.browseEffect(article("fixture").url));
      const second = Effect.runPromise(archive.browseEffect(`${article("fixture").url}?utm_source=test#section`));
      yield* Deferred.await(queryStarted);
      yield* Deferred.succeed(queryGate, undefined);
      assert.deepEqual(
        yield* Effect.promise(() => first),
        yield* Effect.promise(() => second)
      );
      assert.equal(calls.filter((call) => call === 'query').length, 1);
      yield* archive.browseEffect(article("fixture").url);
      assert.equal(calls.filter((call) => call === 'query').length, 2);
    })
  ));

await test('unverified snapshot claims and mislabeled blobs cannot suppress valid alternatives', () =>
  Effect.runPromise(Effect.gen(function* () {
    for (const field of ['blobHash', 'title'] as const) {
      const {archive, controls} = fixture();
      const copy = yield* encode(article('legitimate'));
      const valid = listingFor(copy);
      const poison = {...valid, id:'a'.repeat(64), pubkey:'3'.repeat(64), createdAt:valid.createdAt+1000,
        [field]:field === 'blobHash' ? '0'.repeat(64) : 'Forged title'};
      controls.listings = [poison, valid];
      controls.files.set(copy.contentHash, copy);
      const result = yield* archive.browseEffect(article("fixture").url);
      assert.deepEqual(result.entries.map(entry=>entry.title), ['legitimate']);
      assert.equal(controls.reads.length, 2);
    }
  })));

await test('current URL discovery bounds attempts and limits each signing key', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    for (let index=0; index<40; index++) {
      const copy = yield* encode({...article(`candidate-${index}`),
        url:article('fixture').url});
      controls.files.set(copy.contentHash, copy);
      controls.listings.push({...listingFor(copy), pubkey:index<20 ? '2'.repeat(64) : index.toString(16).padStart(64,'0')});
    }
    yield* archive.browseEffect(article("fixture").url);
    assert.equal(controls.reads.length, 20);
    assert.ok(controls.reads.filter(entry=>entry.pubkey==='2'.repeat(64)).length <= 4);
    assert.ok(controls.reads.some(entry=>entry.pubkey!=='2'.repeat(64)));
  })));

await test('identical file claims share one download and retain earliest listing age', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    const copy = yield* encode(article('same-snapshot'));
    const valid = listingFor(copy);
    controls.listings = [valid, {...valid,id:'b'.repeat(64),pubkey:'3'.repeat(64),createdAt:valid.createdAt-1000}];
    controls.files.set(copy.contentHash, copy);
    const result = yield* archive.browseEffect(article("fixture").url);
    assert.equal(result.entries.length,1);
    assert.equal(controls.reads.length,1,'Identical file/metadata bindings need one download');
    assert.equal(result.entries[0]?.listedAt, valid.createdAt-1000);
  })));

await test('different verified files with one snapshot merge without boosting reputation', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls, reader} = fixture();
    const newer = yield* encode(article('snapshot'));
    const older = yield* encode({...newer.article, capturedAt:newer.article.capturedAt-1000});
    const recent = listingFor(newer);
    const earlier = {...listingFor(older),pubkey:'3'.repeat(64),createdAt:recent.createdAt-1000};
    controls.listings = [recent,earlier];
    controls.files.set(newer.blobHash,newer);
    controls.files.set(older.blobHash,older);
    const result = yield* archive.browseEffect(article("fixture").url);
    assert.equal(controls.reads.length,2);
    assert.equal(result.entries.length,1);
    assert.equal(result.entries[0]?.listedAt,earlier.createdAt);
    assert.equal((yield* Effect.promise(()=>reader.listRecords())).length,1);
  })));

await test("reposting someone else's exact file claims cannot spend their publisher allowance", () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    for(let index=0;index<8;index++) {
      const copy = yield* encode(article(`reposted-${index}`));
      const original = {...listingFor(copy),pubkey:(index+10).toString(16).padStart(64,'0')};
      controls.files.set(copy.blobHash,copy);
      controls.listings.push({...original,id:(index+20).toString(16).padStart(64,'0'),pubkey:'2'.repeat(64),createdAt:original.createdAt+1000},original);
    }
    const result = yield* archive.browseEffect(article("fixture").url);
    assert.equal(result.entries.length,8);
    assert.equal(controls.reads.length,8);
    assert.equal(controls.reads.filter(entry=>entry.pubkey==='2'.repeat(64)).length,4);
  })));

await test('current URL discovery rejects foreign relay and cached listings before downloading', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    const matching = yield* encode(article('current'));
    const foreign = yield* encode({...article('foreign'),url:'https://example.org/other'});
    controls.listings = [listingFor(matching),listingFor(foreign)];
    controls.files.set(matching.blobHash,matching);
    controls.files.set(foreign.blobHash,foreign);
    yield* archive.saveEffect(foreign.article,{share:true});
    const found = yield* archive.browseEffect(`${matching.article.url}?utm_source=fixture#section`);
    assert.deepEqual(found.entries.map(entry=>entry.title),['current']);
    assert.deepEqual(controls.queriedUrls,[matching.article.url]);
    assert.deepEqual(controls.reads.map(entry=>entry.url),[matching.article.url]);
    assert.deepEqual((yield* archive.localCatalogEffect(matching.article.url)).map(entry=>entry.title),['current']);
    assert.deepEqual((yield* archive.libraryEffect(matching.article.url)).map(entry=>entry.title),['current']);
    assert.equal((yield* archive.libraryEffect()).length,2);
    assert.deepEqual((yield* archive.localCatalogEffect(foreign.article.url)).map(entry=>entry.title),['foreign']);
  })));

await test('concurrent lookups for different URLs never share results or pending discovery', () =>
  Effect.runPromise(Effect.gen(function* () {
    const queryStarted=Deferred.makeUnsafe<void>();
    const queryGate=Deferred.makeUnsafe<void>();
    const {archive,controls}=fixture({queryStarted,queryGate});
    const a=yield* encode(article('a'));
    const b=yield* encode({...article('b'),url:'https://example.org/b'});
    controls.listings=[listingFor(a),listingFor(b)];
    controls.files.set(a.blobHash,a);
    controls.files.set(b.blobHash,b);
    const first=Effect.runPromise(archive.browseEffect(a.article.url));
    yield* Deferred.await(queryStarted);
    const second=Effect.runPromise(archive.browseEffect(b.article.url));
    yield* Deferred.succeed(queryGate,undefined);
    const resultA=yield* Effect.promise(()=>first);
    const resultB=yield* Effect.promise(()=>second);
    assert.deepEqual(resultA.entries.map(entry=>entry.url),[a.article.url]);
    assert.deepEqual(resultB.entries.map(entry=>entry.url),[b.article.url]);
    assert.deepEqual(controls.queriedUrls.sort(),[a.article.url,b.article.url].sort());
  })));

await test('at most two distinct URL discoveries run concurrently and cancellation releases capacity', () =>
  Effect.runPromise(Effect.gen(function* () {
    const queryStarted=Deferred.makeUnsafe<void>();
    const queryGate=Deferred.makeUnsafe<void>();
    const {archive,controls}=fixture({queryStarted,queryGate});
    const controller=new AbortController();
    const first=Effect.runPromise(archive.browseEffect('https://example.org/a'),{signal:controller.signal});
    const canceled=first.catch(()=>undefined);
    yield* Deferred.await(queryStarted);
    const second=Effect.runPromise(archive.browseEffect('https://example.org/b'));
    yield* Effect.promise(async()=>{
      await assert.rejects(Effect.runPromise(archive.browseEffect('https://example.org/c')),/Wait for an article search/);
    });
    assert.equal(controls.queriedUrls.length,2);
    controller.abort();
    yield* Effect.promise(()=>canceled);
    const third=Effect.runPromise(archive.browseEffect('https://example.org/c'));
    yield* Deferred.succeed(queryGate,undefined);
    yield* Effect.promise(()=>second);
    yield* Effect.promise(()=>third);
    assert.deepEqual(controls.queriedUrls,['https://example.org/a','https://example.org/b','https://example.org/c']);
  })));

await test('explicit sharing pins the exact private saved snapshot before announcing and rejects ineligible bodies', () =>
  Effect.runPromise(Effect.gen(function* () {
    const pinned: ArticleCopy[] = [];
    const { archive, calls } = fixture({ pinEffect: copy => Effect.sync(() => {
      pinned.push(copy);
      return { cid: cidFor(copy), blobHash: copy.blobHash, size: copy.size, routes };
    }) });
    const saved = yield* archive.saveEffect(article('private-mirror'));
    const original = yield* archive.recordEffect(saved.contentHash);
    const result = yield* archive.contributeEffect(saved.contentHash);
    assert.equal(result.shared, true);
    assert.equal(result.cid, cidFor(original));
    assert.deepEqual(pinned[0]?.bytes, original.bytes);
    assert.equal((yield* archive.libraryEffect())[0]?.shared, true);
    assert.deepEqual(calls, ['listing']);
    const short = yield* archive.saveEffect({ ...article('teaser-mirror'), content: '<p>Short</p>' });
    const rejected = yield* archive.contributeEffect(short.contentHash);
    assert.equal(rejected.shared, false);
    assert.match(rejected.validationError || '', /too short/);
    assert.equal(pinned.length, 1);
  })));

await test('contribution retries retain the pending file when the reader has another encoding of the same snapshot', () =>
  Effect.runPromise(Effect.gen(function* () {
    const pinned: ArticleCopy[] = [];
    const { archive, controls, writer, reader, receipts } = fixture({ pinEffect: copy => Effect.sync(() => {
      pinned.push(copy);
      return { cid: cidFor(copy), blobHash: copy.blobHash, size: copy.size, routes };
    }) });
    controls.failListing = true;
    const pending = yield* archive.saveEffect(article('pending exact file'), { share: true });
    const retained = yield* Effect.promise(() => writer.getRecord(pending.contentHash));
    assert.ok(retained);
    const downloaded = yield* encode({ ...retained.article, capturedAt: retained.article.capturedAt + 1000 });
    assert.equal(downloaded.contentHash, retained.contentHash);
    assert.notEqual(downloaded.blobHash, retained.blobHash);
    yield* Effect.promise(() => reader.saveRecord(downloaded, { shared: true }));
    controls.failListing = false;
    const result = yield* archive.contributeEffect(pending.contentHash);
    assert.equal(result.shared, true);
    assert.equal(result.cid, cidFor(retained));
    assert.deepEqual(pinned.map(copy => copy.blobHash), [retained.blobHash, retained.blobHash]);
    assert.equal(yield* Effect.promise(() => receipts.get(pending.contentHash)), null);
    assert.equal((yield* Effect.promise(() => reader.getRecord(pending.contentHash)))?.blobHash, downloaded.blobHash);
  })));

await test('a relay replication warning retains accepted sharing and its verified CID', () =>
  Effect.runPromise(Effect.gen(function* () {
    const { archive, controls } = fixture();
    controls.listingWarning = 'One relay did not accept this listing.';
    const result = yield* archive.saveEffect(article('partial-replication'), { share: true });
    assert.equal(result.shared, true);
    assert.equal(result.pinned, true);
    assert.ok(result.cid);
    assert.match(result.warning || '', /One relay/);
    assert.equal(result.shareError, undefined);
  })));

await test('pause belongs to the archive and preserves private copies and unfinished share receipts', () =>
  Effect.runPromise(Effect.gen(function* () {
    const { archive, controls, calls, receipts } = fixture();
    const privateCopy = yield* archive.saveEffect(article('private during pause'));
    controls.failListing = true;
    const pending = yield* archive.saveEffect(article('pending during pause'), {share: true});
    const before = yield* Effect.promise(() => receipts.get(pending.contentHash));
    yield* archive.pauseEffect();
    assert.deepEqual(calls, ['pin', 'listing', 'pause']);
    assert.equal((yield* archive.readEffect(privateCopy.contentHash)).shared, false);
    assert.deepEqual(yield* Effect.promise(() => receipts.get(pending.contentHash)), before);
    assert.equal((yield* archive.libraryEffect()).find(copy => copy.contentHash === pending.contentHash)?.pendingShare, true);
  })));

await test('pause and sharing cannot overlap, and pause failures release the archive guard', () =>
  Effect.runPromise(Effect.gen(function* () {
    const pinStarted = Deferred.makeUnsafe<void>();
    const pinGate = Deferred.makeUnsafe<void>();
    const pauseStarted = Deferred.makeUnsafe<void>();
    const pauseGate = Deferred.makeUnsafe<void>();
    let pauses = 0;
    const { archive } = fixture({
      pinEffect: copy => Effect.gen(function* () {
        yield* Deferred.succeed(pinStarted, undefined);
        yield* Deferred.await(pinGate);
        return {cid: cidFor(copy), blobHash: copy.blobHash, size: copy.size, routes};
      }),
      pauseEffect: () => Effect.gen(function* () {
        if (++pauses === 1) {
          yield* Deferred.succeed(pauseStarted, undefined);
          yield* Deferred.await(pauseGate);
          return yield* BoundaryError.from(new Error('Pause failed'));
        }
      }),
    });
    const saved = yield* archive.saveEffect(article('ordered pause'));
    const sharing = Effect.runPromise(archive.contributeEffect(saved.contentHash));
    yield* Deferred.await(pinStarted);
    yield* Effect.promise(() => assert.rejects(Effect.runPromise(archive.pauseEffect()), /sharing to finish/));
    assert.equal(pauses, 0);
    yield* Deferred.succeed(pinGate, undefined);
    yield* Effect.promise(() => sharing);
    const pausing = Effect.runPromise(archive.pauseEffect()).catch((error: unknown) => error);
    yield* Deferred.await(pauseStarted);
    yield* Effect.promise(() => assert.rejects(Effect.runPromise(archive.contributeEffect(saved.contentHash)), /contribution to pause/));
    yield* Deferred.succeed(pauseGate, undefined);
    assert.match(String(yield* Effect.promise(() => pausing)), /Pause failed/);
    yield* archive.pauseEffect();
    assert.equal(pauses, 2);
    assert.equal((yield* archive.contributeEffect(saved.contentHash)).shared, true);
  })));

await test('keeping a reader snapshot promotes it to the contributor quota before pinning', () =>
  Effect.runPromise(Effect.gen(function* () {
    const { archive, writer, reader, calls } = fixture({ maxWriterRecords: 1 });
    const own = yield* encode(article('protected writer'));
    yield* Effect.promise(() => writer.saveRecord(own, { pendingShare: true }));
    const downloaded = yield* encode(article('reader snapshot'));
    yield* Effect.promise(() => reader.saveRecord({ ...downloaded, shared: true }));
    yield* Effect.promise(() => assert.rejects(Effect.runPromise(archive.contributeEffect(downloaded.contentHash)), /archive is full/i));
    assert.deepEqual(calls, [], 'Contributor capacity is checked before public side effects');
    assert.ok(yield* Effect.promise(() => reader.getRecord(downloaded.contentHash)));
    yield* Effect.promise(() => writer.setPending(own.contentHash, false));
    const result = yield* archive.contributeEffect(downloaded.contentHash);
    assert.equal(result.shared, true);
    assert.ok(yield* Effect.promise(() => writer.getRecord(downloaded.contentHash)));
    assert.equal(yield* Effect.promise(() => writer.getRecord(own.contentHash)), null);
    assert.deepEqual(calls, ['pin', 'listing']);
  })));

await test('identical CID claims combine independent mirror routes without adding ranking entries', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    const copy = yield* encode(article('replicated snapshot'));
    const first = listingFor(copy);
    const secondRoute = `${PUBLIC_BOOTSTRAP_ROUTES[1]}/p2p-circuit/webrtc/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN`;
    controls.listings = [first, {...first, id: 'a'.repeat(64), pubkey: '3'.repeat(64), routes: [secondRoute]}];
    controls.files.set(copy.blobHash, copy);
    const result = yield* archive.browseEffect(copy.article.url);
    assert.equal(result.entries.length, 1);
    assert.equal(controls.reads.length, 1);
    assert.deepEqual([...(controls.readRoutes[0] ?? [])].sort(), [...first.routes, secondRoute].sort());
  })));

await test('explicit contributor removal releases its pin and preserves the saved copy if cleanup fails', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls, writer, receipts} = fixture();
    controls.failListing = true;
    const saved = yield* archive.saveEffect(article('removal'), {share: true});
    const copy = yield* archive.recordEffect(saved.contentHash);
    controls.failForget = true;
    yield* Effect.promise(() => assert.rejects(Effect.runPromise(archive.removeEffect(saved.contentHash, 'writer')), /Pin removal failed/));
    assert.equal((yield* Effect.promise(() => writer.getRecord(saved.contentHash)))?.pendingShare, true);
    assert.ok(yield* Effect.promise(() => receipts.get(saved.contentHash)));
    controls.failForget = false;
    yield* archive.removeEffect(saved.contentHash, 'writer');
    assert.deepEqual(controls.forgotten, [copy.blobHash, copy.blobHash]);
    assert.equal(yield* Effect.promise(() => writer.getRecord(saved.contentHash)), null);
  })));

await test('clear excludes new saves, discovery and contribution until cleanup completes', () =>
  Effect.runPromise(Effect.gen(function* () {
    const started = Deferred.makeUnsafe<void>();
    const gate = Deferred.makeUnsafe<void>();
    const {archive, calls} = fixture({clearPinsEffect: () => Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(gate);
    })});
    const saved = yield* archive.saveEffect(article('clear ordering'));
    const clearing = Effect.runPromise(archive.clearEffect());
    yield* Deferred.await(started);
    yield* Effect.promise(async () => {
      await assert.rejects(Effect.runPromise(archive.contributeEffect(saved.contentHash)), /cleanup/);
      await assert.rejects(Effect.runPromise(archive.saveEffect(article('late save'))), /cleanup/);
      await assert.rejects(Effect.runPromise(archive.browseEffect(article('page').url)), /cleanup/);
    });
    assert.deepEqual(calls, [], 'Clear cannot race a pin, publication or lookup');
    yield* Deferred.succeed(gate, undefined);
    yield* Effect.promise(() => clearing);
    assert.deepEqual(yield* archive.libraryEffect(), []);
    assert.ok((yield* archive.saveEffect(article('after clear'))).contentHash);
  })));

await test('removal reserves the copy before asynchronous unpin and releases it after failure', () =>
  Effect.runPromise(Effect.gen(function* () {
    const started = Deferred.makeUnsafe<void>();
    const gate = Deferred.makeUnsafe<void>();
    const {archive, calls} = fixture({forgetEffect: () => Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(gate);
      return yield* BoundaryError.from(new Error('Unpin failed'));
    })});
    const saved = yield* archive.saveEffect(article('remove ordering'));
    const removing = Effect.runPromise(archive.removeEffect(saved.contentHash, 'writer')).catch((error: unknown) => error);
    yield* Deferred.await(started);
    yield* Effect.promise(async () => {
      await assert.rejects(Effect.runPromise(archive.contributeEffect(saved.contentHash)), /current operation/);
      await assert.rejects(Effect.runPromise(archive.discardShareEffect(saved.contentHash)), /current operation/);
      await assert.rejects(Effect.runPromise(archive.clearEffect()), /operations to finish/);
    });
    assert.deepEqual(calls, []);
    yield* Deferred.succeed(gate, undefined);
    assert.match(String(yield* Effect.promise(() => removing)), /Unpin failed/);
    assert.equal((yield* archive.readEffect(saved.contentHash)).article.title, 'remove ordering');
    assert.equal((yield* archive.contributeEffect(saved.contentHash)).shared, true);
  })));

await test('canceling a save joins its local write before allowing cleanup or contribution', async () => {
  const {archive, writer, calls} = fixture();
  const input = article('joined local save');
  const copy = await encodeArticle(input);
  const saveRecord = writer.saveRecord.bind(writer);
  const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
  const {promise: gate, resolve: release} = Promise.withResolvers<void>();
  writer.saveRecord = async (...args: Parameters<typeof saveRecord>) => {
    markStarted();
    await gate;
    return saveRecord(...args);
  };
  const controller = new AbortController();
  const saving = Effect.runPromise(archive.saveEffect(input), {signal: controller.signal});
  const canceled = assert.rejects(saving);
  try {
    await started;
    controller.abort();
    await assert.rejects(Effect.runPromise(archive.clearEffect()), /operations to finish/);
    await assert.rejects(Effect.runPromise(archive.contributeEffect(copy.contentHash)), /current operation/);
    assert.deepEqual(calls, []);
  } finally {
    release();
    await canceled;
    writer.saveRecord = saveRecord;
  }
  assert.ok(await writer.getRecord(copy.contentHash), 'The completed local write remains recoverable');
  await Effect.runPromise(archive.clearEffect());
  assert.equal(await writer.getRecord(copy.contentHash), null);
});

await test('contributed files remain manageable under eviction and repeated saves reuse their exact bytes', async () => {
  const {archive, writer, controls} = fixture({maxWriterRecords: 2});
  const input = article('retained contribution');
  const saved = await Effect.runPromise(archive.saveEffect(input, {share: true}));
  const original = await writer.getRecord(saved.contentHash);
  assert.ok(original?.meshRetained);
  await Effect.runPromise(archive.saveEffect(article('older private')));
  await Effect.runPromise(archive.saveEffect(article('newer private')));
  assert.equal((await archive.libraryEffect().pipe(Effect.runPromise)).length, 2);
  assert.ok(await writer.getRecord(saved.contentHash));
  await Effect.runPromise(archive.saveEffect({...input, capturedAt: input.capturedAt + 1}));
  assert.equal((await writer.getRecord(saved.contentHash))?.blobHash, original.blobHash);
  assert.equal((await writer.getRecord(saved.contentHash))?.meshRetained, true);
  await Effect.runPromise(archive.removeEffect(saved.contentHash, 'writer'));
  assert.ok(controls.forgotten.includes(original.blobHash));
  assert.equal(await writer.getRecord(saved.contentHash), null);
});
await test('canceling a failed listing keeps a potentially pinned copy visible until explicit removal', async () => {
  const {archive, writer, controls} = fixture({maxWriterRecords: 1});
  controls.failListing = true;
  const saved = await Effect.runPromise(archive.saveEffect(article('listing failed'), {share: true}));
  assert.ok(saved.shareError);
  await Effect.runPromise(archive.discardShareEffect(saved.contentHash));
  const record = await writer.getRecord(saved.contentHash);
  assert.equal(record?.pendingShare, false);
  assert.equal(record?.meshRetained, true);
  await assert.rejects(Effect.runPromise(archive.saveEffect(article('next private'))), /full/);
  assert.equal((await Effect.runPromise(archive.libraryEffect())).length, 1);
  await Effect.runPromise(archive.removeEffect(saved.contentHash, 'writer'));
  await Effect.runPromise(archive.saveEffect(article('next private')));
});

await test('Manage exposes orphaned contributions for explicit removal without changing private copies', async () => {
  const {archive, writer, reader, retained, controls, calls} = fixture();
  const saved = await Effect.runPromise(archive.saveEffect(article('private remains')));
  const orphan = await encodeArticle(article('previously evicted contribution'));
  retained.set(orphan.blobHash, {blobHash: orphan.blobHash, size: orphan.size});
  await reader.saveRecord(orphan, {shared: true});
  const rows = await Effect.runPromise(archive.libraryEffect());
  const entry = rows.find(row => row.source === 'mesh');
  assert.equal(entry?.contentHash, orphan.blobHash);
  assert.equal((await Effect.runPromise(archive.libraryEffect(orphan.article.url))).some(row => row.source === 'mesh'), false);
  assert.deepEqual(calls, [], 'Listing retained metadata does not start network activity');
  controls.failForget = true;
  await assert.rejects(Effect.runPromise(archive.removeEffect(orphan.blobHash, 'mesh')), /Pin removal failed/);
  assert.equal(retained.size, 1);
  controls.failForget = false;
  await Effect.runPromise(archive.removeEffect(orphan.blobHash, 'mesh'));
  assert.equal(retained.size, 0);
  assert.ok(await writer.getRecord(saved.contentHash));
  assert.ok(await reader.getRecord(orphan.contentHash));
});
await test('existing reservations protect old writer records before quota enforcement', async () => {
  const {archive, writer, retained} = fixture({maxWriterRecords: 1});
  const saved = await Effect.runPromise(archive.saveEffect(article('old writer contribution')));
  const file = await writer.getRecord(saved.contentHash);
  assert.ok(file);
  retained.set(file.blobHash, {blobHash: file.blobHash, size: file.size});
  await assert.rejects(Effect.runPromise(archive.saveEffect(article('incoming private'))), /full/);
  assert.equal((await writer.getRecord(saved.contentHash))?.meshRetained, true);
  assert.equal((await Effect.runPromise(archive.libraryEffect())).some(row => row.source === 'mesh'), false);
  await assert.rejects(Effect.runPromise(archive.removeEffect(file.blobHash, 'mesh')), /through its saved article/);
  await Effect.runPromise(archive.removeEffect(saved.contentHash, 'writer'));
  await Effect.runPromise(archive.saveEffect(article('incoming private')));
});

await test('partial rating coverage reaches discovery and explicit refresh, then clears after recovery', () =>
  Effect.runPromise(Effect.gen(function* () {
    const {archive, controls} = fixture();
    const copy = yield* encode(article('partial-ratings'));
    controls.listings = [listingFor(copy)];
    controls.files.set(copy.contentHash, copy);
    controls.votesWarning = 'Some ratings are unavailable. Rankings may be incomplete.';
    const result = yield* archive.browseEffect(copy.article.url);
    assert.equal(result.entries.length, 1);
    assert.equal(result.warning, controls.votesWarning);
    assert.equal((yield* archive.ratingsEffect(copy.contentHash)).warning, controls.votesWarning);
    controls.votesWarning = undefined;
    assert.equal((yield* archive.browseEffect(copy.article.url)).warning, '');
    assert.equal((yield* archive.ratingsEffect(copy.contentHash)).warning, undefined);
  })));
