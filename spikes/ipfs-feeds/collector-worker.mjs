import { createServer } from "node:http";
import { collector } from "./collector.mjs";
import { multiaddr } from "@multiformats/multiaddr";
const app = await collector(process.argv[2], {
  fault: async (phase) => {
    if (process.env.SPIKE_KILL_PHASE === phase) {
      process.send({ fault: phase });
      await new Promise(() => {});
    }
  },
});
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/popular") res.end(JSON.stringify(app.state.snapshot));
  else if (req.url === "/health")
    res.end(
      JSON.stringify({
        status: app.state.snapshot?.body.status,
        feeds: app.state.registry.length,
      }),
    );
  else {
    res.statusCode = 404;
    res.end("{}");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.send({
  ready: true,
  addresses: app.helia.libp2p.getMultiaddrs().map((a) => a.toString()),
  http: `http://127.0.0.1:${server.address().port}`,
  pid: process.pid,
});
process.on("message", async (message) => {
  try {
    let value;
    if (message.command === "register")
      value = await app.register(message.entry);
    else if (message.command === "poll") value = await app.poll();
    else if (message.command === "status") value = await app.status();
    else if (message.command === "dial")
      value = await app.helia.libp2p.dial(multiaddr(message.address));
    else if (message.command === "has")
      value = await app.helia.blockstore.has(
        (await import("multiformats/cid")).CID.parse(message.cid),
      );
    else if (message.command === "stop") {
      await new Promise((r) => server.close(r));
      await app.stop();
      process.send({ id: message.id, value: "stopped" });
      process.disconnect();
      return;
    } else throw Error("Unknown command");
    process.send({
      id: message.id,
      value: message.command === "dial" ? true : value,
    });
  } catch (error) {
    process.send({ id: message.id, error: error.message });
  }
});
