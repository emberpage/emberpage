import { Schema } from 'effect';
import { CID } from 'multiformats/cid';

export const MAX_IPFS_DAG_OVERHEAD = 64 * 1024;

const SnapshotCid = Schema.String.check(Schema.makeFilter((value) => {
  if (value.length > 128) return false;
  try {
    const cid = CID.parse(value);
    return cid.version === 1 && [0x55, 0x70].includes(cid.code) &&
      cid.multihash.code === 0x12 && cid.multihash.size === 32 &&
      cid.toString() === value;
  } catch { return false; }
}));
export const isSnapshotCid = Schema.is(SnapshotCid);
