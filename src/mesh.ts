import { Effect, Schema } from "effect";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { decodeArticle, MAX_ARTICLE_BYTES } from "./core/article.js";
import {
  NostrDirectory,
  PROVIDER,
  RELAY,
  LISTING_KIND,
  RATING_KIND,
  LISTING_TAG,
  RATING_TAG,
  validateListingEvent,
  validateVoteEvent,
} from "./network/nostr.js";
import type {
  ArticleCopy,
  Listing,
  RatingTarget,
  UploadReceipt,
  Vote,
} from "./types.ts";
export { PROVIDER, RELAY };

export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  { message: Schema.String, cause: Schema.Unknown },
) {}
const failure = (cause: unknown) =>
  new NetworkError({
    message:
      cause instanceof Error ? cause.message : "The network operation failed.",
    cause,
  });
const io = <A>(operation: (signal: AbortSignal) => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const reject = (message: string) => Effect.fail(failure(new Error(message)));
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const HASH = /^[a-f0-9]{64}$/;
const receiptSchema = Schema.Struct({
  sha256: Schema.String,
  size: Schema.Number,
  type: Schema.String,
  url: Schema.String,
});
let identityPromise: Promise<Uint8Array> | null = null;
async function installationIdentity(): Promise<Uint8Array> {
  return (identityPromise ??= (async () => {
    const key = "meshcacheSigningKey";
    const stored: unknown = (await chrome.storage.local.get(key))[key];
    if (stored !== undefined) {
      if (typeof stored !== "string" || !HASH.test(stored))
        throw new Error("The local signing key is invalid.");
      return Uint8Array.from(stored.match(/../g)!, (byte) =>
        parseInt(byte, 16),
      );
    }
    const secret = generateSecretKey();
    await chrome.storage.local.set({
      [key]: [...secret]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    });
    return secret;
  })().catch((error) => {
    identityPromise = null;
    throw error;
  }));
}

/** Primal expects padded standard Base64 rather than current BUD-11 encoding. */
export function createBlossomAuthorization(
  secretKey: Uint8Array,
  {
    action,
    blobHash,
    now = Date.now(),
  }: { action: string; blobHash: string; now?: number },
) {
  if (!["upload", "delete"].includes(action) || !HASH.test(blobHash))
    throw new Error("Invalid blob authorization.");
  const event = finalizeEvent(
    {
      kind: 24242,
      created_at: Math.floor(now / 1000) - 1,
      tags: [
        ["t", action],
        ["x", blobHash],
        ["server", "blossom.primal.net"],
        ["expiration", String(Math.floor(now / 1000) + 120)],
      ],
      content: `${action === "upload" ? "Upload" : "Delete"} one MeshCache article file`,
    },
    secretKey,
  );
  return `Nostr ${btoa(String.fromCharCode(...encoder.encode(JSON.stringify(event))))}`;
}

const responseBytes = Effect.fn("MeshNetwork.responseBytes")(function* (
  response: Response,
  maximum: number,
  budget?: { remainingBytes: number },
) {
  const declared = response.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum))
    return yield* reject("The server response exceeds the file limit.");
  if (!response.body)
    return yield* reject("The server returned no readable file.");
  const body = response.body;
  return yield* Effect.scoped(
    Effect.gen(function* () {
      const reader = yield* Effect.acquireRelease(
        Effect.try({ try: () => body.getReader(), catch: failure }),
        (reader) =>
          Effect.promise(async () => {
            await reader.cancel().catch(() => {});
            reader.releaseLock();
          }),
      );
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { value, done } = yield* io(() => reader.read());
        if (done) break;
        total += value.length;
        if (budget) {
          if (value.length > budget.remainingBytes)
            return yield* reject("The discovery download budget is exhausted.");
          budget.remainingBytes -= value.length;
        }
        if (total > maximum)
          return yield* reject("The server response exceeds the file limit.");
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return bytes;
    }),
  );
});

interface NetworkOptions {
  fetch?: typeof globalThis.fetch;
  WebSocket?: typeof globalThis.WebSocket;
  identity?: () => Promise<Uint8Array>;
  now?: () => number;
  timeoutMs?: number;
}

/** One explicit provider and directory; acquisition scopes own cancellation. */
export class MeshNetwork {
  readonly fetch: typeof globalThis.fetch;
  readonly identity: () => Promise<Uint8Array>;
  readonly now: () => number;
  readonly timeoutMs: number;
  readonly directory: NostrDirectory;
  constructor({
    fetch = globalThis.fetch.bind(globalThis),
    WebSocket = globalThis.WebSocket,
    identity = installationIdentity,
    now = () => Date.now(),
    timeoutMs = 20_000,
  }: NetworkOptions = {}) {
    this.fetch = fetch;
    this.identity = identity;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.directory = new NostrDirectory({ WebSocket, now });
  }
  private request = Effect.fn("MeshNetwork.request")(function* (
    this: MeshNetwork,
    url: string,
    init: RequestInit,
    maximum: number,
    timeoutMessage: string,
    budget?: { remainingBytes: number },
    requireSuccess = false,
  ) {
    return yield* Effect.scoped(
      Effect.gen({ self: this }, function* () {
        const controller = yield* Effect.acquireRelease(
          Effect.sync(() => new AbortController()),
          (controller) => Effect.sync(() => controller.abort()),
        );
        const response = yield* io(() =>
          this.fetch(url, {
            ...init,
            credentials: "omit",
            redirect: "error",
            signal: controller.signal,
          }),
        );
        if (requireSuccess && !response.ok)
          return yield* reject(
            `Article file is unavailable (${response.status}).`,
          );
        if (response.url && response.url !== url)
          return yield* reject(
            "Article retrieval left the configured provider.",
          );
        const bytes = yield* responseBytes(response, maximum, budget);
        return { response, bytes };
      }).pipe(
        Effect.timeoutOrElse({
          duration: this.timeoutMs,
          orElse: () => reject(timeoutMessage),
        }),
      ),
    );
  });
  uploadEffect = Effect.fn("MeshNetwork.upload")(function* (
    this: MeshNetwork,
    copy: ArticleCopy,
  ): Effect.fn.Return<UploadReceipt, NetworkError> {
    const verified: ArticleCopy = yield* io(() =>
      decodeArticle(copy.bytes, { blobHash: copy.blobHash, now: this.now() }),
    );
    const secret = yield* io(() => this.identity());
    const authorization = yield* Effect.try({
      try: () =>
        createBlossomAuthorization(secret, {
          action: "upload",
          blobHash: verified.blobHash,
          now: this.now(),
        }),
      catch: failure,
    });
    const { response, bytes } = yield* this.request(
      `${PROVIDER}/upload`,
      {
        method: "PUT",
        body: Uint8Array.from(verified.bytes),
        headers: {
          "Content-Type": "application/json",
          "X-SHA-256": verified.blobHash,
          Authorization: authorization,
        },
      },
      8192,
      "Article upload timed out. Your local copy is saved.",
    );
    if (!response.ok) {
      const text = yield* Effect.try({
        try: () => decoder.decode(bytes),
        catch: failure,
      });
      return yield* reject(
        `Article upload failed (${response.status}): ${text.slice(0, 300)}`,
      );
    }
    const raw: unknown = yield* Effect.try({
      try: () => JSON.parse(decoder.decode(bytes)),
      catch: failure,
    });
    const receipt = yield* Schema.decodeUnknownEffect(receiptSchema)(raw).pipe(
      Effect.mapError(() =>
        failure(
          new Error("The upload receipt does not match this article file."),
        ),
      ),
    );
    if (
      receipt.sha256 !== verified.blobHash ||
      receipt.size !== verified.size ||
      receipt.type !== "application/json" ||
      receipt.url !== `${PROVIDER}/${verified.blobHash}.json`
    )
      return yield* reject(
        "The upload receipt does not match this article file.",
      );
    return {
      blobHash: verified.blobHash,
      size: verified.size,
      provider: PROVIDER,
    };
  });
  publishListingEffect = Effect.fn("MeshNetwork.publishListing")(function* (
    this: MeshNetwork,
    copy: ArticleCopy,
    receipt: UploadReceipt,
  ): Effect.fn.Return<Listing, NetworkError> {
    const verified: ArticleCopy = yield* io(() =>
      decodeArticle(copy.bytes, { blobHash: copy.blobHash, now: this.now() }),
    );
    if (
      receipt?.blobHash !== verified.blobHash ||
      receipt.size !== verified.size ||
      receipt.provider !== PROVIDER
    )
      return yield* reject(
        "The saved upload receipt does not match this article.",
      );
    const { content: _, ...article } = verified.article;
    const value = {
      version: 1,
      ...article,
      urlHash: verified.urlHash,
      contentHash: verified.contentHash,
      blobHash: verified.blobHash,
      size: verified.size,
      provider: PROVIDER,
    };
    const secret = yield* io(() => this.identity());
    const event = yield* Effect.try({
      try: () =>
        finalizeEvent(
          {
            kind: LISTING_KIND,
            created_at: Math.floor(this.now() / 1000),
            tags: [
              ["t", LISTING_TAG],
              ["u", value.urlHash],
              ["x", value.contentHash],
            ],
            content: JSON.stringify(value),
          },
          secret,
        ),
      catch: failure,
    });
    const listing: Listing | null = yield* io(() =>
      validateListingEvent(event, { now: this.now() }),
    );
    if (!listing)
      return yield* reject("This article cannot be listed publicly.");
    yield* io((signal) => this.directory.publish(event, signal));
    return listing;
  });
  publishArticleEffect = Effect.fn("MeshNetwork.publishArticle")(function* (
    this: MeshNetwork,
    copy: ArticleCopy,
  ) {
    const receipt = yield* this.uploadEffect(copy);
    return yield* this.publishListingEffect(copy, receipt);
  });
  readArticleEffect = Effect.fn("MeshNetwork.readArticle")(function* (
    this: MeshNetwork,
    listing: Listing,
    { budget }: { budget?: { remainingBytes: number } } = {},
  ): Effect.fn.Return<ArticleCopy, NetworkError> {
    if (
      listing?.provider !== PROVIDER ||
      !HASH.test(listing.blobHash) ||
      !Number.isSafeInteger(listing.size) ||
      listing.size < 1 ||
      listing.size > MAX_ARTICLE_BYTES
    )
      return yield* reject("Invalid article file reference.");
    if (
      budget &&
      (!Number.isSafeInteger(budget.remainingBytes) ||
        budget.remainingBytes < listing.size)
    )
      return yield* reject("The discovery download budget is exhausted.");
    const hash = listing.blobHash;
    const url = `https://media.primal.net/uploads2/${hash[0]}/${hash.slice(1, 3)}/${hash.slice(3, 5)}/${hash}.json`;
    const { bytes } = yield* this.request(
      url,
      {},
      Math.min(MAX_ARTICLE_BYTES, listing.size),
      "Article download timed out.",
      budget,
      true,
    );
    if (bytes.length !== listing.size)
      return yield* reject("The article file size does not match its listing.");
    const copy: ArticleCopy = yield* io(() =>
      decodeArticle(bytes, { blobHash: hash, now: this.now() }),
    );
    for (const field of ["urlHash", "contentHash", "blobHash", "size"] as const)
      if (copy[field] !== listing[field])
        return yield* reject("The article file does not match its listing.");
    for (const field of ["url", "title", "byline", "capturedAt"] as const)
      if (copy.article[field] !== listing[field])
        return yield* reject(
          "The article metadata does not match its listing.",
        );
    return copy;
  });
  queryListingsEffect = Effect.fn("MeshNetwork.queryListings")(function* (
    this: MeshNetwork,
  ): Effect.fn.Return<Listing[], NetworkError> {
    return yield* io((signal) => this.directory.queryListings(signal));
  });
  queryVotesEffect = Effect.fn("MeshNetwork.queryVotes")(function* (
    this: MeshNetwork,
    targets: RatingTarget[],
  ): Effect.fn.Return<Vote[], NetworkError> {
    return yield* io((signal) => this.directory.queryVotes(targets, signal));
  });
  publishVoteEffect = Effect.fn("MeshNetwork.publishVote")(function* (
    this: MeshNetwork,
    value: RatingTarget & { value: number },
  ): Effect.fn.Return<Vote, NetworkError> {
    if (
      !value ||
      !HASH.test(value.urlHash) ||
      !HASH.test(value.contentHash) ||
      ![1, -1].includes(value.value)
    )
      return yield* reject("Invalid rating.");
    const secret = yield* io(() => this.identity());
    const event = yield* Effect.try({
      try: () =>
        finalizeEvent(
          {
            kind: RATING_KIND,
            created_at: Math.floor(this.now() / 1000),
            tags: [
              ["t", RATING_TAG],
              ["u", value.urlHash],
              ["x", value.contentHash],
            ],
            content: JSON.stringify({
              version: 1,
              urlHash: value.urlHash,
              contentHash: value.contentHash,
              value: value.value,
            }),
          },
          secret,
        ),
      catch: failure,
    });
    const vote: Vote | null = validateVoteEvent(event, { now: this.now() });
    if (!vote) return yield* reject("Invalid signed rating.");
    yield* io((signal) => this.directory.publish(event, signal));
    return vote;
  });

  upload(copy: ArticleCopy, options?: { signal?: AbortSignal }) {
    return Effect.runPromise(this.uploadEffect(copy), options);
  }
  publishListing(copy: ArticleCopy, receipt: UploadReceipt) {
    return Effect.runPromise(this.publishListingEffect(copy, receipt));
  }
  publishArticle(copy: ArticleCopy) {
    return Effect.runPromise(this.publishArticleEffect(copy));
  }
  readArticle(
    listing: Listing,
    options: { budget?: { remainingBytes: number }; signal?: AbortSignal } = {},
  ) {
    return Effect.runPromise(this.readArticleEffect(listing, options), {
      signal: options.signal,
    });
  }
  queryListings() {
    return Effect.runPromise(this.queryListingsEffect());
  }
  queryVotes(targets: RatingTarget[]) {
    return Effect.runPromise(this.queryVotesEffect(targets));
  }
  publishVote(value: RatingTarget & { value: number }) {
    return Effect.runPromise(this.publishVoteEffect(value));
  }
}
