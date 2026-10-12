import { BoundaryError } from '../src/domain/errors.ts';
import { Effect } from 'effect';
// Local-only child-process fixture: never constructs a relay socket.
import { NostrDirectory } from '../src/directory/nostr.ts';
NostrDirectory.prototype.queryListings = async function (signal) {
  process.send?.({ queryStarted: true });
  return Effect.runPromise(
    Effect.callback<never, BoundaryError>((resume) => {
      if (!signal) {
        resume(
          Effect.fail(
            BoundaryError.from(new Error('Missing fixture abort signal'))
          )
        );
        return;
      }
      const abort = () => {
        process.send?.({ queryAborted: true });
        resume(
          Effect.fail(
            BoundaryError.from(new Error('Fixture query interrupted'))
          )
        );
      };
      signal.addEventListener('abort', abort, { once: true });
      return Effect.sync(() => signal.removeEventListener('abort', abort));
    })
  );
};
NostrDirectory.prototype.queryVotes = function () {
  return Promise.reject(
    new Error('Votes must not start after fixture interruption')
  );
};
await import('../aggregator/main.ts');
