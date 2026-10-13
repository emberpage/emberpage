import { BoundaryError } from "../src/domain/errors.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ESLint } from "eslint";
import { Effect, Schema } from "effect";

const repository = resolve(".");
const failure = (cause: unknown) =>
  BoundaryError.from(cause, "Tooling fixture failed");
const io = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const sandbox = Effect.fn("Tooling.sandbox")(function* () {
  const directory = yield* Effect.acquireRelease(
    io(() => mkdtemp(join(tmpdir(), "emberpage-tooling-"))),
    (directory) =>
      Effect.promise(() => rm(directory, { recursive: true, force: true })),
  );
  yield* Effect.forEach(
    [
      "src/domain",
      "src/platform",
      "entrypoints",
      "aggregator",
      "scripts",
      "tests",
      ".github",
    ],
    (path) => io(() => mkdir(join(directory, path), { recursive: true })),
  );
  yield* io(() =>
    writeFile(
      join(directory, "package.json"),
      JSON.stringify({
        type: "module",
        packageManager: "pnpm@12.11.2",
        scripts: {},
      }),
    ),
  );
  yield* io(() =>
    writeFile(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          allowJs: false,
          noUnusedLocals: true,
          noUnusedParameters: true,
        },
      }),
    ),
  );
  return directory;
});
const run = (directory: string, script: string, args: string[] = []) =>
  Effect.sync(() => {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    if (result.error) throw result.error;
    return { status: result.status, output: result.stdout + result.stderr };
  });

await test("actual ESLint configuration rejects missing Effect, explicit any, unsafe JSON and floating effects", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const eslint = new ESLint({ cwd: repository });
      const filePath = join(repository, "src/domain/url.ts");
      const cases = [
        { rule: "emberpage/effect-module", source: "export const value = 1;" },
        {
          rule: "emberpage/effect-module",
          source: "import 'effect'; export const value = 1;",
        },
        {
          rule: "emberpage/effect-module",
          source:
            "/* eslint-disable\n emberpage/effect-module\n*/\nexport const value = 1;",
        },
        {
          rule: "@typescript-eslint/no-explicit-any",
          source:
            "import { Predicate } from 'effect'; export const value: any = 'fixture'; export const valid = Predicate.isString(value);",
        },
        {
          rule: "@typescript-eslint/no-unsafe-assignment",
          source:
            "import { Predicate } from 'effect'; export const value: string = JSON.parse('\"fixture\"'); export const valid = Predicate.isString(value);",
        },
        {
          rule: "@typescript-eslint/no-floating-promises",
          source:
            "import { Effect } from 'effect'; Effect.runPromise(Effect.succeed('fixture'));",
        },
        {
          rule: "no-restricted-globals",
          source:
            "import { Effect } from 'effect'; export const read = Effect.sync(() => chrome.runtime.getURL('fixture'));",
        },
        {
          rule: "no-restricted-globals",
          source:
            "import { Effect } from 'effect'; export const read = Effect.sync(() => globalThis.chrome.runtime.getURL('fixture'));",
        },
        {
          rule: "no-restricted-globals",
          source:
            "import { Effect } from 'effect'; export const read = Effect.sync(() => globalThis['chrome'].runtime.getURL('fixture'));",
        },
      ];
      for (const fixture of cases) {
        const results = yield* io(() =>
          eslint.lintText(fixture.source, { filePath }),
        );
        assert.ok(
          results
            .flatMap((result) => result.messages)
            .some((message) => message.ruleId === fixture.rule),
          `${fixture.rule} must reject the actual violation`,
        );
      }
      const valid = yield* io(() =>
        eslint.lintText(
          "import { Predicate } from 'effect'; export const valid = Predicate.isString('fixture');",
          { filePath },
        ),
      );
      assert.equal(
        valid.reduce((count, result) => count + result.errorCount, 0),
        0,
        "A valid module remains accepted",
      );
      const application = yield* io(() =>
        eslint.lintText(
          "import { Effect } from 'effect'; export const read = Effect.sync(() => chrome.runtime.getURL('fixture'));",
          { filePath: join(repository, "src/application/archive.ts") },
        ),
      );
      assert.ok(
        application
          .flatMap((result) => result.messages)
          .some((message) => message.ruleId === "no-restricted-globals"),
        "Application code cannot call Chrome directly",
      );
      for (const path of [
        "src/application/archive.ts",
        "src/transport/network.ts",
        "src/platform/capture.ts",
      ]) {
        const executed = yield* io(() =>
          eslint.lintText(
            "import { Effect } from 'effect'; export const run = () => Effect.runPromise(Effect.succeed('fixture'));",
            { filePath: join(repository, path) },
          ),
        );
        assert.ok(
          executed
            .flatMap((result) => result.messages)
            .some((message) => message.ruleId === "no-restricted-syntax"),
          "Business modules must return effects rather than execute them",
        );
      }
      const directoryFetch = yield* io(() =>
        eslint.lintText(
          "import { Effect } from 'effect'; export const fetchBody = Effect.tryPromise(() => globalThis.fetch('https://example.org'));",
          { filePath: join(repository, "src/directory/nostr.ts") },
        ),
      );
      assert.ok(
        directoryFetch
          .flatMap((result) => result.messages)
          .some((message) => message.ruleId === "no-restricted-globals"),
        "Metadata directory cannot fetch article bodies",
      );
      const aggregatorPath = join(repository, "aggregator/server.ts");
      const bodyDecoder = yield* io(() =>
        eslint.lintText(
          "import { Effect } from 'effect'; import { decodeArticle } from '../src/domain/article.ts'; export const decoder = Effect.succeed(decodeArticle);",
          { filePath: aggregatorPath },
        ),
      );
      assert.ok(
        bodyDecoder
          .flatMap((result) => result.messages)
          .some((message) => message.ruleId === "no-restricted-imports"),
        "The aggregator cannot import an article body decoder",
      );
      const metadata = yield* io(() =>
        eslint.lintText(
          "import { Effect } from 'effect'; import { hashUrl, MAX_ARTICLE_BYTES } from '../src/domain/article.ts'; export const metadata = Effect.succeed({ hashUrl, maximumSize: MAX_ARTICLE_BYTES });",
          { filePath: aggregatorPath },
        ),
      );
      assert.equal(
        metadata.reduce((count, result) => count + result.errorCount, 0),
        0,
        "The aggregator can use article metadata helpers",
      );
    }),
  ));

await test("actual dependency-cruiser policy rejects extension-to-dashboard and domain-to-platform imports", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* sandbox();
        yield* io(() =>
          writeFile(
            join(directory, "aggregator/target.ts"),
            "export const target = 1;",
          ),
        );
        yield* io(() =>
          writeFile(
            join(directory, "src/platform/target.ts"),
            "export const platform = 1;",
          ),
        );
        yield* io(() =>
          writeFile(
            join(directory, "entrypoints/target.ts"),
            "export const target = 1;",
          ),
        );
        for (const path of [
          "src/storage/target.ts",
          "src/transport/target.ts",
          "src/domain/target.ts",
        ]) {
          yield* io(() =>
            mkdir(dirname(join(directory, path)), { recursive: true }),
          );
          yield* io(() =>
            writeFile(join(directory, path), "export const target = 1;"),
          );
        }
        const fixtures = [
          {
            path: "src/transport/wire-violation.ts",
            source: "import { finalizeEvent } from 'nostr-tools/pure'; export const value = finalizeEvent;",
            rule: "nostr-wire-format-owned-by-directory",
          },
          {
            path: "src/extension.ts",
            source:
              "import { target } from '../aggregator/target.ts'; export const value = target;",
            rule: "extension-independent-of-dashboard",
          },
          {
            path: "src/domain/violation.ts",
            source:
              "import { platform } from '../platform/target.ts'; export const value = platform;",
            rule: "domain-independent",
          },
          {
            path: "src/application/violation.ts",
            source:
              "import { platform } from '../platform/target.ts'; export const value = platform;",
            rule: "application-imports",
          },
          {
            path: "src/pages/violation.ts",
            source:
              "import { target } from '../storage/target.ts'; export const value = target;",
            rule: "pages-imports",
          },
          {
            path: "src/transport/violation.ts",
            source:
              "import { platform } from '../platform/target.ts'; export const value = platform;",
            rule: "transport-imports",
          },
          {
            path: "aggregator/violation.ts",
            source:
              "import { target } from '../src/transport/target.ts'; export const value = target;",
            rule: "aggregator-metadata-only",
          },
          {
            path: "src/pages/node-violation.ts",
            source:
              "import { readFileSync } from 'node:fs'; export const value = readFileSync;",
            rule: "browser-no-node",
          },
          {
            path: "src/application/entrypoint-violation.ts",
            source:
              "import { target } from '../../entrypoints/target.ts'; export const value = target;",
            rule: "entrypoints-are-composition-only",
          },
          {
            path: "aggregator/entrypoint-violation.ts",
            source:
              "import { target } from '../entrypoints/target.ts'; export const value = target;",
            rule: "entrypoints-are-composition-only",
          },
        ];
        for (const fixture of fixtures) {
          yield* io(() =>
            mkdir(dirname(join(directory, fixture.path)), { recursive: true }),
          );
          yield* io(() =>
            writeFile(join(directory, fixture.path), fixture.source),
          );
          const result = yield* run(
            directory,
            join(
              repository,
              "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
            ),
            [
              fixture.path,
              "--config",
              join(repository, ".dependency-cruiser.json"),
            ],
          );
          assert.notEqual(
            result.status,
            0,
            "Crossed boundary must fail the real CLI",
          );
          assert.ok(
            result.output.includes(fixture.rule),
            `${fixture.rule} must appear in the actual diagnostic: ${result.output}`,
          );
        }
        const allowed = "src/application/allowed.ts";
        yield* io(() =>
          writeFile(
            join(directory, allowed),
            "import { target } from '../domain/target.ts'; export const value = target;",
          ),
        );
        const accepted = yield* run(
          directory,
          join(
            repository,
            "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
          ),
          [allowed, "--config", join(repository, ".dependency-cruiser.json")],
        );
        assert.equal(accepted.status, 0, accepted.output);
      }),
    ),
  ));

await test("actual repository checker rejects JavaScript and suppression files without retaining test fixtures", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* sandbox();
        const command = [join(repository, "scripts/check-repo.ts")];
        const cli = join(repository, "node_modules/tsx/dist/cli.mjs");
        const clean = yield* run(directory, cli, command);
        assert.equal(clean.status, 0, clean.output);
        for (const path of [
          "src/forbidden.js",
          "tools/forbidden.js",
          "root-forbidden.js",
        ]) {
          const javascript = join(directory, path);
          yield* io(() => mkdir(dirname(javascript), { recursive: true }));
          yield* io(() => writeFile(javascript, "export const value = 1;"));
          const rejectedJavaScript = yield* run(directory, cli, command);
          assert.notEqual(rejectedJavaScript.status, 0, path);
          assert.match(
            rejectedJavaScript.output,
            /JavaScript source is forbidden/,
          );
          yield* io(() => rm(javascript));
        }
        const suppressed = join(directory, "src/forbidden.ts");
        // Build the prohibited marker in the sandbox; this test module itself contains no suppression.
        yield* io(() =>
          writeFile(
            suppressed,
            "// " + "@" + "ts-ignore\nexport const value = 1;",
          ),
        );
        const rejectedSuppression = yield* run(directory, cli, command);
        assert.notEqual(rejectedSuppression.status, 0);
        assert.match(rejectedSuppression.output, /suppression is forbidden/);
        yield* io(() => rm(suppressed));
        yield* io(() =>
          writeFile(
            suppressed,
            "/*\n eslint-disable\n*/\nexport const value = 1;",
          ),
        );
        const rejectedMultiline = yield* run(directory, cli, command);
        assert.notEqual(rejectedMultiline.status, 0);
        assert.match(rejectedMultiline.output, /suppression is forbidden/);
        yield* io(() => rm(suppressed));
        yield* io(() =>
          writeFile(
            suppressed,
            "// " + "@effect-diagnostics *:off\nexport const value = 1;",
          ),
        );
        const rejectedEffectOverride = yield* run(directory, cli, command);
        assert.notEqual(rejectedEffectOverride.status, 0);
        assert.match(rejectedEffectOverride.output, /suppression is forbidden/);
        yield* io(() => rm(suppressed));
        const restored = yield* run(directory, cli, command);
        assert.equal(restored.status, 0, restored.output);
      }),
    ),
  ));

await test("official Effect diagnostics check actual files and reject floating effects and missing context", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* sandbox();
        yield* io(() =>
          symlink(
            join(repository, "node_modules"),
            join(directory, "node_modules"),
            "dir",
          ),
        );
        const compiler = Schema.decodeUnknownSync(
          Schema.fromJsonString(
            Schema.Struct({
              compilerOptions: Schema.Record(Schema.String, Schema.Unknown),
            }),
          ),
        )(yield* io(() => readFile(join(repository, "tsconfig.json"), "utf8")));
        assert.ok(
          Array.isArray(compiler.compilerOptions.plugins),
          "Clone the installed project plugin configuration",
        );
        yield* io(() =>
          writeFile(
            join(directory, "tsconfig.json"),
            JSON.stringify({
              compilerOptions: {
                ...compiler.compilerOptions,
                target: "ES2023",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                skipLibCheck: true,
                types: [],
              },
              include: ["fixture.ts"],
            }),
          ),
        );
        const diagnosticReport = Schema.fromJsonString(
          Schema.Struct({
            diagnostics: Schema.Array(
              Schema.Struct({ name: Schema.String, severity: Schema.String }),
            ),
            summary: Schema.Struct({
              filesChecked: Schema.Number,
              totalFiles: Schema.Number,
              errors: Schema.Number,
            }),
          }),
        );
        const cases = [
          {
            diagnostic: "floatingEffect",
            source:
              "import { Effect } from 'effect'; Effect.succeed('floating');",
          },
          {
            diagnostic: "missingEffectContext",
            source:
              "import { Context, Effect } from 'effect'; class Needed extends Context.Service<Needed, { value: string }>()('FixtureNeeded') {}\nawait Effect.runPromise(Effect.gen(function* () { const needed = yield* Needed; return needed.value; }));",
          },
          {
            diagnostic: "anyUnknownInErrorContext",
            source:
              "import { Effect } from 'effect'; export const bad = Effect.tryPromise({ try: () => Promise.resolve('fixture'), catch: (cause: unknown) => cause });",
          },
          {
            diagnostic: "unsafeEffectTypeAssertion",
            source:
              "import { Effect } from 'effect'; export const bad = Effect.fail('fixture') as Effect.Effect<never, never>;",
          },
          {
            diagnostic: "globalErrorInEffectFailure",
            severity: "warning",
            source:
              "import { Effect } from 'effect'; export const bad = Effect.fail(new Error('fixture'));",
          },
          {
            diagnostic: null,
            source:
              "import { Effect } from 'effect'; await Effect.runPromise(Effect.succeed('valid'));",
          },
        ];
        for (const fixture of cases) {
          yield* io(() =>
            writeFile(join(directory, "fixture.ts"), fixture.source),
          );
          const result = yield* run(
            directory,
            join(repository, "node_modules/@effect/language-service/cli.js"),
            [
              "diagnostics",
              "--project",
              join(directory, "tsconfig.json"),
              "--format",
              "json",
              "--strict",
            ],
          );
          const report = Schema.decodeUnknownSync(diagnosticReport)(
            result.output,
          );
          assert.ok(
            report.summary.filesChecked > 0,
            "A passing gate must check actual files",
          );
          assert.equal(report.summary.totalFiles, 1);
          if (fixture.diagnostic) {
            assert.equal(result.status, 1, fixture.diagnostic);
            assert.ok(
              report.diagnostics.some(
                (diagnostic) =>
                  diagnostic.name === fixture.diagnostic &&
                  diagnostic.severity === (fixture.severity ?? "error"),
              ),
              result.output,
            );
          } else {
            assert.equal(result.status, 0, result.output);
            assert.equal(report.summary.errors, 0);
            assert.deepEqual(report.diagnostics, []);
          }
        }
      }),
    ),
  ));
