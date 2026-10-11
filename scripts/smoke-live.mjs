// LIVE_UI_SMOKE=1 node scripts/smoke-live.mjs; otherwise preparation only, with no networking.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const live = process.env.LIVE_UI_SMOKE === '1';
const temporary = await mkdtemp(join(tmpdir(), 'meshcache-live-ui-'));
const journalPath = resolve('.meshcache/live-ui-cleanup.json');
const resultPath = resolve('docs/research/live-ui.json');
const results = { startedAt: new Date().toISOString(), live, steps: [] };
const contexts = [];
let journal,
  author,
  reader,
  journalOwned = false;
const helperSource = `
import {generateSecretKey,finalizeEvent,getPublicKey} from 'nostr-tools/pure';
import {encodeArticle} from './src/core/article.js';
import {snapshotSealInput} from './src/preview.js';
import {sha256} from './src/core/article.js';
import {sanitizeArticle} from './src/sanitize.js';
import {MeshNetwork,createBlossomAuthorization,PROVIDER} from './src/mesh.ts';
import {NostrDirectory} from './src/network/nostr.js';
window.installJournal=()=>chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.target!=='live-ui-journal')return;
 window.persistEvent(message.event).then(()=>respond({ok:true}),()=>respond({ok:false}));return true;
});
window.prepare=async()=>{
 const key=generateSecretKey(),readerKey=generateSecretKey(),id=crypto.randomUUID();
 const icon=new Image();icon.src=chrome.runtime.getURL('icons/icon-128.png');await icon.decode();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.getContext('2d').drawImage(icon,0,0);
 const image=canvas.toDataURL('image/webp',.8);
 const article={url:'https://example.org/meshcache-test-'+id,title:'Original synthetic MeshCache UI test '+id,byline:'MeshCache test fixture',capturedAt:Date.now(),
 content:'<p>'+('This original synthetic article tests explicit sharing and independent reading. The observations are test prose, not a real publication. ').repeat(30)+'</p><figure><img src="'+image+'" alt="MeshCache synthetic illustration"></figure>'};
 article.content=sanitizeArticle(article.content,article.url);article.textContent='Original synthetic preview';
 const copy=await encodeArticle(article);
 const hex=bytes=>[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 await chrome.storage.local.set({meshcacheSigningKey:hex(key)});
 await chrome.storage.session.set({['draft:'+id]:article,['seal:'+id]:await sha256(snapshotSealInput(article))});
 return {id,title:article.title,blobHash:copy.blobHash,contentHash:copy.contentHash,urlHash:copy.urlHash,size:copy.size,
 authorKey:hex(key),authorPubkey:getPublicKey(key),readerKey:hex(readerKey),readerPubkey:getPublicKey(readerKey)};
};
window.seedReader=key=>chrome.storage.local.set({meshcacheSigningKey:key});
window.cleanup=async(ids,hash)=>{
 const stored=(await chrome.storage.local.get('meshcacheSigningKey')).meshcacheSigningKey;
 const secret=Uint8Array.from(stored.match(/../g),byte=>parseInt(byte,16)),directory=new NostrDirectory();const outcome={};
 if(ids.length){const event=finalizeEvent({kind:5,created_at:Math.floor(Date.now()/1000),tags:ids.map(id=>['e',id]),content:'Remove my synthetic MeshCache UI test'},secret);
 try{await directory.publish(event);outcome.deletionAck=true;}catch(error){outcome.deletionError=error.message;}}
 if(hash){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(PROVIDER+'/'+hash,{method:'DELETE',headers:{Authorization:createBlossomAuthorization(secret,{action:'delete',blobHash:hash})},credentials:'omit',redirect:'error',signal:controller.signal});outcome.blobDeleteStatus=response.status;await response.body?.cancel();}
 catch(error){outcome.blobDeleteError=error.message;}finally{controller.abort();clearTimeout(timer);}}
 return outcome;
};
window.remaining=async ids=>{if(!ids.length)return[];const directory=new NostrDirectory();return(await directory.exchange(['REQ',crypto.randomUUID(),{ids,limit:ids.length}],{limit:ids.length})).map(event=>event.id);};
window.ready=true;
`;
const hookSource = `const NativeWebSocket=globalThis.WebSocket;
globalThis.WebSocket=class extends NativeWebSocket {
 send(data){let event;try{const frame=JSON.parse(data);if(frame[0]==='EVENT')event=frame[1];}catch{}
 if(!event)return super.send(data);
 chrome.runtime.sendMessage({target:'live-ui-journal',event:{id:event.id,kind:event.kind,pubkey:event.pubkey}}).then(response=>{
 if(!response?.ok){this.close();return;}super.send(data);
 }).catch(()=>this.close());
 }
};\n`;
async function activate(page, selector) {
  await page.locator(selector).focus();
  await page.keyboard.press('Enter');
}
async function launch(extension, name) {
  const context = await chromium.launchPersistentContext(
    join(temporary, name),
    {
      headless: true,
      executablePath:
        process.env.CHROMIUM_EXECUTABLE || undefined,
      viewport: { width: 1000, height: 800 },
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`
      ]
    }
  );
  contexts.push(context);
  context.setDefaultTimeout(60_000);
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent('serviceworker'));
  const base = worker.url().split('/').slice(0, 3).join('/');
  const helper = await context.newPage();
  await helper.exposeFunction('persistEvent', async (event) => {
    journal.events.push(event);
    await writeFile(journalPath, JSON.stringify(journal, null, 2), {
      mode: 0o600
    });
  });
  await helper.goto(`${base}/live-helper.html`);
  await helper.waitForFunction(() => window.ready);
  await helper.evaluate(() => window.installJournal());
  const popup = await context.newPage();
  await popup.goto(`${base}/popup.html`);
  await popup.locator('#accept').waitFor({ state: 'visible' });
  await activate(popup, '#accept');
  await popup.locator('#app').waitFor({ state: 'visible' });
  return { context, helper, popup, base };
}
async function absentBlob(hash) {
  const path = `/uploads2/${hash[0]}/${hash.slice(1, 3)}/${hash.slice(3, 5)}/${hash}.json`;
  const statuses = {};
  for (const [label, url] of [
    ['cdn', 'https://media.primal.net' + path],
    ['canonical', `https://blossom.primal.net/${hash}.json`]
  ]) {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000)
    });
    statuses[label] = response.status;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (
      label === 'canonical' &&
      [
        'https://r2a.primal.net' + path,
        'https://media.primal.net' + path
      ].includes(location)
    ) {
      const redirected = await fetch(location, {
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000)
      });
      statuses.canonicalTarget = redirected.status;
      await redirected.body?.cancel();
    }
  }
  return {
    ...statuses,
    absent:
      statuses.cdn === 404 &&
      (statuses.canonical === 404 || statuses.canonicalTarget === 404)
  };
}
try {
  const extension = join(temporary, 'extension');
  await cp(resolve('.output/chrome-mv3'), extension, { recursive: true });
  const productionBackground = await readFile(
    join(extension, 'background.js'),
    'utf8'
  );
  await writeFile(
    join(extension, 'background.js'),
    hookSource + productionBackground
  );
  await writeFile(
    join(extension, 'live-helper.html'),
    '<script src="live-helper.js"></script>'
  );
  await build({
    stdin: { contents: helperSource, resolveDir: resolve('.') },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: join(extension, 'live-helper.js')
  });
  const manifest = JSON.parse(
    await readFile(join(extension, 'manifest.json'), 'utf8')
  );
  assert.equal(
    manifest.host_permissions,
    undefined,
    'Harness must preserve the production permission boundary'
  );
  if (!live) {
    console.log(
      'PREPARED: actual WXT Chrome MV3 output copy, helper bundle, production CSP/permissions, journal-before-send hook. No browser or network started.'
    );
  } else {
    author = await launch(extension, 'author');
    const preparation = await author.helper.evaluate(() => window.prepare());
    journal = {
      ...preparation,
      createdAt: new Date().toISOString(),
      events: []
    };
    await mkdir(resolve('.meshcache'), { recursive: true });
    await writeFile(journalPath, JSON.stringify(journal, null, 2), {
      flag: 'wx',
      mode: 0o600
    });
    journalOwned = true;
    const { authorKey, readerKey, ...publicFixture } = preparation;
    results.fixture = publicFixture;
    const review = await author.context.newPage();
    await review.goto(`${author.base}/review.html?id=${preparation.id}`);
    await review.waitForFunction(
      () => !document.querySelector('#share').disabled
    );
    await review.waitForFunction(
      () => document.querySelector('#article img')?.naturalWidth === 128
    );
    await activate(review, '#share');
    await review.waitForFunction(
      () =>
        document.querySelector('#review-controls').hidden ||
        document.querySelector('#status').classList.contains('error')
    );
    assert.match(
      await review.locator('#status').textContent(),
      /^Cached for readers/
    );
    results.steps.push(
      'Keyboard Cache for readers: production upload, listing acknowledgment, local share state'
    );
    await mkdir('artifacts', { recursive: true });
    await review.screenshot({
      path: 'artifacts/live-ui-shared.png',
      fullPage: true
    });
    reader = await launch(extension, 'reader');
    await reader.helper.evaluate(
      (key) => window.seedReader(key),
      preparation.readerKey
    );
    assert.equal(
      await reader.popup.locator('#catalog-list .item').count(),
      0,
      'Reader profile starts with no cached copy'
    );
    let discovered = false;
    for (let attempt = 0; attempt < 3 && !discovered; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 5000));
      await activate(reader.popup, '#browse');
      await reader.popup.waitForFunction(
        () => !document.querySelector('#browse').disabled
      );
      discovered =
        (await reader.popup
          .getByText(preparation.title, { exact: true })
          .count()) === 1;
    }
    assert.equal(
      discovered,
      true,
      `Independent Popular lookup failed: ${await reader.popup.locator('#status').textContent()}`
    );
    const openReader = reader.context.waitForEvent('page');
    const row = reader.popup
      .locator('.item-main')
      .filter({ hasText: preparation.title });
    await row.focus();
    await reader.popup.keyboard.press('Enter');
    const reading = await openReader;
    await reading.waitForLoadState();
    await reading.locator('#source').waitFor({ state: 'visible' });
    assert.equal(
      await reading.locator('#title').textContent(),
      preparation.title
    );
    assert.equal(await reading.locator('#article img[src^="http"]').count(), 0);
    assert.equal(await reading.locator('#article img').count(), 1);
    await reading.waitForFunction(
      () => document.querySelector('#article img')?.naturalWidth === 128
    );
    assert.ok((await reading.locator('#article').textContent()).length >= 1000);
    results.steps.push(
      'Independent fresh profile: Popular discovers verified body, Read shows embedded WebP'
    );
    await activate(reading, '#helpful');
    await reading.waitForFunction(
      () => document.querySelector('#status').textContent === 'Rating sent.'
    );
    await activate(reading, '#refresh-ratings');
    await reading.waitForFunction(
      () => document.querySelector('#status').textContent === 'Ratings updated.'
    );
    assert.match(
      await reading.locator('#rating-summary').textContent(),
      /^1 helpful/
    );
    results.steps.push(
      'Keyboard Helpful and Check ratings: signed rating acknowledgment and relay readback'
    );
    await reading.screenshot({
      path: 'artifacts/live-ui-reader.png',
      fullPage: true
    });
    results.passed = true;
    console.log(
      'PASS: production background/archive/storage and real review/Popular/reader UI, independent profile, image, signed rating.'
    );
  }
} catch (error) {
  results.error = error.message;
  process.exitCode = 1;
} finally {
  if (journalOwned) {
    try {
      const publications = journal.events.filter((event) => event.kind !== 5);
      const authorIds = publications
        .filter((event) => event.pubkey === journal.authorPubkey)
        .map((event) => event.id);
      const readerIds = publications
        .filter((event) => event.pubkey === journal.readerPubkey)
        .map((event) => event.id);
      results.authorCleanup = await author.helper.evaluate(
        ({ ids, hash }) => window.cleanup(ids, hash),
        { ids: authorIds, hash: journal.blobHash }
      );
      if (reader)
        results.readerCleanup = await reader.helper.evaluate(
          (ids) => window.cleanup(ids),
          readerIds
        );
      const ids = publications.map((event) => event.id);
      results.blobRemoval = await absentBlob(journal.blobHash);
      results.remainingEvents = await author.helper.evaluate(
        (ids) => window.remaining(ids),
        ids
      );
      if (results.blobRemoval.absent && results.remainingEvents.length === 0) {
        await rm(journalPath);
        results.cleanupVerified = true;
      } else results.cleanupJournalRetained = true;
    } catch (error) {
      results.cleanupError = error.message;
      results.cleanupJournalRetained = true;
    }
  }
  results.finishedAt = new Date().toISOString();
  if (live) {
    await mkdir(resolve('docs/research'), { recursive: true });
    await writeFile(resultPath, JSON.stringify(results, null, 2));
    console.log(
      'Results:',
      resultPath,
      'Cleanup verified:',
      results.cleanupVerified === true
    );
  }
  for (const context of contexts) await context.close();
  await rm(temporary, { recursive: true, force: true });
}
