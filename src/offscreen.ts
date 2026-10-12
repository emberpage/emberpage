import { Predicate, Schema } from 'effect';
import { inspectArticle } from './inspect.ts';
import { errorMessage } from './ui.ts';
import type { Inspection } from './types.ts';
const InspectionRequest = Schema.Struct({
  target: Schema.Literals(['offscreen']),
  action: Schema.Literals(['INSPECT_ARTICLE']),
  article: Schema.Struct({ content: Schema.String, url: Schema.String })
});
function inspectMessage(message: unknown, sender: chrome.runtime.MessageSender,
  respond: (reply: { ok: boolean; data?: Inspection; error?: string }) => void): void {
  if (!Predicate.isObject(message) || message.target !== 'offscreen' ||
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL('')) ||
    message.action !== 'INSPECT_ARTICLE') return;
  try {
    const request = Schema.decodeUnknownSync(InspectionRequest)(message);
    respond({ ok: true, data: inspectArticle(request.article) });
  } catch (error) {
    respond({ ok: false, error: errorMessage(error) });
  }
}
chrome.runtime.onMessage.addListener(inspectMessage);
