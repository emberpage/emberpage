import { Effect } from 'effect';
import { BoundaryError } from '../domain/errors.ts';

let creating: Promise<void> | undefined;

/** One document owns both inert HTML inspection and explicit WebRTC sessions. */
export const ensureOffscreen = Effect.fn('Offscreen.ensure')(function* () {
  return yield* Effect.tryPromise({
    try: async () => {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen.html')],
      });
      if (creating) {await creating; return;}
      if (contexts.length) return;
      creating ??= chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER', 'WEB_RTC'],
        justification: 'Inspect saved articles and connect browser peers after explicit article sharing or lookup.',
      }).finally(() => { creating = undefined; });
      await creating;
    },
    catch: cause => BoundaryError.from(cause),
  });
});
