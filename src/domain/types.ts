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
}
export interface Listing extends Omit<Article, "content"> {
  id: string;
  pubkey: string;
  createdAt: number;
  urlHash: string;
  contentHash: string;
  blobHash: string;
  size: number;
  provider: string;
  listedAt?: number;
}
export interface UploadReceipt {
  blobHash: string;
  size: number;
  provider: string;
}
export interface ShareReceipt extends UploadReceipt {
  contentHash: string;
  uploaded: boolean;
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
  uploadEffect(copy: ArticleCopy): Effect.Effect<UploadReceipt, Error>;
  publishListingEffect(
    copy: ArticleCopy,
    receipt: UploadReceipt,
  ): Effect.Effect<Listing, Error>;
  readArticleEffect(
    listing: Listing,
    options?: { budget?: { remainingBytes: number } },
  ): Effect.Effect<ArticleCopy, Error>;
  queryListingsEffect(): Effect.Effect<Listing[], Error>;
  queryVotesEffect(targets: RatingTarget[]): Effect.Effect<Vote[], Error>;
  publishVoteEffect(
    value: RatingTarget & { value: number },
  ): Effect.Effect<Vote, Error>;
}
