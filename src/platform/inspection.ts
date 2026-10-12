import { Effect, Schema } from "effect";
import { BoundaryError } from "../domain/errors.ts";
import type { Article, Inspection } from "../domain/types.ts";
const failure = (cause: unknown) =>
  BoundaryError.from(
    cause,
    cause instanceof Error ? cause.message : "Article inspection failed.",
  );
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
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

/** Owns Chrome's offscreen parser lifetime and validates its inspection reply. */
export function createArticleInspector() {
  let creatingOffscreen: Promise<void> | undefined;
  // Native Chrome adapter: callers retain a Promise interface for the existing inspector.
  const inspectEffect = Effect.fn("Inspection.article")(function* (
    article: Article,
  ) {
    if (!(yield* io(() => chrome.offscreen.hasDocument()))) {
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
      const creating = creatingOffscreen;
      yield* io(() => creating);
    }
    const response: unknown = yield* io(() =>
      chrome.runtime.sendMessage({
        target: "offscreen",
        action: "INSPECT_ARTICLE",
        article,
      }),
    );
    const reply = yield* Schema.decodeUnknownEffect(inspectionReply)(
      response,
    ).pipe(Effect.mapError(failure));
    if (!reply.ok)
      return yield* BoundaryError.from(
        new Error(reply.error || "Article inspection failed."),
      );
    return reply.data;
  });
  return (article: Article): Promise<Inspection> =>
    Effect.runPromise(inspectEffect(article));
}
