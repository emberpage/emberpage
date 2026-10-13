import { Schema } from 'effect';
import type { Article } from './types.ts';
import { normalizeUrl } from './url.ts';
export const MAX_ARTICLE_BYTES: number = 2 * 1024 * 1024;
const encoder: TextEncoder = new TextEncoder(),
  decoder: TextDecoder = new TextDecoder('utf-8', { fatal: true });
const ArticleFields = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  byline: Schema.String,
  content: Schema.String,
  capturedAt: Schema.Number
});
const HASH: RegExp = /^[a-f0-9]{64}$/;
const CopyIdentity = Schema.Struct({
  blobHash: Schema.String.check(Schema.isPattern(HASH)),
  contentHash: Schema.String.check(Schema.isPattern(HASH)),
  urlHash: Schema.String.check(Schema.isPattern(HASH)),
  size: Schema.Int.check(Schema.isBetween({minimum: 1, maximum: MAX_ARTICLE_BYTES})),
});
export async function sha256(value: string | Uint8Array<ArrayBufferLike>) {
  const bytes: Uint8Array<ArrayBufferLike> =
    typeof value === 'string' ? encoder.encode(value) : value;
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
    )
  ]
    .map((byte: number) => byte.toString(16).padStart(2, '0'))
    .join('');
}
export function hashUrl(url: unknown) {
  return sha256(normalizeUrl(url));
}
export function validateArticle(
  input: unknown,
  {
    now = Date.now()
  }:
    | {
        now?: number | undefined;
      }
    | undefined = {}
) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid article.');
  let value: Article;
  try {
    value = Schema.decodeUnknownSync(ArticleFields)(input);
  } catch {
    throw new Error('Invalid article fields.');
  }
  const url: string = normalizeUrl(value.url);
  if (url !== value.url || url.length > 4096)
    throw new Error('Article URL must be normalized.');
  if (
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 500 ||
    typeof value.byline !== 'string' ||
    value.byline.length > 500 ||
    typeof value.content !== 'string' ||
    !value.content.trim() ||
    typeof value.capturedAt !== 'number' ||
    !Number.isSafeInteger(value.capturedAt) ||
    value.capturedAt < 0 ||
    value.capturedAt > now + 60000
  )
    throw new Error('Invalid article fields.');
  const article: {
    url: string;
    title: string;
    byline: string;
    capturedAt: number;
    content: string;
  } = {
    url,
    title: value.title,
    byline: value.byline,
    capturedAt: value.capturedAt,
    content: value.content
  };
  if (encoder.encode(JSON.stringify(article)).byteLength > MAX_ARTICLE_BYTES)
    throw new Error('Article is too large.');
  return article;
}
async function copy(bytes: Uint8Array<ArrayBufferLike>, article: Article) {
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
/** Native gzip, bounded before parsing; the envelope remains provider-compatible JSON. */
async function gzipBytes(bytes: Uint8Array<ArrayBuffer>, decompress = false) {
  const stream = new Blob([bytes]).stream().pipeThrough(
    decompress ? new DecompressionStream('gzip') : new CompressionStream('gzip')
  );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ARTICLE_BYTES) {
        await reader.cancel();
        throw new Error('Expanded article file is too large.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
export async function encodeArticle(
  input: unknown,
  options: { now?: number | undefined } = {}
) {
  const article = validateArticle(input, options);
  const compressed = await gzipBytes(encoder.encode(JSON.stringify(article)));
  let binary = '';
  for (let offset = 0; offset < compressed.length; offset += 32_768)
    binary += String.fromCharCode(...compressed.subarray(offset, offset + 32_768));
  const bytes = encoder.encode(JSON.stringify({
    format: 'emberpage.article', version: 2, encoding: 'gzip', payload: btoa(binary)
  }));
  if (bytes.byteLength > MAX_ARTICLE_BYTES) throw new Error('Article file is too large.');
  return copy(bytes, article);
}
export async function decodeArticle(
  input: unknown,
  { blobHash, expected, now = Date.now() }: {
    blobHash?: string | undefined; expected?: unknown; now?: number | undefined;
  } = {}
) {
  if (!(input instanceof Uint8Array) || !input.byteLength || input.byteLength > MAX_ARTICLE_BYTES)
    throw new Error('Invalid article file size.');
  const bytes = input.slice();
  const identity = expected === undefined ? undefined : Schema.decodeUnknownSync(CopyIdentity)(expected);
  if (identity && identity.size !== bytes.byteLength)
    throw new Error('Article file metadata does not match.');
  blobHash ??= identity?.blobHash;
  if (blobHash !== undefined && (!HASH.test(blobHash) || await sha256(bytes) !== blobHash))
    throw new Error('Article file hash does not match.');
  const envelope = Schema.decodeUnknownSync(Schema.Struct({
    format: Schema.Literal('emberpage.article'),
    version: Schema.Literal(2),
    encoding: Schema.Literal('gzip'),
    payload: Schema.String
  }))(JSON.parse(decoder.decode(bytes)) as unknown);
  if (!envelope.payload ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(envelope.payload))
    throw new Error('Invalid compressed article.');
  const compressed = Uint8Array.from(atob(envelope.payload), character => character.charCodeAt(0));
  const expanded = await gzipBytes(compressed, true);
  const article = JSON.parse(decoder.decode(expanded)) as unknown;
  const decoded = await copy(bytes, validateArticle(article, { now }));
  if (identity) {
    for (const field of ['blobHash', 'contentHash', 'urlHash', 'size'] as const)
      if (decoded[field] !== identity[field])
        throw new Error('Article file metadata does not match.');
  }
  return decoded;
}
