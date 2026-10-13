import { Predicate, Schema } from 'effect';
import { inspectArticle } from '../extraction/inspect.ts';
import { errorMessage } from '../domain/errors.ts';
import type { Inspection } from '../domain/types.ts';
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
export function startInspection() {
  chrome.runtime.onMessage.addListener(inspectMessage);
  return () => chrome.runtime.onMessage.removeListener(inspectMessage);
}
