import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sanitizeArticle } from '../src/sanitize.js';
import { captureArticle } from '../src/content.js';
import { inspectArticle } from '../src/inspect.js';

function fixture(html) {
  const dom = new JSDOM(html, { url: 'https://example.com/story#section' });
  globalThis.document = dom.window.document;
  return dom.window.document;
}

test('sanitizer removes active content, hidden text, resource URLs, and dangerous links', () => {
  fixture('');
  const clean = sanitizeArticle(`<p class="tracking" onclick="alert(1)">Hello <strong>world</strong></p>
    <script>alert(1)</script><img src="https://tracker.test/pixel">
    <svg><a href="javascript:alert(1)">SVG</a></svg><iframe src="https://tracker.test"></iframe>
    <span hidden>Private</span><span style="display: none">Hidden</span>
    <a href="javascript:alert(1)">bad</a><a href="https://user:pass@example.com/">credential</a>
    <a href="/related?utm_source=newsletter" data-id="123">related</a><a href="/secret?token=abc">secret</a>`, 'https://example.com/story');
  const element = document.createElement('div');
  element.innerHTML = clean;
  assert.equal(element.querySelector('strong').textContent, 'world');
  assert.equal(element.querySelectorAll('script,img,svg,iframe,[hidden],[style],[onclick],[class],[data-id]').length, 0);
  assert.equal(element.querySelectorAll('a[href]').length, 1);
  assert.equal(element.querySelector('a[href]').href, 'https://example.com/related');
  assert.ok(!element.textContent.includes('Private'));
  assert.ok(!element.textContent.includes('Hidden'));
});

test('capture preserves readable article and does not mutate the page', async () => {
  const paragraphs = Array.from({ length: 5 }, (_, i) => `<p>Paragraph ${i}. This is an article about preserving readable text. Readers can save useful articles and return to them later. Every paragraph contains enough meaningful detail for article extraction.</p>`).join('');
  const doc = fixture(`<html><head><title>A useful article</title></head><body><nav>Menu</nav><article><h1>A useful article</h1>${paragraphs}<img src="https://tracker.test/pixel"><script>bad()</script></article></body></html>`);
  const before = doc.documentElement.outerHTML;
  const result = await captureArticle(doc);
  assert.equal(result.ok, true);
  assert.equal(result.article.url, 'https://example.com/story');
  assert.equal(typeof result.article.capturedAt, 'number');
  assert.match(result.article.textContent, /Paragraph 4/);
  assert.ok(!result.article.content.includes('<img'));
  assert.ok(!result.article.content.includes('<script'));
  assert.equal(doc.documentElement.outerHTML, before);
});

test('capture returns a helpful failure for an empty page', async () => {
  const doc = fixture('<html><body></body></html>');
  assert.equal((await captureArticle(doc)).ok, false);
});

const WEBP = 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACwAgCdASoUAAoAPxFysFAsJqSisAgBgCIJaQAAeyAA/vBpgAA=';

test('sanitizer retains only bounded inline WebP with measured dimensions and safe alt text', () => {
  fixture('');
  const clean = sanitizeArticle(`<img src="${WEBP}" alt="Coastal chart" onload="bad()" srcset="https://tracker.test/image 2x" width="99999"><img src="data:image/png;base64,AAAA" alt="Missing chart"><img src="https://tracker.test/pixel" alt="Remote chart">`, 'https://example.com/story');
  const output = document.createElement('div'); output.innerHTML = clean;
  assert.equal(output.querySelectorAll('img').length, 1);
  const image = output.querySelector('img');
  assert.equal(image.getAttribute('src'), WEBP);
  assert.equal(image.getAttribute('width'), '20');
  assert.equal(image.getAttribute('height'), '10');
  assert.equal(image.getAttribute('alt'), 'Coastal chart');
  assert.deepEqual(image.getAttributeNames().sort(), ['alt', 'height', 'src', 'width']);
  assert.match(output.textContent, /Image: Missing chart/);
  assert.match(output.textContent, /Image: Remote chart/);
});

test('sanitizer rejects forged, oversized, and excessive inline images', () => {
  fixture('');
  const dimensionBomb = Buffer.from(WEBP.split(',')[1], 'base64');
  dimensionBomb.writeUInt16LE(8193, 26);
  const bombUri = `data:image/webp;base64,${dimensionBomb.toString('base64')}`;
  const badSignature = WEBP.replace('UklGR', 'AAAAA');
  const hugeUri = `data:image/webp;base64,${'A'.repeat(1024 * 1024)}`;
  const clean = sanitizeArticle(`<img src="${bombUri}" alt="too wide"><img src="${badSignature}" alt="forged"><img src="${hugeUri}" alt="too large">${Array.from({ length: 12 }, () => `<img src="${WEBP}" alt="chart">`).join('')}`, 'https://example.com/story');
  const output = document.createElement('div'); output.innerHTML = clean;
  assert.equal(output.querySelectorAll('img').length, 10);
  assert.match(output.textContent, /too wide/);
  assert.match(output.textContent, /forged/);
  assert.match(output.textContent, /too large/);

  // Add a bounded ancillary color profile to make each URI about 333 KB.
  const bytes = Buffer.from(WEBP.split(',')[1], 'base64');
  const chunk = Buffer.alloc(8 + 250000); chunk.write('ICCP'); chunk.writeUInt32LE(250000, 4);
  const padded = Buffer.concat([bytes, chunk]); padded.writeUInt32LE(padded.length - 8, 4);
  const paddedUri = `data:image/webp;base64,${padded.toString('base64')}`;
  assert.ok(paddedUri.length > 300_000 && paddedUri.length <= 1024 * 1024);
  const total = sanitizeArticle(Array.from({ length: 6 }, () => `<img src="${paddedUri}" alt="chart">`).join(''), 'https://example.com/story');
  output.innerHTML = total;
  assert.equal(output.querySelectorAll('img').length, 3);
  assert.ok([...output.querySelectorAll('img')].reduce((sum, image) => sum + image.getAttribute('src').length, 0) <= 1024 * 1024);
});

test('capture draws the original loaded image, downsizes it, and uses safe placeholders on canvas failure', async () => {
  const paragraphs = Array.from({ length: 5 }, () => '<p>This coastal article contains meaningful observations about seasons, birds, and ocean tides. Researchers preserve detailed field notes so readers can study the patterns.</p>').join('');
  const doc = fixture(`<html><head><title>A field notebook</title></head><body><article><h1>A field notebook</h1>${paragraphs}<img src="/chart.webp" alt="Tide chart"><img src="/blocked.webp" alt="Protected chart"></article></body></html>`);
  const originals = [...doc.querySelectorAll('img')];
  for (const image of originals) Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 800 } });
  const create = doc.createElement.bind(doc);
  const draws = [], sizes = [];
  doc.createElement = (...args) => {
    const element = create(...args);
    if (args[0] === 'canvas') {
      element.getContext = () => ({ drawImage(image) { draws.push(image); if (image === originals[1]) throw new Error('Tainted canvas'); } });
      element.toDataURL = (mime, quality) => {
        assert.equal(mime, 'image/webp'); sizes.push([element.width, element.height, quality]);
        return WEBP;
      };
    }
    return element;
  };
  const before = doc.documentElement.outerHTML;
  const result = await captureArticle(doc);
  assert.equal(result.ok, true);
  assert.equal(draws[0], originals[0]);
  assert.deepEqual(sizes, [[1600, 800, 0.8]]);
  const output = create('div'); output.innerHTML = result.article.content;
  assert.equal(output.querySelectorAll('img').length, 1);
  assert.equal(output.querySelector('img').src, WEBP);
  assert.match(output.textContent, /Image: Protected chart/);
  assert.equal(doc.documentElement.outerHTML, before);
});

test('article tables are focusable without retaining publisher attributes', () => {
  fixture('');
  const clean = sanitizeArticle('<table onclick="bad()"><tr><td>Figure</td></tr></table>', 'https://example.com/story');
  const output = document.createElement('div'); output.innerHTML = clean;
  assert.equal(output.querySelector('table').getAttribute('tabindex'), '0');
  assert.equal(output.querySelector('table').getAttribute('aria-label'), 'Article table');
  assert.equal(output.querySelector('table').hasAttribute('onclick'), false);
});

test('authorized rendered fallback crops selected responsive pixels and restores page and scroll', async () => {
  const text = '<p>A detailed field notebook describes birds, seasons, ocean tides and meaningful coastal observations for researchers and readers.</p>'.repeat(8);
  const doc = fixture(`<html><head><title>Notebook</title></head><body><article><h1>Notebook</h1>${text}<img style="border: 1px solid" src="/unselected.png" alt="Responsive chart"></article></body></html>`);
  const original = doc.querySelector('img'), view = doc.defaultView;
  Object.defineProperties(original, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 800 }, currentSrc: { value: 'https://example.com/selected.svg' } });
  Object.defineProperties(view, { innerWidth: { value: 1000 }, innerHeight: { value: 600 }, scrollX: { value: 12 }, scrollY: { value: 345 } });
  view.requestAnimationFrame = callback => callback();
  const restores = []; view.scrollTo = options => restores.push(options);
  const bitmap = { width: 2000, height: 1200, close() { this.closed = true; } };
  view.createImageBitmap = async () => bitmap;
  const create = doc.createElement.bind(doc), draws = [], selected = [];
  doc.createElement = (...args) => {
    const element = create(...args);
    if (args[0] === 'img') {
      element.decode = async () => { selected.push(element.src); };
      element.getBoundingClientRect = () => ({ left: 16, top: 58, width: 968, height: 484, right: 984, bottom: 542 });
    }
    if (args[0] === 'canvas') {
      element.getContext = () => ({ drawImage(...values) { if (values[0] === original) throw new Error('Tainted'); draws.push(values); } });
      element.toDataURL = () => WEBP;
    }
    return element;
  };
  const before = doc.documentElement.outerHTML, calls = [];
  globalThis.chrome = { runtime: { async sendMessage(message) { calls.push(message); return { ok: true, data: { dataUrl: 'data:image/png;base64,AAAA' } }; } } };
  try {
    const result = await captureArticle(doc, { captureToken: 'authorized-session' });
    assert.equal(result.ok, true);
    assert.equal((result.article.content.match(/<img/g) || []).length, 1);
    assert.deepEqual(calls, [{ target: 'background', action: 'CAPTURE_IMAGE_PIXELS', captureToken: 'authorized-session' }]);
    assert.deepEqual(selected, ['https://example.com/selected.svg']);
    assert.deepEqual(draws[0].slice(1), [32, 116, 1936, 968, 0, 0, 968, 484]);
    assert.equal(bitmap.closed, true);
    assert.deepEqual(restores, [{ left: 12, top: 345, behavior: 'instant' }]);
    assert.equal(doc.documentElement.outerHTML, before);
    view.requestAnimationFrame = () => 1; // Hidden tabs may never deliver a paint callback.
    const stalledPaint = await captureArticle(doc, { captureToken: 'authorized-session' });
    assert.ok(!stalledPaint.article.content.includes('<img'));
    assert.equal(calls.length, 1);
    assert.equal(doc.documentElement.outerHTML, before);
    const withoutToken = await captureArticle(doc);
    assert.ok(!withoutToken.article.content.includes('<img'));
    assert.equal(calls.length, 1);
  } finally { delete globalThis.chrome; }
});

test('anonymous fallback omits cookies and referrer and cancels oversized responses', async () => {
  const text = '<p>Meaningful article observations describe the ocean and coastal wildlife with sufficient detail to preserve an interesting field notebook.</p>'.repeat(8);
  const doc = fixture(`<article><h1>Notebook</h1>${text}<img src="https://images.example/chart.jpg" alt="Chart"></article>`);
  const original = doc.querySelector('img'), view = doc.defaultView;
  Object.defineProperties(original, { complete: { value: true }, naturalWidth: { value: 100 }, naturalHeight: { value: 50 } });
  view.createImageBitmap = async () => { throw new Error('Oversized response must not decode'); };
  let options;
  view.fetch = async (_url, request) => { options = request; return { ok: true, body: {}, headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': String(3 * 1024 * 1024) }) }; };
  const create = doc.createElement.bind(doc);
  doc.createElement = (...args) => {
    const element = create(...args);
    if (args[0] === 'canvas') element.getContext = () => ({ drawImage() { throw new Error('Tainted'); } });
    return element;
  };
  const result = await captureArticle(doc);
  assert.equal(result.ok, true);
  assert.ok(!result.article.content.includes('<img'));
  assert.equal(options.mode, 'cors'); assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.signal.aborted, true);
});

test('single-preset overflow requires explicit text-only choice rather than lowering image quality', async () => {
  const text='<p>A careful coastal field report preserves meaningful observations about changing tides and wildlife for future researchers.</p>'.repeat(12);
  const doc=fixture(`<article><h1>Coastal field report</h1>${text}<img src="/large.webp" alt="Detailed chart"></article>`);
  const original=doc.querySelector('img');
  Object.defineProperties(original,{complete:{value:true},naturalWidth:{value:2000},naturalHeight:{value:1000}});
  const create=doc.createElement.bind(doc),attempts=[];
  doc.createElement=(...args)=>{const node=create(...args);if(args[0]==='canvas'){
    node.getContext=()=>({drawImage(){}});
    node.toDataURL=(mime,quality)=>{attempts.push([node.width,node.height,mime,quality]);return 'x'.repeat(1024*1024+1);};
  }return node;};
  const result=await captureArticle(doc);
  assert.equal(result.ok,true);assert.equal(result.imageLimitExceeded,true);assert.match(result.imageWarning,/text only/);
  assert.deepEqual(attempts,[[1600,800,'image/webp',0.8]]);assert.match(result.article.content,/Image: Detailed chart/);
});

test('capture flags native decoded image limits without attempting canvas serialization', async () => {
  const text='<p>Meaningful coastal field observations explain wildlife and tides for readers returning to a detailed scientific notebook.</p>'.repeat(12);
  const doc=fixture(`<article><h1>Field observations</h1>${text}<img src="/huge.webp" alt="Huge chart"></article>`);
  Object.defineProperties(doc.querySelector('img'),{complete:{value:true},naturalWidth:{value:5000},naturalHeight:{value:4000}});
  const create=doc.createElement.bind(doc);doc.createElement=(...args)=>{assert.notEqual(args[0],'canvas');return create(...args);};
  const result=await captureArticle(doc);assert.equal(result.ok,true);assert.equal(result.imageLimitExceeded,true);assert.match(result.article.content,/Huge chart/);
});

test('capture ignores author-like navigation guesses and retains explicit author metadata', async () => {
  const text='<p>Detailed field observations record tides, wildlife and weather throughout the year for researchers revisiting the coastline.</p>'.repeat(12);
  const html=`<head><title>Coastal study</title></head><body><article><h1>Coastal study</h1>${text}<div class="authority-control">showAuthority control databases</div></article></body>`;
  assert.equal((await captureArticle(fixture(html))).article.byline,'');
  const metadata=fixture(html);const meta=metadata.createElement('meta');meta.name='author';meta.content='A genuine author';metadata.head.append(meta);
  assert.equal((await captureArticle(metadata)).article.byline,'A genuine author');
  const semantic=fixture(html.replace('<h1>Coastal study</h1>','<h1>Coastal study</h1><span rel="author">A semantic author</span>'));
  assert.equal((await captureArticle(semantic)).article.byline,'A semantic author');
  const classByline=fixture(html.replace('<h1>Coastal study</h1>','<h1>Coastal study</h1><span class="article-byline">A class author</span>'));
  assert.equal((await captureArticle(classByline)).article.byline,'A class author');
});
