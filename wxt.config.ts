import { readFileSync } from "node:fs";
import { Schema } from "effect";
import { defineConfig } from "wxt";

const version = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Struct({
  version: Schema.String.check(Schema.isPattern(/^\d+\.\d+\.\d+$/)),
})))(readFileSync("package.json", "utf8")).version;

export default defineConfig({
  manifestVersion: 3,
  imports: false,
  vite: () => ({ build: { target: "chrome116", sourcemap: true } }),
  manifest: {
    version,
    name: "Ember Page",
    description:
      "Keep readable article snapshots for when links break or pages disappear. Save privately by default.",
    minimum_chrome_version: "116",
    permissions: ["activeTab", "scripting", "storage", "offscreen"],
    action: {
      default_title: "Ember Page",
      default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src https: wss:; img-src 'self' data:; style-src 'self'; font-src 'self';",
    },
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
  },
});
