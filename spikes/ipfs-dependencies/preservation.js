import { IDBBlockstore } from 'blockstore-idb';
import { Key } from 'interface-datastore';
import { CID } from 'multiformats/cid';

export const LIMITS = Object.freeze({ fileBytes: 2 * 1024 * 1024, preservedBytes: 16 * 1024 * 1024, preservedRecords: 100, servedBytes: 8 * 1024 * 1024, servedRequests: 128, servingConcurrency: 2, servingQueue: 2, blockBytes: 1024 * 1024, receivedBytes: 16 * 1024 * 1024 });
export const LOCAL_ACCESS = Symbol('local block access');
const policyKey = new Key('/meshcache/preservation-policy');
function reject(message) { const err = new Error(message); err.name = 'PolicyLimitError'; throw err; }

// Public-only IDB is the sole Bitswap serving source. The offline/read IDB is never
// passed to its inbound block responder. CID permission covers every DAG block.
export class PreservationStore extends IDBBlockstore {
  constructor(name, datastore, limits = {}) { super(name); this.datastore = datastore; this.limits = { ...LIMITS }; for (const [key, value] of Object.entries(limits)) { if (!(key in LIMITS) || !Number.isInteger(value) || value < 1 || value > LIMITS[key]) reject('Test limits may only lower ceilings'); this.limits[key] = value; } this.state = { records: [], budget: { hour: Math.floor(Date.now() / 3600000), bytes: 0, requests: 0 }, denied: 0, deniedReasons: {}, peakActive: 0 }; this.active = 0; this.queue = []; this.pending = Promise.resolve(); this.capture = null; this.diskBytes = 0; }
  async open() { await super.open(); try { this.state = JSON.parse(new TextDecoder().decode(await this.datastore.get(policyKey))); } catch (err) { if (err.name !== 'NotFoundError') throw err; } this.state.deniedReasons ??= {}; this.state.peakActive ??= 0; this.allowed = new Set(this.state.records.flatMap(record => record.blocks)); for await (const { bytes } of super.getAll({ [LOCAL_ACCESS]: true })) for await (const chunk of bytes) this.diskBytes += chunk.length; if (this.diskBytes > this.limits.preservedBytes) reject('Existing public blocks exceed quota'); }
  save() { this.pending = this.pending.then(() => this.datastore.put(policyKey, new TextEncoder().encode(JSON.stringify(this.state)))); return this.pending; }
  info() { return { ...this.state, diskBytes: this.diskBytes, active: this.active, queued: this.queue.length, limits: this.limits, bytes: this.state.records.reduce((sum, r) => sum + r.bytes, 0), count: this.state.records.length }; }
  async has(cid, options = {}) { if (!options[LOCAL_ACCESS] && !this.allowed.has(cid.toString())) return false; return super.has(cid, options); }
  async *get(cid, options = {}) {
    if (options[LOCAL_ACCESS]) { yield* super.get(cid, options); return; }
    if (!this.allowed.has(cid.toString())) { const err = new Error('Not public'); err.name = 'NotFoundError'; throw err; }
    const budget = this.state.budget; const hour = Math.floor(Date.now() / 3600000); if (budget.hour !== hour) Object.assign(budget, { hour, bytes: 0, requests: 0 });
    if (budget.requests >= this.limits.servedRequests) { this.state.denied++; const reason = 'requests'; this.state.deniedReasons[reason] = (this.state.deniedReasons[reason] || 0) + 1; await this.save(); reject('Serving request/concurrency limit'); }
    await this.acquire(options.signal);
    try {
      if (budget.requests >= this.limits.servedRequests) { this.state.denied++; this.state.deniedReasons.requests = (this.state.deniedReasons.requests || 0) + 1; await this.save(); reject('Serving request budget exhausted'); } budget.requests++;
      for await (const chunk of super.get(cid, options)) {
        if (budget.bytes + chunk.length > this.limits.servedBytes) { this.state.denied++; this.state.deniedReasons.bytes = (this.state.deniedReasons.bytes || 0) + 1; await this.save(); reject('Serving byte budget exhausted'); }
        // Reserve persistently before handing bytes to Bitswap. Counts are
        // conservative: a HAVE probe may read bytes that it does not send.
        budget.bytes += chunk.length; await this.save(); if (!this.allowed.has(cid.toString())) { const err = new Error('Sharing revoked'); err.name = 'NotFoundError'; throw err; } yield chunk;
      }
    } finally { this.release(); }
  }
  async acquire(signal) {
    signal?.throwIfAborted();
    if (this.active < this.limits.servingConcurrency) { this.active++; this.state.peakActive = Math.max(this.state.peakActive, this.active); return; }
    if (this.queue.length >= this.limits.servingQueue) { this.state.denied++; this.state.deniedReasons.concurrency = (this.state.deniedReasons.concurrency || 0) + 1; await this.save(); reject('Serving concurrency queue full'); }
    await new Promise((resolve, rejectPromise) => {
      const job = { resolve: () => { cleanup(); resolve(); } };
      const abort = () => { this.queue = this.queue.filter(item => item !== job); cleanup(); rejectPromise(new Error('Queued serving request aborted')); };
      const timer = setTimeout(abort, 3000); const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      this.queue.push(job); this.state.peakQueue = Math.max(this.state.peakQueue || 0, this.queue.length); signal?.addEventListener('abort', abort, { once: true });
    });
  }
  release() { this.active--; const job = this.queue.shift(); if (job) { this.active++; this.state.peakActive = Math.max(this.state.peakActive, this.active); job.resolve(); } }
  async put(cid, bytes, options = {}) { const chunks = []; let length = 0; if (bytes instanceof Uint8Array) { chunks.push(bytes); length = bytes.length; } else for await (const chunk of bytes) { length += chunk.length; if (length > this.limits.fileBytes) reject('Block exceeds file limit'); chunks.push(chunk); } if (length > this.limits.fileBytes) reject('Block exceeds file limit'); const existing = await super.has(cid); if (!existing && this.diskBytes + length > this.limits.preservedBytes) reject('Public blockstore byte quota full'); this.capture?.set(cid.toString(), length); const result = await super.put(cid, chunks, options); if (!existing) this.diskBytes += length; return result; }
  async preserve(bytes, fs, pins) {
    if (bytes.length > this.limits.fileBytes) reject('Article exceeds 2 MiB');
    // One promotion at a time avoids quota checks racing. Readers may continue.
    if (this.promoting) reject('Preservation already in progress'); this.promoting = true;
    const before = new Set(this.allowed); this.capture = new Map();
    try {
      if (this.state.records.length >= this.limits.preservedRecords) reject('Preserved article count full');
      if (this.info().bytes + bytes.length > this.limits.preservedBytes) reject('Preserved byte quota full');
      const cid = await fs.addBytes(bytes); const existing = this.state.records.find(record => record.cid === cid.toString()); if (existing) return cid.toString();
      const blocks = []; for await (const child of pins.add(cid, { [LOCAL_ACCESS]: true, signal: AbortSignal.timeout(3000) })) blocks.push(child.toString());
      let physicalBytes = 0; for (const block of new Set(blocks)) { const importedSize = this.capture.get(block); if (importedSize != null) physicalBytes += importedSize; else for await (const chunk of super.get(CID.parse(block))) physicalBytes += chunk.length; }
      if (this.info().bytes + physicalBytes > this.limits.preservedBytes) { for await (const child of pins.rm(cid, { [LOCAL_ACCESS]: true, signal: AbortSignal.timeout(3000) })) {} reject('DAG blocks exceed preserved byte quota'); }
      await this.afterPin?.(cid.toString());
      const record = { cid: cid.toString(), bytes: physicalBytes, fileBytes: bytes.length, blocks: [...new Set(blocks)], sharedAt: Date.now() };
      this.state.records.push(record); try { await this.save(); } catch (err) { this.state.records = this.state.records.filter(item => item !== record); throw err; } for (const block of record.blocks) this.allowed.add(block); return cid.toString();
    } catch (err) { for (const block of this.capture.keys()) if (!before.has(block)) await this.deletePublicBlock(CID.parse(block)); throw err; }
    finally { this.capture = null; this.promoting = false; }
  }
  async reconcile(pins) {
    // The durable consent manifest is the commit point. Rebuild only its pins;
    // discard staging bytes/pin metadata left by an interrupted promotion.
    const committed = new Set(this.state.records.map(record => record.cid)); const oldPins = []; for await (const pin of pins.ls()) oldPins.push(pin.cid.toString());
    for (const prefix of ['/pin/', '/pinned-block/']) { const keys = []; for await (const key of this.datastore.queryKeys({ prefix })) keys.push(key); for (const key of keys) await this.datastore.delete(key); }
    const hashes = new Set(this.state.records.flatMap(record => record.blocks).map(cid => CID.parse(cid).multihash.bytes.join(','))); let removedBlocks = 0;
    for await (const { cid } of super.getAll({ [LOCAL_ACCESS]: true })) if (!hashes.has(cid.multihash.bytes.join(','))) { await this.deletePublicBlock(cid); removedBlocks++; }
    for (const record of this.state.records) { const blocks = []; for await (const cid of pins.add(CID.parse(record.cid), { [LOCAL_ACCESS]: true, signal: AbortSignal.timeout(3000) })) blocks.push(cid.toString()); if (blocks.length !== record.blocks.length || blocks.some(cid => !record.blocks.includes(cid))) reject('Committed preservation DAG changed'); }
    this.state.recovery = { removedPins: oldPins.filter(cid => !committed.has(cid)).length, removedBlocks, at: Date.now() }; await this.save();
  }
  async deletePublicBlock(cid) { let bytes = 0; if (await super.has(cid)) for await (const chunk of super.get(cid)) bytes += chunk.length; await super.delete(cid); this.diskBytes -= bytes; }
  async revoke(cid, pins) {
    const removed = this.state.records.find(record => record.cid === cid); if (!removed) return;
    this.state.records = this.state.records.filter(record => record.cid !== cid); this.allowed = new Set(this.state.records.flatMap(record => record.blocks)); await this.save();
    for await (const child of pins.rm(CID.parse(cid), { [LOCAL_ACCESS]: true, signal: AbortSignal.timeout(3000) })) {}
    for (const block of removed.blocks) if (!this.allowed.has(block)) await this.deletePublicBlock(CID.parse(block));
  }
}

// This sink rejects before persisting an oversized or cumulative download. A
// hostile Bitswap response may already have allocated memory upstream.
export class ReadStore extends IDBBlockstore {
  constructor(name, datastore) { super(name); this.datastore = datastore; this.receiving = null; this.bytes = 0; this.roots = []; this.rejections = {}; }
  async open() { await super.open(); try { this.roots = JSON.parse(new TextDecoder().decode(await this.datastore.get(new Key('/meshcache/read-roots')))); } catch (err) { if (err.name !== 'NotFoundError') throw err; } for await (const { bytes } of super.getAll()) for await (const chunk of bytes) this.bytes += chunk.length; if (this.bytes > LIMITS.receivedBytes || this.roots.length > 100) this.reject('Existing read cache exceeds quota'); }
  async put(cid, bytes, options = {}) {
    const chunks = []; let length = 0; if (bytes instanceof Uint8Array) { chunks.push(bytes); length = bytes.length; } else for await (const chunk of bytes) { length += chunk.length; if (length > LIMITS.fileBytes) this.reject('Received block exceeds 2 MiB'); chunks.push(chunk); }
    if (length > LIMITS.fileBytes) this.reject('Received block exceeds 2 MiB');
    const existing = await super.has(cid); if (!existing) {
      if (this.bytes + length > LIMITS.receivedBytes) this.reject('Read cache byte quota full');
      if (this.receiving && !this.receiving.has(cid.toString())) { if (this.receiving.size >= 32) this.reject('Received DAG block count exceeded'); const total = [...this.receiving.values()].reduce((sum, n) => sum + n, 0); if (total + length > LIMITS.fileBytes + 4096) this.reject('Received DAG exceeds article limit'); this.receiving.set(cid.toString(), length); }
      this.bytes += length;
    }
    try { return await super.put(cid, chunks, options); } catch (err) { if (!existing) { this.bytes -= length; this.receiving?.delete(cid.toString()); } throw err; }
  }
  async accept(cid) { if (!this.roots.includes(cid)) { if (this.roots.length >= 100) this.reject('Read cache article count full'); this.roots.push(cid); try { await this.datastore.put(new Key('/meshcache/read-roots'), new TextEncoder().encode(JSON.stringify(this.roots))); } catch (err) { this.roots = this.roots.filter(root => root !== cid); throw err; } } this.receiving = null; }
  async discardReceive() { if (this.receiving) for (const [cid, bytes] of this.receiving) { await super.delete(CID.parse(cid)); this.bytes -= bytes; } this.receiving = null; }
  reject(reason) { this.rejections[reason] = (this.rejections[reason] || 0) + 1; reject(reason); }
  info() { return { bytes: this.bytes, count: this.roots.length, roots: this.roots, rejections: this.rejections }; }
}
