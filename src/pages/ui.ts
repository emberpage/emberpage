import { BoundaryError, errorMessage } from '../domain/errors.ts';
import { Effect, Schema } from 'effect';
import type { Article, PopularEntry, Rating, ShareResult } from '../domain/types.ts';
interface LibraryEntry {
  contentHash: string;
  url: string;
  title: string;
  shared?: boolean;
  pendingShare?: boolean;
  source: string;
}
export interface Replies {
  ACCEPT: boolean;
  CAPTURE: boolean;
  SAVE_PAGE: boolean;
  LOCAL_CATALOG: PopularEntry[];
  CATALOG: { entries: PopularEntry[]; warning?: string };
  LIBRARY: LibraryEntry[];
  OPEN_COPY: boolean;
  RETRY_SHARE: ShareResult;
  DISCARD_SHARE: boolean;
  DELETE: boolean;
  CLEAR: boolean;
  SAVE: ShareResult;
  DISCARD: boolean;
  DRAFT: Article & { textContent: string };
  READ: { article: Article; rating: Rating; shared?: boolean };
  RATE: Rating;
  RATINGS: Rating;
}
const Reply = Schema.Union([
  Schema.Struct({ ok: Schema.Literals([true]), data: Schema.Unknown }),
  Schema.Struct({ ok: Schema.Literals([false]), error: Schema.optionalKey(Schema.String) })
]);
const failure = (error: unknown) => BoundaryError.from(error, errorMessage(error));
export const sendEffect = Effect.fn('UI.send')(function* <A extends keyof Replies>(
  action: A, fields: Record<string, unknown> = {}
): Effect.fn.Return<Replies[A], BoundaryError> {
  const raw: unknown = yield* Effect.tryPromise({
    try: () => chrome.runtime.sendMessage({ target: 'background', action, ...fields }),
    catch: failure
  });
  const response = yield* Schema.decodeUnknownEffect(Reply)(raw).pipe(Effect.mapError(failure));
  if (!response.ok) return yield* BoundaryError.from(response, response.error || 'Ember Page did not respond. Reopen the extension and try again.');
  // Background action schemas own the data contract for these extension-only replies.
  return response.data as Replies[A];
});
export function send<A extends keyof Replies>(action: A, fields: Record<string, unknown> = {}): Promise<Replies[A]> {
  return Effect.runPromise(sendEffect(action, fields));
}
export function element(selector: string): HTMLElement {
  const node = document.querySelector(selector);
  if (!node || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') throw new Error(`Missing interface element: ${selector}`);
  return node as HTMLElement;
}
export function control<K extends keyof HTMLElementTagNameMap>(selector: string, tag: K): HTMLElementTagNameMap[K] {
  const node = element(selector);
  if (node.localName !== tag) throw new Error(`Unexpected interface element: ${selector}`);
  return node as HTMLElementTagNameMap[K];
}
export function status(text: string | undefined, error = false): void {
  const node = element('#status');
  node.textContent = text || '';
  node.classList.toggle('error', error);
}
export function busy(button: HTMLButtonElement, task: () => Promise<unknown>, loading?: string): Promise<void> {
  const label = button.textContent;
  return Effect.runPromise(Effect.acquireUseRelease(
    Effect.sync(() => { button.disabled = true; if (loading) button.textContent = loading; }),
    () => Effect.tryPromise({ try: task, catch: failure }).pipe(Effect.asVoid, Effect.catch((error) => Effect.sync(() => status(error.message, true)))),
    () => Effect.sync(() => { button.disabled = false; button.textContent = label; })
  ));
}
export function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'Article'; }
}
