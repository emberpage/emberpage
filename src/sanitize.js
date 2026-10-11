import { normalizeUrl } from './core/url.js';

export const MAX_IMAGES = 10;
export const MAX_TOTAL_IMAGE_URI_LENGTH = 1024 * 1024;
export const MAX_IMAGE_URI_LENGTH = MAX_TOTAL_IMAGE_URI_LENGTH;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_IMAGE_EDGE = 8192;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_TOTAL_IMAGE_PIXELS = 32_000_000;
export const validImageDimensions = ({ width, height }) => Number.isSafeInteger(width) && Number.isSafeInteger(height)
  && width > 0 && height > 0 && width <= MAX_IMAGE_EDGE && height <= MAX_IMAGE_EDGE && width * height <= MAX_IMAGE_PIXELS;

/** Accept bounded still WebP frames, with no EXIF, XMP, or external resources. */
export function inspectWebP(uri) {
  if (typeof uri !== 'string' || uri.length > MAX_IMAGE_URI_LENGTH || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) return null;
  try {
    const binary = atob(uri.slice('data:image/webp;base64,'.length));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const tag = offset => binary.slice(offset, offset + 4);
    if (bytes.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP' || view.getUint32(4, true) !== bytes.length - 8) return null;
    let frame, canvas;
    for (let offset = 12; offset < bytes.length;) {
      if (offset + 8 > bytes.length) return null;
      const kind = tag(offset), size = view.getUint32(offset + 4, true), start = offset + 8;
      if (start + size > bytes.length) return null;
      let dimensions;
      if (kind === 'VP8 ' && size >= 10 && bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) {
        dimensions = { width: view.getUint16(start + 6, true) & 0x3fff, height: view.getUint16(start + 8, true) & 0x3fff };
      } else if (kind === 'VP8L' && size >= 5 && bytes[start] === 0x2f) {
        const bits = view.getUint32(start + 1, true);
        dimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      } else if (kind === 'VP8X' && size === 10 && !(bytes[start] & 0x02)) {
        canvas = { width: 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16), height: 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16) };
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
  'object', 'embed', 'svg', 'math', 'source',
  'video', 'audio', 'track', 'canvas', 'form', 'input', 'button',
  'select', 'textarea', 'option', 'link', 'meta', 'base',
]);

export function sanitizeArticle(html, baseUrl) {
  const template = document.createElement('template');
  template.innerHTML = String(html ?? '');
  const output = document.createElement('div');
  let visited = 0, images = 0, imageUriLength = 0, imagePixels = 0;

  function appendClean(node, parent, depth = 0) {
    if (++visited > 50_000 || depth > 100) return;
    if (node.nodeType === 3) {
      parent.appendChild(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.localName.toLowerCase();
    if (DROP_TAGS.has(tag) || node.hasAttribute('hidden') ||
        node.getAttribute('aria-hidden') === 'true' ||
        /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.getAttribute('style') || '')) return;

    if (tag === 'img') {
      const src = node.getAttribute('src'), dimensions = inspectWebP(src);
      const alt = (node.getAttribute('alt') || 'Image unavailable').slice(0, 500);
      if (!dimensions || images >= MAX_IMAGES || imageUriLength + src.length > MAX_TOTAL_IMAGE_URI_LENGTH || imagePixels + dimensions.width * dimensions.height > MAX_TOTAL_IMAGE_PIXELS) {
        const placeholder = document.createElement('span');
        placeholder.textContent = `[Image: ${alt}]`;
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
    if (!ALLOWED_TAGS.has(tag)) {
      for (const child of node.childNodes) appendClean(child, parent, depth + 1);
      return;
    }
    const clean = document.createElement(tag);
    if (tag === 'table') {
      clean.setAttribute('tabindex', '0');
      clean.setAttribute('aria-label', 'Article table');
    }
    if (tag === 'a' && node.hasAttribute('href')) {
      try {
        const url = new URL(node.getAttribute('href'), baseUrl);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          const sensitive = /^(?:access_token|token|auth|authorization|email|session|sessionid|session_id|user_id|password|key|api_key)$/i;
          if (![...url.searchParams.keys()].some(key => sensitive.test(key))) {
            clean.setAttribute('href', normalizeUrl(url.href));
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
