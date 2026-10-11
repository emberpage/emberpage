// Local-only child-process fixture: never constructs a relay socket.
import { NostrDirectory } from "../src/network/nostr.js";
NostrDirectory.prototype.queryListings = async function (signal) {
  process.send?.({ queryStarted: true });
  return new Promise((resolve, reject) =>
    signal.addEventListener(
      "abort",
      () => {
        process.send?.({ queryAborted: true });
        reject(new Error("Fixture query interrupted"));
      },
      { once: true },
    ),
  );
};
NostrDirectory.prototype.queryVotes = async function () {
  throw new Error("Votes must not start after fixture interruption");
};
await import("../aggregator/main.ts");
