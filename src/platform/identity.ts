import { Effect, Schema } from "effect";
import { generateSecretKey } from "nostr-tools/pure";

const KEY = "emberpageSigningKey";
const SharingKey = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/));
const StoredIdentity = Schema.Struct({
  [KEY]: Schema.optionalKey(Schema.Unknown),
});
class IdentityError extends Schema.TaggedError<IdentityError>()(
  "IdentityError",
  {
    message: Schema.String,
    cause: Schema.Unknown,
  },
) {}
const failure = (cause: unknown) =>
  new IdentityError({
    message:
      cause instanceof Error
        ? cause.message
        : "The sharing identity could not be loaded.",
    cause,
  });
const io = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const loadIdentity = Effect.fn("Identity.load")(function* () {
  const raw = yield* io<unknown>(() => chrome.storage.local.get(KEY));
  const stored = yield* Schema.decodeUnknownEffect(StoredIdentity)(raw).pipe(
    Effect.mapError(failure),
  );
  if (stored[KEY] !== undefined) {
    const key = yield* Schema.decodeUnknownEffect(SharingKey)(stored[KEY]).pipe(
      Effect.mapError(
        (cause) =>
          new IdentityError({
            message:
              "This installation’s sharing identity is damaged. You can still read saved copies.",
            cause,
          }),
      ),
    );
    return Uint8Array.from({ length: 32 }, (_, index) =>
      parseInt(key.slice(index * 2, index * 2 + 2), 16),
    );
  }
  const secret = yield* Effect.try({ try: generateSecretKey, catch: failure });
  yield* io(() =>
    chrome.storage.local.set({
      [KEY]: [...secret]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    }),
  );
  return secret;
});
let identityPromise: Promise<Uint8Array> | undefined;

/** Load or create a key only when an explicit public action needs to sign. */
export function installationIdentity(): Promise<Uint8Array> {
  return (identityPromise ??= Effect.runPromise(loadIdentity()).catch(
    (error: unknown) => {
      identityPromise = undefined;
      throw error;
    },
  ));
}
