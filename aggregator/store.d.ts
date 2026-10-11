import type { Listing, Rating, JournalEvent, RefreshSummary } from "./types.ts";
export class AggregatorStore {
  constructor(options?: {
    path?: string;
    now?: () => number;
    maxArticles?: number;
    maxEvents?: number;
    maxBytes?: number;
    maxVotes?: number;
    maxVoteBytes?: number;
  });
  commitMetadata(
    listings: readonly Listing[],
    votes: readonly Rating[],
  ): Promise<{ articles: number; votes: number }>;
  listArticles(): Listing[];
  listVotes(): Rating[];
  appendEvent(event: JournalEvent): unknown;
  saveRefresh(summary: RefreshSummary): unknown;
  events(): unknown[];
  trends(): unknown[];
  stats(): unknown;
  lastRefresh(): unknown;
  close(): void;
}
