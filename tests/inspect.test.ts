import { Effect } from 'effect';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { inspectArticle } from '../src/extraction/inspect.ts';
import { captureArticle } from '../src/extraction/content.ts';

function inspect(content: string, textContent = 'A falsely claimed long article') {
  globalThis.document = new JSDOM('').window.document;
  const article = { url: 'https://example.com/story', content, textContent };
  return Effect.runSync(Effect.sync(() => inspectArticle(article)));
}
const WEBP = 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACwAgCdASoUAAoAPxFysFAsJqSisAgBgCIJaQAAeyAA/vBpgAA=';

void test('inspection computes text and structure from clean HTML rather than a claimed text field', () => {
  const result = inspect('<div><h2>A heading</h2><p> First   paragraph. </p><p>Second <em>paragraph.</em></p></div>');
  assert.equal(result.textContent, 'A heading First paragraph. Second paragraph.');
  assert.deepEqual([result.paragraphs, result.headings, result.images, result.blocks], [2, 1, 0, 4]);
  assert.equal(result.domSignature, 'h1-p2-div1-img0');
  assert.ok(result.textDensity > 0 && result.textDensity < 1);
  assert.ok(!result.textContent.includes('falsely claimed'));
});

void test('inspection removes executable markup and remote resources before measuring', () => {
  const result = inspect('<script>bad()</script><iframe src="https://tracker.test"></iframe><p onclick="bad()">Readable</p><img src="https://tracker.test/pixel" alt="Missing chart"><span hidden>Secret</span>');
  assert.equal(result.textContent, 'Readable[Image: Missing chart]');
  assert.equal(result.paragraphs, 1);
  assert.equal(result.images, 0);
  assert.ok(!result.content.includes('tracker.test'));
  assert.ok(!result.content.includes('onclick'));
  assert.ok(!result.textContent.includes('Secret'));
});

void test('inline image bytes are excluded from the text density denominator', () => {
  const result = inspect(`<p>A meaningful article paragraph.</p><img src="${WEBP}" alt="Chart">`);
  const withoutUriLength = result.content.replace(WEBP, '').length;
  assert.equal(result.images, 1);
  assert.equal(result.textDensity, result.textContent.length / withoutUriLength);
  assert.equal(result.domSignature, 'h0-p1-div0-img1');
});

void test('empty sanitized content has zero text density', () => {
  const result = inspect('<script>bad()</script>');
  assert.equal(result.textContent, '');
  assert.equal(result.textDensity, 0);
});


void test('inspection rejects an image flood before sanitization can reduce its count', () => {
  const images = Array.from({ length: 11 }, () => '<img src="https://tracker.test/image" hidden alt="chart">').join('');
  assert.throws(() => inspect(`<p>A long article paragraph.</p>${images}`), /more than ten images/);
});

void test('a Readability capture with formatting and unavailable media survives actual DOM inspection', async () => {
  const paragraphs = Array.from({ length: 12 }, (_, index) => `<p>Observation ${index + 1}. Coastal researchers record the changing weather, the ocean tides, and the birds returning with each season. These detailed field notes help readers study recurring natural patterns across the year.</p>`).join('');
  const html = `<html><head><title>The coastal notebook</title></head><body><article><h1>The coastal notebook</h1>${paragraphs}<h2>Measurements</h2><table><tr><th>Season</th><th>Water</th></tr><tr><td>Spring</td><td>Cold</td></tr></table><pre><code>temperature = 12</code></pre><img src="https://example.com/chart.webp" alt="Coastal chart"></article></body></html>`;
  const dom = new JSDOM(html, { url: 'https://example.com/notebook' });
  globalThis.document = dom.window.document;
  const captured = await captureArticle(document);
  assert.ok(captured.ok);
  const inspection = inspectArticle(captured.article);
  assert.equal(inspection.textContent, captured.article.textContent.replace(/\s+/g, ' ').trim());
  assert.equal(inspection.paragraphs, 12);
  assert.match(inspection.textContent, /Image: Coastal chart/);
  assert.ok(inspection.textDensity >= 0.1);

});

void test('a literal data URI in article text is counted as text rather than treated as an embedded image', () => {
  const result = inspect(`<p>A WebP data URI example:</p><pre><code>${WEBP}</code></pre>`);
  assert.equal(result.images, 0);
  assert.equal(result.textDensity, result.textContent.length / result.content.length);
  assert.ok(result.textDensity <= 1);
});

void test('inspection rejects image dimensions and total pixels before native decoding', () => {
  const uri = (width: number, height: number) => {
    const bytes = Buffer.from(WEBP.slice(WEBP.indexOf(',') + 1), 'base64');
    bytes.writeUInt16LE(width, 26); bytes.writeUInt16LE(height, 28);
    return `data:image/webp;base64,${bytes.toString('base64')}`;
  };
  assert.throws(() => inspect(`<img src="${uri(8193, 1)}">`), /invalid or oversized/);
  assert.throws(() => inspect(`<img src="${uri(5000, 4000)}">`), /invalid or oversized/);
  assert.throws(() => inspect(`<img src="${uri(4000, 4000)}"><img src="${uri(4000, 4000)}"><img src="${uri(20, 10)}">`), /total image budget/);
  assert.equal(inspect(`<img src="${uri(4000, 4000)}"><img src="${uri(4000, 4000)}">`).images, 2);
});

void test('inspection rejects over-budget URIs and excessive DOM depth', () => {
  assert.throws(() => inspect(`<img src="data:image/webp;base64,${'A'.repeat(1024 * 1024)}">`), /invalid or oversized/);
  assert.throws(() => inspect('<div>'.repeat(102) + 'Visible text' + '</div>'.repeat(102)), /DOM structure limit/);
});
