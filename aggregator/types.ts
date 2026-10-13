import { SnapshotRoutes } from '../src/domain/routes.ts';
import { isSnapshotCid } from '../src/domain/cid.ts';
import { Schema } from "effect";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const Hash = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/));
export const ListingSchema = Schema.Struct({
  id: Hash,
  pubkey: Hash,
  createdAt: Count,
  url: Schema.String,
  urlHash: Hash,
  contentHash: Hash,
  blobHash: Hash,
  size: Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: 2 * 1024 * 1024 }),
  ),
  title: Schema.NonEmptyString,
  byline: Schema.String,
  capturedAt: Count,
  cid: Schema.String.check(Schema.makeFilter(isSnapshotCid)),
  routes: SnapshotRoutes,
});
export const RatingSchema = Schema.Struct({
  id: Hash,
  pubkey: Hash,
  createdAt: Count,
  urlHash: Hash,
  contentHash: Hash,
  value: Schema.Literals([1, -1]),
});
export const RelayOutcomeSchema = Schema.Struct({
  relay: Schema.String,
  outcome: Schema.Literals(['success','failure']),
  error: Schema.optionalKey(Schema.Literals(['timeout','network','canceled'])),
});
export const DiagnosticsSchema = Schema.Struct({
  received: Count,
  accepted: Count,
  rejected: Count,
  duplicates: Count,
  relays: Schema.optionalKey(Schema.Array(RelayOutcomeSchema)),
  reasons: Schema.optionalKey(Schema.Record(Schema.String, Count)),
});
export type Listing = typeof ListingSchema.Type;
export type Rating = typeof RatingSchema.Type;
export type QueryDiagnostics = typeof DiagnosticsSchema.Type;
export interface MetadataDirectory {
  queryListings(signal?: AbortSignal): Promise<unknown>;
  queryVotes(
    targets: readonly { urlHash: string; contentHash: string }[],
    signal?: AbortSignal,
  ): Promise<unknown>;
}
export interface JournalEvent {
  readonly action: string;
  readonly kind: string;
  readonly outcome: string;
  readonly startedAt?: number;
  readonly durationMs?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}
export interface RefreshSummary {
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly durationMs: number;
  readonly outcome: "success";
  readonly discovered: number;
  readonly indexed: number;
  readonly votes: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly duplicates: number;
}
