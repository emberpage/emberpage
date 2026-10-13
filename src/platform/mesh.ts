import { Effect, Schema } from 'effect';
import { decodeArticle, MAX_ARTICLE_BYTES } from '../domain/article.ts';
import { BoundaryError } from '../domain/errors.ts';
import type { ArticleCopy, IpfsMirror, Listing } from '../domain/types.ts';
import { ensureOffscreen } from './offscreen-document.ts';
import { SnapshotRoutes } from '../domain/routes.ts';
import { MAX_IPFS_DAG_OVERHEAD } from '../domain/cid.ts';

const io = <A>(operation: () => PromiseLike<A>) =>
  Effect.tryPromise({try: operation, catch: cause => BoundaryError.from(cause)});
const Reply = Schema.Union([
  Schema.Struct({ok: Schema.Literal(true), data: Schema.Unknown}),
  Schema.Struct({ok: Schema.Literal(false), error: Schema.String}),
]);
const mirrorReply = Schema.Struct({cid: Schema.String, uri: Schema.String, size: Schema.Int,
  routes: SnapshotRoutes});
const file = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});

/** Chrome JSON messaging stays outside the article transport. */
export class BrowserMeshClient {
  readonly #request = Effect.fn('Mesh.request')(function* (
    action: string, fields: Record<string, unknown> = {},
  ) {
    if ((action === 'PIN' || action === 'READ') && navigator.onLine === false)
      return yield* BoundaryError.from(new Error('You are offline. Your saved copy is safe; try again when connected.'));
    yield* ensureOffscreen();
    const requestId = crypto.randomUUID();
    const raw: unknown = yield* Effect.tryPromise({
      try: async signal => {
        const cancel = () => {
          chrome.runtime.sendMessage({target: 'mesh', action: 'CANCEL', requestId}).catch(() => {});
        };
        signal.addEventListener('abort', cancel, {once: true});
        try {
          return await chrome.runtime.sendMessage({target: 'mesh', action, requestId, ...fields}) as unknown;
        } finally {signal.removeEventListener('abort', cancel);}
      },
      catch: cause => BoundaryError.from(cause),
    });
    const reply = yield* Schema.decodeUnknownEffect(Reply)(raw).pipe(Effect.mapError(cause => BoundaryError.from(cause)));
    if (!reply.ok) return yield* BoundaryError.from(new Error(reply.error));
    return reply.data;
  });

  readonly mirrorEffect = Effect.fn('Mesh.pin')(function* (this: BrowserMeshClient, copy: ArticleCopy): Effect.fn.Return<IpfsMirror, BoundaryError> {
    const text = yield* Effect.try({try: () => file.decode(copy.bytes), catch: cause => BoundaryError.from(cause)});
    const reply = yield* this.#request('PIN', {file: text});
    const mirror = yield* Schema.decodeUnknownEffect(mirrorReply)(reply).pipe(Effect.mapError(cause => BoundaryError.from(cause)));
    return {...mirror, routes: [...mirror.routes]};
  });

  readonly readEffect = Effect.fn('Mesh.read')(function* (
    this: BrowserMeshClient, listing: Listing,
    {budget, routes}: {budget?: {remainingBytes: number}; routes?: readonly string[]} = {},
  ): Effect.fn.Return<ArticleCopy, BoundaryError> {
    if (!Number.isSafeInteger(listing.size) || listing.size < 1 || listing.size > MAX_ARTICLE_BYTES)
      return yield* BoundaryError.from(new Error('Invalid snapshot size.'));
    // Reserve file and bounded DAG overhead before concurrent IPC, including failed reads.
    const maximumBytes = listing.size + MAX_IPFS_DAG_OVERHEAD;
    if (budget) {
      if (!Number.isSafeInteger(budget.remainingBytes) || budget.remainingBytes < maximumBytes) return yield* BoundaryError.from(new Error('The article search reached its download limit.'));
      budget.remainingBytes -= maximumBytes;
    }
    const reply = yield* this.#request('READ', {listing, ...(routes ? {routes} : {})});
    const text = yield* Schema.decodeUnknownEffect(Schema.String.check(Schema.isMaxLength(MAX_ARTICLE_BYTES)))(reply)
      .pipe(Effect.mapError(cause => BoundaryError.from(cause)));
    return yield* io(() => decodeArticle(new TextEncoder().encode(text), {expected: listing}));
  });

  readonly pauseEffect = Effect.fn('Mesh.pause')(function* (this: BrowserMeshClient) {
    yield* this.#request('PAUSE');
  });
  readonly forgetEffect = Effect.fn('Mesh.forget')(function* (this: BrowserMeshClient, blobHash: string) {
    yield* this.#request('FORGET', {blobHash});
  });
  readonly clearEffect = Effect.fn('Mesh.clear')(function* (this: BrowserMeshClient) {
    yield* this.#request('CLEAR');
  });
}
