import { parseArgs } from "node:util";
import packageInfo from "../package.json" with { type: "json" };
import { Effect, Predicate, Schema } from "effect";
import { AggregatorStore } from "./store.js";
import { createAggregatorServer, type AggregatorServer } from "./server.ts";
import WebSocket from "ws";
import { NostrDirectory } from "../src/network/nostr.js";

class StartupError extends Schema.TaggedError<StartupError>()(
  "AggregatorStartupError",
  { message: Schema.String, cause: Schema.Defect() },
) {}
const argumentsSchema = Schema.Struct({
  port: Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.isBetween({ minimum: 1, maximum: 65535 }),
  ),
  interval: Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(30),
  ),
  database: Schema.NonEmptyString,
});
const { values } = parseArgs({
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
    port: { type: "string", short: "p", default: "4318" },
    database: {
      type: "string",
      short: "d",
      default: new URL("../.emberpage/aggregator-nostr.sqlite", import.meta.url)
        .pathname,
    },
    interval: { type: "string", short: "i", default: "60" },
  },
});
const listen = Effect.fn("Aggregator.listen")(
  (server: AggregatorServer, port: number) =>
    Effect.callback<void, StartupError>((resume) => {
      const success = () => resume(Effect.void);
      const failure = (cause: Error) =>
        resume(
          Effect.fail(
            new StartupError({
              message:
                Predicate.hasProperty(cause, "code") &&
                cause.code === "EADDRINUSE"
                  ? `Port ${port} is already in use.`
                  : "The local server could not start.",
              cause,
            }),
          ),
        );
      server.once("error", failure);
      server.listen(port, "127.0.0.1", success);
      return Effect.sync(() => {
        server.removeListener("error", failure);
      });
    }),
);
const closeServer = Effect.fn("Aggregator.closeServer")(function* (
  server: AggregatorServer,
) {
  yield* server.indexer.shutdownEffect();
  server.closeAllConnections();
  yield* Effect.callback<void>((resume) => {
    server.close(() => resume(Effect.void));
  });
});
const untilShutdown = Effect.callback<void>((resume) => {
  const stop = () => resume(Effect.void);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return Effect.sync(() => {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  });
});
const run = Effect.scoped(
  Effect.gen(function* () {
    const options = yield* Schema.decodeUnknownEffect(argumentsSchema)(
      values,
    ).pipe(
      Effect.mapError(
        (cause) =>
          new StartupError({
            message:
              "Use a port from 1–65535 and an interval of at least 30 seconds.",
            cause,
          }),
      ),
    );
    const store = yield* Effect.acquireRelease(
      Effect.try({
        try: () => new AggregatorStore({ path: options.database }),
        catch: (cause) =>
          new StartupError({
            message: "The local metadata database could not open.",
            cause,
          }),
      }),
      (store) => Effect.sync(() => store.close()),
    );
    const directory = new NostrDirectory({ WebSocket });
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        createAggregatorServer({
          store,
          directory,
          intervalMs: options.interval * 1000,
        }),
      ),
      closeServer,
    );
    yield* listen(server, options.port);
    yield* Effect.sync(() => {
      console.log(
        `Ember Page dashboard: http://127.0.0.1:${options.port}\nRolling metadata indexing every ${options.interval}s; no article bodies stored or served.`,
      );
      server.indexer.startScheduler();
    });
    yield* untilShutdown;
  }),
);
if (values.help)
  console.log(
    "Ember Page local metadata aggregator\n\nUsage: pnpm aggregator [options]\n\n--port, -p       Local port (default: 4318)\n--database, -d   SQLite file (default: .emberpage/aggregator-nostr.sqlite)\n--interval, -i   Seconds between completed indexing runs (default: 60, minimum: 30)\n--version, -v    Print version\n--help, -h       Show help\n\nBinds only 127.0.0.1. Queries Nostr metadata; never publishes or retrieves article bodies.",
  );
else if (values.version) console.log(packageInfo.version);
else
  await Effect.runPromise(
    run.pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          console.error(error.message);
          process.exitCode = 1;
        }),
      ),
    ),
  );
