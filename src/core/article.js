import { normalizeUrl } from './url.js';

export const MAX_ARTICLE_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder(),
  decoder = new TextDecoder('utf-8', { fatal: true });
const HASH = /^[a-f0-9]{64}$/;
export async function sha256(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
export function hashUrl(url) {
  return sha256(normalizeUrl(url));
}
export function validateArticle(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid article.');
  const url = normalizeUrl(input.url);
  if (url !== input.url || url.length > 4096)
    throw new Error('Article URL must be normalized.');
  if (
    typeof input.title !== 'string' ||
    !input.title.trim() ||
    input.title.length > 500 ||
    typeof input.byline !== 'string' ||
    input.byline.length > 500 ||
    typeof input.content !== 'string' ||
    !input.content.trim() ||
    !Number.isSafeInteger(input.capturedAt) ||
    input.capturedAt < 0 ||
    input.capturedAt > now + 60_000
  )
    throw new Error('Invalid article fields.');
  const article = {
    url,
    title: input.title,
    byline: input.byline,
    capturedAt: input.capturedAt,
    content: input.content
  };
  if (encoder.encode(JSON.stringify(article)).byteLength > MAX_ARTICLE_BYTES)
    throw new Error('Article is too large.');
  return article;
}
async function copy(bytes, article) {
  return {
    bytes,
    article,
    urlHash: await hashUrl(article.url),
    contentHash: await sha256(
      JSON.stringify([
        1,
        article.url,
        article.title,
        article.byline,
        article.content
      ])
    ),
    blobHash: await sha256(bytes),
    size: bytes.byteLength
  };
}
export async function encodeArticle(input, options = {}) {
  const article = validateArticle(input, options);
  const bytes = encoder.encode(
    JSON.stringify({ format: 'meshcache.article', version: 1, article })
  );
  if (bytes.byteLength > MAX_ARTICLE_BYTES)
    throw new Error('Article file is too large.');
  return copy(bytes, article);
}
/**
 * @param {unknown} input
 * @param {{ blobHash?: string, now?: number }} [options]
 * @returns {Promise<import('../types.ts').ArticleCopy>}
 */
export async function decodeArticle(
  input,
  { blobHash, now = Date.now() } = {}
) {
  if (
    !(input instanceof Uint8Array) ||
    !input.byteLength ||
    input.byteLength > MAX_ARTICLE_BYTES
  )
    throw new Error('Invalid article file size.');
  const bytes = input.slice();
  if (
    blobHash !== undefined &&
    (!HASH.test(blobHash) || (await sha256(bytes)) !== blobHash)
  )
    throw new Error('Article file hash does not match.');
  const file = JSON.parse(decoder.decode(bytes));
  if (
    !file ||
    Array.isArray(file) ||
    file.format !== 'meshcache.article' ||
    file.version !== 1
  )
    throw new Error('Unsupported article format.');
  return copy(bytes, validateArticle(file.article, { now }));
}
