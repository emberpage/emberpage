// Isolated metadata collector. Raw single-block feeds deliberately exclude DAGs.
import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  createHash,
} from "node:crypto";
import { readFile, writeFile, rename, mkdir, rm } from "node:fs/promises";
import { CID } from "multiformats/cid";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { strings } from "@helia/strings";
import { ipns } from "@helia/ipns";
import { rankedArticles } from "../../aggregator/indexer.ts";
import { node } from "./node.mjs";
import { boundStores, quota, usage } from "./quotas.mjs";
export const limits = {
  feeds: 4,
  events: 100,
  feedBytes: 65536,
  eventBytes: 8192,
  totalBytes: 262144,
  feedTimeoutMs: 1800,
  pollTimeoutMs: 6000,
  concurrency: 1,
  snapshotBytes: 65536,
  snapshotArticles: 100,
  freshnessMs: 86400000,
};
const text = new TextDecoder("utf-8", { fatal: true }),
  bytes = new TextEncoder(),
  hash = (value) => createHash("sha256").update(value).digest("hex");
export function signed(body, key) {
  return {
    body,
    key: key.publicKey,
    signature: sign(
      null,
      Buffer.from(JSON.stringify(body)),
      createPrivateKey(key.privateKey),
    ).toString("base64"),
  };
}
export function identity() {
  const key = generateKeyPairSync("ed25519");
  return {
    publicKey: key.publicKey.export({ type: "spki", format: "pem" }),
    privateKey: key.privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}
function checkEnvelope(envelope, key, maxBytes) {
  if (bytes.encode(JSON.stringify(envelope)).length > maxBytes)
    throw Error("Envelope bytes limit");
  if (
    envelope.key !== key ||
    !verify(
      null,
      Buffer.from(JSON.stringify(envelope.body)),
      createPublicKey(key),
      Buffer.from(envelope.signature, "base64"),
    )
  )
    throw Error("Signer or signature");
}
export function validateFeed(envelope, key, previous, now) {
  checkEnvelope(envelope, key, limits.feedBytes);
  const b = envelope.body,
    digest = hash(JSON.stringify(b));
  if (
    b.format !== "meshcache.feed.spike" ||
    !Number.isSafeInteger(b.sequence) ||
    b.sequence < 1
  )
    throw Error("Feed format/sequence");
  if (
    previous &&
    (b.sequence < previous.sequence ||
      (b.sequence === previous.sequence && digest !== previous.digest))
  )
    throw Error("Sequence rollback/equivocation");
  if (
    !Number.isSafeInteger(b.updatedAt) ||
    b.updatedAt < now - limits.freshnessMs ||
    b.updatedAt > now + 60000
  )
    throw Error("Feed stale/time");
  if (!Array.isArray(b.events) || b.events.length > limits.events)
    throw Error("Event count");
  const ids = new Set(),
    events = [];
  for (const event of b.events) {
    if (bytes.encode(JSON.stringify(event)).length > limits.eventBytes)
      throw Error("Event bytes");
    if (
      !["id", "urlHash", "contentHash"].every((k) =>
        /^[a-f0-9]{64}$/.test(event[k]),
      )
    )
      throw Error("Event hash");
    if (
      !Number.isSafeInteger(event.createdAt) ||
      event.createdAt < now - 7 * 86400000 ||
      event.createdAt > now + 60000
    )
      throw Error("Event time");
    if (event.type === "listing") {
      articleCid(event.cid);
      const url = new URL(event.url);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        event.url.length > 4096 ||
        !Number.isSafeInteger(event.size) ||
        event.size < 1 ||
        event.size > 2097152 ||
        !/^([a-f0-9]{64})$/.test(event.blobHash) ||
        typeof event.title !== "string" ||
        !event.title.trim() ||
        event.title.length > 500 ||
        typeof event.byline !== "string" ||
        event.byline.length > 500
      )
        throw Error("Listing schema");
      if (hash(event.url) !== event.urlHash) throw Error("Listing URL hash");
    } else if (
      event.type !== "rating" ||
      (event.value !== 1 && event.value !== -1)
    )
      throw Error("Rating schema");
    if (!ids.has(event.id)) {
      ids.add(event.id);
      events.push({ ...event, pubkey: key });
    }
  }
  return { sequence: b.sequence, digest, updatedAt: b.updatedAt, events };
}
export function rawCid(input) {
  let cid;
  try {
    cid = CID.parse(input);
  } catch {
    throw Error("Invalid CID");
  }
  if (
    cid.code !== 0x55 ||
    cid.multihash.code !== 0x12 ||
    cid.multihash.size !== 32
  )
    throw Error("Only raw SHA-256 CID allowed; DAGs rejected");
  return cid;
}
export function articleCid(input) {
  const cid = CID.parse(input);
  if (
    ![0x55, 0x70].includes(cid.code) ||
    cid.multihash.code !== 0x12 ||
    cid.multihash.size !== 32
  )
    throw Error("Article CID format");
  return cid;
}
export async function boundedBlock(helia, input, signal) {
  const cid = rawCid(input);
  let size = 0,
    chunks = [];
  for await (const part of helia.blockstore.get(cid, { signal })) {
    size += part.length;
    if (size > limits.feedBytes) throw Error("Block bytes limit");
    chunks.push(part);
  }
  const result = new Uint8Array(size);
  let at = 0;
  for (const part of chunks) {
    result.set(part, at);
    at += part.length;
  }
  return result;
}
export function verifySnapshot(envelope, key, now = Date.now()) {
  checkEnvelope(envelope, key, limits.snapshotBytes);
  const b = envelope.body;
  if (
    !Number.isSafeInteger(b.observedAt) ||
    b.observedAt > b.generatedAt ||
    b.observedAt < 0
  )
    throw Error("Snapshot observed time");
  if (
    b.format !== "meshcache.popular.spike" ||
    !Number.isSafeInteger(b.generatedAt) ||
    b.generatedAt > now + 60000 ||
    b.generatedAt < now - 300000 ||
    !["fresh", "stale"].includes(b.status) ||
    !Array.isArray(b.articles) ||
    b.articles.length > limits.snapshotArticles ||
    !Number.isSafeInteger(b.feeds) ||
    b.feeds < 0 ||
    b.feeds > limits.feeds
  )
    throw Error("Snapshot schema/freshness");
  for (const article of b.articles) {
    if (
      Object.keys(article).some(
        (key) =>
          ![
            "cid",
            "title",
            "contentHash",
            "urlHash",
            "listedAt",
            "score",
            "rating",
          ].includes(key),
      )
    )
      throw Error("Snapshot article schema or resource URL");
    articleCid(article.cid);
    if (
      !/^[a-f0-9]{64}$/.test(article.contentHash) ||
      !/^[a-f0-9]{64}$/.test(article.urlHash) ||
      !Number.isFinite(article.score) ||
      !Number.isSafeInteger(article.listedAt) ||
      article.listedAt < 0 ||
      article.listedAt > now + 60000 ||
      typeof article.title !== "string" ||
      !article.title.trim() ||
      article.title.length > 500 ||
      !article.rating ||
      !["upvotes", "downvotes"].every(
        (key) =>
          Number.isSafeInteger(article.rating[key]) &&
          article.rating[key] >= 0 &&
          article.rating[key] <= 50,
      ) ||
      Object.keys(article.rating).some(
        (key) => !["upvotes", "downvotes"].includes(key),
      )
    )
      throw Error("Snapshot article schema or resource URL");
  }
  return b;
}
export async function readHttpSnapshot(url, key, now = Date.now()) {
  const response = await fetch(url, {
    redirect: "error",
    credentials: "omit",
    signal: AbortSignal.timeout(limits.feedTimeoutMs),
  });
  if (!response.ok) throw Error("HTTP status");
  const advertised = Number(response.headers.get("content-length"));
  if (advertised > limits.snapshotBytes) throw Error("HTTP advertised size");
  let size = 0,
    chunks = [];
  for await (const part of response.body) {
    size += part.length;
    if (size > limits.snapshotBytes) throw Error("HTTP streamed size");
    chunks.push(part);
  }
  return verifySnapshot(
    JSON.parse(Buffer.concat(chunks).toString("utf8")),
    key,
    now,
  );
}
export async function collector(path, { fault } = {}) {
  await mkdir(path, { recursive: true });
  let state;
  try {
    state = JSON.parse(await readFile(`${path}/state.json`, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = {
      identity: identity(),
      registry: [],
      highwater: {},
      cache: {},
      snapshot: null,
    };
  }
  const blockstore = new FsBlockstore(`${path}/blocks`),
    datastore = new FsDatastore(`${path}/metadata`);
  await Promise.all([blockstore.open(), datastore.open()]);
  boundStores(blockstore, datastore);
  const helia = await node({
    helia: { blockstore, datastore },
    bitswap: {
      maxIncomingMessageSize: limits.feedBytes + 2048,
      maxOutgoingMessageSize: limits.feedBytes + 2048,
      // Runtime spelling differs from the installed TypeScript declaration.
      // This is a soft trim target: native in-flight wants can exceed it.
      maxWantListSize: 32,
      maxInboundStreams: 4,
      maxOutboundStreams: 4,
      messageSendConcurrency: 1,
      messageReceiveTimeout: 1800,
      messageSendTimeout: 1800,
      incomingStreamTimeout: 1800,
      sendBlocksMaxQueueLength: 4,
    },
  });
  const save = async (candidate = state) => {
    const encoded = JSON.stringify(candidate);
    if (Buffer.byteLength(encoded) > quota.stateBytes)
      throw Error("State quota");
    await writeFile(`${path}/state.tmp`, encoded, { mode: 0o600 });
    if (candidate !== state) await fault?.("precommit");
    await rename(`${path}/state.tmp`, `${path}/state.json`);
    state = candidate;
  };
  const reconcile = async () => {
    const references = new Set(
      Object.values(state.highwater).map((value) => value.cid),
    );
    if (state.snapshotCid) references.add(state.snapshotCid);
    for (const reference of references) {
      const cid = rawCid(reference);
      if (!(await helia.blockstore.has(cid)))
        throw Error("Committed block missing");
      if (!(await helia.pins.isPinned(cid)))
        for await (const pinned of helia.pins.add(cid)) {
        }
    }
    for await (const pin of helia.pins.ls())
      if (!references.has(pin.cid.toString()))
        for await (const removed of helia.pins.rm(pin.cid)) {
        }
    await helia.gc();
  };
  await rm(`${path}/state.tmp`, { force: true });
  await reconcile();
  await save();
  let polling = false;
  return {
    helia,
    get state() {
      return state;
    },
    async register(entry) {
      if (state.registry.length >= limits.feeds)
        throw Error("Registry feed count");
      if (
        !entry ||
        typeof entry.name !== "string" ||
        entry.name.length > 128 ||
        typeof entry.key !== "string" ||
        entry.key.length > 256
      )
        throw Error("Registry fields");
      const name = CID.parse(entry.name);
      if (name.code !== 0x72) throw Error("IPNS name required");
      if (createPublicKey(entry.key).asymmetricKeyType !== "ed25519")
        throw Error("Registry Ed25519 key required");
      if (
        state.registry.some((e) => e.name === entry.name || e.key === entry.key)
      )
        throw Error("Duplicate registration");
      const next = structuredClone(state);
      next.registry.push(entry);
      await save(next);
    },
    async poll() {
      if (polling) throw Error("A poll is already running");
      polling = true;
      const candidate = structuredClone(state);
      try {
        const deadline = AbortSignal.timeout(limits.pollTimeoutMs),
          now = Date.now(),
          outcomes = [];
        let total = 0,
          failures = 0;
        for (const entry of state.registry) {
          const started = Date.now(),
            signal = AbortSignal.any([
              deadline,
              AbortSignal.timeout(limits.feedTimeoutMs),
            ]);
          try {
            let path;
            for await (const result of ipns(helia).resolve(
              CID.parse(entry.name),
              { nocache: true, signal },
            ))
              path = text.decode(result.record.value);
            if (!path?.startsWith("/ipfs/")) throw Error("IPNS path");
            const cid = rawCid(path.slice(6));
            const data = await boundedBlock(helia, cid.toString(), signal);
            total += data.length;
            if (total > limits.totalBytes) throw Error("Poll bytes");
            const next = validateFeed(
              JSON.parse(text.decode(data)),
              entry.key,
              state.highwater[entry.name],
              now,
            );
            if (!(await helia.pins.isPinned(cid)))
              for await (const pinned of helia.pins.add(cid)) {
              }
            await fault?.("postblockpin");
            candidate.highwater[entry.name] = {
              sequence: next.sequence,
              digest: next.digest,
              cid: cid.toString(),
            };
            candidate.cache[entry.name] = next.events;
            outcomes.push({
              name: entry.name,
              outcome: "success",
              sequence: next.sequence,
              bytes: data.length,
              durationMs: Date.now() - started,
            });
          } catch (error) {
            failures++;
            outcomes.push({
              name: entry.name,
              outcome: "failure",
              error: error.message,
              durationMs: Date.now() - started,
            });
          }
          if (deadline.aborted) break;
        }
        const events = Object.values(candidate.cache).flat(),
          ranked = rankedArticles(
            events.filter((e) => e.type === "listing"),
            events.filter((e) => e.type === "rating"),
            now,
          ).slice(0, limits.snapshotArticles),
          articles = ranked.map(
            ({
              cid,
              title,
              contentHash,
              urlHash,
              listedAt,
              score,
              rating,
            }) => ({
              cid,
              title,
              contentHash,
              urlHash,
              listedAt,
              score,
              rating,
            }),
          );
        const previous = state.snapshot;
        const generatedAt = now,
          observedAt = failures ? (previous?.body.observedAt ?? now) : now;
        let next;
        do {
          next = signed(
            {
              format: "meshcache.popular.spike",
              generatedAt,
              observedAt,
              status: failures ? "stale" : "fresh",
              feeds: state.registry.length,
              articles,
            },
            state.identity,
          );
          if (bytes.encode(JSON.stringify(next)).length <= limits.snapshotBytes)
            break;
          articles.pop();
        } while (articles.length);
        verifySnapshot(next, state.identity.publicKey, now);
        candidate.snapshot = next;
        const snapshotCid = await strings(helia).add(JSON.stringify(next));
        for await (const pinned of helia.pins.add(snapshotCid)) {
        }
        candidate.snapshotCid = snapshotCid.toString();
        await save(candidate);
        await reconcile();
        return { outcomes, totalBytes: total, snapshot: state.snapshot };
      } finally {
        await reconcile();
        polling = false;
      }
    },
    async status() {
      const pins = [];
      for (const [name, value] of Object.entries(state.highwater))
        pins.push({
          name,
          cid: value.cid,
          pinned: await helia.pins.isPinned(CID.parse(value.cid)),
        });
      const pinCids = [];
      for await (const pin of helia.pins.ls()) pinCids.push(pin.cid.toString());
      return {
        pinCids,
        key: state.identity.publicKey,
        registry: state.registry,
        highwater: state.highwater,
        snapshot: state.snapshot,
        pins,
        snapshotCid: state.snapshotCid,
        usage: await usage([blockstore.path, datastore.path]),
        connections: helia.libp2p.getConnections().length,
      };
    },
    async stop() {
      await save();
      await helia.stop();
      await Promise.all([blockstore.close(), datastore.close()]);
    },
  };
}
