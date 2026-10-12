import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { Effect, Predicate, Schema } from "effect";
import { MetadataIndexer, rankedArticles } from "./indexer.ts";
import type { AggregatorStore } from "./store.ts";
import type { MetadataDirectory } from "./types.ts";

const publicRoot = new URL("./public/", import.meta.url);
const FILES = new Map<string, readonly [URL, string]>([
  ["/", [new URL("index.html", publicRoot), "text/html"]],
  ["/index.html", [new URL("index.html", publicRoot), "text/html"]],
  ["/dashboard.css", [new URL("dashboard.css", publicRoot), "text/css"]],

  ["/theme.css", [new URL("../public/theme.css", import.meta.url), "text/css"]],
  ["/fonts/geist-sans.woff2", [new URL("../public/fonts/geist-sans.woff2", import.meta.url), "font/woff2"]],
  ["/fonts/geist-mono.woff2", [new URL("../public/fonts/geist-mono.woff2", import.meta.url), "font/woff2"]],
  ["/logo.png", [new URL("../public/icons/logo.png", import.meta.url), "image/png"]],
]);
const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};
function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    ...HEADERS,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}
class RequestError extends Schema.TaggedError<RequestError>()(
  "AggregatorRequestError",
  { message: Schema.String, status: Schema.Number, cause: Schema.Defect() },
) {}
const boundedInput = Effect.fn("Aggregator.boundedInput")(
  (request: IncomingMessage) =>
    Effect.tryPromise({
      async try() {
        if (Number(request.headers["content-length"]) > 16384) {
          request.resume();
          throw new RequestError({
            message: "Request is too large.",
            status: 413,
            cause: null,
          });
        }
        let count = 0;
        for await (const chunk of request as AsyncIterable<Buffer>) {
          count += Buffer.byteLength(chunk);
          if (count > 16384)
            throw new RequestError({
              message: "Request is too large.",
              status: 413,
              cause: null,
            });
        }
      },
      catch: (cause) =>
        cause instanceof RequestError
          ? cause
          : new RequestError({
              message: "The local request could not be read.",
              status: 400,
              cause,
            }),
    }),
);
export type AggregatorServer = Server & { readonly indexer: MetadataIndexer };
export function createAggregatorServer({
  store,
  directory,
  intervalMs = 60000,
}: {
  store: AggregatorStore;
  directory: MetadataDirectory;
  intervalMs?: number;
}): AggregatorServer {
  const indexer = new MetadataIndexer({ store, directory, intervalMs });
  const dashboardBundle = Effect.runSync(Effect.cached(Effect.tryPromise({
    try: async () => {
      const result = await build({entryPoints:[new URL("dashboard.ts",publicRoot).pathname],bundle:true,write:false,format:"esm",platform:"browser",target:"chrome116"});
      const content = result.outputFiles?.[0]?.text;
      if (content === undefined) throw new Error("Dashboard bundle missing.");
      return content;
    },
    catch: cause => new RequestError({message:"The dashboard could not build.",status:500,cause}),
  })));
  const articles = () =>
    rankedArticles(store.listArticles(), store.listVotes());
  const snapshot = Effect.fn("Aggregator.snapshot")(function* () {
    return {
      generatedAt: yield* indexer.timestamp,
      articles: articles(),
      storage: store.stats(),
      network: yield* indexer.statusEffect(),
      events: store.events(),
      trends: store.trends(),
      lastRefresh: store.lastRefresh(),
    };
  });
  const handle = Effect.fn("Aggregator.request")(function* (
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    const address = server.address();
    if (!address || typeof address === "string") return;
    const origin = `http://127.0.0.1:${address.port}`;
    if (request.headers.host !== new URL(origin).host) {
      json(response, 403, {
        error: "Only the local aggregator address is allowed.",
      });
      return;
    }
    const url = yield* Effect.try({
      try: () => new URL(request.url ?? "/", origin),
      catch: (cause) =>
        new RequestError({
          message: "Invalid local request.",
          status: 400,
          cause,
        }),
    });
    if (request.method === "GET") {
      if (url.pathname === "/dashboard.js") {
        const bundle = yield* dashboardBundle;
        response.writeHead(200,{...HEADERS,"Content-Type":"text/javascript; charset=utf-8"});
        response.end(bundle);
        return;
      }
      if (url.pathname === "/api/dashboard") {
        json(response, 200, yield* snapshot());
        return;
      }
      if (url.pathname === "/api/status") {
        json(response, 200, yield* indexer.statusEffect());
        return;
      }
      if (url.pathname === "/api/articles") {
        const category = url.searchParams.get("category");
        json(
          response,
          200,
          articles().filter(
            (entry) => !category || entry.category === category,
          ),
        );
        return;
      }
      const file = FILES.get(url.pathname);
      if (file) {
        const content = yield* Effect.tryPromise({
          try: () => readFile(file[0]),
          catch: (cause) =>
            new RequestError({
              message: "The local aggregator could not read this page.",
              status: 500,
              cause,
            }),
        });
        response.writeHead(200, {
          ...HEADERS,
          "Content-Type": file[1].startsWith("text/") ? `${file[1]}; charset=utf-8` : file[1],
        });
        response.end(content);
        return;
      }
    }
    if (request.method === "POST" && url.pathname === "/api/refresh") {
      if (
        request.headers.origin !== origin ||
        request.headers["x-emberpage-action"] !== "refresh"
      ) {
        json(response, 403, {
          error: "Refresh must come from this dashboard.",
        });
        return;
      }
      yield* boundedInput(request);
      // Promise boundary registers this manual run for joined shutdown.
      yield* Effect.tryPromise({
        try: () => indexer.refresh(),
        catch: (cause) => cause,
      });
      json(response, 200, yield* snapshot());
      return;
    }
    json(response, 404, { error: "This local endpoint does not exist." });
  });
  const native = createServer((request, response) => {
    void Effect.runPromise(
      handle(request, response).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            if (
              Predicate.isObject(error) &&
              Predicate.isNumber(error.status) &&
              Predicate.isString(error.message)
            )
              json(response, error.status, { error: error.message });
            else
              json(response, 500, {
                error:
                  "The local aggregator could not complete this operation.",
              });
          }),
        ),
      ),
    );
  });
  const server: AggregatorServer = Object.assign(native, { indexer });
  server.on("close", () => {
    void indexer.stopScheduler();
  });
  return server;
}
