import { Effect } from "effect";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { startContentCapture } from "../src/extraction/content.ts";

export default defineUnlistedScript(() => Effect.runSync(Effect.sync(startContentCapture)));
