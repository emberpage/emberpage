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
export async function encodeArticle(
  input: unknown,
  options:
    | {
        now?: number | undefined;
      }
    | undefined = {}
) {
  const article: Article = validateArticle(input, options);
  const bytes: Uint8Array<ArrayBuffer> = encoder.encode(
    JSON.stringify({ format: 'emberpage.article', version: 1, article })
  );
  if (bytes.byteLength > MAX_ARTICLE_BYTES)
    throw new Error('Article file is too large.');
  return copy(bytes, article);
}
export async function decodeArticle(
  input: unknown,
  {
    blobHash,
    now = Date.now()
  }:
    | {
        blobHash?: string | undefined;
        now?: number | undefined;
      }
    | undefined = {}
) {
  if (
    !(input instanceof Uint8Array) ||
    !input.byteLength ||
    input.byteLength > MAX_ARTICLE_BYTES
  )
    throw new Error('Invalid article file size.');
  const bytes: Uint8Array<ArrayBuffer> = input.slice();
  if (
    blobHash !== undefined &&
    (!HASH.test(blobHash) || (await sha256(bytes)) !== blobHash)
  )
    throw new Error('Article file hash does not match.');
  const file: unknown = JSON.parse(decoder.decode(bytes)) as unknown;
  const value: Record<string, unknown> | null = file as Record<
    string,
    unknown
  > | null;
  if (
    !file ||
    Array.isArray(file) ||
    value?.format !== 'emberpage.article' ||
    value?.version !== 1
  )
    throw new Error('Unsupported article format.');
  return copy(bytes, validateArticle(value?.article, { now }));
}
