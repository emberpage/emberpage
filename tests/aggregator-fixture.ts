import { Schema } from 'effect';
import { ListingSchema } from '../aggregator/types.ts';
import type { Listing, Rating } from '../aggregator/types.ts';
import { hashUrl } from '../src/domain/article.ts';
import { PROVIDER } from '../src/directory/nostr.ts';
export async function listing(
  now = Date.now(),
  overrides: Partial<Listing> & Record<string, unknown> = {}
) {
  const url = overrides.url || 'https://example.com/article';
  const base = Schema.decodeUnknownSync(ListingSchema)({
    id: 'a'.repeat(64),
    pubkey: 'b'.repeat(64),
    url,
    urlHash: await hashUrl(url),
    contentHash: 'c'.repeat(64),
    blobHash: 'd'.repeat(64),
    size: 150000,
    title: 'Science field notes',
    byline: 'A researcher',
    capturedAt: now - 60 * 86400_000,
    createdAt: now,
    provider: PROVIDER
  });
  return { ...base, ...overrides };
}
export function vote(
  entry: Listing,
  overrides: Partial<Rating> & Record<string, unknown> = {}
): Rating {
  return {
    id: 'e'.repeat(64),
    pubkey: 'f'.repeat(64),
    createdAt: entry.createdAt,
    urlHash: entry.urlHash,
    contentHash: entry.contentHash,
    value: 1,
    ...overrides
  };
}
