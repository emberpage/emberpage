import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';
import { Effect } from 'effect';

const repository = resolve('.');
const failure = (cause: unknown) =>
  new Error('Tooling fixture failed', { cause });
const io = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({ try: operation, catch: failure });
const sandbox = Effect.fn('Tooling.sandbox')(function* () {
  const directory = yield* Effect.acquireRelease(
    io(() => mkdtemp(join(tmpdir(), 'emberpage-tooling-'))),
    (directory) =>
      Effect.promise(() => rm(directory, { recursive: true, force: true }))
  );
  yield* Effect.forEach(
    ['src/core', 'entrypoints', 'aggregator', 'scripts', 'tests', '.github'],
    (path) => io(() => mkdir(join(directory, path), { recursive: true }))
  );
  yield* io(() =>
    writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@12.11.2', scripts: {} })
    )
  );
  yield* io(() =>
    writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          allowJs: false,
          noUnusedLocals: true,
          noUnusedParameters: true
        }
      })
    )
  );
  return directory;
});
const run = (directory: string, script: string, args: string[] = []) =>
  Effect.sync(() => {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024
    });
    if (result.error) throw result.error;
    return { status: result.status, output: result.stdout + result.stderr };
  });

await test('actual ESLint configuration rejects missing Effect, explicit any, unsafe JSON and floating effects', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const eslint = new ESLint({ cwd: repository });
      const filePath = join(repository, 'src/core/url.ts');
      const cases = [
        { rule: 'emberpage/effect-module', source: 'export const value = 1;' },
        {
          rule: 'emberpage/effect-module',
          source: "import 'effect'; export const value = 1;"
        },
        {
          rule: 'emberpage/effect-module',
          source:
            '/* eslint-disable\n emberpage/effect-module\n*/\nexport const value = 1;'
        },
        {
          rule: '@typescript-eslint/no-explicit-any',
          source:
            "import { Predicate } from 'effect'; export const value: any = 'fixture'; export const valid = Predicate.isString(value);"
        },
        {
          rule: '@typescript-eslint/no-unsafe-assignment',
          source:
            "import { Predicate } from 'effect'; export const value: string = JSON.parse('\"fixture\"'); export const valid = Predicate.isString(value);"
        },
        {
          rule: '@typescript-eslint/no-floating-promises',
          source:
            "import { Effect } from 'effect'; Effect.runPromise(Effect.succeed('fixture'));"
        }
      ];
      for (const fixture of cases) {
        const results = yield* io(() =>
          eslint.lintText(fixture.source, { filePath })
        );
        assert.ok(
          results
            .flatMap((result) => result.messages)
            .some((message) => message.ruleId === fixture.rule),
          `${fixture.rule} must reject the actual violation`
        );
      }
      const valid = yield* io(() =>
        eslint.lintText(
          "import { Predicate } from 'effect'; export const valid = Predicate.isString('fixture');",
          { filePath }
        )
      );
      assert.equal(
        valid.reduce((count, result) => count + result.errorCount, 0),
        0,
        'A valid module remains accepted'
      );
    })
  ));

await test('actual dependency-cruiser policy rejects extension-to-dashboard and core-to-platform imports', () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* sandbox();
        yield* io(() =>
          writeFile(
            join(directory, 'aggregator/target.ts'),
            'export const target = 1;'
          )
        );
        yield* io(() =>
          writeFile(
            join(directory, 'entrypoints/target.ts'),
            'export const platform = 1;'
          )
        );
        const fixtures = [
          {
            path: 'src/extension.ts',
            source:
              "import { target } from '../aggregator/target.ts'; export const value = target;",
            rule: 'extension-independent-of-dashboard'
          },
          {
            path: 'src/core/violation.ts',
            source:
              "import { platform } from '../../entrypoints/target.ts'; export const value = platform;",
            rule: 'core-independent-of-platform'
          }
        ];
        for (const fixture of fixtures) {
          yield* io(() =>
            writeFile(join(directory, fixture.path), fixture.source)
          );
          const result = yield* run(
            directory,
            join(
              repository,
              'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'
            ),
            [
              fixture.path,
              '--config',
              join(repository, '.dependency-cruiser.json')
            ]
          );
          assert.notEqual(
            result.status,
            0,
            'Crossed boundary must fail the real CLI'
          );
          assert.ok(
            result.output.includes(fixture.rule),
            `${fixture.rule} must appear in the actual diagnostic: ${result.output}`
          );
        }
      })
    )
  ));

await test('actual repository checker rejects JavaScript and suppression files without retaining test fixtures', () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* sandbox();
        const command = [join(repository, 'scripts/check-repo.ts')];
        const cli = join(repository, 'node_modules/tsx/dist/cli.mjs');
        const clean = yield* run(directory, cli, command);
        assert.equal(clean.status, 0, clean.output);
        for (const path of [
          'src/forbidden.js',
          'tools/forbidden.js',
          'root-forbidden.js'
        ]) {
          const javascript = join(directory, path);
          yield* io(() => mkdir(dirname(javascript), { recursive: true }));
          yield* io(() => writeFile(javascript, 'export const value = 1;'));
          const rejectedJavaScript = yield* run(directory, cli, command);
          assert.notEqual(rejectedJavaScript.status, 0, path);
          assert.match(
            rejectedJavaScript.output,
            /JavaScript source is forbidden/
          );
          yield* io(() => rm(javascript));
        }
        const suppressed = join(directory, 'src/forbidden.ts');
        // Build the prohibited marker in the sandbox; this test module itself contains no suppression.
        yield* io(() =>
          writeFile(
            suppressed,
            '// ' + '@' + 'ts-ignore\nexport const value = 1;'
          )
        );
        const rejectedSuppression = yield* run(directory, cli, command);
        assert.notEqual(rejectedSuppression.status, 0);
        assert.match(rejectedSuppression.output, /suppression is forbidden/);
        yield* io(() => rm(suppressed));
        yield* io(() =>
          writeFile(
            suppressed,
            '/*\n eslint-disable\n*/\nexport const value = 1;'
          )
        );
        const rejectedMultiline = yield* run(directory, cli, command);
        assert.notEqual(rejectedMultiline.status, 0);
        assert.match(rejectedMultiline.output, /suppression is forbidden/);
        yield* io(() => rm(suppressed));
        const restored = yield* run(directory, cli, command);
        assert.equal(restored.status, 0, restored.output);
      })
    )
  ));
