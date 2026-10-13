import { Effect, Predicate, Schema } from 'effect';
import { BrowserIpfs } from './transport/ipfs.ts';
import { IpfsReservations } from './storage/ipfs.ts';
import { startInspection } from './platform/offscreen.ts';
import { decodeArticle, MAX_ARTICLE_BYTES } from './domain/article.ts';
import { BoundaryError, errorMessage } from './domain/errors.ts';
import { SnapshotRoutes, ReaderRoutes } from './domain/routes.ts';
import type { Listing } from './domain/types.ts';
import { MAX_IPFS_DAG_OVERHEAD } from './domain/cid.ts';

const ListingFields = Schema.Struct({
  id: Schema.String, pubkey: Schema.String, createdAt: Schema.Int,
  url: Schema.String, title: Schema.String, byline: Schema.String, capturedAt: Schema.Int,
  urlHash: Schema.String, contentHash: Schema.String, blobHash: Schema.String,
  size: Schema.Int, cid: Schema.String, routes: SnapshotRoutes,
});
const Request = Schema.Union([
  Schema.Struct({action: Schema.Literal('PIN'), file: Schema.String.check(Schema.isMaxLength(MAX_ARTICLE_BYTES))}),
  Schema.Struct({action: Schema.Literal('READ'), listing: ListingFields, routes: Schema.optionalKey(ReaderRoutes)}),
  Schema.Struct({action: Schema.Literal('PAUSE')}),
  Schema.Struct({action: Schema.Literal('FORGET'), blobHash: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/))}),
  Schema.Struct({action: Schema.Literal('CLEAR')}),
]);
const Correlation = Schema.Struct({requestId: Schema.String.check(Schema.isPattern(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/))});
const active = new Map<string, AbortController>();
const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({try: operation, catch: cause => BoundaryError.from(cause)});

// Construction is inert. The transport starts only for an explicit command or retained contribution consent.
const mesh = new BrowserIpfs({reservations: new IpfsReservations()});
startInspection();

const handle = Effect.fn('Offscreen.mesh')(function* (input: unknown) {
  const request = yield* Schema.decodeUnknownEffect(Request)(input).pipe(Effect.mapError(cause => BoundaryError.from(cause)));
  switch (request.action) {
    case 'PIN': {
      const copy = yield* io(() => decodeArticle(new TextEncoder().encode(request.file)));
      return yield* mesh.mirrorEffect(copy);
    }
    case 'READ': {
      const listing: Listing = {...request.listing, routes: [...request.listing.routes]};
      const copy = yield* mesh.readEffect(listing, {budget: {remainingBytes: listing.size + MAX_IPFS_DAG_OVERHEAD},
        ...(request.routes ? {routes: [...request.routes]} : {})});
      return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(copy.bytes);
    }
    case 'PAUSE':
      yield* mesh.pauseEffect();
      return true;
    case 'FORGET':
      yield* mesh.forgetEffect(request.blobHash);
      return true;
    case 'CLEAR':
      yield* mesh.clearEffect();
      return true;
  }
});

chrome.runtime.onMessage.addListener((input: unknown, sender: chrome.runtime.MessageSender, respond: (reply: unknown) => void) => {
  if (!Predicate.isObject(input) || input.target !== 'mesh') return;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) {
    respond({ok: false, error: 'This action must come from Ember Page.'});
    return;
  }
  const correlation = Schema.decodeUnknownExit(Correlation)(input);
  if (correlation._tag === 'Failure') {
    respond({ok: false, error: 'Invalid mesh request.'});
    return;
  }
  const {requestId} = correlation.value;
  if (input.action === 'CANCEL') {
    active.get(requestId)?.abort();
    respond({ok: true, data: true});
    return;
  }
  if (active.has(requestId) || active.size >= 8) {
    respond({ok: false, error: 'Wait for the current mesh operation to finish.'});
    return;
  }
  const controller = new AbortController();
  active.set(requestId, controller);
  Effect.runPromise(handle(input), {signal: controller.signal}).then(
    data => respond({ok: true, data}),
    error => respond({ok: false, error: errorMessage(error)}),
  ).finally(() => {active.delete(requestId);});
  return true;
});

Effect.runPromise(mesh.resumeEffect()).catch(error => console.warn('Ember Page contribution could not resume:', errorMessage(error)));
