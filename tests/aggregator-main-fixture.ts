import { Effect } from 'effect';
// Local-only child-process fixture: never constructs a relay socket.
import { NostrDirectory } from "../src/network/nostr.ts";
NostrDirectory.prototype.queryListings = async function (signal) {
  process.send?.({ queryStarted: true });
  return Effect.runPromise(Effect.callback<never,Error>(resume => {
    if(!signal) {resume(Effect.fail(new Error('Missing fixture abort signal')));return;}
    const abort=()=>{process.send?.({queryAborted:true});resume(Effect.fail(new Error('Fixture query interrupted')));};
    signal.addEventListener('abort',abort,{once:true});
    return Effect.sync(()=>signal.removeEventListener('abort',abort));
  }));

};
NostrDirectory.prototype.queryVotes = function () {
  return Promise.reject(new Error("Votes must not start after fixture interruption"));
};
await import("../aggregator/main.ts");
