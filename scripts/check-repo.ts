import { BoundaryError } from '../src/domain/errors.ts';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Effect, Schema } from 'effect';
import ts from 'typescript';

const Package = Schema.Struct({ packageManager: Schema.String });
const Compiler = Schema.Struct({
  compilerOptions: Schema.Struct({
    strict: Schema.Boolean,
    allowJs: Schema.Boolean,
    noUnusedLocals: Schema.Boolean,
    noUnusedParameters: Schema.Boolean,
  }),
});
const files = Effect.fn('Repo.files')(function* (
  directory: string,
): Effect.fn.Return<string[], Error> {
  const entries = yield* Effect.tryPromise({
    try: () => readdir(directory, { withFileTypes: true }),
    catch: cause => BoundaryError.from(cause, `Cannot scan ${directory}`),
  });
  const sourceEntries = entries.filter(entry => !(entry.isDirectory() && (
    entry.name === 'node_modules' || entry.name === '.git' ||
    (directory === '.' && ['.output', '.wxt', 'dist', 'artifacts', '.emberpage'].includes(entry.name))
  )));
  return (yield* Effect.forEach(sourceEntries, entry => entry.isDirectory()
    ? files(join(directory, entry.name))
    : Effect.succeed([join(directory, entry.name)]))).flat();
});
const read = (path: string) => Effect.tryPromise({
  try: () => readFile(path, 'utf8'),
  catch: cause => BoundaryError.from(cause, `Cannot read ${path}`),
});
const check = Effect.gen(function* () {
  const pkg = yield* read('package.json').pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Package))),
  );
  const config = yield* read('tsconfig.json').pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Compiler))),
  );
  const options = config.compilerOptions;
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(pkg.packageManager) || !options.strict ||
      options.allowJs || !options.noUnusedLocals || !options.noUnusedParameters) {
    return yield* BoundaryError.from(undefined, 'Pinned pnpm and strict TypeScript coverage are required.');
  }
  const paths = yield* files('.');
  const invalid = paths.filter(path => /\.(?:js|mjs|cjs|jsx)$/.test(path));
  if (invalid.length) {
    return yield* BoundaryError.from(undefined, `JavaScript source is forbidden:\n${invalid.join('\n')}`);
  }
  for (const path of paths.filter(path => /\.(?:ts|tsx|mts|cts)$/.test(path))) {
    const source = yield* read(path);
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      if ((token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) &&
          /@ts-(?:ignore|nocheck|expect-error)|eslint-disable|@effect-diagnostics/.test(scanner.getTokenText())) {
        return yield* BoundaryError.from(undefined, `Type/lint suppression is forbidden: ${path}`);
      }
    }
  }
  for (const path of ['spikes', 'docs/research', 'scripts/spikes']) {
    const exists = yield* Effect.tryPromise({
      try: () => readdir(path),
      catch: cause => BoundaryError.from(cause, `Cannot inspect ${path}`),
    }).pipe(Effect.as(true), Effect.catch(error =>
      error.cause instanceof Error && 'code' in error.cause && error.cause.code === 'ENOENT'
        ? Effect.succeed(false)
        : Effect.fail(error),
    ));
    if (exists) {
      return yield* BoundaryError.from(undefined, `Retired experiments must stay outside the repository: ${path}`);
    }
  }
  yield* Effect.sync(() => console.log('Verified pinned pnpm, strict TypeScript, no JavaScript/suppressions, and no retired experiments.'));
});
await Effect.runPromise(check);
