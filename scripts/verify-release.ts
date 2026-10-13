import { BoundaryError } from '../src/domain/errors.ts';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Effect, Schema } from 'effect';

const Manifest = Schema.Struct({
  version:Schema.String,name:Schema.String,manifest_version:Schema.Number,
  action:Schema.Struct({default_title:Schema.String,default_popup:Schema.String}),
  permissions:Schema.Array(Schema.String),
  host_permissions:Schema.optionalKey(Schema.Array(Schema.String)),
  optional_host_permissions:Schema.optionalKey(Schema.Array(Schema.String)),
  content_scripts:Schema.optionalKey(Schema.Array(Schema.Unknown)),
  background:Schema.Struct({type:Schema.String,service_worker:Schema.String}),
  content_security_policy:Schema.Struct({extension_pages:Schema.String}),
  icons:Schema.Record(Schema.String,Schema.String),
});
const Package = Schema.Struct({version:Schema.String});
const read = (path:string)=>Effect.tryPromise({try:()=>readFile(path,'utf8'),catch:cause=>BoundaryError.from(cause, `Cannot read ${path}`)});
await Effect.runPromise(Effect.gen(function* () {
  const output='.output/chrome-mv3';
  const pkg=yield* read('package.json').pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Package))));
  const manifest=yield* read(join(output,'manifest.json')).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))));
  assert.equal(manifest.version,pkg.version);
  assert.equal(manifest.name,'Ember Page');
  assert.equal(manifest.action.default_title,'Ember Page');
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual([...manifest.permissions].sort(),['activeTab','offscreen','scripting','storage']);
  assert.equal(manifest.host_permissions?.length ?? 0,0);
  assert.equal(manifest.optional_host_permissions?.length ?? 0, 0);
  assert.equal(manifest.content_scripts?.length ?? 0,0);
  assert.equal(manifest.background.type,'module');
  assert(!/localhost|unsafe-eval/.test(manifest.content_security_policy.extension_pages));
  assert(!/127\.0\.0\.1/.test(manifest.content_security_policy.extension_pages));
  const connections = manifest.content_security_policy.extension_pages.split(';').map(directive => directive.trim().split(/\s+/)).filter(directive => directive[0] === 'connect-src');
  assert.equal(connections.length, 1, 'Release CSP has exactly one connection policy');
  assert.deepEqual(connections[0]?.slice(1).sort(), ['https:', 'wss:'], 'Browser mesh permits encrypted public connections only');
  assert(!/blossom|media\.primal/.test(manifest.content_security_policy.extension_pages));
  assert(manifest.content_security_policy.extension_pages.includes("font-src 'self'"));
  for(const file of [manifest.background.service_worker,manifest.action.default_popup,'review.html','reader.html','offscreen.html','capture.js','typeset.css','theme.css','fonts/geist-sans.woff2','fonts/geist-mono.woff2',...Object.values(manifest.icons)])
    yield* Effect.tryPromise({try:()=>access(join(output,file)),catch:cause=>BoundaryError.from(cause, `Missing release asset ${file}`)});
  for(const page of ['reader.html','review.html']) assert((yield* read(join(output,page))).includes('typeset'));
  if(process.env.GITHUB_REF_TYPE==='tag') assert.equal(process.env.GITHUB_REF_NAME,`v${pkg.version}`,'Release tag must match package version');
  yield* Effect.sync(()=>console.log(`Verified release manifest, entrypoints, Typeset and local fonts for ${pkg.version}.`));
}));
