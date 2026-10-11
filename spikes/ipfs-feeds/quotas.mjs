// Payload byte/file ceilings for these two scratch filesystem stores.
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
export const quota = {
  storeBytes: 1048576,
  storeFiles: 512,
  blockBytes: 65536,
  metadataBytes: 16384,
  stateBytes: 524288,
  totalPayloadBytes: 2097152,
};
export async function usage(paths) {
  let bytes = 0,
    files = 0;
  for (const path of paths) {
    for (const name of await readdir(path, { recursive: true })) {
      try {
        const file = await stat(join(path, name));
        if (file.isFile()) {
          bytes += file.size;
          files++;
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  return { bytes, files };
}
export function boundStores(blockstore, datastore) {
  let queued = Promise.resolve();
  for (const [store, max] of [
    [blockstore, quota.blockBytes],
    [datastore, quota.metadataBytes],
  ]) {
    const put = store.put.bind(store);
    store.put = (key, value, options) => {
      const run = queued.then(async () => {
        if (!(value instanceof Uint8Array) || value.byteLength > max)
          throw Error("Store record quota");
        const current = await usage([blockstore.path, datastore.path]);
        if (
          current.bytes + value.byteLength > quota.storeBytes ||
          current.files + 1 > quota.storeFiles
        )
          throw Error("Aggregate store quota");
        return put(key, value, options);
      });
      queued = run.catch(() => {});
      return run;
    };
  }
}
