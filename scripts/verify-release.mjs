import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const output = ".output/chrome-mv3";
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(
  await readFile(join(output, "manifest.json"), "utf8"),
);
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.name, "Ember Page");
assert.equal(manifest.action.default_title, "Ember Page");
assert.equal(manifest.manifest_version, 3);
assert.deepEqual([...manifest.permissions].sort(), [
  "activeTab",
  "offscreen",
  "scripting",
  "storage",
]);
assert.equal(manifest.host_permissions?.length ?? 0, 0);
assert.equal(manifest.content_scripts?.length ?? 0, 0);
assert.equal(manifest.background.type, "module");
assert(
  !/localhost|127\.0\.0\.1|unsafe-eval/.test(
    manifest.content_security_policy.extension_pages,
  ),
);
for (const file of [
  manifest.background.service_worker,
  manifest.action.default_popup,
  "review.html",
  "reader.html",
  "offscreen.html",
  "capture.js",
  ...Object.values(manifest.icons),
]) {
  await access(join(output, file));
}
if (process.env.GITHUB_REF_TYPE === "tag") {
  assert.equal(
    process.env.GITHUB_REF_NAME,
    `v${pkg.version}`,
    "Release tag must match package version",
  );
}
console.log(`Verified release manifest and entrypoints for ${pkg.version}.`);
