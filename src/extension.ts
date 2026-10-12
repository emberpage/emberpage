import { Effect, Predicate, Schema } from "effect";
import { LocalVault, ShareReceipts } from "./storage/indexeddb.ts";
import { VoteLedger } from "./storage/votes.ts";
import { CatalogLedger } from "./storage/catalog.ts";
import { EmberNetwork } from "./transport/network.ts";
import { ArticleArchive } from "./application/archive.ts";
import { createCaptureModule } from "./platform/capture.ts";
import { installationIdentity } from "./platform/identity.ts";
import { createArticleInspector } from "./platform/inspection.ts";

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
/** WXT calls this explicitly; importing workflows never registers Chrome listeners. */
export function startBackground() {
  const inspect = createArticleInspector();
  const archive = new ArticleArchive({
    network: new EmberNetwork({ identity: installationIdentity }),
    writer: new LocalVault(),
    reader: new LocalVault({ name: "emberpage-reader-v1" }),
    catalog: new CatalogLedger(),
    votes: new VoteLedger(),
    receipts: new ShareReceipts(),
    inspect,
  });
  const openPage = (page: string, id: string) =>
    io(() =>
      chrome.tabs.create({
        url: chrome.runtime.getURL(`${page}.html?id=${encodeURIComponent(id)}`),
      }),
    );

  const capture = createCaptureModule({
    saveArticle: (article, options) => archive.saveEffect(article, options),
    openPage,
  });

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
      case "SAVE_PAGE":
        return yield* capture.captureEffect(message.tabId, {
          preview: message.action === "CAPTURE",
        });
      case "DRAFT":
        return yield* capture.draftEffect(message.id);
      case "DISCARD":
        return yield* capture.discardEffect(message.id);
      case "SAVE":
        return yield* capture.saveEffect(message.id, {
          share: message.share,
          textOnly: message.textOnly,
        });
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
          ? capture.pixelsEffect(message.captureToken, sender)
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
