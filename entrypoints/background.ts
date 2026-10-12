import { Effect } from "effect";
import { defineBackground } from "wxt/utils/define-background";
import { startBackground } from "../src/background.ts";

export default defineBackground({
  type: "module",
  main() {
    Effect.runSync(Effect.sync(startBackground));
  },
});
