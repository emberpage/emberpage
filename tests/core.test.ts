import { meshRoutes } from './mesh-fixture.ts';
import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import {
  encodeArticle,
  decodeArticle,
  validateArticle,
  MAX_ARTICLE_BYTES,
  sha256,
  hashUrl
} from '../src/domain/article.ts';
import { LocalVault, ShareReceipts, recordBytes } from '../src/storage/indexeddb.ts';
import { normalizeUrl } from '../src/domain/url.ts';
const now = Date.now(),
  article = {
    url: 'https://example.org/story?id=7',
    title: 'Story',
    byline: 'Writer',
    capturedAt: now,
    content: '<p>A complete article.</p>'
  };
const name = () => `core-${crypto.randomUUID()}`;
const fixture = (path: string, fields: Record<string, unknown> = {}) =>
  encodeArticle(
    { ...article, url: `https://example.org/${path}`, ...fields },
    { now }
  );
await test('normalized identity preserves meaningful queries and rejects credentials', () =>
  Effect.runPromise(
    Effect.sync(() => {
      assert.equal(
        normalizeUrl('https://EXAMPLE.org:443/story?id=7&utm_source=x#part'),
        article.url
      );
      assert.notEqual(
        normalizeUrl('https://example.org/?id=7'),
        normalizeUrl('https://example.org/?id=8')
      );
      assert.throws(() => normalizeUrl('https://user:pass@example.org/'));
      assert.throws(() => normalizeUrl('javascript:bad()'));
    })
  ));
await test('compressed JSON format uses exact blob bytes and stable content identity without expiry', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const first = await encodeArticle(article, { now });
      const envelope = JSON.parse(new TextDecoder().decode(first.bytes)) as {version:number;encoding:string};
      assert.equal(envelope.version, 2);
      assert.equal(envelope.encoding, 'gzip');
      assert.deepEqual((await decodeArticle(first.bytes, {now})).article, article);
      assert.equal(first.blobHash, await sha256(first.bytes));
      assert.equal(first.urlHash, await hashUrl(article.url));
      assert.equal(
        first.contentHash,
        await sha256(
          JSON.stringify([
            1,
            article.url,
            article.title,
            article.byline,
            article.content
          ])
        )
      );
      const later = await encodeArticle(
        {
          ...article,
          capturedAt: now - 90 * 86400000,
          extractorVersion: 'Future',
          textContent: 'Ignored claim'
        },
        { now }
      );
      assert.equal(later.contentHash, first.contentHash);
      assert.notEqual(later.blobHash, first.blobHash);
      assert.deepEqual(
        (
          await decodeArticle(first.bytes, {
            blobHash: first.blobHash,
            now: now + 90 * 86400000
          })
        ).article,
        article
      );
      const decorated = new TextEncoder().encode(JSON.stringify({
        ...JSON.parse(new TextDecoder().decode(first.bytes)), optional: 'Next producer'
      }));
      const copy = await decodeArticle(decorated, { now });
      assert.equal(copy.contentHash, first.contentHash);
      assert.notEqual(copy.blobHash, first.blobHash);
      assert.deepEqual(copy.article, article);
    })
  ));
await test('file verification rejects wrong hashes, unknown format, malformed UTF8, future times and byte bombs', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const valid = await encodeArticle(article, { now }),
        tampered = valid.bytes.slice();
      const byte = tampered[tampered.length - 5];
      assert.ok(byte !== undefined);
      tampered[tampered.length - 5] = byte ^ 1;
      await assert.rejects(
        decodeArticle(tampered, { blobHash: valid.blobHash, now }),
        /hash/
      );
      for (const file of [
        { format: 'emberpage.article', version: 2, article },
        { header: { version: 1 }, crypto: { encryptedData: 'old' } },
        {
          format: 'emberpage.article',
          version: 1,
          article: { ...article, capturedAt: now + 60001 }
        }
      ])
        await assert.rejects(
          decodeArticle(new TextEncoder().encode(JSON.stringify(file)), { now })
        );
      await assert.rejects(decodeArticle(new Uint8Array([255]), { now }));
      await assert.rejects(
        decodeArticle(new Uint8Array(MAX_ARTICLE_BYTES + 1), { now }),
        /size/
      );
      assert.throws(
        () =>
          validateArticle(
            { ...article, content: '📰'.repeat(MAX_ARTICLE_BYTES / 4 + 1) },
            { now }
          ),
        /large/
      );
    })
  ));

await test('snapshot decoding binds exact bytes to all expected identity fields', async () => {
  const valid = await encodeArticle(article, {now});
  assert.deepEqual(await decodeArticle(valid.bytes, {expected: valid, now}), valid);
  for (const field of ['blobHash', 'contentHash', 'urlHash'] as const) {
    const changed = valid[field] === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64);
    await assert.rejects(decodeArticle(valid.bytes, {expected: {...valid, [field]: changed}, now}), /match/);
  }
  await assert.rejects(decodeArticle(valid.bytes, {expected: {...valid, size: valid.size + 1}, now}), /match/);
  for (const expected of [null, {}, {...valid, blobHash: 'invalid'}, {...valid, size: '1'}])
    await assert.rejects(decodeArticle(valid.bytes, {expected, now}));
  const legacy = new TextEncoder().encode(JSON.stringify({format: 'emberpage.article', version: 1, article}));
  await assert.rejects(decodeArticle(legacy, {now}));
});
await test('LRU whole-record eviction keeps the recently read copy and survives beyond24h', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      let clock = now;
      const vault = new LocalVault({
        name: name(),
        indexedDB,
        now: () => clock,
        maxRecords: 2
      });
      const [a, b, c] = await Promise.all([
        fixture('a'),
        fixture('b'),
        fixture('c')
      ]);
      await vault.saveRecord(a);
      clock++;
      await vault.saveRecord(b);
      clock++;
      await vault.getRecord(a.contentHash);
      clock++;
      await vault.saveRecord(c);
      assert.equal(await vault.getRecord(b.contentHash), null);
      assert.ok(await vault.getRecord(a.contentHash));
      clock += 90 * 86400000;
      assert.equal((await vault.listRecords()).length, 2);
      const stored = await vault.store.update();
      const firstStored = stored[0];
      assert.ok(firstStored);
      assert.equal(
        Object.hasOwn(firstStored, 'article'),
        false,
        'HTML is stored once in exact file bytes'
      );
    })
  ));
await test('byte quotas and pending-share protection fail atomically without losing existing records', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const copy = await fixture('pending'),
        vault = new LocalVault({ name: name(), indexedDB, maxRecords: 1 });
      await vault.saveRecord(copy, { pendingShare: true });
      await vault.saveRecord(copy);
      const pending = await vault.getRecord(copy.contentHash);
      assert.ok(pending);
      assert.equal(pending.pendingShare, true);
      const before = await vault.listRecords(),
        next = await fixture('other');
      await assert.rejects(vault.saveRecord(next), /full/);
      const retained = (await vault.listRecords())[0],
        prior = before[0];
      assert.ok(retained);
      assert.ok(prior);
      assert.equal(retained.contentHash, prior.contentHash);
      const records = await vault.store.update(),
        budget = recordBytes(records[0]);
      const constrained = new LocalVault({
        name: name(),
        indexedDB,
        maxBytes: budget - 1
      });
      await assert.rejects(constrained.saveRecord(copy), /size limit/);
      assert.deepEqual(await constrained.listRecords(), []);
      await vault.setPending(copy.contentHash, false);
      await vault.saveRecord(next);
      assert.equal(await vault.getRecord(copy.contentHash), null);
      await vault.setShared(next.contentHash, true, now);
      const shared = await vault.getRecord(next.contentHash);
      assert.ok(shared);
      assert.equal(shared.listedAt, now);
    })
  ));

await test('a rejected read cannot protect a damaged copy from LRU eviction', async () => {
  let clock = now;
  const vault = new LocalVault({name: name(), indexedDB, now: () => clock, maxRecords: 2});
  const [damaged, healthy, incoming] = await Promise.all([fixture('damaged'), fixture('healthy'), fixture('incoming')]);
  await vault.saveRecord(damaged);
  clock++;
  await vault.saveRecord(healthy);
  const before = (await vault.store.update()).find(record => record.contentHash === damaged.contentHash)?.lastAccessedAt;
  await vault.store.update(records => records.map(record => {
    if (record.contentHash !== damaged.contentHash) return record;
    const bytes = record.bytes.slice();
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    return {...record, bytes};
  }));
  clock++;
  await assert.rejects(vault.getRecord(damaged.contentHash), /hash/);
  assert.equal((await vault.store.update()).find(record => record.contentHash === damaged.contentHash)?.lastAccessedAt, before);
  clock++;
  await vault.saveRecord(incoming);
  assert.deepEqual(new Set((await vault.listSummaries()).map(record => record.contentHash)), new Set([healthy.contentHash, incoming.contentHash]));
  assert.equal(await vault.getRecord(damaged.contentHash), null);
  assert.ok(await vault.getRecord(healthy.contentHash));
});
await test('reader and contributor vaults stay separate and concurrent writes retain count bounds', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const writer = new LocalVault({ name: name(), indexedDB }),
        reader = new LocalVault({ name: name(), indexedDB, maxRecords: 2 });
      const own = await fixture('private');
      await writer.saveRecord(own);
      await Promise.all(
        ['one', 'two', 'three'].map(async (path) =>
          reader.saveRecord(await fixture(path))
        )
      );
      assert.equal((await reader.listRecords()).length, 2);
      assert.ok(await writer.getRecord(own.contentHash));
      await reader.clear();
      assert.ok(await writer.getRecord(own.contentHash));
    })
  ));
await test('receipts reserve quota before pinning, persist pinned state, and never silently evict obligations', () =>
  Effect.runPromise(
    Effect.promise(async () => {
      const receipts = new ShareReceipts({
          name: name(),
          indexedDB,
          maxRecords: 1
        }),
        copy = await fixture('receipt');
      const reserved = await receipts.put(copy);
      assert.equal(reserved.pinned, false);
      assert.equal(reserved.cid, undefined);
      await assert.rejects(receipts.put({ ...reserved, pinned: true, cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m' }), /Invalid share receipt/);
      await assert.rejects(receipts.put({ ...reserved, pinned: true, cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m', routes: ['http://127.0.0.1:5001'] }), /Invalid share receipt/);
      await receipts.put({ ...reserved, pinned: true, routes: meshRoutes(), cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m' });
      const uploaded = await receipts.get(copy.contentHash);
      assert.ok(uploaded);
      assert.equal(uploaded.pinned, true);
      await assert.rejects(
        receipts.put(await fixture('another-receipt')),
        /full/
      );
      assert.equal((await receipts.list()).length, 1);
      await receipts.delete(copy.contentHash);
      assert.equal(await receipts.get(copy.contentHash), null);
      await receipts.clear();
    })
  ));

await test('gzip rejects expanded byte bombs, truncated streams and invalid encoding', () =>
  Effect.runPromise(Effect.promise(async () => {
    const content = 'a'.repeat(MAX_ARTICLE_BYTES + 1);
    const compressed = new Uint8Array(await new Response(new Blob([content]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    const payload = Buffer.from(compressed).toString('base64');
    const file = (value: string) => new TextEncoder().encode(JSON.stringify({format:'emberpage.article', version:2, encoding:'gzip', payload:value}));
    await assert.rejects(decodeArticle(file(payload)), /large/);
    await assert.rejects(decodeArticle(file(Buffer.from(compressed.slice(0, -4)).toString('base64'))));
    await assert.rejects(decodeArticle(file('not base64')));
    const encoded = await encodeArticle({...article, content:'<p>Repeated archival prose.</p>'.repeat(1000)}, {now});
    assert.ok(encoded.size < 1000);
    assert.deepEqual((await decodeArticle(encoded.bytes, {now})).article, encoded.article);
  })));

await test('URL-scoped vault listing filters unrelated metadata before body decoding',()=>
  Effect.runPromise(Effect.promise(async()=>{
    const initial=Date.now();
    let clock=initial;
    const vault=new LocalVault({name:name(),indexedDB,now:()=>clock});
    const selected=await encodeArticle({...article,url:'https://example.org/selected',capturedAt:initial-1000});
    const unrelated=await encodeArticle({...article,url:'https://example.org/unrelated',capturedAt:initial+59000});
    await vault.saveRecord(selected);
    await vault.saveRecord(unrelated);
    clock=initial-2000;
    const scoped=await vault.listRecords(`${selected.article.url}?utm_source=test#heading`);
    assert.deepEqual(scoped.map(record=>record.article.url),[selected.article.url]);
    await assert.rejects(vault.listRecords(),/Invalid article fields/,'An unscoped read would attempt the unrelated future-dated body');
  })));
