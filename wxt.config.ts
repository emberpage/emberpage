import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  imports: false,
  vite: () => ({ build: { target: "chrome116", sourcemap: true } }),
  manifest: {
    name: "MeshCache",
    description:
      "Save an article privately or share it for readers. Browse complete community copies.",
    minimum_chrome_version: "116",
    permissions: ["activeTab", "scripting", "storage", "offscreen"],
    action: {
      default_title: "MeshCache",
      default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src https://blossom.primal.net https://media.primal.net wss://relay.primal.net; img-src 'self' data:; style-src 'self';",
    },
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
  },
});
