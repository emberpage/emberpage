import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sanitizeArticle } from '../src/extraction/sanitize.ts';
import { captureArticleEffect } from '../src/extraction/content.ts';


async function capture(doc: Document, options: {captureToken?: string} = {}) {
  const result = await Effect.runPromise(captureArticleEffect(doc, options));
  assert.ok(result.ok);
  return result;
}

function fixture(html: string) {
  const dom = new JSDOM(html, { url: 'https://example.com/story#section' });
  globalThis.document = dom.window.document;
  return dom.window.document;
}

void test('sanitizer removes active content, hidden text, resource URLs, and dangerous links', () => {
  fixture('');
  const clean = sanitizeArticle(`<p class="tracking" onclick="alert(1)">Hello <strong>world</strong></p>
    <script>alert(1)</script><img src="https://tracker.test/pixel">
    <svg><a href="javascript:alert(1)">SVG</a></svg><iframe src="https://tracker.test"></iframe>
    <span hidden>Private</span><span style="display: none">Hidden</span>
    <a href="javascript:alert(1)">bad</a><a href="https://user:pass@example.com/">credential</a>
    <a href="/related?utm_source=newsletter" data-id="123">related</a><a href="/secret?token=abc">secret</a>`, 'https://example.com/story');
  const element = document.createElement('div');
  element.innerHTML = clean;
  assert.equal(element.querySelector('strong')?.textContent, 'world');
  assert.equal(element.querySelectorAll('script,img,svg,iframe,[hidden],[style],[onclick],[class],[data-id]').length, 0);
  assert.equal(element.querySelectorAll('a[href]').length, 1);
  assert.equal(element.querySelector<HTMLAnchorElement>('a[href]')?.href, 'https://example.com/related');
  assert.ok(!element.textContent.includes('Private'));
  assert.ok(!element.textContent.includes('Hidden'));
});

void test('capture preserves readable article and does not mutate the page', async () => {
  const paragraphs = Array.from({ length: 5 }, (_, i) => `<p>Paragraph ${i}. This is an article about preserving readable text. Readers can save useful articles and return to them later. Every paragraph contains enough meaningful detail for article extraction.</p>`).join('');
  const doc = fixture(`<html><head><title>A useful article</title></head><body><nav>Menu</nav><article><h1>A useful article</h1>${paragraphs}<img src="https://tracker.test/pixel"><script>bad()</script></article></body></html>`);
  const before = doc.documentElement.outerHTML;
  const result = await capture(doc);
  assert.ok(result.ok);
  assert.equal(result.article.url, 'https://example.com/story');
  assert.equal(typeof result.article.capturedAt, 'number');
  assert.match(result.article.textContent, /Paragraph 4/);
  assert.ok(!result.article.content.includes('<img'));
  assert.ok(!result.article.content.includes('<script'));
  assert.equal(doc.documentElement.outerHTML, before);
});

void test('capture returns a helpful failure for an empty page', async () => {
  const doc = fixture('<html><body></body></html>');
  assert.equal((await Effect.runPromise(captureArticleEffect(doc))).ok, false);
});

const WEBP = 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACwAgCdASoUAAoAPxFysFAsJqSisAgBgCIJaQAAeyAA/vBpgAA=';

void test('sanitizer retains only bounded inline WebP with measured dimensions and safe alt text', () => {
  fixture('');
  const clean = sanitizeArticle(`<img src="${WEBP}" alt="Coastal chart" onload="bad()" srcset="https://tracker.test/image 2x" width="99999"><img src="data:image/png;base64,AAAA" alt="Missing chart"><img src="https://tracker.test/pixel" alt="Remote chart">`, 'https://example.com/story');
  const output = document.createElement('div'); output.innerHTML = clean;
  assert.equal(output.querySelectorAll('img').length, 1);
  const image = output.querySelector('img');
  assert.equal(image?.getAttribute('src'), WEBP);
  assert.equal(image?.getAttribute('width'), '20');
  assert.equal(image?.getAttribute('height'), '10');
  assert.equal(image?.getAttribute('alt'), 'Coastal chart');
  assert.deepEqual(image?.getAttributeNames().sort(), ['alt', 'height', 'src', 'width']);
  assert.match(output.textContent, /Image: Missing chart/);
  assert.match(output.textContent, /Image: Remote chart/);
});

void test('sanitizer rejects forged, oversized, and excessive inline images', () => {
  fixture('');
  const dimensionBomb = Buffer.from(WEBP.slice(WEBP.indexOf(',') + 1), 'base64');
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
  const bytes = Buffer.from(WEBP.slice(WEBP.indexOf(',') + 1), 'base64');
  const chunk = Buffer.alloc(8 + 250000); chunk.write('ICCP'); chunk.writeUInt32LE(250000, 4);
  const padded = Buffer.concat([bytes, chunk]); padded.writeUInt32LE(padded.length - 8, 4);
  const paddedUri = `data:image/webp;base64,${padded.toString('base64')}`;
  assert.ok(paddedUri.length > 300_000 && paddedUri.length <= 1024 * 1024);
  const total = sanitizeArticle(Array.from({ length: 6 }, () => `<img src="${paddedUri}" alt="chart">`).join(''), 'https://example.com/story');
  output.innerHTML = total;
  assert.equal(output.querySelectorAll('img').length, 3);
  assert.ok([...output.querySelectorAll('img')].reduce((sum, image) => sum + (image.getAttribute('src')?.length ?? 0), 0) <= 1024 * 1024);
});

void test('capture draws the original loaded image, downsizes it, and uses safe placeholders on canvas failure', async () => {
  const paragraphs = Array.from({ length: 5 }, () => '<p>This coastal article contains meaningful observations about seasons, birds, and ocean tides. Researchers preserve detailed field notes so readers can study the patterns.</p>').join('');
  const doc = fixture(`<html><head><title>A field notebook</title></head><body><article><h1>A field notebook</h1>${paragraphs}<img src="/chart.webp"><img src="/blocked.webp" alt="Protected chart"></article></body></html>`);
  const originals = [...doc.querySelectorAll('img')];
  for (const image of originals) Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 800 } });
  const create = doc.createElement.bind(doc);
  const draws: CanvasImageSource[] = [], sizes: [number, number, number | undefined][] = [];
  Object.defineProperty(doc, 'createElement', {value: (tagName: string) => {
    const element = create(tagName);
    if (tagName === 'canvas') {
      const canvas = element as HTMLCanvasElement;
      Object.defineProperty(canvas, 'getContext', {value: () => ({ drawImage(image: CanvasImageSource) { draws.push(image); if (image === originals[1]) throw new Error('Tainted canvas'); } })});
      canvas.toDataURL = (mime?: string, quality?: number) => {
        assert.equal(mime, 'image/webp'); sizes.push([canvas.width, canvas.height, quality]);
        return WEBP;
      };
    }
    return element;
  }});
  const before = doc.documentElement.outerHTML;
  const result = await capture(doc);
  assert.ok(result.ok);
  assert.equal(draws[0], originals[0]);
  assert.deepEqual(sizes, [[1600, 800, 0.8]]);
  const output = create('div'); output.innerHTML = result.article.content;
  assert.equal(output.querySelectorAll('img').length, 1);
  assert.equal(output.querySelector('img')?.src, WEBP);
  assert.equal(output.querySelector('img')?.getAttribute('alt'), '', 'A successfully copied image without a description must not announce a capture failure.');
  assert.match(output.textContent, /Image: Protected chart/);
  assert.equal(doc.documentElement.outerHTML, before);
});

void test('article tables are focusable without retaining publisher attributes', () => {
  fixture('');
  const clean = sanitizeArticle('<table onclick="bad()"><tr><td>Figure</td></tr></table>', 'https://example.com/story');
  const output = document.createElement('div'); output.innerHTML = clean;
  assert.equal(output.querySelector('table')?.getAttribute('tabindex'), '0');
  assert.equal(output.querySelector('table')?.getAttribute('aria-label'), 'Article table');
  assert.equal(output.querySelector('table')?.hasAttribute('onclick'), false);
});

void test('authorized rendered fallback crops selected responsive pixels and restores page and scroll', async () => {
  const text = '<p>A detailed field notebook describes birds, seasons, ocean tides and meaningful coastal observations for researchers and readers.</p>'.repeat(8);
  const doc = fixture(`<html><head><title>Notebook</title></head><body><article><h1>Notebook</h1>${text}<img style="border: 1px solid" src="/unselected.png" alt="Responsive chart"></article></body></html>`);
  const original = doc.querySelector('img'), view = doc.defaultView;
  assert.ok(original && view);
  Object.defineProperties(original, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 800 }, currentSrc: { value: 'https://example.com/selected.svg' } });
  Object.defineProperties(view, { innerWidth: { value: 1000 }, innerHeight: { value: 600 }, scrollX: { value: 12 }, scrollY: { value: 345 } });
  view.requestAnimationFrame = callback => { callback(0); return 1; };
  const restores: ScrollToOptions[] = []; Object.defineProperty(view, 'scrollTo', {value: (options: ScrollToOptions) => { restores.push(options); }});
  const bitmap = { closed: false, width: 2000, height: 1200, close() { this.closed = true; } };
  view.createImageBitmap = () => Promise.resolve(bitmap);
  const create = doc.createElement.bind(doc), draws: unknown[][] = [], selected: string[] = [];
  Object.defineProperty(doc, 'createElement', {value: (tagName: string) => {
    const element = create(tagName);
    if (tagName === 'img') {
      const image = element as HTMLImageElement;
      image.decode = () => { selected.push(image.src); return Promise.resolve(); };
      image.getBoundingClientRect = () => new view.DOMRect(16, 58, 968, 484);
    }
    if (tagName === 'canvas') {
      const canvas = element as HTMLCanvasElement;
      Object.defineProperty(canvas, 'getContext', {value: () => ({ drawImage(...values: unknown[]) { if (values[0] === original) throw new Error('Tainted'); draws.push(values); } })});
      canvas.toDataURL = () => WEBP;
    }
    return element;
  }});
  const before = doc.documentElement.outerHTML, calls: unknown[] = [];
  Object.defineProperty(globalThis, 'chrome', {configurable:true, writable:true, value: { runtime: { sendMessage(message: unknown) { calls.push(message); return Promise.resolve({ ok: true, data: { dataUrl: 'data:image/png;base64,AAAA' } }); } } }});
  try {
    const result = await capture(doc, { captureToken: 'authorized-session' });
    assert.ok(result.ok);
    assert.equal((result.article.content.match(/<img/g) || []).length, 1);
    assert.deepEqual(calls, [{ target: 'background', action: 'CAPTURE_IMAGE_PIXELS', captureToken: 'authorized-session' }]);
    assert.deepEqual(selected, ['https://example.com/selected.svg']);
    assert.deepEqual(draws[0]?.slice(1), [32, 116, 1936, 968, 0, 0, 968, 484]);
    assert.equal(bitmap.closed, true);
    assert.deepEqual(restores, [{ left: 12, top: 345, behavior: 'instant' }]);
    assert.equal(doc.documentElement.outerHTML, before);
    view.requestAnimationFrame = () => 1; // Hidden tabs may never deliver a paint callback.
    const stalledPaint = await capture(doc, { captureToken: 'authorized-session' });
    assert.ok(stalledPaint.ok);
    assert.ok(!stalledPaint.article.content.includes('<img'));
    assert.equal(calls.length, 1);
    assert.equal(doc.documentElement.outerHTML, before);
    const withoutToken = await capture(doc);
    assert.ok(withoutToken.ok);
    assert.ok(!withoutToken.article.content.includes('<img'));
    assert.equal(calls.length, 1);
  } finally { Reflect.deleteProperty(globalThis, 'chrome'); }
});

void test('anonymous fallback omits cookies and referrer and cancels oversized responses', async () => {
  const text = '<p>Meaningful article observations describe the ocean and coastal wildlife with sufficient detail to preserve an interesting field notebook.</p>'.repeat(8);
  const doc = fixture(`<article><h1>Notebook</h1>${text}<img src="https://images.example/chart.jpg" alt="Chart"></article>`);
  const original = doc.querySelector('img'), view = doc.defaultView;
  assert.ok(original && view);
  Object.defineProperties(original, { complete: { value: true }, naturalWidth: { value: 100 }, naturalHeight: { value: 50 } });
  view.createImageBitmap = () => Promise.reject(new Error('Oversized response must not decode'));
  let options: RequestInit | undefined;
  view.fetch = (_url, request) => { options = request; return Promise.resolve(new Response('fixture', { headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': String(3 * 1024 * 1024) }) })); };
  const create = doc.createElement.bind(doc);
  Object.defineProperty(doc, 'createElement', {value: (tagName: string) => {
    const element = create(tagName);
    if (tagName === 'canvas') Object.defineProperty(element, 'getContext', {value: () => ({ drawImage() { throw new Error('Tainted'); } })});
    return element;
  }});
  const result = await capture(doc);
  assert.ok(result.ok);
  assert.ok(!result.article.content.includes('<img'));
  assert.ok(options);
  assert.equal(options.mode, 'cors'); assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.signal?.aborted, true);
});

void test('single-preset overflow requires explicit text-only choice rather than lowering image quality', async () => {
  const text='<p>A careful coastal field report preserves meaningful observations about changing tides and wildlife for future researchers.</p>'.repeat(12);
  const doc=fixture(`<article><h1>Coastal field report</h1>${text}<img src="/large.webp" alt="Detailed chart"></article>`);
  const original=doc.querySelector('img');
  assert.ok(original);
  Object.defineProperties(original,{complete:{value:true},naturalWidth:{value:2000},naturalHeight:{value:1000}});
  const create=doc.createElement.bind(doc),attempts: [number, number, string | undefined, number | undefined][]=[];
  Object.defineProperty(doc, 'createElement', {value:(tagName:string)=>{const node=create(tagName);if(tagName==='canvas'){
    const canvas=node as HTMLCanvasElement;
    Object.defineProperty(canvas,'getContext',{value:()=>({drawImage(){}})});
    canvas.toDataURL=(mime?:string,quality?:number)=>{attempts.push([canvas.width,canvas.height,mime,quality]);return 'x'.repeat(1024*1024+1);};
  }return node;}});
  const result=await capture(doc);
  assert.ok(result.ok);assert.equal(result.imageLimitExceeded,true);assert.match(result.imageWarning,/text only/);
  assert.deepEqual(attempts,[[1600,800,'image/webp',0.8]]);assert.match(result.article.content,/Image: Detailed chart/);
});

void test('capture flags native decoded image limits without attempting canvas serialization', async () => {
  const text='<p>Meaningful coastal field observations explain wildlife and tides for readers returning to a detailed scientific notebook.</p>'.repeat(12);
  const doc=fixture(`<article><h1>Field observations</h1>${text}<img src="/huge.webp" alt="Huge chart"></article>`);
  Object.defineProperties(doc.querySelector('img'),{complete:{value:true},naturalWidth:{value:5000},naturalHeight:{value:4000}});
  const create=doc.createElement.bind(doc);Object.defineProperty(doc, 'createElement',{value:(tagName:string)=>{assert.notEqual(tagName,'canvas');return create(tagName);}});
  const result=await capture(doc);assert.ok(result.ok);assert.equal(result.imageLimitExceeded,true);assert.match(result.article.content,/Huge chart/);
});

void test('capture ignores author-like navigation guesses and retains explicit author metadata', async () => {
  const text='<p>Detailed field observations record tides, wildlife and weather throughout the year for researchers revisiting the coastline.</p>'.repeat(12);
  const html=`<head><title>Coastal study</title></head><body><article><h1>Coastal study</h1>${text}<div class="authority-control">showAuthority control databases</div></article></body>`;
  assert.equal((await capture(fixture(html))).article.byline,'');
  const metadata=fixture(html);const meta=metadata.createElement('meta');meta.name='author';meta.content='A genuine author';metadata.head.append(meta);
  assert.equal((await capture(metadata)).article.byline,'A genuine author');
  const semantic=fixture(html.replace('<h1>Coastal study</h1>','<h1>Coastal study</h1><span rel="author">A semantic author</span>'));
  assert.equal((await capture(semantic)).article.byline,'A semantic author');
  const classByline=fixture(html.replace('<h1>Coastal study</h1>','<h1>Coastal study</h1><span class="article-byline">A class author</span>'));
  assert.equal((await capture(classByline)).article.byline,'A class author');
});

void test('local references and inert MathML survive repeated sanitization', () => {
  fixture('');
  const clean = sanitizeArticle('<script id="removed"></script><p><a href="#note">Note</a></p><p id="note">Reference</p><math display="block" onclick="bad()"><mfrac><mi>x</mi><mn>2</mn></mfrac><annotation-xml><script>bad()</script></annotation-xml></math>', 'https://example.com/story');
  const element = document.createElement('div'); element.innerHTML = clean;
  const target = element.querySelector('p[id]');
  assert.equal(element.querySelector('a')?.getAttribute('href'), `#${target?.id}`);
  assert.equal(element.querySelector('math')?.namespaceURI, 'http://www.w3.org/1998/Math/MathML');
  assert.equal(element.querySelector('mfrac')?.textContent, 'x2');
  assert.equal(element.querySelectorAll('script,annotation-xml,[onclick]').length, 0);
  assert.equal(sanitizeArticle(clean, 'https://example.com/story'), clean);
});

void test('capture uses explicit schema.org author metadata without executing scripts', async () => {
  const prose = '<p>Archiving a readable document preserves the text and its author metadata for future readers. This paragraph gives the article enough detail to extract reliably.</p>'.repeat(8);
  const doc = fixture(`<html><head><title>Archiving documents</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Archiving documents","author":{"@type":"Person","name":"Ada Shore"}}</script></head><body><article><h1>Archiving documents</h1>${prose}</article></body></html>`);
  const result = await capture(doc);
  assert.equal(result.article.byline, 'Ada Shore');
  assert.ok(!result.article.content.includes('<script'));
});

void test('capture rejects oversized and deeply nested source DOMs before cloning', async () => {
  const large = fixture('<p>' + 'x'.repeat(8 * 1024 * 1024 + 1) + '</p>');
  const oversized = await Effect.runPromise(captureArticleEffect(large));
  assert.equal(oversized.ok, false);
  const nested = fixture('<div>'.repeat(102) + '<p>A nested article.</p>' + '</div>'.repeat(102));
  const deep = await Effect.runPromise(captureArticleEffect(nested));
  assert.equal(deep.ok, false);
});
