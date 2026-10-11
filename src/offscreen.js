import { inspectArticle } from './inspect.js';
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    message.target !== 'offscreen' ||
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL('')) ||
    message.action !== 'INSPECT_ARTICLE'
  )
    return;
  try {
    respond({ ok: true, data: inspectArticle(message.article) });
  } catch (error) {
    respond({ ok: false, error: error.message });
  }
});
