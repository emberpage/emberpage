import { Deferred, Effect, Schema } from "effect";
import { encodeArticle } from "./core/article.js";
import { filterCandidates, rankCandidates } from "./core/candidates.js";
import type {
  Article,
  ArticleCopy,
  ArticleNetwork,
  Inspection,
  Listing,
  PopularEntry,
  Rating,
  ShareReceipt,
  ShareResult,
  Vote,
} from "./types.ts";

export class ArchiveError extends Schema.TaggedError<ArchiveError>()(
  "ArchiveError",
  { message: Schema.String, cause: Schema.Unknown },
) {}
const failure = (cause: unknown) =>
  new ArchiveError({
    message:
      cause instanceof Error ? cause.message : "The archive operation failed.",
    cause,
  });
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const rejected = (message: string) => Effect.fail(failure(new Error(message)));
type EligibleCopy = ArticleCopy & { listedAt: number };
interface CopyStore {
  saveRecord(
    copy: ArticleCopy,
    options?: { shared?: boolean; pendingShare?: boolean },
  ): Promise<unknown>;
  getRecord(hash: string): Promise<ArticleCopy | null>;
  listRecords(): Promise<ArticleCopy[]>;
  setPending(hash: string, value: boolean): Promise<unknown>;
  setShared(hash: string, value: boolean, listedAt: number): Promise<unknown>;
  deleteRecord(hash: string): Promise<unknown>;
  clear(): Promise<unknown>;
}
interface ArchiveOptions {
  network: ArticleNetwork;
  writer: CopyStore;
  reader: CopyStore;
  catalog: {
    ingest(listings: Listing[]): Promise<unknown>;
    list(): Promise<Listing[]>;
  };
  votes: {
    ingest(votes: Vote[]): Promise<unknown>;
    summarize(hash: string): Promise<Rating>;
  };
  receipts: {
    get(hash: string): Promise<ShareReceipt | null>;
    put(
      receipt: Omit<ShareReceipt, "provider"> & { provider?: string },
    ): Promise<ShareReceipt>;
    delete(hash: string): Promise<unknown>;
    clear(): Promise<unknown>;
  };
  inspect(article: Article): Promise<Inspection> | Inspection;
}

/** Owns explicit share workflows and the distinction between private and public copies. */
export class ArticleArchive {
  network: ArchiveOptions["network"];
  writer: ArchiveOptions["writer"];
  reader: ArchiveOptions["reader"];
  catalog: ArchiveOptions["catalog"];
  votes: ArchiveOptions["votes"];
  receipts: ArchiveOptions["receipts"];
  inspect: ArchiveOptions["inspect"];
  readonly activeShares = new Set<string>();
  private discovery: Deferred.Deferred<
    { entries: PopularEntry[]; warning: string },
    Error
  > | null = null;

  constructor(options: ArchiveOptions) {
    this.network = options.network;
    this.writer = options.writer;
    this.reader = options.reader;
    this.catalog = options.catalog;
    this.votes = options.votes;
    this.receipts = options.receipts;
    this.inspect = options.inspect;
  }
  private inspectEffect = (article: Article) =>
    io(() => Promise.resolve(this.inspect(article)));
  private eligible = (copies: ArticleCopy[]) =>
    io(() => filterCandidates(copies, { inspect: this.inspect }));

  saveEffect = Effect.fn("ArticleArchive.save")(function* (
    this: ArticleArchive,
    article: Article,
    { share = false } = {},
  ): Effect.fn.Return<ShareResult, Error> {
    const inspection = yield* this.inspectEffect(article);
    const copy: ArticleCopy = yield* io(() =>
      encodeArticle({ ...article, content: inspection.content }),
    );
    yield* io(() => this.writer.saveRecord(copy, { pendingShare: share }));
    if (share) return yield* this.shareEffect(copy);
    yield* this.discardShareEffect(copy.contentHash);
    return { contentHash: copy.contentHash, shared: false };
  });

  shareEffect = Effect.fn("ArticleArchive.share")(function* (
    this: ArticleArchive,
    copy: ArticleCopy,
  ): Effect.fn.Return<ShareResult, Error> {
    let receipt: ShareReceipt | null = null;
    let listing: Listing | undefined;
    const workflow = Effect.gen({ self: this }, function* () {
      yield* Effect.acquireRelease(
        Effect.try({
          try: () => {
            if (this.activeShares.has(copy.contentHash))
              throw new Error("This copy is already being shared.");
            this.activeShares.add(copy.contentHash);
          },
          catch: failure,
        }),
        () =>
          Effect.sync(() => {
            this.activeShares.delete(copy.contentHash);
          }),
      );
      return yield* Effect.gen({ self: this }, function* (): Effect.fn.Return<
        ShareResult,
        Error
      > {
        if (!(yield* io(() => this.writer.setPending(copy.contentHash, true))))
          return yield* rejected(
            "The saved copy was removed. Open the article and choose Preview this article again.",
          );
        receipt = yield* io(() => this.receipts.get(copy.contentHash));
        if (
          !(yield* this.eligible([
            { ...copy, listedAt: copy.listedAt ?? Date.now() },
          ])).length
        ) {
          if (!receipt)
            yield* io(() => this.writer.setPending(copy.contentHash, false));
          return {
            contentHash: copy.contentHash,
            shared: false,
            localSaved: true,
            validationError:
              "This copy is too short or incomplete to share. You can keep it on this device.",
          };
        }
        if (receipt && receipt.blobHash !== copy.blobHash)
          return yield* rejected(
            "Choose Cancel sharing in Saved before sharing a new copy.",
          );
        if (!receipt)
          receipt = yield* io(() =>
            this.receipts.put({
              contentHash: copy.contentHash,
              blobHash: copy.blobHash,
              size: copy.size,
              uploaded: false,
            }),
          );
        if (!receipt.uploaded) {
          receipt = {
            ...(yield* this.network.uploadEffect(copy)),
            contentHash: copy.contentHash,
            uploaded: true,
          };
          const saved = receipt;
          yield* io(() => this.receipts.put(saved));
        }
        listing = yield* this.network.publishListingEffect(copy, receipt);
        const accepted = listing;
        yield* io(() =>
          this.writer.setShared(copy.contentHash, true, accepted.createdAt),
        );
        yield* io(() => this.catalog.ingest([accepted]));
        yield* io(() => this.receipts.delete(copy.contentHash));
        yield* io(() => this.writer.setPending(copy.contentHash, false));
        return { contentHash: copy.contentHash, shared: true };
      }).pipe(
        Effect.catch((error) => {
          if (listing)
            return Effect.succeed<ShareResult>({
              contentHash: copy.contentHash,
              shared: true,
              localSaved: true,
              warning:
                "The public share was accepted, but its local status could not be updated. Reopen Saved to check it.",
            });
          if (receipt)
            return Effect.succeed<ShareResult>({
              contentHash: copy.contentHash,
              shared: false,
              localSaved: true,
              shareError: error.message,
            });
          return io(() => this.writer.setPending(copy.contentHash, false)).pipe(
            Effect.andThen(Effect.fail(error)),
          );
        }),
      );
    });
    return yield* Effect.scoped(workflow);
  });

  retryEffect = Effect.fn("ArticleArchive.retry")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const copy = yield* io(() => this.writer.getRecord(hash));
    if (!copy)
      return yield* rejected("The saved copy was removed. Open the article and choose Preview this article again.");
    return yield* this.shareEffect(copy);
  });
  discardShareEffect = Effect.fn("ArticleArchive.discardShare")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    if (this.activeShares.has(hash))
      return yield* rejected("Wait for sharing to finish.");
    yield* io(() => this.receipts.delete(hash));
    yield* io(() => this.writer.setPending(hash, false));
  });

  discoverEffect = Effect.fn("ArticleArchive.discover")(function* (
    this: ArticleArchive,
  ) {
    const fresh = yield* this.network.queryListingsEffect();
    yield* io(() => this.catalog.ingest(fresh));
    const listings = yield* io(() => this.catalog.list());
    const snapshots = new Map<string, Listing & { listedAt: number }>();
    for (const listing of listings) {
      const previous = snapshots.get(listing.contentHash);
      if (previous)
        previous.listedAt = Math.min(previous.listedAt, listing.createdAt);
      else
        snapshots.set(listing.contentHash, {
          ...listing,
          listedAt: listing.createdAt,
        });
    }
    const budget = { remainingBytes: 16 * 1024 * 1024 };
    const accepted = (yield* Effect.forEach(
      [...snapshots.values()].slice(0, 20),
      (listing) =>
        Effect.gen({ self: this }, function* () {
          const copy = {
            ...(yield* this.network.readArticleEffect(listing, { budget })),
            listedAt: listing.listedAt,
          };
          const [eligible] = yield* this.eligible([copy]);
          if (!eligible) return null;
          yield* io(() => this.reader.saveRecord(copy, { shared: true }));
          return eligible;
        }).pipe(Effect.catch(() => Effect.succeed(null))),
      { concurrency: 2 },
    )).filter((copy): copy is EligibleCopy => copy !== null);
    let warning = "";
    if (accepted.length) {
      warning = yield* Effect.gen({ self: this }, function* () {
        const votes = yield* this.network.queryVotesEffect(
          accepted.map((copy) => ({
            urlHash: copy.urlHash,
            contentHash: copy.contentHash,
          })),
        );
        yield* io(() => this.votes.ingest(votes));
        return "";
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(
            "Articles loaded, but ratings could not be refreshed.",
          ),
        ),
      );
    }
    return { entries: yield* this.entriesEffect(accepted), warning };
  });
  browseEffect = Effect.fn("ArticleArchive.browse")(function* (
    this: ArticleArchive,
  ) {
    const { pending, owner } = yield* Effect.sync(() => {
      if (this.discovery) return { pending: this.discovery, owner: false };
      const pending = Deferred.makeUnsafe<
        { entries: PopularEntry[]; warning: string },
        Error
      >();
      this.discovery = pending;
      return { pending, owner: true };
    });
    if (!owner) return yield* Deferred.await(pending);
    return yield* this.discoverEffect().pipe(
      Effect.onExit((exit) => Deferred.done(pending, exit).pipe(Effect.asVoid)),
      Effect.ensuring(
        Effect.sync(() => {
          if (this.discovery === pending) this.discovery = null;
        }),
      ),
    );
  });
  entriesEffect = Effect.fn("ArticleArchive.entries")(function* (
    this: ArticleArchive,
    copies: EligibleCopy[],
  ) {
    const pairs = yield* Effect.forEach(
      copies,
      (copy) =>
        io(() => this.votes.summarize(copy.contentHash)).pipe(
          Effect.map((rating) => [copy.contentHash, rating] as const),
        ),
      { concurrency: 2 },
    );
    const ratings = new Map(pairs);
    return rankCandidates(copies, ratings).map(
      (copy: EligibleCopy & { score: number }) => ({
        contentHash: copy.contentHash,
        urlHash: copy.urlHash,
        url: copy.article.url,
        title: copy.article.title,
        byline: copy.article.byline,
        capturedAt: copy.article.capturedAt,
        listedAt: copy.listedAt,
        score: copy.score,
        rating: ratings.get(copy.contentHash),
      }),
    );
  });
  localCatalogEffect = Effect.fn("ArticleArchive.localCatalog")(function* (
    this: ArticleArchive,
  ) {
    const copies = [
      ...(yield* io(() => this.reader.listRecords())),
      ...(yield* io(() => this.writer.listRecords())),
    ].filter((record) => record.shared);
    return yield* this.entriesEffect(yield* this.eligible(copies));
  });
  recordEffect = Effect.fn("ArticleArchive.record")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const writer = yield* io(() => this.writer.getRecord(hash));
    const reader = writer?.shared
      ? null
      : yield* io(() => this.reader.getRecord(hash));
    const record = writer?.shared ? writer : reader || writer;
    if (!record)
      return yield* rejected(
        "This local copy was removed. Browse Popular or capture it again.",
      );
    return record;
  });
  readEffect = Effect.fn("ArticleArchive.read")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const record = yield* this.recordEffect(hash);
    const inspected = yield* this.inspectEffect(record.article);
    return {
      article: { ...record.article, content: inspected.content },
      shared: record.shared,
      contentHash: hash,
      rating: yield* io(() => this.votes.summarize(hash)),
    };
  });
  rateEffect = Effect.fn("ArticleArchive.rate")(function* (
    this: ArticleArchive,
    hash: string,
    value: number,
  ) {
    if (value !== 1 && value !== -1)
      return yield* rejected("Choose a valid rating.");
    const record = yield* this.recordEffect(hash);
    if (!record.shared)
      return yield* rejected("Only reader-facing copies can be rated.");
    const vote = yield* this.network.publishVoteEffect({
      urlHash: record.urlHash,
      contentHash: hash,
      value,
    });
    yield* io(() => this.votes.ingest([vote]));
    return yield* io(() => this.votes.summarize(hash));
  });
  ratingsEffect = Effect.fn("ArticleArchive.ratings")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const record = yield* this.recordEffect(hash);
    if (record.shared) {
      const votes = yield* this.network.queryVotesEffect([
        { urlHash: record.urlHash, contentHash: hash },
      ]);
      yield* io(() => this.votes.ingest(votes));
    }
    return yield* io(() => this.votes.summarize(hash));
  });
  libraryEffect = Effect.fn("ArticleArchive.library")(function* (
    this: ArticleArchive,
  ) {
    const writer = yield* io(() => this.writer.listRecords());
    const reader = yield* io(() => this.reader.listRecords());
    return [
      ...writer.map((record) => ({ ...record, source: "writer" })),
      ...reader.map((record) => ({ ...record, source: "reader" })),
    ].map(({ contentHash, article, shared, pendingShare, source }) => ({
      contentHash,
      url: article.url,
      title: article.title,
      shared,
      pendingShare,
      source,
    }));
  });
  removeEffect = Effect.fn("ArticleArchive.remove")(function* (
    this: ArticleArchive,
    hash: string,
    source: string,
  ) {
    if (source === "reader")
      return yield* io(() => this.reader.deleteRecord(hash));
    yield* this.discardShareEffect(hash);
    return yield* io(() => this.writer.deleteRecord(hash));
  });
  clearEffect = Effect.fn("ArticleArchive.clear")(function* (
    this: ArticleArchive,
  ) {
    if (this.activeShares.size)
      return yield* rejected(
        "Wait for sharing to finish before clearing copies.",
      );
    yield* io(() => this.receipts.clear());
    yield* io(() => this.writer.clear());
    yield* io(() => this.reader.clear());
  });

  // Promise adapters are the legacy page/test boundary; workflows compose above.
  save(article: Article, options = {}) {
    return Effect.runPromise(this.saveEffect(article, options));
  }
  share(copy: ArticleCopy) {
    return Effect.runPromise(this.shareEffect(copy));
  }
  retry(hash: string) {
    return Effect.runPromise(this.retryEffect(hash));
  }
  discardShare(hash: string) {
    return Effect.runPromise(this.discardShareEffect(hash));
  }
  browse() {
    return Effect.runPromise(this.browseEffect());
  }
  discover() {
    return Effect.runPromise(this.discoverEffect());
  }
  localCatalog() {
    return Effect.runPromise(this.localCatalogEffect());
  }
  record(hash: string) {
    return Effect.runPromise(this.recordEffect(hash));
  }
  read(hash: string) {
    return Effect.runPromise(this.readEffect(hash));
  }
  rate(hash: string, value: number) {
    return Effect.runPromise(this.rateEffect(hash, value));
  }
  ratings(hash: string) {
    return Effect.runPromise(this.ratingsEffect(hash));
  }
  library() {
    return Effect.runPromise(this.libraryEffect());
  }
  remove(hash: string, source: string) {
    return Effect.runPromise(this.removeEffect(hash, source));
  }
  clear() {
    return Effect.runPromise(this.clearEffect());
  }
}
