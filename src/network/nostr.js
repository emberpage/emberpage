import { verifyEvent } from 'nostr-tools/pure';
import { normalizeUrl } from '../core/url.js';
import { hashUrl, MAX_ARTICLE_BYTES } from '../core/article.js';

export const RELAY = 'wss://relay.primal.net';
export const PROVIDER = 'https://blossom.primal.net';
export const LISTING_KIND = 8965;
export const RATING_KIND = 8966;
// Ember Page uses its own discovery namespace.
export const LISTING_TAG = 'emberpage-v1-listing';
export const RATING_TAG = 'emberpage-v1-rating';
export const METADATA_BYTES = 8192;
export const DISCOVERY_WINDOW_MS = 30 * 86400_000;
const HASH = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();

function signedContent(event, kind, namespace, now) {
  if (!event || encoder.encode(JSON.stringify(event)).length > METADATA_BYTES
    || event.kind !== kind || !HASH.test(event.id) || !HASH.test(event.pubkey)
    || !/^[a-f0-9]{128}$/.test(event.sig) || !Number.isSafeInteger(event.created_at)
    || event.created_at < 0 || event.created_at * 1000 > now + 60_000
    || event.created_at * 1000 < now - DISCOVERY_WINDOW_MS
    || typeof event.content !== 'string' || !Array.isArray(event.tags)
    || event.tags.length > 32 || event.tags.some(tag => !Array.isArray(tag) || tag.length > 8
      || !tag.length || tag.some(field => typeof field !== 'string' || field.length > 8192))) return null;
  // The library caches verification on objects. Verify a fresh projection of wire fields.
  const wire = { id: event.id, pubkey: event.pubkey, created_at: event.created_at,
    kind: event.kind, tags: event.tags, content: event.content, sig: event.sig };
  if (!verifyEvent(wire)) return null;
  const tags = {};
  for (const name of ['t', 'u', 'x']) {
    const found = event.tags.filter(tag => tag[0] === name);
    if (found.length !== 1 || found[0].length !== 2) return null;
    tags[name] = found[0][1];
  }
  if (tags.t !== namespace || !HASH.test(tags.u) || !HASH.test(tags.x)) return null;
  const content = JSON.parse(event.content);
  if (!content || Array.isArray(content) || typeof content !== 'object' || content.version !== 1
    || content.urlHash !== tags.u || content.contentHash !== tags.x) return null;
  return content;
}

export async function validateListingEvent(event, { now = Date.now() } = {}) {
  try {
    const value = signedContent(event, LISTING_KIND, LISTING_TAG, now);
    if (!value || typeof value.url !== 'string' || value.url.length > 4096 || normalizeUrl(value.url) !== value.url
      || await hashUrl(value.url) !== value.urlHash || !HASH.test(value.blobHash)
      || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_ARTICLE_BYTES
      || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 500
      || typeof value.byline !== 'string' || value.byline.length > 500
      || !Number.isSafeInteger(value.capturedAt) || value.capturedAt < 0 || value.capturedAt > now + 60_000
      || value.provider !== PROVIDER) return null;
    return { id: event.id, pubkey: event.pubkey, createdAt: event.created_at * 1000,
      url: value.url, urlHash: value.urlHash, contentHash: value.contentHash, blobHash: value.blobHash,
      size: value.size, title: value.title, byline: value.byline, capturedAt: value.capturedAt, provider: PROVIDER };
  } catch { return null; }
}

export function validateVoteEvent(event, { now = Date.now() } = {}) {
  try {
    const value = signedContent(event, RATING_KIND, RATING_TAG, now);
    if (!value || ![1, -1].includes(value.value)) return null;
    return { id: event.id, pubkey: event.pubkey, createdAt: event.created_at * 1000,
      urlHash: value.urlHash, contentHash: value.contentHash, value: value.value };
  } catch { return null; }
}

/** Bounded, one-shot Nostr operations. This module needs no Chrome or signing key for reads. */
export class NostrDirectory {
  /** @param {{ WebSocket?: typeof globalThis.WebSocket | typeof import('ws').WebSocket, now?: () => number, timeoutMs?: number }} options */
  constructor({ WebSocket = globalThis.WebSocket, now = () => Date.now(), timeoutMs = 12_000 } = {}) {
    this.WebSocket = WebSocket; this.now = now; this.timeoutMs = timeoutMs; this.lastQuery = null;
  }
  /** @param {{ eventId?: string, limit?: number, signal?: AbortSignal }} options */
  exchange(message, { eventId, limit = 1, signal } = {}) {
    return new Promise((resolve, reject) => {
      let socket, settled = false, inspected = 0;
      const events = [];
      const finish = (error, result) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        try {
          if (socket?.readyState === 1 && message[0] === 'REQ') socket.send(JSON.stringify(['CLOSE', message[1]]));
          socket?.close();
        } catch { /* Completion is final even if a closing socket refuses CLOSE. */ }
        if (error) reject(error); else resolve(result);
      };
      const timer = setTimeout(() => finish(new Error('The article directory took too long to respond. Try again.')), this.timeoutMs);
      const abort = () => finish(new Error('The article directory request was canceled.'));
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      try { socket = new this.WebSocket(RELAY); }
      catch { finish(new Error('Could not connect to the article directory. Check your connection and try again.')); return; }
      socket.onopen = () => {
        try { socket.send(JSON.stringify(message)); }
        catch { finish(new Error('Could not send the request to the article directory. Try again.')); }
      };
      socket.onerror = () => finish(new Error('The connection to the article directory failed. Try again.'));
      socket.onclose = () => finish(new Error('The article directory disconnected before finishing. Try again.'));
      socket.onmessage = ({ data }) => {
        if (settled) return;
        inspected++;
        if (inspected > limit + 32) { finish(new Error('The article directory sent too much data. The request was stopped.')); return; }
        try {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          if (encoder.encode(text).length > METADATA_BYTES + 256) return;
          const frame = JSON.parse(text);
          if (eventId && frame[0] === 'OK' && frame[1] === eventId) {
            finish(frame[2] === true ? null : new Error(`The article directory rejected this update: ${String(frame[3] || 'no reason').slice(0, 500)}`), { accepted: true });
          } else if (!eventId && frame[1] === message[1]) {
            if (frame[0] === 'EVENT') {
              if (encoder.encode(JSON.stringify(frame[2])).length <= METADATA_BYTES) events.push(frame[2]);
              if (events.length >= limit) finish(null, events);
            } else if (frame[0] === 'EOSE') finish(null, events);
            else if (frame[0] === 'CLOSED') finish(new Error(`The article directory refused this request: ${String(frame[2] || 'no reason').slice(0, 500)}`));
          }
        } catch { /* Ignore malformed remote frames within the response/time budget. */ }
      };
    });
  }
  /** @param {AbortSignal} [signal] */
  publish(event, signal = undefined) {
    if (encoder.encode(JSON.stringify(['EVENT', event])).length > METADATA_BYTES) throw new Error('The article listing is too large to share.');
    return this.exchange(['EVENT', event], { eventId: event.id, signal });
  }
  /** @param {AbortSignal} [signal] */
  async queryListings(signal = undefined) {
    const now = this.now();
    const events = await this.exchange(['REQ', crypto.randomUUID(), { kinds: [LISTING_KIND], '#t': [LISTING_TAG],
      since: Math.floor((now - DISCOVERY_WINDOW_MS) / 1000), until: Math.floor((now + 60_000) / 1000), limit: 100 }], { limit: 100, signal });
    const records = new Map();
    const diagnostics = { action: 'listings', received: events.length, accepted: 0, rejected: 0, duplicates: 0, reasons: { invalid: 0 } };
    for (const event of events) {
      const listing = await validateListingEvent(event, { now });
      if (!listing) { diagnostics.rejected++; diagnostics.reasons.invalid++; }
      else if (records.has(listing.id)) diagnostics.duplicates++;
      else { records.set(listing.id, listing); diagnostics.accepted++; }
    }
    this.lastQuery = { ...diagnostics, observedAt: this.now() };
    return [...records.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)).slice(0, 100);
  }
  /** @param {AbortSignal} [signal] */
  async queryVotes(targets, signal = undefined) {
    if (!Array.isArray(targets) || targets.length > 100 || targets.some(target => !HASH.test(target?.urlHash) || !HASH.test(target?.contentHash))) throw new Error('Invalid rating targets.');
    if (!targets.length) return [];
    const now = this.now();
    const wanted = new Set(targets.map(target => `${target.urlHash}:${target.contentHash}`));
    const events = await this.exchange(['REQ', crypto.randomUUID(), { kinds: [RATING_KIND], '#t': [RATING_TAG],
      '#u': [...new Set(targets.map(target => target.urlHash))], '#x': [...new Set(targets.map(target => target.contentHash))],
      since: Math.floor((now - DISCOVERY_WINDOW_MS) / 1000), until: Math.floor((now + 60_000) / 1000), limit: 5000 }], { limit: 5000, signal });
    const records = new Map();
    const diagnostics = { action: 'ratings', received: events.length, accepted: 0, rejected: 0, duplicates: 0, reasons: { invalid: 0, target: 0 } };
    for (const event of events) {
      const vote = validateVoteEvent(event, { now });
      if (!vote) { diagnostics.rejected++; diagnostics.reasons.invalid++; }
      else if (!wanted.has(`${vote.urlHash}:${vote.contentHash}`)) { diagnostics.rejected++; diagnostics.reasons.target++; }
      else if (records.has(vote.id)) diagnostics.duplicates++;
      else { records.set(vote.id, vote); diagnostics.accepted++; }
    }
    this.lastQuery = { ...diagnostics, observedAt: this.now() };
    return [...records.values()];
  }
}
