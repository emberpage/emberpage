import { Effect, Schema } from "effect";
import { BoundaryError } from "../domain/errors.ts";
import type { Article, Inspection } from "../domain/types.ts";
import { ensureOffscreen } from './offscreen-document.ts';
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
  // Native Chrome adapter: callers retain a Promise interface for the existing inspector.
  const inspectEffect = Effect.fn("Inspection.article")(function* (
    article: Article,
  ) {
    yield* ensureOffscreen();
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
