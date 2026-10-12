import { Schema } from 'effect';
import type { Article } from './types.ts';
const TextSnapshot = Schema.Struct({ textContent: Schema.String });
// The preview and saved payload use the same transformation of the captured snapshot.
export function articleForMode<T extends Article & { textContent: string }>(article: T, textOnly = false): T {
  if (!textOnly) return article;
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => entities[char] ?? char
    );
  const content = Schema.decodeUnknownSync(TextSnapshot)(article).textContent
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escape(paragraph)}</p>`)
    .join('');
  return { ...article, content };
}

export function snapshotSealInput(article: Article) {
  return JSON.stringify([
    article.url,
    article.title,
    article.byline,
    article.content,
    article.textContent,
    article.capturedAt,
    article.imageLimitExceeded === true,
    article.imageWarning || ''
  ]);
}
