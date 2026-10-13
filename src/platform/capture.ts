import { DateTime, Effect, Schema, Semaphore } from "effect";
import { sha256 } from "../domain/article.ts";
import { normalizeUrl } from "../domain/url.ts";
import { articleForMode, snapshotSealInput } from "../domain/preview.ts";
import type { Article, ShareResult } from "../domain/types.ts";

class CaptureError extends Schema.TaggedError<CaptureError>()("CaptureError", {
  message: Schema.String,
  cause: Schema.Unknown,
}) {}
const failure = (cause: unknown) =>
  new CaptureError({
    message:
      cause instanceof Error ? cause.message : "The capture operation failed.",
    cause,
  });
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const now = () => DateTime.toEpochMillis(DateTime.nowUnsafe());
const reject = (message: string) => Effect.fail(failure(new Error(message)));
const articleSchema = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  byline: Schema.String,
  content: Schema.String,
  textContent: Schema.String,
  capturedAt: Schema.Int,
});
const failedReply = Schema.Struct({
  ok: Schema.Literals([false]),
  error: Schema.optionalKey(Schema.String),
});
const captureReply = Schema.Union([
  Schema.Struct({
    ok: Schema.Literals([true]),
    article: articleSchema,
    imageLimitExceeded: Schema.optionalKey(Schema.Boolean),
    imageWarning: Schema.optionalKey(Schema.String),
  }),
  failedReply,
]);
const draftSchema = Schema.Struct({
  ...articleSchema.fields,
  imageLimitExceeded: Schema.optionalKey(Schema.Boolean),
  imageWarning: Schema.optionalKey(Schema.String),
});
interface CaptureSession {
  token: string;
  url: string;
  count: number;
  expiresAt: number;
}

interface CaptureActions {
  saveArticle: (
    article: Article & { textContent: string },
    options: { share: boolean },
  ) => Effect.Effect<ShareResult, Error>;
  openPage: (
    page: "reader" | "review",
    id: string,
  ) => Effect.Effect<unknown, Error>;
}

/** Keeps capture authorization and sealed preview decisions together until the explicit action completes. */
export function createCaptureModule({ saveArticle, openPage }: CaptureActions) {
  const captures = new Map<number, CaptureSession>();
  const changingDrafts = new Set<string>();
  const changeDraft = Effect.fn("Capture.changeDraft")(function* <A>(
    id: string, operation: Effect.Effect<A, Error>,
  ) {
    return yield* Effect.acquireUseRelease(
      Effect.try({try: () => {
        if (changingDrafts.has(id))
          throw new Error("Wait for this preview's current action to finish.");
        changingDrafts.add(id);
      }, catch: failure}),
      () => operation,
      () => Effect.sync(() => {changingDrafts.delete(id);}),
    );
  });
  const screenshotPermit = Semaphore.makeUnsafe(1);
  let lastScreenshotAt = 0;
  const pixelsEffect = Effect.fn("Capture.pixels")(function* (
    captureToken: string,
    sender: chrome.runtime.MessageSender,
  ) {
    const tabId = sender.tab?.id;
    const session = tabId === undefined ? undefined : captures.get(tabId);
    if (
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      tabId === undefined ||
      !session ||
      captureToken !== session.token ||
      sender.url !== session.url ||
      now() > session.expiresAt ||
      session.count >= 10
    )
      return yield* reject(
        "Image capture is only available while preparing this page.",
      );
    session.count++;
    return yield* Effect.gen(function* () {
      yield* Effect.sleep(Math.max(0, 550 - (now() - lastScreenshotAt)));
      const tab = yield* io(() => chrome.tabs.get(tabId));
      if (
        !tab.active ||
        tab.url !== session.url ||
        captures.get(tabId) !== session ||
        now() > session.expiresAt
      )
        return yield* reject(
          "Keep the article tab selected while preparing this page.",
        );
      const [active] = yield* io(() =>
        chrome.tabs.query({ active: true, windowId: tab.windowId }),
      );
      if (active?.id !== tabId)
        return yield* reject("The article tab is no longer selected.");
      lastScreenshotAt = now();
      const dataUrl = yield* io(() =>
        chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
      );
      const [after] = yield* io(() =>
        chrome.tabs.query({ active: true, windowId: tab.windowId }),
      );
      if (after?.id !== tabId || after.url !== session.url)
        return yield* reject("The article tab changed during image capture.");
      return { dataUrl };
    }).pipe(Semaphore.withPermit(screenshotPermit));
  });

  const captureEffect = Effect.fn("Capture.article")(function* (
    tabId: number,
    { preview = true }: { preview?: boolean } = {},
  ) {
    const tab = yield* io(() => chrome.tabs.get(tabId));
    if (!tab.url) return yield* reject("Could not read this page URL.");
    const url = tab.url;
    yield* Effect.try({ try: () => normalizeUrl(url), catch: failure });
    return yield* Effect.scoped(
      Effect.gen(function* () {
        const capture = {
          token: crypto.randomUUID(),
          url,
          count: 0,
          expiresAt: now() + 30_000,
        };
        yield* Effect.acquireRelease(
          Effect.try({
            try: () => {
              if (captures.has(tabId))
                throw new Error("This page is already being prepared.");
              captures.set(tabId, capture);
            },
            catch: failure,
          }),
          () =>
            Effect.sync(() => {
              if (captures.get(tabId) === capture) captures.delete(tabId);
            }),
        );
        yield* io(() =>
          chrome.scripting.executeScript({
            target: { tabId },
            files: ["capture.js"],
          }),
        );
        const raw = yield* io<unknown>(() =>
          chrome.tabs.sendMessage(tabId, {
            action: "CAPTURE_ARTICLE",
            captureToken: capture.token,
          }),
        );
        const result = yield* Schema.decodeUnknownEffect(captureReply)(
          raw,
        ).pipe(Effect.mapError(failure));
        if (!result.ok)
          return yield* reject(result.error || "Could not read this page.");
        const article = {
          ...result.article,
          url: normalizeUrl(result.article.url),
          imageLimitExceeded: result.imageLimitExceeded === true,
          imageWarning: result.imageWarning || "",
        };
        if (!preview && !article.imageLimitExceeded) {
          const saved = yield* saveArticle(articleForMode(article, false), {
            share: false,
          });
          yield* openPage("reader", saved.contentHash);
          return true;
        }
        const id = crypto.randomUUID();
        const seal = yield* io(() => sha256(snapshotSealInput(article)));
        yield* io(() =>
          chrome.storage.session.set({
            [`draft:${id}`]: article,
            [`seal:${id}`]: seal,
          }),
        );
        yield* openPage("review", id);
        return true;
      }),
    );
  });
  const draftEffect = Effect.fn("Capture.draft")(function* (id: string) {
    const data = yield* io(() => chrome.storage.session.get([`draft:${id}`, `seal:${id}`]));
    if (!data[`draft:${id}`])
      return yield* reject(
        "This preview expired. Return to the article and choose Options → Preview before saving.",
      );
    const article = yield* Schema.decodeUnknownEffect(draftSchema)(data[`draft:${id}`]).pipe(
      Effect.mapError(failure),
    );
    const seal = yield* io(() => sha256(snapshotSealInput(article)));
    if (data[`seal:${id}`] !== seal)
      return yield* reject(
        "The preview changed. Return to the article and choose Options → Preview before saving.",
      );
    return article;
  });
  const discardEffect = Effect.fn("Capture.discard")(function* (id: string) {
    yield* changeDraft(id, io(() =>
      chrome.storage.session.remove([`draft:${id}`, `seal:${id}`]),
    ).pipe(Effect.uninterruptible));
    return true;
  });
  const saveEffect = Effect.fn("Capture.save")(function* (
    id: string,
    {
      share = false,
      textOnly = false,
    }: { share?: boolean; textOnly?: boolean } = {},
  ) {
    return yield* changeDraft(id, Effect.gen(function* () {
      const article = yield* draftEffect(id);
      if (article.imageLimitExceeded && textOnly !== true)
        return yield* reject(
          article.imageWarning ||
            "The images are too large to save. Choose Text only.",
        );
      const result = yield* saveArticle(
        articleForMode(article, textOnly === true),
        { share: share === true },
      );
      if (!result.shareError && !result.validationError)
        yield* io(() =>
          chrome.storage.session.remove([`draft:${id}`, `seal:${id}`]),
        ).pipe(Effect.uninterruptible);
      return result;
    }));
  });
  return {
    captureEffect,
    draftEffect,
    saveEffect,
    discardEffect,
    pixelsEffect,
  };
}
