import { DISCOVERY_WINDOW_MS } from "../src/directory/nostr.ts";
import { DateTime, Effect, Fiber, Predicate, Schema, Schedule } from "effect";
import type { AggregatorStore } from "./store.ts";
import {
  ListingSchema,
  RatingSchema,
  DiagnosticsSchema,
  type MetadataDirectory,
  type RefreshSummary,
} from "./types.ts";
interface RankedListing {
  id: string;
  pubkey: string;
  createdAt: number;
  urlHash: string;
  contentHash: string;
  title: string;
  byline: string;
}
interface RankedRating {
  id: string;
  pubkey: string;
  createdAt: number;
  urlHash: string;
  contentHash: string;
  value: number;
}
const CATEGORIES = [
  "AI",
  "Technology",
  "Finance",
  "Science",
  "Politics",
  "General",
];
function categoryFor(entry: Pick<RankedListing, "title" | "byline">) {
  const text = `${entry.title} ${entry.byline}`;
  const patterns = [
    /\b(ai|artificial intelligence|machine learning|llm|chatgpt)\b/i,
    /\b(technology|software|computer|chip|cybersecurity|programming|smartphone)\b/i,
    /\b(finance|financial|bank|market|stock|economy|economic|investment|inflation)\b/i,
    /\b(science|scientist|research|biology|physics|climate|space|astronomy)\b/i,
    /\b(politics|political|election|government|congress|parliament|president)\b/i,
  ];
  const index = patterns.findIndex((pattern) => pattern.test(text));
  return CATEGORIES[index < 0 ? 5 : index];
}
export function rankedArticles<T extends RankedListing>(
  listings: readonly T[],
  votes: readonly RankedRating[],
  now = DateTime.toEpochMillis(DateTime.nowUnsafe()),
) {
  const latest = new Map<string, RankedRating>();
  for (const vote of votes) {
    if (vote.createdAt < now - 7 * 86400_000 || vote.createdAt > now + 60_000)
      continue;
    const key = `${vote.urlHash}:${vote.contentHash}:${vote.pubkey}`,
      old = latest.get(key);
    if (
      !old ||
      vote.createdAt > old.createdAt ||
      (vote.createdAt === old.createdAt && vote.id < old.id)
    )
      latest.set(key, vote);
  }
  const totals = new Map<string, { upvotes: number; downvotes: number }>();
  for (const vote of latest.values()) {
    const key = `${vote.urlHash}:${vote.contentHash}`;
    const count = totals.get(key) || { upvotes: 0, downvotes: 0 };
    if (vote.value === 1) count.upvotes = Math.min(50, count.upvotes + 1);
    if (vote.value === -1) count.downvotes = Math.min(50, count.downvotes + 1);
    totals.set(key, count);
  }
  const copies = new Map<string, T & { listedAt: number }>();
  for (const listing of listings) {
    if (listing.createdAt < now - DISCOVERY_WINDOW_MS) continue;
    const key = `${listing.urlHash}:${listing.contentHash}`,
      old = copies.get(key);
    if (!old) copies.set(key, { ...listing, listedAt: listing.createdAt });
    else {
      const listedAt = Math.min(old.listedAt, listing.createdAt);
      if (
        listing.createdAt > old.createdAt ||
        (listing.createdAt === old.createdAt && listing.id < old.id)
      )
        copies.set(key, { ...listing, listedAt });
      else old.listedAt = listedAt;
    }
  }
  return [...copies.values()]
    .map((entry) => {
      const { upvotes, downvotes } = totals.get(`${entry.urlHash}:${entry.contentHash}`)
        || { upvotes: 0, downvotes: 0 };
      const ageHours = Math.max(0, now - entry.listedAt) / 3_600_000;
      return {
        ...entry,
        category: categoryFor(entry),
        rating: { upvotes, downvotes },
        score: (upvotes - downvotes + 2) / (ageHours + 2) ** 1.5,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.contentHash.localeCompare(b.contentHash) ||
        a.urlHash.localeCompare(b.urlHash),
    );
}
function errorCode(error: unknown): "timeout" | "network" {
  return Predicate.hasProperty(error, "code") && error.code === "timeout"
    ? "timeout"
    : "network";
}
export class IndexingError extends Schema.TaggedError<IndexingError>()(
  "IndexingError",
  {
    message: Schema.String,
    status: Schema.Number,
    code: Schema.Literals(["timeout", "network", "busy"]),
    cause: Schema.Defect(),
  },
) {}
const failure = (cause: unknown) =>
  cause instanceof IndexingError
    ? cause
    : new IndexingError({
        message: "Metadata operation failed.",
        status: 502,
        code: errorCode(cause),
        cause,
      });

/** Only signed metadata enters this collector; it has no article-body client. */
export class MetadataIndexer {
  readonly store: AggregatorStore;
  readonly directory: MetadataDirectory;
  readonly intervalMs: number;
  readonly timestamp: Effect.Effect<number>;
  pending = false;
  indexing = false;
  nextRunAt: number | null = null;
  connected = false;
  error: "timeout" | "network" | null = null;
  private schedulerFiber: Fiber.Fiber<void, never> | null = null;
  private refreshFiber: Fiber.Fiber<RefreshSummary, IndexingError> | null =
    null;
  private closed = false;
  constructor({
    store,
    directory,
    now,
    intervalMs = 60_000,
  }: {
    store: AggregatorStore;
    directory: MetadataDirectory;
    now?: () => number;
    intervalMs?: number;
  }) {
    this.store = store;
    this.directory = directory;
    this.intervalMs = intervalMs;
    this.timestamp = now
      ? Effect.sync(now)
      : DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));
  }
  private operation = Effect.fn("MetadataIndexer.operation")(function* <A>(
    this: MetadataIndexer,
    action: string,
    query: (signal: AbortSignal) => Promise<unknown>,
    schema: Schema.Codec<readonly A[]>,
  ) {
    const startedAt = yield* this.timestamp;
    const result = yield* Effect.tryPromise({
      try: query,
      catch: failure,
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(schema)),
      Effect.mapError(failure),
      Effect.tapError((error) =>
        Effect.sync(() =>
          this.store.appendEvent({
            action,
            kind: "network",
            outcome: "failure",
            startedAt,
            details: { error: error.code },
          }),
        ),
      ),
    );
    const diagnostics =
      this.directory.lastQuery == null
        ? null
        : yield* Schema.decodeUnknownEffect(DiagnosticsSchema)(
            this.directory.lastQuery,
          ).pipe(Effect.mapError(failure));
    const finishedAt = yield* this.timestamp;
    yield* Effect.sync(() =>
      this.store.appendEvent({
        action,
        kind: "network",
        outcome: "success",
        startedAt,
        durationMs: finishedAt - startedAt,
        details: diagnostics
          ? { ...diagnostics, entries: result.length }
          : { accepted: result.length, entries: result.length },
      }),
    );
    return { records: result, diagnostics };
  });
  readonly refreshEffect = Effect.fn("MetadataIndexer.refresh")(function* (
    this: MetadataIndexer,
  ): Effect.fn.Return<RefreshSummary, IndexingError> {
    if (this.closed)
      return yield* new IndexingError({
        message: "The indexer is stopped.",
        status: 503,
        code: "busy",
        cause: null,
      });
    if (this.pending)
      return yield* new IndexingError({
        message: "An indexing run is already in progress.",
        status: 409,
        code: "busy",
        cause: null,
      });
    const startedAt = yield* this.timestamp;
    return yield* Effect.acquireUseRelease(
      Effect.sync(() => {
        this.pending = true;
      }),
      () =>
        Effect.gen({ self: this }, function* () {
          const listingQuery = yield* this.operation(
            "LISTINGS",
            (signal) => this.directory.queryListings(signal),
            Schema.Array(ListingSchema),
          );
          const listings = listingQuery.records;
          const unique = new Map(
            listings.map((entry) => [
              `${entry.urlHash}:${entry.contentHash}`,
              { urlHash: entry.urlHash, contentHash: entry.contentHash },
            ]),
          );
          const voteQuery = yield* this.operation(
            "VOTES",
            (signal) =>
              this.directory.queryVotes(
                [...unique.values()].slice(0, 100),
                signal,
              ),
            Schema.Array(RatingSchema),
          );
          const committed = yield* Effect.tryPromise({
            try: () => this.store.commitMetadata(listings, voteQuery.records),
            catch: failure,
          }).pipe(Effect.uninterruptible);
          const rejected =
            (listingQuery.diagnostics?.rejected ?? 0) +
            (voteQuery.diagnostics?.rejected ?? 0);
          const duplicates =
            (listingQuery.diagnostics?.duplicates ?? 0) +
            (voteQuery.diagnostics?.duplicates ?? 0) +
            listings.length -
            unique.size;
          const finishedAt = yield* this.timestamp;
          const summary: RefreshSummary = {
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            outcome: "success",
            discovered: listingQuery.diagnostics?.received ?? listings.length,
            indexed: committed.articles,
            votes: voteQuery.records.length,
            accepted: listings.length + voteQuery.records.length,
            rejected,
            duplicates,
          };
          yield* Effect.sync(() => {
            this.store.appendEvent({
              action: "FILTER",
              kind: "filter",
              outcome: "success",
              details: { accepted: summary.accepted, rejected, duplicates },
            });
            this.store.appendEvent({
              action: "STORE",
              kind: "storage",
              outcome: "success",
              details: { articles: committed.articles, votes: committed.votes },
            });
            this.store.saveRefresh(summary);
            this.store.appendEvent({
              action: "REFRESH",
              kind: "refresh",
              outcome: "success",
              startedAt,
              durationMs: summary.durationMs,
              details: { ...summary },
            });
            this.connected = true;
            this.error = null;
          });
          return summary;
        }).pipe(
          Effect.catch((error) =>
            Effect.gen({ self: this }, function* () {
              this.connected = false;
              this.error = error.code === "timeout" ? "timeout" : "network";
              const finishedAt = yield* this.timestamp;
              yield* Effect.sync(() =>
                this.store.appendEvent({
                  action: "REFRESH",
                  kind: "refresh",
                  outcome: "failure",
                  startedAt,
                  durationMs: finishedAt - startedAt,
                  details: { error: this.error },
                }),
              );
              return yield* new IndexingError({
                message:
                  this.error === "timeout"
                    ? "Nostr indexing timed out. The previous index is still available."
                    : "Nostr indexing failed. The previous index is still available.",
                status: 502,
                code: this.error,
                cause: error,
              });
            }),
          ),
        ),
      () =>
        Effect.sync(() => {
          this.pending = false;
        }),
    );
  });
  refresh(): Promise<RefreshSummary> {
    if (this.pending || this.refreshFiber)
      return Effect.runPromise(
        Effect.fail(
          new IndexingError({
            message: "An indexing run is already in progress.",
            status: 409,
            code: "busy",
            cause: null,
          }),
        ),
      );
    const fiber = Effect.runFork(this.refreshEffect());
    this.refreshFiber = fiber;
    return Effect.runPromise(
      Fiber.join(fiber).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            if (this.refreshFiber === fiber) this.refreshFiber = null;
          }),
        ),
      ),
    );
  }
  readonly statusEffect = Effect.fn("MetadataIndexer.status")(function* (
    this: MetadataIndexer,
  ) {
    return {
      connected: false,
      peers: 0,
      lastQuerySucceeded: this.connected,
      error: this.error,
      pending: Number(this.pending),
      indexing: this.indexing,
      intervalMs: this.intervalMs,
      nextRunAt: this.nextRunAt,
      observedAt: yield* this.timestamp,
    };
  });
  status() {
    return Effect.runPromise(this.statusEffect());
  }
  startScheduler(): void {
    if (this.schedulerFiber || this.closed) return;
    this.indexing = true;
    this.schedulerFiber = Effect.runFork(
      Effect.scoped(
        Effect.gen({self:this}, function* () {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              this.indexing = false;
              this.nextRunAt = null;
            }),
          );
          yield* Effect.gen({self:this}, function* () {
            this.nextRunAt = null;
            if (!this.pending)
              yield* this.refreshEffect().pipe(Effect.catch(() => Effect.void));
            this.nextRunAt = (yield* this.timestamp) + this.intervalMs;
          }).pipe(Effect.repeat(Schedule.spaced(this.intervalMs)));
        }),
      ),
    );
  }
  readonly stopSchedulerEffect = Effect.fn("MetadataIndexer.stopScheduler")(
    function* (this: MetadataIndexer) {
      const fiber = this.schedulerFiber;
      if (fiber) yield* Fiber.interrupt(fiber);
      if (this.schedulerFiber === fiber) this.schedulerFiber = null;
      this.indexing = false;
      this.nextRunAt = null;
    },
  );
  stopScheduler() {
    return Effect.runPromise(this.stopSchedulerEffect());
  }
  readonly shutdownEffect = Effect.fn("MetadataIndexer.shutdown")(function* (
    this: MetadataIndexer,
  ) {
    this.closed = true;
    yield* this.stopSchedulerEffect();
    if (this.refreshFiber) yield* Fiber.interrupt(this.refreshFiber);
    this.refreshFiber = null;
  });
}
