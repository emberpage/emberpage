import { Deferred, Effect, Schema } from "effect";
import { normalizeUrl } from "../domain/url.ts";
import { encodeArticle } from "../domain/article.ts";
import { filterCandidates, rankCandidates } from "../domain/candidates.ts";
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
  SavedCopySummary,
  Vote,
} from "../domain/types.ts";

class ArchiveError extends Schema.TaggedError<ArchiveError>()("ArchiveError", {
  message: Schema.String,
  cause: Schema.Unknown,
}) {}
const failure = (cause: unknown) =>
  new ArchiveError({
    message:
      cause instanceof Error ? cause.message : "The archive operation failed.",
    cause,
  });
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: operation, catch: failure }).pipe(Effect.uninterruptible);
const rejected = (message: string) => Effect.fail(failure(new Error(message)));
type EligibleCopy = ArticleCopy & { listedAt: number };
interface CopyStore {
  saveRecord(
    copy: ArticleCopy,
    options?: { shared?: boolean; pendingShare?: boolean },
  ): Promise<unknown>;
  getRecord(hash: string): Promise<ArticleCopy | null>;
  listRecords(url?: string): Promise<ArticleCopy[]>;
  listSummaries(url?: string): Promise<SavedCopySummary[]>;
  setPending(hash: string, value: boolean): Promise<unknown>;
  retainForMesh(hash: string): Promise<unknown>;
  setShared(hash: string, value: boolean, listedAt: number): Promise<unknown>;
  deleteRecord(hash: string): Promise<unknown>;
  clear(): Promise<unknown>;
}
interface ArchiveOptions {
  network: ArticleNetwork;
  contributions: {list(): Promise<readonly {blobHash: string; size: number}[]>};
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
      receipt: ShareReceipt,
    ): Promise<ShareReceipt>;
    delete(hash: string): Promise<unknown>;
    clear(): Promise<unknown>;
  };
  inspect(this: void, article: Article): Promise<Inspection> | Inspection;
}

/** Allocate downloads fairly; claimed content hashes are not verified identities yet. */
function discoveryCandidates(listings: Listing[]) {
  type Claim = { listings: Listing[]; listedAt: number };
  const claims = new Map<string, Claim>();
  for (const listing of listings) {
    const binding = JSON.stringify([listing.cid, listing.blobHash, listing.size, listing.urlHash,
      listing.contentHash, listing.url, listing.title, listing.byline, listing.capturedAt]);
    const existing = claims.get(binding);
    if (existing) {
      existing.listings.push(listing);
      existing.listedAt = Math.min(existing.listedAt, listing.createdAt);
      continue;
    }
    const claim = {listings:[listing], listedAt:listing.createdAt};
    claims.set(binding, claim);
  }
  const publishers = new Map<string, number>();
  const selected: {listing: Listing & {listedAt:number}; routes: string[]}[] = [];
  for (const claim of claims.values()) {
    const listing = claim.listings.find(entry => (publishers.get(entry.pubkey) || 0) < 4);
    if (!listing) continue;
    publishers.set(listing.pubkey, (publishers.get(listing.pubkey) || 0) + 1);
    selected.push({listing: {...listing, listedAt:claim.listedAt},
      routes: [...new Set(claim.listings.flatMap(entry => entry.routes))].slice(0,12)});
    if (selected.length === 20) break;
  }
  return selected;
}

/** Owns explicit share workflows and the distinction between private and public copies. */
export class ArticleArchive {
  readonly #network: ArchiveOptions["network"];
  readonly #contributions: ArchiveOptions["contributions"];
  readonly #writer: ArchiveOptions["writer"];
  readonly #reader: ArchiveOptions["reader"];
  readonly #catalog: ArchiveOptions["catalog"];
  readonly #votes: ArchiveOptions["votes"];
  readonly #receipts: ArchiveOptions["receipts"];
  readonly #inspect: ArchiveOptions["inspect"];
  readonly #activeCopies = new Set<string>();
  #maintenance: "pause" | "clear" | null = null;
  readonly #discoveries = new Map<string, Deferred.Deferred<
    { entries: PopularEntry[]; warning: string }, Error
  >>();

  constructor(options: ArchiveOptions) {
    this.#network = options.network;
    this.#contributions = options.contributions;
    this.#writer = options.writer;
    this.#reader = options.reader;
    this.#catalog = options.catalog;
    this.#votes = options.votes;
    this.#receipts = options.receipts;
    this.#inspect = options.inspect;
  }
  readonly #mutateCopy = Effect.fn("ArticleArchive.mutateCopy")(function* <A>(
    this: ArticleArchive, hash: string, operation: Effect.Effect<A, Error>,
  ) {
    return yield* Effect.scoped(Effect.gen({self: this}, function* () {
      yield* Effect.acquireRelease(
        Effect.try({try: () => {
          if (this.#maintenance)
            throw new Error(this.#maintenance === "pause"
              ? "Wait for contribution to pause before sharing."
              : "Wait for archive cleanup to finish.");
          if (this.#activeCopies.has(hash))
            throw new Error("Wait for this copy's current operation to finish.");
          this.#activeCopies.add(hash);
        }, catch: failure}),
        () => Effect.sync(() => {this.#activeCopies.delete(hash);}),
      );
      return yield* operation;
    }));
  });
  readonly #maintain = Effect.fn("ArticleArchive.maintain")(function* (
    this: ArticleArchive, mode: "pause" | "clear", operation: Effect.Effect<void, Error>,
  ) {
    return yield* Effect.scoped(Effect.gen({self: this}, function* () {
      yield* Effect.acquireRelease(
        Effect.try({try: () => {
          if (this.#maintenance || this.#activeCopies.size || this.#discoveries.size)
            throw new Error(mode === "pause"
              ? "Wait for sharing to finish before pausing contribution."
              : "Wait for archive operations to finish before clearing copies.");
          this.#maintenance = mode;
        }, catch: failure}),
        () => Effect.sync(() => {this.#maintenance = null;}),
      );
      yield* operation;
    })).pipe(Effect.uninterruptible);
  });
  readonly #inspectEffect = (
    article: Article,
  ): Effect.Effect<Inspection, ArchiveError> =>
    io(() => Promise.resolve(this.#inspect(article)));
  readonly #eligible = (copies: ArticleCopy[]) =>
    io(() =>
      filterCandidates(copies, {
        inspect: (article) => this.#inspect(article),
      }),
    );

  readonly saveEffect = Effect.fn("ArticleArchive.save")(function* (
    this: ArticleArchive,
    article: Article,
    { share = false }: { share?: boolean } = {},
  ): Effect.fn.Return<ShareResult, Error> {
    const inspection: Inspection = yield* this.#inspectEffect(article);
    const copy: ArticleCopy = yield* io(() =>
      encodeArticle({ ...article, content: inspection.content }),
    );
    return yield* this.#mutateCopy(copy.contentHash, Effect.gen({self: this}, function* () {
      const retained = (yield* io(() => this.#writer.listSummaries())).find(
        record => record.contentHash === copy.contentHash && record.meshRetained,
      );
      const previous = retained ? yield* io(() => this.#writer.getRecord(copy.contentHash)) : null;
      const saved = previous ?? copy;
      yield* io(() => this.#writer.saveRecord(saved, { pendingShare: share }));
      if (share) return yield* this.#shareEffect(saved);
      yield* this.#discardShareEffect(copy.contentHash);
      return { contentHash: copy.contentHash, shared: false };
    }));
  });

  readonly #shareEffect = Effect.fn("ArticleArchive.share")(function* (
    this: ArticleArchive,
    copy: ArticleCopy,
  ): Effect.fn.Return<ShareResult, Error> {
    let receipt: ShareReceipt | null = null;
    let listing: (Listing & {warning?: string}) | undefined;
    const workflow = Effect.gen({ self: this }, function* () {
      return yield* Effect.gen({ self: this }, function* (): Effect.fn.Return<
        ShareResult,
        Error
      > {
        if (!(yield* io(() => this.#writer.setPending(copy.contentHash, true))))
          return yield* rejected(
            "This saved copy was removed. Open the original page and choose Save article again.",
          );
        receipt = yield* io(() => this.#receipts.get(copy.contentHash));
        if (
          !(yield* this.#eligible([
            { ...copy, listedAt: copy.listedAt ?? Date.now() },
          ])).length
        ) {
          if (!receipt)
            yield* io(() => this.#writer.setPending(copy.contentHash, false));
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
            "Open Options → Manage saved articles and cancel unfinished sharing before sharing a new copy.",
          );
        if (!receipt)
          receipt = yield* io(() =>
            this.#receipts.put({
              contentHash: copy.contentHash,
              blobHash: copy.blobHash,
              size: copy.size,
              pinned: false,
            }),
          );
        {
          // Reserve the visible archive record before a pin can survive cancellation.
          yield* io(() => this.#writer.retainForMesh(copy.contentHash));
          // Idempotent local pins refresh the live peer routes on each explicit retry.
          receipt = {
            ...(yield* this.#network.pinEffect(copy)),
            contentHash: copy.contentHash,
            pinned: true,
          };
          const saved = receipt;
          yield* io(() => this.#receipts.put(saved));
        }
        if (!receipt.cid) return yield* rejected("The preserved file address was not saved. Retry sharing.");
        if (!receipt.routes) return yield* rejected("The peer address was not saved. Retry sharing.");
        listing = yield* this.#network.publishListingEffect(copy, {cid:receipt.cid,blobHash:receipt.blobHash,size:receipt.size,routes:receipt.routes});
        const accepted = listing;
        yield* io(() =>
          this.#writer.setShared(copy.contentHash, true, accepted.createdAt),
        );
        yield* io(() => this.#catalog.ingest([accepted]));
        yield* io(() => this.#receipts.delete(copy.contentHash));
        yield* io(() => this.#writer.setPending(copy.contentHash, false));
        return { contentHash: copy.contentHash, shared: true, pinned: true, cid: receipt.cid, ...(accepted.warning ? {warning:accepted.warning} : {}) };
      }).pipe(
        Effect.catch((error) => {
          if (listing)
            return Effect.succeed<ShareResult>({
              contentHash: copy.contentHash,
              shared: true,
              localSaved: true,
              pinned: true,
              ...(receipt?.cid ? {cid:receipt.cid} : {}),
              warning:
                "Shared publicly, but the saved status could not be updated. Check Options → Manage saved articles.",
            });
          if (receipt)
            return Effect.succeed<ShareResult>({
              contentHash: copy.contentHash,
              shared: false,
              localSaved: true,
              pinned: receipt.pinned,
              ...(receipt.cid ? {cid:receipt.cid} : {}),
              shareError: error.message,
            });
          return io(() =>
            this.#writer.setPending(copy.contentHash, false),
          ).pipe(Effect.andThen(Effect.fail(error)));
        }),
      );
    });
    return yield* Effect.scoped(workflow);
  });

  readonly #discardShareEffect = Effect.fn("ArticleArchive.discardShare")(
    function* (this: ArticleArchive, hash: string) {
      yield* io(() => this.#receipts.delete(hash));
      yield* io(() => this.#writer.setPending(hash, false));
    },
  );
  readonly discardShareEffect = Effect.fn("ArticleArchive.cancelSharing")(function* (
    this: ArticleArchive, hash: string,
  ) {
    yield* this.#mutateCopy(hash, this.#discardShareEffect(hash));
  });

  readonly #discoverEffect = Effect.fn("ArticleArchive.discover")(function* (
    this: ArticleArchive,
    url: string,
  ) {
    const query = yield* this.#network.queryListingsEffect(url);
    const fresh = query.records.filter(listing => listing.url === url);
    const directoryWarning = query.warning || "";
    yield* io(() => this.#catalog.ingest(fresh));
    const listings = (yield* io(() => this.#catalog.list())).filter(listing => listing.url === url);
    const budget = { remainingBytes: 16 * 1024 * 1024 };
    const inspected = (yield* Effect.forEach(
      discoveryCandidates(listings),
      ({listing, routes}) =>
        Effect.gen({ self: this }, function* () {
          const copy = {
            ...(yield* this.#network.readArticleEffect(listing, { budget, routes })),
            listedAt: listing.listedAt,
          };
          const [eligible] = yield* this.#eligible([copy]);
          if (!eligible) return null;
          return eligible;
        }).pipe(Effect.catch(() => Effect.succeed(null))),
      { concurrency: 2 },
    )).filter((copy): copy is EligibleCopy => copy !== null);
    const snapshots = new Map<string, EligibleCopy>();
    for (const copy of inspected) {
      const previous = snapshots.get(copy.contentHash);
      if (previous) previous.listedAt = Math.min(previous.listedAt, copy.listedAt);
      else snapshots.set(copy.contentHash, copy);
    }
    const accepted = (yield* Effect.forEach([...snapshots.values()],
      copy => io(() => this.#reader.saveRecord(copy, {shared:true})).pipe(
        Effect.as(copy), Effect.catch(() => Effect.succeed(null))),
      {concurrency:2})).filter((copy): copy is EligibleCopy => copy !== null);
    let warning = directoryWarning;
    if (accepted.length) {
      const ratingsWarning = yield* Effect.gen({ self: this }, function* () {
        const votes = yield* this.#network.queryVotesEffect(
          accepted.map((copy) => ({
            urlHash: copy.urlHash,
            contentHash: copy.contentHash,
          })),
        );
        yield* io(() => this.#votes.ingest(votes.records));
        return votes.warning || "";
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(
            "Articles loaded, but ratings could not be refreshed.",
          ),
        ),
      );
      warning = [directoryWarning, ratingsWarning].filter(Boolean).join(" ");
    }
    return { entries: yield* this.#entriesEffect(accepted), warning };
  });
  readonly browseEffect = Effect.fn("ArticleArchive.browse")(function* (
    this: ArticleArchive,
    rawUrl: string,
  ) {
    if (this.#maintenance)
      return yield* rejected("Wait for archive cleanup to finish before finding copies.");
    const url = yield* Effect.try({try: () => normalizeUrl(rawUrl), catch: failure});
    const { pending, owner } = yield* Effect.sync(() => {
      const existing = this.#discoveries.get(url);
      if (existing) return { pending: existing, owner: false };
      if (this.#discoveries.size >= 2) return { pending: null, owner: false };
      const pending = Deferred.makeUnsafe<
        { entries: PopularEntry[]; warning: string },
        Error
      >();
      this.#discoveries.set(url, pending);
      return { pending, owner: true };
    });
    if (!pending) return yield* rejected("Wait for an article search to finish before searching another page.");
    if (!owner) return yield* Deferred.await(pending);
    return yield* this.#discoverEffect(url).pipe(
      Effect.onExit((exit) => Deferred.done(pending, exit).pipe(Effect.asVoid)),
      Effect.ensuring(
        Effect.sync(() => {
          if (this.#discoveries.get(url) === pending) this.#discoveries.delete(url);
        }),
      ),
    );
  });
  readonly #entriesEffect = Effect.fn("ArticleArchive.entries")(function* (
    this: ArticleArchive,
    copies: EligibleCopy[],
  ) {
    const pairs = yield* Effect.forEach(
      copies,
      (copy) =>
        io(() => this.#votes.summarize(copy.contentHash)).pipe(
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
  readonly localCatalogEffect = Effect.fn("ArticleArchive.localCatalog")(
    function* (this: ArticleArchive, rawUrl: string) {
      const url = yield* Effect.try({try: () => normalizeUrl(rawUrl), catch: failure});
      const copies = [
        ...(yield* io(() => this.#reader.listRecords(url))),
        ...(yield* io(() => this.#writer.listRecords(url))),
      ].filter((record) => record.shared && record.article.url === url);
      return yield* this.#entriesEffect(yield* this.#eligible(copies));
    },
  );
  readonly recordEffect = Effect.fn("ArticleArchive.record")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const writer = yield* io(() => this.#writer.getRecord(hash));
    const reader = writer?.shared
      ? null
      : yield* io(() => this.#reader.getRecord(hash));
    const record = writer?.shared ? writer : reader || writer;
    if (!record)
      return yield* rejected(
        "This saved copy was removed. Open the original page and choose Find saved copies or Save article.",
      );
    return record;
  });
  readonly contributeEffect = Effect.fn("ArticleArchive.contribute")(function* (
    this: ArticleArchive, hash: string,
  ) {
    return yield* this.#mutateCopy(hash, Effect.gen({self: this}, function* () {
      const retained = yield* io(() => this.#writer.getRecord(hash));
      const copy = retained ?? (yield* this.recordEffect(hash));
      if (!retained) {
        if (!(yield* this.#eligible([copy])).length)
          return yield* rejected("This saved snapshot is too short or incomplete to share.");
        yield* io(() => this.#writer.saveRecord(copy, {pendingShare:true}));
      }
      return yield* this.#shareEffect(copy);
    }));
  });
  readonly readEffect = Effect.fn("ArticleArchive.read")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const record = yield* this.recordEffect(hash);
    const inspected = yield* this.#inspectEffect(record.article);
    return {
      article: { ...record.article, content: inspected.content },
      shared: record.shared,
      contentHash: hash,
      rating: yield* io(() => this.#votes.summarize(hash)),
    };
  });
  readonly rateEffect = Effect.fn("ArticleArchive.rate")(function* (
    this: ArticleArchive,
    hash: string,
    value: number,
  ) {
    if (value !== 1 && value !== -1)
      return yield* rejected("Choose a valid rating.");
    const record = yield* this.recordEffect(hash);
    if (!record.shared)
      return yield* rejected("Only reader-facing copies can be rated.");
    const vote = yield* this.#network.publishVoteEffect({
      urlHash: record.urlHash,
      contentHash: hash,
      value,
    });
    yield* io(() => this.#votes.ingest([vote]));
    return yield* io(() => this.#votes.summarize(hash));
  });
  readonly ratingsEffect = Effect.fn("ArticleArchive.ratings")(function* (
    this: ArticleArchive,
    hash: string,
  ) {
    const record = yield* this.recordEffect(hash);
    let warning: string | undefined;
    if (record.shared) {
      const votes = yield* this.#network.queryVotesEffect([
        { urlHash: record.urlHash, contentHash: hash },
      ]);
      yield* io(() => this.#votes.ingest(votes.records));
      warning = votes.warning;
    }
    return {...(yield* io(() => this.#votes.summarize(hash))), ...(warning ? {warning} : {})};
  });
  readonly libraryEffect = Effect.fn("ArticleArchive.library")(function* (
    this: ArticleArchive,
    rawUrl?: string,
  ) {
    const url = rawUrl === undefined ? undefined : yield* Effect.try({try: () => normalizeUrl(rawUrl), catch: failure});
    const writer = yield* io(() => this.#writer.listSummaries(url));
    const reader = yield* io(() => this.#reader.listSummaries(url));
    const retained = url === undefined ? yield* io(() => this.#contributions.list()) : [];
    const knownFiles = new Set(writer.map(record => record.blobHash));
    return [
      ...retained.filter(record => !knownFiles.has(record.blobHash)).map(record => ({
        contentHash: record.blobHash, url: "", title: `Retained contribution · ${record.blobHash.slice(0, 8)}`,
        capturedAt: 0, shared: true, pendingShare: false, source: "mesh",
      })),
      ...writer.map((record) => ({ ...record, source: "writer" })),
      ...reader.map((record) => ({ ...record, source: "reader" })),
    ].filter(record => url === undefined || record.url === url).map(({ contentHash, url, title, capturedAt, shared, pendingShare, source }) => ({
      contentHash,
      url,
      title,
      capturedAt,
      shared,
      pendingShare,
      source,
    })).sort((a, b) => b.capturedAt - a.capturedAt);
  });
  readonly removeEffect = Effect.fn("ArticleArchive.remove")(function* (
    this: ArticleArchive,
    hash: string,
    source: string,
  ) {
    if (source === "mesh")
      return yield* this.#maintain("clear", Effect.gen({self: this}, function* () {
        const records = yield* io(() => this.#contributions.list());
        if (!records.some(record => record.blobHash === hash)) return;
        if ((yield* io(() => this.#writer.listSummaries())).some(record => record.blobHash === hash))
          return yield* rejected("Remove this contribution through its saved article.");
        yield* this.#network.forgetEffect(hash);
      }));
    return yield* this.#mutateCopy(hash, Effect.gen({self: this}, function* () {
      if (source === "reader")
        return yield* io(() => this.#reader.deleteRecord(hash));
      const copy = (yield* io(() => this.#writer.listSummaries())).find(record => record.contentHash === hash);
      if (copy) yield* this.#network.forgetEffect(copy.blobHash);
      yield* this.#discardShareEffect(hash);
      return yield* io(() => this.#writer.deleteRecord(hash));
    }));
  });
  readonly clearEffect = Effect.fn("ArticleArchive.clear")(function* (
    this: ArticleArchive,
  ) {
    return yield* this.#maintain("clear", Effect.gen({self: this}, function* () {
      yield* this.#network.clearPinsEffect();
      yield* io(() => this.#receipts.clear());
      yield* io(() => this.#writer.clear());
      yield* io(() => this.#reader.clear());
    }));
  });
  readonly pauseEffect = Effect.fn("ArticleArchive.pause")(function* (
    this: ArticleArchive,
  ) {
    return yield* this.#maintain("pause", this.#network.pauseEffect());
  });
}
