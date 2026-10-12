import { Effect, Schema } from 'effect';
import type { Listing, Vote, RatingTarget } from '../domain/types.ts';
import type { Event } from 'nostr-tools';
import { verifyEvent } from 'nostr-tools/pure';
import { normalizeUrl } from '../domain/url.ts';
import { hashUrl, MAX_ARTICLE_BYTES } from '../domain/article.ts';

const RELAY = 'wss://relay.primal.net';
export const PROVIDER = 'https://blossom.primal.net';
export const LISTING_KIND = 8965;
export const RATING_KIND = 8966;
// Ember Page uses its own discovery namespace.
export const LISTING_TAG = 'emberpage-v1-listing';
export const RATING_TAG = 'emberpage-v1-rating';
const METADATA_BYTES = 8192;
export const DISCOVERY_WINDOW_MS = 30 * 86400_000;
const HASH = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();






type QueryDiagnostics = {action:'listings'|'ratings';received:number;accepted:number;rejected:number;duplicates:number;reasons:{invalid:number;target?:number};observedAt?:number};
interface NostrSocket {
  readyState:number;
  send(data:string):void;
  close():void;
  onopen:((event:never)=>void)|null;
  onclose:((event:never)=>void)|null;
  onerror:((event:never)=>void)|null;
  onmessage:((event:never)=>void)|null;
}
export type NostrSocketConstructor = new (url:string) => NostrSocket;
type DirectoryOptions = {WebSocket?:NostrSocketConstructor;now?:()=>number;timeoutMs?:number};
type ExchangeOptions = {eventId?:string;limit?:number;signal?:AbortSignal};
type ExchangeResult = unknown[]|{accepted:true};
const decodeRecord = Schema.decodeUnknownSync(Schema.Record(Schema.String,Schema.Unknown));

function signedContent(event:unknown, kind:number, namespace:string, now:number) {
  if (typeof event !== 'object' || event === null || Array.isArray(event)) return null;
  const record = decodeRecord(event);
  if (encoder.encode(JSON.stringify(record)).length > METADATA_BYTES
    || record.kind !== kind || typeof record.id !== 'string' || !HASH.test(record.id)
    || typeof record.pubkey !== 'string' || !HASH.test(record.pubkey)
    || typeof record.sig !== 'string' || !/^[a-f0-9]{128}$/.test(record.sig)
    || typeof record.created_at !== 'number' || !Number.isSafeInteger(record.created_at)
    || record.created_at < 0 || record.created_at * 1000 > now + 60_000
    || record.created_at * 1000 < now - DISCOVERY_WINDOW_MS
    || typeof record.content !== 'string' || !Array.isArray(record.tags) || record.tags.length > 32) return null;
  
  const eventTags: string[][] = [];
  for (const inputTag of record.tags as unknown[]) {
    if (!Array.isArray(inputTag) || !inputTag.length || inputTag.length > 8) return null;
    
    const tag: string[] = [];
    for (const field of inputTag as unknown[]) {
      if (typeof field !== 'string' || field.length > 8192) return null;
      tag.push(field);
    }
    eventTags.push(tag);
  }
  // The library caches verification on objects. Verify a fresh projection of wire fields.
  const wire = { id: record.id, pubkey: record.pubkey, created_at: record.created_at,
    kind, tags: eventTags, content: record.content, sig: record.sig };
  if (!verifyEvent(wire)) return null;
  
  const tags: Record<string,string> = {};
  for (const name of ['t', 'u', 'x']) {
    const found = wire.tags.filter(tag => tag[0] === name);
    const first = found[0];
    if (found.length !== 1 || !first || first.length !== 2 || typeof first[1] !== 'string') return null;
    tags[name] = first[1];
  }
  if (tags.t !== namespace || typeof tags.u !== 'string' || typeof tags.x !== 'string' || !HASH.test(tags.u) || !HASH.test(tags.x)) return null;
  const parsedContent: unknown = JSON.parse(wire.content);
  if (typeof parsedContent !== 'object' || parsedContent === null || Array.isArray(parsedContent)) return null;
  const content = decodeRecord(parsedContent);
  if (content.version !== 1
    || content.urlHash !== tags.u || content.contentHash !== tags.x) return null;
  return { wire, content, urlHash:tags.u,contentHash:tags.x };
}


export async function validateListingEvent(event:unknown, { now = Date.now() }: {now?:number} = {}): Promise<Listing|null> {
  try {
    const signed = signedContent(event, LISTING_KIND, LISTING_TAG, now);
    if (!signed) return null;
    const {content:value,wire} = signed;
    if (typeof value.url !== 'string' || value.url.length > 4096 || normalizeUrl(value.url) !== value.url
      || await hashUrl(value.url) !== value.urlHash || typeof value.blobHash !== 'string' || !HASH.test(value.blobHash)
      || typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_ARTICLE_BYTES
      || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 500
      || typeof value.byline !== 'string' || value.byline.length > 500
      || typeof value.capturedAt !== 'number' || !Number.isSafeInteger(value.capturedAt) || value.capturedAt < 0 || value.capturedAt > now + 60_000
      || value.provider !== PROVIDER) return null;
    return { id: wire.id, pubkey: wire.pubkey, createdAt: wire.created_at * 1000,
      url: value.url, urlHash: signed.urlHash, contentHash: signed.contentHash, blobHash: value.blobHash,
      size: value.size, title: value.title, byline: value.byline, capturedAt: value.capturedAt, provider: PROVIDER };
  } catch { return null; }
}


export function validateVoteEvent(event:unknown, { now = Date.now() }: {now?:number} = {}): Vote|null {
  try {
    const signed = signedContent(event, RATING_KIND, RATING_TAG, now);
    if (!signed) return null;
    const {content:value,wire} = signed;
    if (typeof value.value !== 'number' || ![1, -1].includes(value.value)) return null;
    return { id: wire.id, pubkey: wire.pubkey, createdAt: wire.created_at * 1000,
      urlHash: signed.urlHash, contentHash: signed.contentHash, value: value.value };
  } catch { return null; }
}

class DirectoryError extends Error {
  
  constructor(readonly code:'timeout'|'network'|'canceled',message:string) { super(message); this.name = 'DirectoryError';  }
}

/** Bounded, one-shot Nostr operations. This module needs no Chrome or signing key for reads. */
export class NostrDirectory {
  readonly WebSocket: NostrSocketConstructor;
  readonly now:()=>number;
  readonly timeoutMs:number;
  lastQuery:QueryDiagnostics|null;
  
  constructor({ WebSocket = globalThis.WebSocket, now = () => Date.now(), timeoutMs = 12_000 }:DirectoryOptions = {}) {
    this.WebSocket = WebSocket; this.now = now; this.timeoutMs = timeoutMs;  this.lastQuery = null;
  }
  
  
  
  exchange(message:unknown[],options:ExchangeOptions & {eventId:string}):Promise<{accepted:true}>;
  exchange(message:unknown[],options?:ExchangeOptions & {eventId?:undefined}):Promise<unknown[]>;
  exchange(message:unknown[],options:ExchangeOptions = {}):Promise<ExchangeResult> {
    return Effect.runPromise(this.exchangeEffect(message,options));
  }
  exchangeEffect(message:unknown[], {eventId,limit=1,signal}:ExchangeOptions = {}) {
    return Effect.callback<ExchangeResult,DirectoryError>(resume => {
      
      let socket: NostrSocket|undefined;
      let settled = false, inspected = 0;
      
      const events: unknown[] = [];
      
      const finish = (error:DirectoryError|null, result:ExchangeResult = []) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        try {
          if (socket?.readyState === 1 && message[0] === 'REQ') socket.send(JSON.stringify(['CLOSE', message[1]]));
          socket?.close();
        } catch { /* Completion is final even if a closing socket refuses CLOSE. */ }
        resume(error ? Effect.fail(error) : Effect.succeed(result));
      };
      const timer = setTimeout(() => finish(new DirectoryError('timeout', 'The article directory took too long to respond. Try again.')), this.timeoutMs);
      const abort = () => finish(new DirectoryError('canceled', 'The article directory request was canceled.'));
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      try { socket = new this.WebSocket(RELAY); }
      catch { finish(new DirectoryError('network', 'Could not connect to the article directory. Check your connection and try again.')); return; }
      socket.onopen = () => {
        try { socket?.send(JSON.stringify(message)); }
        catch { finish(new DirectoryError('network', 'Could not send the request to the article directory. Try again.')); }
      };
      socket.onerror = () => finish(new DirectoryError('network', 'The connection to the article directory failed. Try again.'));
      socket.onclose = () => finish(new DirectoryError('network', 'The article directory disconnected before finishing. Try again.'));
      
      socket.onmessage = ({ data }: {data:unknown}) => {
        if (settled) return;
        inspected++;
        if (inspected > limit + 32) { finish(new DirectoryError('network', 'The article directory sent too much data. The request was stopped.')); return; }
        try {
          if (typeof data !== 'string' && !(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) return;
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          if (encoder.encode(text).length > METADATA_BYTES + 256) return;
          const parsedFrame: unknown = JSON.parse(text);
          if (!Array.isArray(parsedFrame)) return;
          const frame = parsedFrame as unknown[];
          if (eventId && frame[0] === 'OK' && frame[1] === eventId) {
            finish(frame[2] === true ? null : new DirectoryError('network', `The article directory rejected this update: ${typeof frame[3] === 'string' && frame[3] ? frame[3].slice(0,500) : 'no reason'}`), { accepted: true });
          } else if (!eventId && frame[1] === message[1]) {
            if (frame[0] === 'EVENT') {
              if (encoder.encode(JSON.stringify(frame[2])).length <= METADATA_BYTES) events.push(frame[2]);
              if (events.length >= limit) finish(null, events);
            } else if (frame[0] === 'EOSE') finish(null, events);
            else if (frame[0] === 'CLOSED') finish(new DirectoryError('network', `The article directory refused this request: ${typeof frame[2] === 'string' && frame[2] ? frame[2].slice(0,500) : 'no reason'}`));
          }
        } catch { /* Ignore malformed remote frames within the response/time budget. */ }
      };
      return Effect.sync(() => { settled = true; clearTimeout(timer); signal?.removeEventListener('abort',abort); try { if(socket?.readyState===1 && message[0]==='REQ') socket.send(JSON.stringify(['CLOSE',message[1]])); socket?.close(); } catch { /* Closing an already-settled socket is best effort. */ } });
    });
  }
  
  publish(event:Event, signal:AbortSignal|undefined = undefined) {
    if (encoder.encode(JSON.stringify(['EVENT', event])).length > METADATA_BYTES) throw new Error('The article listing is too large to share.');
    return this.exchange(['EVENT', event], { eventId: event.id, signal });
  }
  
  async queryListings(signal:AbortSignal|undefined = undefined):Promise<Listing[]> {
    const now = this.now();
    const events = await this.exchange(['REQ', crypto.randomUUID(), { kinds: [LISTING_KIND], '#t': [LISTING_TAG],
      since: Math.floor((now - DISCOVERY_WINDOW_MS) / 1000), until: Math.floor((now + 60_000) / 1000), limit: 100 }], { limit: 100, signal });
    
    const records = new Map<string,Listing>();
    
    const diagnostics: QueryDiagnostics = { action: 'listings', received: events.length, accepted: 0, rejected: 0, duplicates: 0, reasons: { invalid: 0 } };
    for (const event of events) {
      const listing = await validateListingEvent(event, { now });
      if (!listing) { diagnostics.rejected++; diagnostics.reasons.invalid++; }
      else if (records.has(listing.id)) diagnostics.duplicates++;
      else { records.set(listing.id, listing); diagnostics.accepted++; }
    }
    this.lastQuery = { ...diagnostics, observedAt: this.now() };
    return [...records.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)).slice(0, 100);
  }
  
  async queryVotes(targets:RatingTarget[], signal:AbortSignal|undefined = undefined):Promise<Vote[]> {
    if (!Array.isArray(targets) || targets.length > 100 || targets.some(target => !HASH.test(target?.urlHash) || !HASH.test(target?.contentHash))) throw new Error('Invalid rating targets.');
    const now = this.now();
    if (!targets.length) {
      this.lastQuery = {action:'ratings',received:0,accepted:0,rejected:0,duplicates:0,reasons:{invalid:0,target:0},observedAt:now};
      return [];
    }
    const wanted = new Set(targets.map(target => `${target.urlHash}:${target.contentHash}`));
    const events = await this.exchange(['REQ', crypto.randomUUID(), { kinds: [RATING_KIND], '#t': [RATING_TAG],
      '#u': [...new Set(targets.map(target => target.urlHash))], '#x': [...new Set(targets.map(target => target.contentHash))],
      since: Math.floor((now - DISCOVERY_WINDOW_MS) / 1000), until: Math.floor((now + 60_000) / 1000), limit: 5000 }], { limit: 5000, signal });
    
    const records = new Map<string,Vote>();
    
    const diagnostics: QueryDiagnostics = { action: 'ratings', received: events.length, accepted: 0, rejected: 0, duplicates: 0, reasons: { invalid: 0, target: 0 } };
    for (const event of events) {
      const vote = validateVoteEvent(event, { now });
      if (!vote) { diagnostics.rejected++; diagnostics.reasons.invalid++; }
      else if (!wanted.has(`${vote.urlHash}:${vote.contentHash}`)) { diagnostics.rejected++; diagnostics.reasons.target = (diagnostics.reasons.target || 0) + 1; }
      else if (records.has(vote.id)) diagnostics.duplicates++;
      else { records.set(vote.id, vote); diagnostics.accepted++; }
    }
    this.lastQuery = { ...diagnostics, observedAt: this.now() };
    return [...records.values()];
  }
}
