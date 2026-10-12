import { Effect } from "effect";
import { defineBackground } from "wxt/utils/define-background";
import { startBackground } from "../src/extension.ts";

export default defineBackground({
  type: "module",
  main() {
    Effect.runSync(Effect.sync(startBackground));
  },
});
