import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeUrl } from '../src/core/url.js';
import { hashUrl } from '../src/core/article.js';
import { PROVIDER, DISCOVERY_WINDOW_MS } from '../src/network/nostr.js';

const byteSize = value => new TextEncoder().encode(JSON.stringify(value)).length;
const JOURNAL_TTL = 7 * 86400_000;
const HASH = /^[a-f0-9]{64}$/;
const counts = new Set(['received','accepted','rejected','duplicates','entries','articles','votes','indexed','discovered','bytes','count','expired','evicted','queries']);
const codes = new Set(['invalid','signature','shape','expired','target','network','timeout','storage','unknown']);
function details(input = {}) {
  const output = {};
  for (const key of counts) if (Number.isSafeInteger(input[key]) && input[key] >= 0) output[key] = input[key];
  for (const key of ['error','reason']) if (typeof input[key] === 'string') output[key] = codes.has(input[key]) ? input[key] : 'unknown';
  if (input.reasons && typeof input.reasons === 'object') {
    output.reasons = {};
    for (const code of codes) if (Number.isSafeInteger(input.reasons[code]) && input.reasons[code] >= 0) output.reasons[code] = input.reasons[code];
  }
  return output;
}
function bounded(records, maxRecords, maxBytes) {
  let bytes = 0;
  return records.filter((record, index) => { const size = byteSize(record); if (index >= maxRecords || bytes + size > maxBytes) return false; bytes += size; return true; });
}

/** Public metadata only. No file bytes, article HTML, keys, or arbitrary relay content. */
export class AggregatorStore {
  constructor({ path = ':memory:', now = () => Date.now(), maxArticles = 1000, maxEvents = 500, maxBytes = 2 * 1024 * 1024, maxVotes = 5000, maxVoteBytes = 4 * 1024 * 1024 } = {}) {
    if (![maxArticles,maxEvents,maxBytes,maxVotes,maxVoteBytes].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Aggregator limits must be positive integers.');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    Object.assign(this, { path, now, maxArticles, maxEvents, maxBytes, maxVotes, maxVoteBytes });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS directory (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ratings (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS journal (id TEXT PRIMARY KEY, createdAt INTEGER NOT NULL, sequence INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS index_refresh (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observation_hours (hour INTEGER PRIMARY KEY, runs INTEGER NOT NULL, failures INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL);`);
  }
  transaction(operation) { this.db.exec('BEGIN IMMEDIATE'); try { const result = operation(); this.db.exec('COMMIT'); return result; } catch (error) { this.db.exec('ROLLBACK'); throw error; } }
  records(table) { return this.db.prepare(`SELECT data FROM ${table} ORDER BY createdAt DESC, ${table === 'journal' ? 'sequence DESC' : 'id ASC'}`).all().map(row => JSON.parse(row.data)); }
  prune(table, ttl, maxRecords, maxBytes) {
    this.db.prepare(`DELETE FROM ${table} WHERE createdAt < ?`).run(this.now() - ttl);
    const records = this.records(table), keep = new Set(bounded(records, maxRecords, maxBytes).map(record => record.id));
    const remove = this.db.prepare(`DELETE FROM ${table} WHERE id=?`);
    for (const record of records) if (!keep.has(record.id)) remove.run(record.id);
  }
  async commitMetadata(listings, votes) {
    const now = this.now(), accepted = [];
    for (const value of listings.slice(0, 1000)) {
      try {
        if (![value.id,value.pubkey,value.urlHash,value.contentHash,value.blobHash].every(hash => HASH.test(hash))
          || normalizeUrl(value.url) !== value.url || await hashUrl(value.url) !== value.urlHash
          || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 1000
          || typeof value.byline !== 'string' || value.byline.length > 1000
          || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > 2 * 1024 * 1024
          || !Number.isSafeInteger(value.capturedAt) || value.capturedAt < 0 || value.capturedAt > now + 60_000
          || !Number.isSafeInteger(value.createdAt) || value.createdAt < now - DISCOVERY_WINDOW_MS || value.createdAt > now + 60_000 || value.provider !== PROVIDER) continue;
        accepted.push(Object.fromEntries(['id','pubkey','url','urlHash','contentHash','blobHash','size','title','byline','capturedAt','createdAt','provider'].map(key => [key,value[key]])));
      } catch { /* Reject malformed normalized metadata at the persistence boundary. */ }
    }
    const acceptedVotes = votes.slice(0, 5000).filter(value => [value.id,value.pubkey,value.urlHash,value.contentHash].every(hash => HASH.test(hash))
      && [1,-1].includes(value.value) && Number.isSafeInteger(value.createdAt) && value.createdAt >= now - DISCOVERY_WINDOW_MS && value.createdAt <= now + 60_000)
      .map(value => Object.fromEntries(['id','pubkey','urlHash','contentHash','createdAt','value'].map(key => [key,value[key]])));
    return this.transaction(() => {
      for (const [table, records] of [['directory',accepted],['ratings',acceptedVotes]]) {
        const insert = this.db.prepare(`INSERT INTO ${table} VALUES(?,?,?) ON CONFLICT(id) DO NOTHING`);
        for (const record of records) insert.run(record.id, record.createdAt, JSON.stringify(record));
      }
      this.prune('directory', DISCOVERY_WINDOW_MS, this.maxArticles, this.maxBytes);
      this.prune('ratings', DISCOVERY_WINDOW_MS, this.maxVotes, this.maxVoteBytes);
      return { articles: this.listArticles().length, votes: this.listVotes().length };
    });
  }
  listArticles() { this.prune('directory', DISCOVERY_WINDOW_MS, this.maxArticles, this.maxBytes); return this.records('directory'); }
  listVotes() { this.prune('ratings', DISCOVERY_WINDOW_MS, this.maxVotes, this.maxVoteBytes); return this.records('ratings'); }
  appendEvent(input) {
    return this.transaction(() => {
      const createdAt = this.now(), sequence = Number(this.db.prepare('SELECT COALESCE(MAX(sequence),0) value FROM journal').get().value) + 1;
      const event = { id: crypto.randomUUID(), createdAt, sequence,
        action: ['REFRESH','LISTINGS','VOTES','FILTER','STORE','STATUS'].includes(input?.action) ? input.action : 'OTHER',
        kind: ['network','storage','filter','refresh'].includes(input?.kind) ? input.kind : 'operation',
        outcome: ['success','failure','partial'].includes(input?.outcome) ? input.outcome : 'unknown',
        startedAt: Number.isSafeInteger(input?.startedAt) && input.startedAt >= 0 && input.startedAt <= createdAt + 60_000 ? input.startedAt : createdAt,
        durationMs: Number.isFinite(input?.durationMs) && input.durationMs >= 0 ? Math.min(Math.round(input.durationMs), JOURNAL_TTL) : 0,
        details: details(input?.details) };
      this.db.prepare('INSERT INTO journal VALUES(?,?,?,?)').run(event.id, createdAt, sequence, JSON.stringify(event));
      this.prune('journal', JOURNAL_TTL, this.maxEvents, 1024 * 1024);
      if (event.action === 'REFRESH') {
        const hour = Math.floor(createdAt / 3600_000) * 3600_000;
        this.db.prepare(`INSERT INTO observation_hours VALUES(?,1,?,?,?) ON CONFLICT(hour) DO UPDATE SET
          runs=runs+1, failures=failures+excluded.failures, accepted=accepted+excluded.accepted, rejected=rejected+excluded.rejected`)
          .run(hour,Number(event.outcome === 'failure'),event.details.accepted || 0,event.details.rejected || 0);
        this.pruneTrends();
      }
      return event;
    });
  }
  events() { this.prune('journal', JOURNAL_TTL, this.maxEvents, 1024 * 1024); return this.db.prepare('SELECT data FROM journal ORDER BY createdAt DESC,sequence DESC').all().map(row => JSON.parse(row.data)); }
  pruneTrends() {
    const firstHour = (Math.floor(this.now() / 3600_000) - 167) * 3600_000;
    this.db.prepare('DELETE FROM observation_hours WHERE hour < ?').run(firstHour);
  }
  trends() {
    this.pruneTrends();
    const now = this.now(), end = (Math.floor(now / 3600_000) + 1) * 3600_000;
    const hours = this.db.prepare('SELECT * FROM observation_hours ORDER BY hour ASC').all();
    return Array.from({length:7}, (_,index) => {
      const startedAt = end - (7 - index) * 86400_000, finishedAt = Math.min(now,startedAt + 86400_000);
      const bins = hours.filter(bin => bin.hour >= startedAt && bin.hour < startedAt + 86400_000);
      return {startedAt,finishedAt,...Object.fromEntries(['runs','failures','accepted','rejected'].map(key => [key,bins.reduce((sum,bin)=>sum+bin[key],0)]))};
    });
  }
  stats() {
    this.pruneTrends();
    const stats = (records,maxRecords,maxBytes,ttlMs) => ({ count:records.length,bytes:records.reduce((sum,record)=>sum+byteSize(record),0),maxRecords,maxBytes,ttlMs,evictionPolicy:'oldest first' });
    return { catalog:stats(this.listArticles(),this.maxArticles,this.maxBytes,DISCOVERY_WINDOW_MS),ratings:stats(this.listVotes(),this.maxVotes,this.maxVoteBytes,DISCOVERY_WINDOW_MS),journal:stats(this.events(),this.maxEvents,1024*1024,JOURNAL_TTL),trends:stats(this.db.prepare('SELECT * FROM observation_hours ORDER BY hour ASC').all(),168,32*1024,JOURNAL_TTL),dbBytes:this.path === ':memory:' ? null : statSync(this.path).size };
  }
  saveRefresh(value) {
    const safe = {...details(value),checkedAt:this.now()};
    if (['success','failure'].includes(value.outcome)) safe.outcome=value.outcome;
    for (const key of ['startedAt','finishedAt']) if (Number.isSafeInteger(value[key]) && value[key]>=0 && value[key]<=this.now()+60_000) safe[key]=value[key];
    if (Number.isFinite(value.durationMs) && value.durationMs>=0) safe.durationMs=Math.min(Math.round(value.durationMs),JOURNAL_TTL);
    this.db.prepare('INSERT INTO index_refresh VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify(safe));return safe;
  }
  lastRefresh() { const row=this.db.prepare('SELECT data FROM index_refresh WHERE id=1').get(); return row?JSON.parse(row.data):null; }
  close() { this.db.close(); }
}
