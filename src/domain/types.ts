import type { Effect } from "effect";

export interface Article {
  url: string;
  title: string;
  byline: string;
  content: string;
  capturedAt: number;
  textContent?: string;
  imageLimitExceeded?: boolean;
  imageWarning?: string;
}
export interface ArticleCopy {
  article: Article;
  bytes: Uint8Array;
  size: number;
  urlHash: string;
  contentHash: string;
  blobHash: string;
  listedAt?: number;
  shared?: boolean;
  pendingShare?: boolean;
  meshRetained?: boolean;
}
export interface SavedCopySummary {
  contentHash: string;
  blobHash: string;
  url: string;
  title: string;
  capturedAt: number;
  shared: boolean;
  pendingShare: boolean;
  meshRetained?: boolean;
}
export interface Listing extends Omit<Article, "content"> {
  id: string;
  pubkey: string;
  createdAt: number;
  urlHash: string;
  contentHash: string;
  blobHash: string;
  size: number;
  cid: string;
  routes: readonly string[];
  listedAt?: number;
}
export interface PinReceipt {
  routes: readonly string[];
  blobHash: string;
  size: number;
  cid: string;
}
export interface ShareReceipt extends Omit<PinReceipt, "cid" | "routes"> {
  contentHash: string;
  cid?: string;
  routes?: readonly string[];
  pinned: boolean;
}
export interface RatingTarget {
  urlHash: string;
  contentHash: string;
}
export interface Vote extends RatingTarget {
  id: string;
  pubkey: string;
  createdAt: number;
  value: number;
}
export interface Rating {
  upvotes: number;
  downvotes: number;
  ownVote?: number;
}
export interface Inspection {
  content: string;
  textContent: string;
  blocks: number;
  images: number;
  textDensity: number;
}
export interface ShareResult {
  contentHash: string;
  shared: boolean;
  localSaved?: boolean;
  validationError?: string;
  shareError?: string;
  warning?: string;
  cid?: string;
  pinned?: boolean;
}
export interface PopularEntry {
  contentHash: string;
  urlHash: string;
  url: string;
  title: string;
  byline: string;
  capturedAt: number;
  listedAt: number;
  score: number;
  rating: Rating | undefined;
}
export interface ArticleNetwork {
  pauseEffect(): Effect.Effect<void, Error>;
  forgetEffect(blobHash: string): Effect.Effect<void, Error>;
  clearPinsEffect(): Effect.Effect<void, Error>;
  pinEffect(copy: ArticleCopy): Effect.Effect<PinReceipt, Error>;
  publishListingEffect(
    copy: ArticleCopy,
    receipt: PinReceipt,
  ): Effect.Effect<Listing & { warning?: string }, Error>;
  readArticleEffect(
    listing: Listing,
    options?: { budget?: { remainingBytes: number }; routes?: readonly string[] },
  ): Effect.Effect<ArticleCopy, Error>;
  queryListingsEffect(url?: string): Effect.Effect<{records: Listing[]; warning?: string}, Error>;
  queryVotesEffect(targets: RatingTarget[]): Effect.Effect<{records: Vote[]; warning?: string}, Error>;
  publishVoteEffect(
    value: RatingTarget & { value: number },
  ): Effect.Effect<Vote, Error>;
}

export interface IpfsMirror {
  routes: readonly string[];
  cid: string;
  uri: string;
  size: number;
}
