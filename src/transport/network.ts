import { Effect, Schema } from "effect";
import { hashUrl } from "../domain/article.ts";
import { normalizeUrl } from "../domain/url.ts";
import { decodeArticle } from "../domain/article.ts";
import { NostrDirectory } from "../directory/nostr.ts";
import type {
  ArticleCopy,
  Listing,
  RatingTarget,
  PinReceipt,
  IpfsMirror,
  Vote,
} from "../domain/types.ts";
import { isSnapshotRoutes } from '../domain/routes.ts';
import { isSnapshotCid } from "../domain/cid.ts";
import type { NostrSocketConstructor } from "../directory/nostr.ts";

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
const HASH = /^[a-f0-9]{64}$/;

type IpfsFiles = {
  pauseEffect():Effect.Effect<void,Error>;
  forgetEffect(blobHash:string):Effect.Effect<void,Error>;
  clearEffect():Effect.Effect<void,Error>;
  mirrorEffect(copy:ArticleCopy):Effect.Effect<IpfsMirror,Error>;
  readEffect(listing:Listing,options?:{budget?:{remainingBytes:number};routes?:readonly string[]}):Effect.Effect<ArticleCopy,Error>;
};

interface NetworkOptions {
  ipfs: IpfsFiles;
  WebSocket?: NostrSocketConstructor;
  identity: () => Promise<Uint8Array>;
  now?: () => number;
  timeoutMs?: number;
}

/** One explicit provider and directory; acquisition scopes own cancellation. */
export class EmberNetwork {
  private readonly ipfs: IpfsFiles;
  private readonly identity: () => Promise<Uint8Array>;
  private readonly now: () => number;
  private readonly directory: NostrDirectory;
  constructor({
    ipfs,
    WebSocket = globalThis.WebSocket,
    identity,
    now = () => Date.now(),
    timeoutMs = 20_000,
  }: NetworkOptions) {
    this.ipfs = ipfs;
    this.identity = identity;
    this.now = now;
    this.directory = new NostrDirectory({ WebSocket, now, timeoutMs });
  }
  pauseEffect = Effect.fn("EmberNetwork.pause")(function* (
    this: EmberNetwork,
  ): Effect.fn.Return<void,NetworkError> {
    yield* this.ipfs.pauseEffect().pipe(Effect.mapError(failure));
  });
  forgetEffect = Effect.fn("EmberNetwork.forget")(function* (
    this: EmberNetwork, blobHash:string,
  ): Effect.fn.Return<void,NetworkError> {
    if (!HASH.test(blobHash)) return yield* reject("Invalid article file hash.");
    yield* this.ipfs.forgetEffect(blobHash).pipe(Effect.mapError(failure));
  });
  clearPinsEffect = Effect.fn("EmberNetwork.clearPins")(function* (
    this: EmberNetwork,
  ): Effect.fn.Return<void,NetworkError> {
    yield* this.ipfs.clearEffect().pipe(Effect.mapError(failure));
  });
  pinEffect = Effect.fn("EmberNetwork.pin")(function* (
    this: EmberNetwork,
    copy: ArticleCopy,
  ): Effect.fn.Return<PinReceipt, NetworkError> {
    const verified = yield* io(() => decodeArticle(copy.bytes, {expected: copy, now: this.now()}));
    const mirror = yield* this.ipfs.mirrorEffect(verified).pipe(Effect.mapError(failure));
    if (!isSnapshotCid(mirror.cid) || !isSnapshotRoutes(mirror.routes) || mirror.size !== verified.size)
      return yield* reject("The IPFS pin receipt does not match this article.");
    return {cid: mirror.cid, routes: [...mirror.routes], blobHash: verified.blobHash, size: verified.size};
  });
  publishListingEffect = Effect.fn("EmberNetwork.publishListing")(function* (
    this: EmberNetwork,
    copy: ArticleCopy,
    receipt: PinReceipt,
  ): Effect.fn.Return<Listing & {warning?: string}, NetworkError> {
    const verified: ArticleCopy = yield* io(() =>
      decodeArticle(copy.bytes, { expected: copy, now: this.now() }),
    );
    if (
      receipt?.blobHash !== verified.blobHash ||
      receipt.size !== verified.size ||
      !isSnapshotCid(receipt.cid) || !isSnapshotRoutes(receipt.routes)
    )
      return yield* reject(
        "The saved pin receipt does not match this article.",
      );
    const { content: _, ...article } = verified.article;
    const value = {
      ...article,
      urlHash: verified.urlHash,
      contentHash: verified.contentHash,
      blobHash: verified.blobHash,
      size: verified.size,
      cid: receipt.cid,
      routes: [...receipt.routes],
    };
    const secret = yield* io(() => this.identity());
    return yield* this.directory.publishListingEffect(value, secret).pipe(Effect.mapError(failure));
  });
  readArticleEffect = Effect.fn("EmberNetwork.readArticle")(function* (
    this: EmberNetwork,
    listing: Listing,
    { budget, routes }: { budget?: { remainingBytes: number }; routes?: readonly string[] } = {},
  ): Effect.fn.Return<ArticleCopy, NetworkError> {
    return yield* this.ipfs.readEffect(listing, {budget,...(routes ? {routes} : {})}).pipe(Effect.mapError(failure));
  });
  queryListingsEffect = Effect.fn("EmberNetwork.queryListings")(function* (
    this: EmberNetwork,
    url?: string,
  ): Effect.fn.Return<{records: Listing[]; warning?: string}, NetworkError> {
    const normalized = url === undefined ? undefined : yield* Effect.try({try: () => normalizeUrl(url), catch: failure});
    const urlHash = normalized === undefined ? undefined : yield* io(() => hashUrl(normalized));
    const result = yield* io((signal) => this.directory.queryListings(signal, urlHash));
    const partial = result.diagnostics.relays?.some(relay => relay.outcome === "failure");
    return {records: result.records.filter(listing => normalized === undefined || listing.url === normalized),
      ...(partial ? {warning: "Some directories are unavailable. Results may be incomplete."} : {})};
  });
  queryVotesEffect = Effect.fn("EmberNetwork.queryVotes")(function* (
    this: EmberNetwork,
    targets: RatingTarget[],
  ): Effect.fn.Return<{records: Vote[]; warning?: string}, NetworkError> {
    const result = yield* io((signal) => this.directory.queryVotes(targets, signal));
    const partial = result.diagnostics.relays?.some(relay => relay.outcome === "failure");
    return {records: result.records,
      ...(partial ? {warning: "Some ratings are unavailable. Rankings may be incomplete."} : {})};
  });
  publishVoteEffect = Effect.fn("EmberNetwork.publishVote")(function* (
    this: EmberNetwork,
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
    return yield* this.directory.publishVoteEffect(value, secret).pipe(Effect.mapError(failure));
  });
}
