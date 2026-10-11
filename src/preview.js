// The preview and saved payload use the same transformation of the captured snapshot.
export function articleForMode(article, textOnly = false) {
  if (!textOnly) return article;
  const escape = (value) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[char]
    );
  const content = article.textContent
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escape(paragraph)}</p>`)
    .join('');
  return { ...article, content };
}

export function snapshotSealInput(article) {
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
