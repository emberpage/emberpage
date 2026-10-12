import { Effect, Predicate, Schema, Semaphore } from "effect";
import { sha256 } from "./core/article.ts";
import { normalizeUrl } from "./core/url.ts";
import { LocalVault, ShareReceipts } from "./core/storage.ts";
import { VoteLedger } from "./core/votes.ts";
import { CatalogLedger } from "./core/catalog.ts";
import { articleForMode, snapshotSealInput } from "./preview.ts";
import { EmberNetwork } from "./network.ts";
import { ArticleArchive } from "./archive.ts";
import type { Article, Inspection } from "./types.ts";

class BackgroundError extends Schema.TaggedError<BackgroundError>()(
  "BackgroundError",
  { message: Schema.String, cause: Schema.Unknown },
) {}
const failure = (cause: unknown) =>
  new BackgroundError({
    message:
      cause instanceof Error
        ? cause.message
        : "The background operation failed.",
    cause,
  });
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const reject = (message: string) => Effect.fail(failure(new Error(message)));
const command = <const A extends string>(action: A) => ({
  target: Schema.Literals(["background"]),
  action: Schema.Literals([action]),
});
const id = Schema.String;
const messageSchema = Schema.Union([
  Schema.Struct(command("ACCEPT")),
  Schema.Struct({ ...command("CAPTURE"), tabId: Schema.Int }),
  Schema.Struct({ ...command("SAVE_PAGE"), tabId: Schema.Int }),
  Schema.Struct({
    ...command("CAPTURE_IMAGE_PIXELS"),
    captureToken: Schema.String,
  }),
  Schema.Struct({ ...command("DRAFT"), id }),
  Schema.Struct({ ...command("DISCARD"), id }),
  Schema.Struct({
    ...command("SAVE"),
    id,
    textOnly: Schema.optionalKey(Schema.Boolean),
    share: Schema.optionalKey(Schema.Boolean),
  }),
  Schema.Struct({ ...command("RETRY_SHARE"), id }),
  Schema.Struct({ ...command("DISCARD_SHARE"), id }),
  Schema.Struct(command("CATALOG")),
  Schema.Struct(command("LOCAL_CATALOG")),
  Schema.Struct({ ...command("RATE"), id, value: Schema.Literals([1, -1]) }),
  Schema.Struct({ ...command("RATINGS"), id }),
  Schema.Struct(command("LIBRARY")),
  Schema.Struct({ ...command("READ"), id }),
  Schema.Struct({ ...command("OPEN_COPY"), id }),
  Schema.Struct({
    ...command("DELETE"),
    id,
    source: Schema.Literals(["reader", "writer"]),
  }),
  Schema.Struct(command("CLEAR")),
]);
type Message = typeof messageSchema.Type;
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
const inspectionReply = Schema.Union([
  Schema.Struct({
    ok: Schema.Literals([true]),
    data: Schema.Struct({
      content: Schema.String,
      textContent: Schema.String,
      blocks: Schema.Int,
      images: Schema.Int,
      textDensity: Schema.Number,
    }),
  }),
  failedReply,
]);
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

/** WXT calls this explicitly; importing workflows never registers Chrome listeners. */
export function startBackground() {
  let creatingOffscreen: Promise<void> | undefined;
  // Native Chrome adapter: callers retain a Promise interface for the existing inspector.
  async function inspect(article: Article): Promise<Inspection> {
    if (!(await chrome.offscreen.hasDocument())) {
      creatingOffscreen ??= chrome.offscreen
        .createDocument({
          url: "offscreen.html",
          reasons: ["DOM_PARSER"],
          justification:
            "Inspect article HTML and embedded image bounds for explicit cache and read actions.",
        })
        .finally(() => {
          creatingOffscreen = undefined;
        });
      await creatingOffscreen;
    }
    const response: unknown = await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "INSPECT_ARTICLE",
      article,
    });
    const reply = Schema.decodeUnknownSync(inspectionReply)(response);
    if (!reply.ok) throw new Error(reply.error || "Article inspection failed.");
    return reply.data;
  }
  const archive = new ArticleArchive({
    network: new EmberNetwork(),
    writer: new LocalVault(),
    reader: new LocalVault({ name: "emberpage-reader-v1" }),
    catalog: new CatalogLedger(),
    votes: new VoteLedger(),
    receipts: new ShareReceipts(),
    inspect,
  });
  const captures = new Map<number, CaptureSession>();
  const screenshotPermit = Semaphore.makeUnsafe(1);
  let lastScreenshotAt = 0;
  const openPage = (page: string, id: string) =>
    io(() =>
      chrome.tabs.create({
        url: chrome.runtime.getURL(`${page}.html?id=${encodeURIComponent(id)}`),
      }),
    );

  const captureImagePixels = Effect.fn("Background.captureImagePixels")(
    function* (
      message: Extract<Message, { action: "CAPTURE_IMAGE_PIXELS" }>,
      sender: chrome.runtime.MessageSender,
    ) {
      const tabId = sender.tab?.id;
      const session = tabId === undefined ? undefined : captures.get(tabId);
      if (
        sender.id !== chrome.runtime.id ||
        sender.frameId !== 0 ||
        tabId === undefined ||
        !session ||
        message.captureToken !== session.token ||
        sender.url !== session.url ||
        Date.now() > session.expiresAt ||
        session.count >= 10
      )
        return yield* reject(
          "Image capture is only available during this page’s preview.",
        );
      session.count++;
      return yield* Effect.gen(function* () {
        yield* Effect.sleep(Math.max(0, 550 - (Date.now() - lastScreenshotAt)));
        const tab = yield* io(() => chrome.tabs.get(tabId));
        if (
          !tab.active ||
          tab.url !== session.url ||
          captures.get(tabId) !== session ||
          Date.now() > session.expiresAt
        )
          return yield* reject(
            "Keep the article tab selected while preparing its preview.",
          );
        const [active] = yield* io(() =>
          chrome.tabs.query({ active: true, windowId: tab.windowId }),
        );
        if (active?.id !== tabId)
          return yield* reject("The article tab is no longer selected.");
        lastScreenshotAt = Date.now();
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
    },
  );

  const handle = Effect.fn("Background.handle")(function* (
    message: Message,
  ): Effect.fn.Return<unknown, Error> {
    if (message.action === "ACCEPT") {
      yield* io(() => chrome.storage.local.set({ accepted: true }));
      return true;
    }
    const { accepted } = yield* io(() => chrome.storage.local.get("accepted"));
    if (!accepted)
      return yield* reject("Open Ember Page before saving or sharing.");
    switch (message.action) {
      case "CAPTURE":
      case "SAVE_PAGE": {
        const tabId = message.tabId;
        const tab = yield* io(() => chrome.tabs.get(tabId));
        if (!tab.url) return yield* reject("Could not read this page URL.");
        const url = tab.url;
        yield* Effect.try({ try: () => normalizeUrl(url), catch: failure });
        return yield* Effect.scoped(Effect.gen(function* () {
          const capture = {
            token: crypto.randomUUID(),
            url,
            count: 0,
            expiresAt: Date.now() + 30_000,
          };
          yield* Effect.acquireRelease(
            Effect.try({
              try: () => {
                if (captures.has(tabId)) throw new Error("This page is already being prepared.");
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
          if (message.action === "SAVE_PAGE" && !article.imageLimitExceeded) {
            const saved = yield* archive.saveEffect(articleForMode(article, false), {
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
        }));
      }
      case "DRAFT": {
        const data = yield* io(() =>
          chrome.storage.session.get(`draft:${message.id}`),
        );
        const article: unknown = data[`draft:${message.id}`];
        if (!article)
          return yield* reject(
            "This preview expired. Open the article and choose Preview this article again.",
          );
        return yield* Schema.decodeUnknownEffect(draftSchema)(article).pipe(
          Effect.mapError(failure),
        );
      }
      case "DISCARD":
        yield* io(() =>
          chrome.storage.session.remove([
            `draft:${message.id}`,
            `seal:${message.id}`,
          ]),
        );
        return true;
      case "SAVE": {
        const data = yield* io(() =>
          chrome.storage.session.get([
            `draft:${message.id}`,
            `seal:${message.id}`,
          ]),
        );
        if (!data[`draft:${message.id}`])
          return yield* reject(
            "This preview expired. Open the article and choose Preview this article again.",
          );
        const article = yield* Schema.decodeUnknownEffect(draftSchema)(
          data[`draft:${message.id}`],
        ).pipe(Effect.mapError(failure));
        const seal = yield* io(() => sha256(snapshotSealInput(article)));
        if (data[`seal:${message.id}`] !== seal)
          return yield* reject("The preview changed. Open the article and choose Preview this article again.");
        if (article.imageLimitExceeded && message.textOnly !== true)
          return yield* reject(
            article.imageWarning ||
              "The images are too large to save. Choose Text only.",
          );
        const result = yield* archive.saveEffect(
          articleForMode(article, message.textOnly === true),
          { share: message.share === true },
        );
        if (!result.shareError && !result.validationError)
          yield* io(() =>
            chrome.storage.session.remove([
              `draft:${message.id}`,
              `seal:${message.id}`,
            ]),
          );
        return result;
      }
      case "RETRY_SHARE":
        return yield* archive.retryEffect(message.id);
      case "DISCARD_SHARE":
        yield* archive.discardShareEffect(message.id);
        return true;
      case "CATALOG":
        return yield* archive.browseEffect();
      case "LOCAL_CATALOG":
        return yield* archive.localCatalogEffect();
      case "RATE":
        return yield* archive.rateEffect(message.id, message.value);
      case "RATINGS":
        return yield* archive.ratingsEffect(message.id);
      case "LIBRARY":
        return yield* archive.libraryEffect();
      case "READ":
        return yield* archive.readEffect(message.id);
      case "OPEN_COPY":
        yield* archive.recordEffect(message.id);
        yield* openPage("reader", message.id);
        return true;
      case "DELETE":
        yield* archive.removeEffect(message.id, message.source);
        return true;
      case "CLEAR":
        yield* archive.clearEffect();
        return true;
      case "CAPTURE_IMAGE_PIXELS":
        return yield* reject("Image capture requires its page session.");
    }
  });
  const listener = (
    input: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (
      response: { ok: true; data: unknown } | { ok: false; error: string },
    ) => void,
  ) => {
    if (!Predicate.isObject(input) || input.target !== "background") return;
    if (
      input.action !== "CAPTURE_IMAGE_PIXELS" &&
      (sender.id !== chrome.runtime.id ||
        !sender.url?.startsWith(chrome.runtime.getURL("")))
    ) {
      respond({ ok: false, error: "This action must come from Ember Page." });
      return;
    }
    const workflow = Schema.decodeUnknownEffect(messageSchema)(input).pipe(
      Effect.mapError(() => failure(new Error("Invalid Ember Page action."))),
      Effect.flatMap((message) =>
        message.action === "CAPTURE_IMAGE_PIXELS"
          ? captureImagePixels(message, sender)
          : handle(message),
      ),
    );
    Effect.runPromise(workflow).then(
      (data) => respond({ ok: true, data }),
      (error) =>
        respond({
          ok: false,
          error: error instanceof Error ? error.message : "The action failed.",
        }),
    );
    return true;
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
