import { isSnapshotRoutes } from '../src/domain/routes.ts';
import { isSnapshotCid } from '../src/domain/cid.ts';
import { Predicate, Schema } from 'effect';
import type { SQLOutputValue, StatementSync } from 'node:sqlite';
import type { JournalEvent, RefreshSummary } from './types.ts';
type Listing = import('./types.ts').Listing;
type Rating = import('./types.ts').Rating;
type SafeDetails = Record<string, unknown> & {
  accepted?: number;
  rejected?: number;
  reasons?: Record<string, number>;
};
type StoredJournal = {
  id: string;
  createdAt: number;
  sequence: number;
  action: string;
  kind: string;
  outcome: string;
  startedAt: number;
  durationMs: number;
  details: SafeDetails;
};
type StoredRefresh = SafeDetails & {
  checkedAt: number;
  outcome?: string;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
};
type TableRecords = {
  directory: Listing;
  ratings: Rating;
  journal: StoredJournal;
};
type HourBin = {
  hour: number;
  runs: number;
  failures: number;
  accepted: number;
  rejected: number;
};
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeUrl } from '../src/domain/url.ts';
import { hashUrl } from '../src/domain/article.ts';
import { DISCOVERY_WINDOW_MS } from '../src/directory/nostr.ts';
const byteSize: (value: unknown) => number = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;
const TrendSchema = Schema.Struct({
  startedAt: Schema.Number,
  finishedAt: Schema.Number,
  runs: Schema.Number,
  failures: Schema.Number,
  accepted: Schema.Number,
  rejected: Schema.Number
});
const JOURNAL_TTL: number = 7 * 86400000;
const HASH: RegExp = /^[a-f0-9]{64}$/;
const counts: Set<string> = new Set([
  'received',
  'accepted',
  'rejected',
  'duplicates',
  'entries',
  'articles',
  'votes',
  'indexed',
  'discovered',
  'bytes',
  'count',
  'expired',
  'evicted',
  'queries',
  'relaysSucceeded',
  'relaysFailed'
]);
const codes: Set<string> = new Set([
  'invalid',
  'signature',
  'shape',
  'expired',
  'target',
  'network',
  'timeout',
  'storage',
  'unknown'
]);
function details(input: unknown = {}) {
  const value: Record<string, unknown> = input as Record<string, unknown>;
  const output: SafeDetails = {};
  for (const key of counts) {
    const count: unknown = value[key];
    if (Predicate.isNumber(count) && Number.isSafeInteger(count) && count >= 0)
      output[key] = count;
  }
  for (const key of ['error', 'reason']) {
    const code: unknown = value[key];
    if (typeof code === 'string')
      output[key] = codes.has(code) ? code : 'unknown';
  }
  if (value.reasons && typeof value.reasons === 'object') {
    const reasons: Record<string, unknown> = value.reasons as Record<
      string,
      unknown
    >;
    output.reasons = {};
    for (const code of codes) {
      const count: unknown = reasons[code];
      if (
        Predicate.isNumber(count) &&
        Number.isSafeInteger(count) &&
        count >= 0
      )
        output.reasons[code] = count;
    }
  }
  return output;
}
function bounded<T>(records: T[], maxRecords: number, maxBytes: number) {
  let bytes: number = 0;
  return records.filter((record: T, index: number) => {
    const size: number = byteSize(record);
    if (index >= maxRecords || bytes + size > maxBytes) return false;
    bytes += size;
    return true;
  });
}
export class AggregatorStore {
  path: string;
  now: () => number;
  maxArticles: number;
  maxEvents: number;
  maxBytes: number;
  maxVotes: number;
  maxVoteBytes: number;
  db: DatabaseSync;
  constructor({
    path = ':memory:',
    now = () => Date.now(),
    maxArticles = 1000,
    maxEvents = 500,
    maxBytes = 2 * 1024 * 1024,
    maxVotes = 5000,
    maxVoteBytes = 4 * 1024 * 1024
  }: {
    path?: string | undefined;
    now?: (() => number) | undefined;
    maxArticles?: number | undefined;
    maxEvents?: number | undefined;
    maxBytes?: number | undefined;
    maxVotes?: number | undefined;
    maxVoteBytes?: number | undefined;
  } = {}) {
    if (
      ![maxArticles, maxEvents, maxBytes, maxVotes, maxVoteBytes].every(
        (value: number) => Number.isSafeInteger(value) && value > 0
      )
    )
      throw new Error('Aggregator limits must be positive integers.');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.path = path;
    this.now = now;
    this.maxArticles = maxArticles;
    this.maxEvents = maxEvents;
    this.maxBytes = maxBytes;
    this.maxVotes = maxVotes;
    this.maxVoteBytes = maxVoteBytes;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS directory (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ratings (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS journal (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, sequence INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS index_refresh (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observation_hours (hour INTEGER PRIMARY KEY, runs INTEGER NOT NULL, failures INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL);`);
  }
  transaction<T>(operation: () => T) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result: T = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error: unknown) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  records<K extends keyof TableRecords>(table: K) {
    return this.db
      .prepare(
        `SELECT data FROM ${table} ORDER BY createdAt DESC, ${table === 'journal' ? 'sequence DESC' : 'id ASC'}`
      )
      .all()
      .map((row: Record<string, SQLOutputValue>) => {
        if (typeof row.data !== 'string')
          throw new Error('Stored metadata is invalid.');
        return JSON.parse(row.data) as TableRecords[K];
      });
  }
  prune(
    table: keyof TableRecords,
    ttl: number,
    maxRecords: number,
    maxBytes: number
  ) {
    this.db
      .prepare(`DELETE FROM ${table} WHERE createdAt < ?`)
      .run(this.now() - ttl);
    const records = this.records(table);
    const eligible = table === 'directory' ? records.filter(record => Predicate.hasProperty(record,'cid') && isSnapshotCid(record.cid) && Predicate.hasProperty(record,'routes') && isSnapshotRoutes(record.routes)) : records;
    const keep = new Set(bounded(eligible,maxRecords,maxBytes).map(record => record.id));
    const remove: StatementSync = this.db.prepare(
      `DELETE FROM ${table} WHERE id=?`
    );
    for (const record of records)
      if (!keep.has(record.id)) remove.run(record.id);
  }
  async commitMetadata(listings: readonly Listing[], votes: readonly Rating[]) {
    const now: number = this.now();
    const accepted: Listing[] = [];
    for (const value of listings.slice(0, 1000)) {
      try {
        if (
          ![
            value.id,
            value.pubkey,
            value.urlHash,
            value.contentHash,
            value.blobHash
          ].every((hash: string) => HASH.test(hash)) ||
          normalizeUrl(value.url) !== value.url ||
          (await hashUrl(value.url)) !== value.urlHash ||
          typeof value.title !== 'string' ||
          !value.title.trim() ||
          value.title.length > 1000 ||
          typeof value.byline !== 'string' ||
          value.byline.length > 1000 ||
          !Number.isSafeInteger(value.size) ||
          value.size < 1 ||
          value.size > 2 * 1024 * 1024 ||
          !Number.isSafeInteger(value.capturedAt) ||
          value.capturedAt < 0 ||
          value.capturedAt > now + 60000 ||
          !Number.isSafeInteger(value.createdAt) ||
          value.createdAt < now - DISCOVERY_WINDOW_MS ||
          value.createdAt > now + 60000 ||
          !isSnapshotCid(value.cid) || !isSnapshotRoutes(value.routes)
        )
          continue;
        accepted.push({
          id: value.id,
          pubkey: value.pubkey,
          url: value.url,
          urlHash: value.urlHash,
          contentHash: value.contentHash,
          blobHash: value.blobHash,
          size: value.size,
          title: value.title,
          byline: value.byline,
          capturedAt: value.capturedAt,
          createdAt: value.createdAt,
          cid: value.cid,
          routes: [...value.routes]
        });
      } catch {
        /* Reject malformed normalized metadata at the persistence boundary. */
      }
    }
    const acceptedVotes: Rating[] = votes
      .slice(0, 5000)
      .filter(
        (value) =>
          [value.id, value.pubkey, value.urlHash, value.contentHash].every(
            (hash: string) => HASH.test(hash)
          ) &&
          [1, -1].includes(value.value) &&
          Number.isSafeInteger(value.createdAt) &&
          value.createdAt >= now - DISCOVERY_WINDOW_MS &&
          value.createdAt <= now + 60000
      )
      .map(
        (value) => ({
          id: value.id,
          pubkey: value.pubkey,
          urlHash: value.urlHash,
          contentHash: value.contentHash,
          createdAt: value.createdAt,
          value: value.value
        })
      );
    return this.transaction(() => {
      const batches: [keyof TableRecords, (Listing | Rating)[]][] = [
        ['directory', accepted],
        ['ratings', acceptedVotes]
      ];
      for (const [table, records] of batches) {
        const insert: StatementSync = this.db.prepare(
          `INSERT INTO ${table} VALUES(?,?,?) ON CONFLICT(id) DO NOTHING`
        );
        for (const record of records)
          insert.run(record.id, record.createdAt, JSON.stringify(record));
      }
      this.prune(
        'directory',
        DISCOVERY_WINDOW_MS,
        this.maxArticles,
        this.maxBytes
      );
      this.prune(
        'ratings',
        DISCOVERY_WINDOW_MS,
        this.maxVotes,
        this.maxVoteBytes
      );
      return {
        articles: this.listArticles().length,
        votes: this.listVotes().length
      };
    });
  }
  listArticles() {
    this.prune(
      'directory',
      DISCOVERY_WINDOW_MS,
      this.maxArticles,
      this.maxBytes
    );
    return this.records('directory').filter(record => isSnapshotCid(record.cid) && isSnapshotRoutes(record.routes));
  }
  listVotes() {
    this.prune(
      'ratings',
      DISCOVERY_WINDOW_MS,
      this.maxVotes,
      this.maxVoteBytes
    );
    return this.records('ratings');
  }
  appendEvent(input: JournalEvent) {
    return this.transaction(() => {
      const createdAt: number = this.now(),
        sequence: number =
          Number(
            this.db
              .prepare('SELECT COALESCE(MAX(sequence),0) value FROM journal')
              .get()?.value
          ) + 1;
      const event: {
        id: `${string}-${string}-${string}-${string}-${string}`;
        createdAt: number;
        sequence: number;
        action: string;
        kind: string;
        outcome: string;
        startedAt: number;
        durationMs: number;
        details: SafeDetails;
      } = {
        id: crypto.randomUUID(),
        createdAt,
        sequence,
        action: [
          'REFRESH',
          'LISTINGS',
          'VOTES',
          'FILTER',
          'STORE',
          'STATUS'
        ].includes(input?.action)
          ? input.action
          : 'OTHER',
        kind: ['network', 'storage', 'filter', 'refresh'].includes(input?.kind)
          ? input.kind
          : 'operation',
        outcome: ['success', 'failure', 'partial'].includes(input?.outcome)
          ? input.outcome
          : 'unknown',
        startedAt:
          typeof input?.startedAt === 'number' &&
          Number.isSafeInteger(input.startedAt) &&
          input.startedAt >= 0 &&
          input.startedAt <= createdAt + 60000
            ? input.startedAt
            : createdAt,
        durationMs:
          typeof input?.durationMs === 'number' &&
          Number.isFinite(input.durationMs) &&
          input.durationMs >= 0
            ? Math.min(Math.round(input.durationMs), JOURNAL_TTL)
            : 0,
        details: details(input?.details)
      };
      this.db
        .prepare('INSERT INTO journal VALUES(?,?,?,?)')
        .run(event.id, createdAt, sequence, JSON.stringify(event));
      this.prune('journal', JOURNAL_TTL, this.maxEvents, 1024 * 1024);
      if (event.action === 'REFRESH') {
        const hour: number = Math.floor(createdAt / 3600000) * 3600000;
        this.db
          .prepare(
            `INSERT INTO observation_hours VALUES(?,1,?,?,?) ON CONFLICT(hour) DO UPDATE SET
          runs=runs+1, failures=failures+excluded.failures, accepted=accepted+excluded.accepted, rejected=rejected+excluded.rejected`
          )
          .run(
            hour,
            Number(event.outcome === 'failure'),
            event.details.accepted || 0,
            event.details.rejected || 0
          );
        this.pruneTrends();
      }
      return event;
    });
  }
  events() {
    this.prune('journal', JOURNAL_TTL, this.maxEvents, 1024 * 1024);
    return this.records('journal');
  }
  pruneTrends() {
    const firstHour: number =
      (Math.floor(this.now() / 3600000) - 167) * 3600000;
    this.db
      .prepare('DELETE FROM observation_hours WHERE hour < ?')
      .run(firstHour);
  }
  trends(): Array<{
    startedAt: number;
    finishedAt: number;
    runs: number;
    failures: number;
    accepted: number;
    rejected: number;
  }> {
    this.pruneTrends();
    const now: number = this.now(),
      end: number = (Math.floor(now / 3600000) + 1) * 3600000;
    const hours: HourBin[] = this.db
      .prepare('SELECT * FROM observation_hours ORDER BY hour ASC')
      .all() as HourBin[];
    return Array.from({ length: 7 }, (_: unknown, index: number) => {
      const startedAt: number = end - (7 - index) * 86400000,
        finishedAt: number = Math.min(now, startedAt + 86400000);
      const bins: HourBin[] = hours.filter(
        (bin: HourBin) =>
          bin.hour >= startedAt && bin.hour < startedAt + 86400000
      );
      return Schema.decodeUnknownSync(TrendSchema)({
        startedAt,
        finishedAt,
        ...Object.fromEntries(
          (
            ['runs', 'failures', 'accepted', 'rejected'] as Array<
              'runs' | 'failures' | 'accepted' | 'rejected'
            >
          ).map((key: 'accepted' | 'rejected' | 'runs' | 'failures') => [
            key,
            bins.reduce((sum: number, bin: HourBin) => sum + bin[key], 0)
          ])
        )
      });
    });
  }
  stats() {
    this.pruneTrends();
    const stats: (
      records: unknown[],
      maxRecords: number,
      maxBytes: number,
      ttlMs: number
    ) => {
      count: number;
      bytes: number;
      maxRecords: number;
      maxBytes: number;
      ttlMs: number;
      evictionPolicy: string;
    } = (
      records: unknown[],
      maxRecords: number,
      maxBytes: number,
      ttlMs: number
    ) => ({
      count: records.length,
      bytes: records.reduce(
        (sum: number, record: unknown) => sum + byteSize(record),
        0
      ),
      maxRecords,
      maxBytes,
      ttlMs,
      evictionPolicy: 'oldest first'
    });
    return {
      catalog: stats(
        this.listArticles(),
        this.maxArticles,
        this.maxBytes,
        DISCOVERY_WINDOW_MS
      ),
      ratings: stats(
        this.listVotes(),
        this.maxVotes,
        this.maxVoteBytes,
        DISCOVERY_WINDOW_MS
      ),
      journal: stats(this.events(), this.maxEvents, 1024 * 1024, JOURNAL_TTL),
      trends: stats(
        this.db
          .prepare('SELECT * FROM observation_hours ORDER BY hour ASC')
          .all(),
        168,
        32 * 1024,
        JOURNAL_TTL
      ),
      dbBytes: this.path === ':memory:' ? null : statSync(this.path).size
    };
  }
  saveRefresh(
    value:
      | RefreshSummary
      | (Record<string, unknown> & {
          outcome?: string | undefined;
          durationMs?: number | undefined;
        })
  ) {
    const safe: StoredRefresh = { ...details(value), checkedAt: this.now() };
    if (
      typeof value.outcome === 'string' &&
      ['success', 'failure'].includes(value.outcome)
    )
      safe.outcome = value.outcome;
    for (const key of ['startedAt', 'finishedAt'] as Array<
      'startedAt' | 'finishedAt'
    >) {
      const time: unknown = value[key];
      if (
        typeof time === 'number' &&
        Number.isSafeInteger(time) &&
        time >= 0 &&
        time <= this.now() + 60000
      )
        safe[key] = time;
    }
    if (
      typeof value.durationMs === 'number' &&
      Number.isFinite(value.durationMs) &&
      value.durationMs >= 0
    )
      safe.durationMs = Math.min(Math.round(value.durationMs), JOURNAL_TTL);
    this.db
      .prepare(
        'INSERT INTO index_refresh VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data'
      )
      .run(JSON.stringify(safe));
    return safe;
  }
  lastRefresh() {
    const row: Record<string, SQLOutputValue> | undefined = this.db
      .prepare('SELECT data FROM index_refresh WHERE id=1')
      .get();
    if (!row) return null;
    if (typeof row.data !== 'string')
      throw new Error('Stored refresh is invalid.');
    return JSON.parse(row.data) as StoredRefresh;
  }
  close() {
    this.db.close();
  }
}
