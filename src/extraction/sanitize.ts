import { Schema } from 'effect';
import { normalizeUrl } from '../domain/url.ts';

/** Serialize sanitized article structure without joining adjacent blocks. */
export function articleText(root: Element): string {
  const blocks = new Set(['article', 'section', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'pre', 'table', 'tr', 'hr']);
  const parts: string[] = [];
  function visit(node: Node, preformatted = false): void {
    if (node.nodeType === 3) {
      const text = node.nodeValue || '';
      parts.push(preformatted ? text : text.replace(/\s+/g, ' '));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).localName;
    if (tag === 'br') {parts.push('\n'); return;}
    const block = blocks.has(tag);
    if (block) parts.push('\n\n');
    for (const child of node.childNodes) visit(child, preformatted || tag === 'pre');
    if (tag === 'td' || tag === 'th') parts.push('\t');
    if (block) parts.push('\n\n');
  }
  visit(root);
  return parts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export const MAX_IMAGES = 10;
export const MAX_TOTAL_IMAGE_URI_LENGTH = 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
const MAX_IMAGE_EDGE = 8192;
const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_TOTAL_IMAGE_PIXELS = 32_000_000;

const imageDimensionsSchema = Schema.Struct({
  width: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_IMAGE_EDGE })),
  height: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_IMAGE_EDGE }))
}).check(Schema.makeFilter(({ width, height }) => width * height <= MAX_IMAGE_PIXELS));
export const validImageDimensions = Schema.is(imageDimensionsSchema);

/** Accept bounded still WebP frames, with no EXIF, XMP, or external resources. */

export function inspectWebP(uri: unknown): {width:number,height:number}|null {
  if (typeof uri !== 'string' || uri.length > MAX_TOTAL_IMAGE_URI_LENGTH || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) return null;
  try {
    const binary = atob(uri.slice('data:image/webp;base64,'.length));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    
    const tag = (offset: number) => binary.slice(offset, offset + 4);
    if (bytes.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP' || view.getUint32(4, true) !== bytes.length - 8) return null;
    let frame, canvas;
    for (let offset = 12; offset < bytes.length;) {
      if (offset + 8 > bytes.length) return null;
      const kind = tag(offset), size = view.getUint32(offset + 4, true), start = offset + 8;
      if (start + size > bytes.length) return null;
      let dimensions;
      if (kind === 'VP8 ' && size >= 10 && bytes[start + 3] === 0x9d && view.getUint8(start + 4) === 0x01 && view.getUint8(start + 5) === 0x2a) {
        dimensions = { width: view.getUint16(start + 6, true) & 0x3fff, height: view.getUint16(start + 8, true) & 0x3fff };
      } else if (kind === 'VP8L' && size >= 5 && bytes[start] === 0x2f) {
        const bits = view.getUint32(start + 1, true);
        dimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      } else if (kind === 'VP8X' && size === 10 && !(view.getUint8(start) & 0x02)) {
        canvas = { width: 1 + view.getUint8(start + 4) + (view.getUint8(start + 5) << 8) + (view.getUint8(start + 6) << 16), height: 1 + view.getUint8(start + 7) + (view.getUint8(start + 8) << 8) + (view.getUint8(start + 9) << 16) };
        if (!validImageDimensions(canvas)) return null;
      } else if (kind !== 'ALPH' && kind !== 'ICCP') return null;
      if (dimensions) {
        if (frame || !validImageDimensions(dimensions)) return null;
        frame = dimensions;
      }
      offset = start + size + (size % 2);
      if (offset > bytes.length) return null;
    }
    if (!frame || (canvas && (canvas.width !== frame.width || canvas.height !== frame.height))) return null;
    return frame;
  } catch { return null; }
}

/** Keep article formatting, safe links, and bounded self-contained images. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'small',
  'sub', 'sup', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
  'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr',
  'th', 'td', 'caption', 'a', 'div', 'span', 'figure', 'figcaption', 'img',
]);
const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'template', 'iframe', 'frame',
  'object', 'embed', 'svg', 'source', 'annotation', 'annotation-xml',
  'video', 'audio', 'track', 'canvas', 'form', 'input', 'button',
  'select', 'textarea', 'option', 'link', 'meta', 'base',
]);


const MATH_TAGS = new Set(['math', 'mrow', 'mi', 'mn', 'mo', 'mtext', 'mfrac', 'msqrt', 'mroot', 'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'semantics']);

export function sanitizeArticle(html: unknown, baseUrl: string) {
  const template = document.createElement('template');
  template.innerHTML = typeof html === 'string' ? html : '';
  const output = document.createElement('div');
  // Rewrite local targets into our own namespace, without retaining page/global IDs.
  const targets = new Map<string, string>();
  const reserved = new Set([...template.content.querySelectorAll('[id]')].map(element => element.id).filter(id => /^ember-ref-\d{1,5}$/.test(id)));
  let reference = 0;
  for (const element of template.content.querySelectorAll('[id]')) {
    if (targets.size >= 50_000) break;
    const id = element.getAttribute('id') || '';
    if (id && id.length <= 500 && !targets.has(id)) {
      while (reserved.has(`ember-ref-${reference}`)) reference++;
      targets.set(id, reserved.has(id) ? id : `ember-ref-${reference++}`);
    }
  }
  const assigned = new Set<string>();
  let visited = 0, images = 0, imageUriLength = 0, imagePixels = 0;

  
  function appendClean(node: Node, parent: Node, depth = 0) {
    if (++visited > 50_000 || depth > 100) return;
    if (node.nodeType === 3) {
      parent.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.localName.toLowerCase();
    if (DROP_TAGS.has(tag) || element.hasAttribute('hidden') ||
        element.getAttribute('aria-hidden') === 'true' ||
        /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(element.getAttribute('style') || '')) return;

    if (tag === 'img') {
      const src = element.getAttribute('src') || '', dimensions = inspectWebP(src);
      const alt = (element.getAttribute('alt') || '').slice(0, 500);
      if (!dimensions || images >= MAX_IMAGES || imageUriLength + src.length > MAX_TOTAL_IMAGE_URI_LENGTH || imagePixels + dimensions.width * dimensions.height > MAX_TOTAL_IMAGE_PIXELS) {
        const placeholder = document.createElement('span');
        placeholder.textContent = `[Image: ${alt || 'Image unavailable'}]`;
        parent.appendChild(placeholder);
        return;
      }
      const image = document.createElement('img');
      image.setAttribute('src', src);
      image.setAttribute('alt', alt);
      image.setAttribute('width', String(dimensions.width));
      image.setAttribute('height', String(dimensions.height));
      parent.appendChild(image);
      images++; imageUriLength += src.length; imagePixels += dimensions.width * dimensions.height;
      return;
    }
    if (!ALLOWED_TAGS.has(tag) && !MATH_TAGS.has(tag)) {
      for (const child of node.childNodes) appendClean(child, parent, depth + 1);
      return;
    }
    const clean = MATH_TAGS.has(tag)
      ? document.createElementNS('http://www.w3.org/1998/Math/MathML', tag)
      : document.createElement(tag);
    const target = targets.get(element.getAttribute('id') || '');
    if (target && !assigned.has(target)) { clean.setAttribute('id', target); assigned.add(target); }
    if (tag === 'math' && element.getAttribute('display') === 'block') clean.setAttribute('display', 'block');
    if (tag === 'table') {
      clean.setAttribute('tabindex', '0');
      clean.setAttribute('aria-label', 'Article table');
    }
    if (tag === 'a' && element.hasAttribute('href')) {
      try {
        const url = new URL(element.getAttribute('href') || '', baseUrl);
        const local = new URL(baseUrl); local.hash = '';
        const destination = new URL(url); destination.hash = '';
        const target = targets.get(decodeURIComponent(url.hash.slice(1)));
        if (url.hash && destination.href === local.href && target) clean.setAttribute('href', `#${target}`);
        else if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          const sensitive = /^(?:access_token|token|auth|authorization|email|session|sessionid|session_id|user_id|password|key|api_key)$/i;
          if (![...url.searchParams.keys()].some(key => sensitive.test(key))) {
            clean.setAttribute('href', normalizeUrl(url.href) + url.hash);
          }
        }
      } catch { /* Invalid links remain readable text. */ }
    }
    for (const child of node.childNodes) appendClean(child, clean, depth + 1);
    parent.appendChild(clean);
  }
  for (const node of template.content.childNodes) appendClean(node, output);
  return output.innerHTML;
}
