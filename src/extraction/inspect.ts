import { Schema } from 'effect';
import type { Article } from '../domain/types.ts';
import { sanitizeArticle, articleText, inspectWebP, MAX_IMAGES, MAX_TOTAL_IMAGE_URI_LENGTH, MAX_TOTAL_IMAGE_PIXELS } from './sanitize.ts';

/** Inspect inert sanitized HTML; derived text can differ across renderer versions. */

const inspectionInputSchema = Schema.Struct({content:Schema.String,url:Schema.String});
const decodeInspectionInput = Schema.decodeUnknownSync(inspectionInputSchema);
export function inspectArticle(input: Pick<Article,'content'|'url'>) {
  const article = decodeInspectionInput(input);
  const raw = document.createElement('template');
  raw.innerHTML = article.content;
  if (raw.content.querySelectorAll('img').length > MAX_IMAGES) {
    throw new Error('Article contains more than ten images.');
  }
  let bytes = 0, pixels = 0;
  for (const image of raw.content.querySelectorAll('img')) {
    const src = image.getAttribute('src') || '';
    if (!src.startsWith('data:')) continue;
    const dimensions = inspectWebP(src);
    if (!dimensions) throw new Error('Article contains an invalid or oversized WebP image.');
    bytes += src.length; pixels += dimensions.width * dimensions.height;
    if (bytes > MAX_TOTAL_IMAGE_URI_LENGTH || pixels > MAX_TOTAL_IMAGE_PIXELS) throw new Error('Article exceeds the total image budget.');
  }
  let nodes = 0;
  
  const pending: Array<[Node,number]> = [...raw.content.childNodes].map(node => [node, 0]);
  while (pending.length) {
    const next = pending.pop();
    if (!next) break;
    const [node, depth] = next;
    if (++nodes > 50_000 || depth > 100) throw new Error('Article exceeds the DOM structure limit.');
    for (const child of node.childNodes) pending.push([child, depth + 1]);
  }
  const content = sanitizeArticle(article.content, article.url);
  const container = document.createElement('div');
  container.innerHTML = content;
  const textContent = articleText(container).replace(/\s+/g, ' ').trim();
  const paragraphs = container.querySelectorAll('p').length;
  const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
  const images = container.querySelectorAll('img').length;
  const divs = container.querySelectorAll('div').length;
  const blocks = container.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,blockquote,pre,li,table,figure,dl').length;
  const markupLength = content.replace(/(<img\b[^>]*\bsrc=")data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}(")/g, '$1$2').length;
  return {
    content,
    textContent,
    paragraphs, headings, images, blocks,
    domSignature: `h${headings}-p${paragraphs}-div${divs}-img${images}`,
    textDensity: markupLength ? textContent.length / markupLength : 0,
  };
}
