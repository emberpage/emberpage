import { meshRoutes } from './mesh-fixture.ts';
import { Schema } from 'effect';
import { ListingSchema } from '../aggregator/types.ts';
import type { Listing, Rating, QueryDiagnostics } from '../aggregator/types.ts';
import { hashUrl } from '../src/domain/article.ts';
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
    routes: meshRoutes(),
    cid: 'bafkreic7i2p4bhkouoidnqnh3ak6lagk3qhcef65qzdgbz735zexp4hu4m'
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

export function queryResult<A>(records: readonly A[], diagnostics: Partial<QueryDiagnostics> = {}) {
  return { records, diagnostics: { received: records.length, accepted: records.length, rejected: 0, duplicates: 0, ...diagnostics } };
}
