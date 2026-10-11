import { decodeArticle } from './article.js';

export const MIN_ARTICLE_CHARACTERS = 1000;
function failure(inspection) {
  if (
    !inspection ||
    typeof inspection.content !== 'string' ||
    typeof inspection.textContent !== 'string'
  )
    return 'inspection';
  if (
    inspection.textContent.replace(/\s+/gu, ' ').trim().length <
    MIN_ARTICLE_CHARACTERS
  )
    return 'content';
  if (
    !inspection.content.trim() ||
    !Number.isSafeInteger(inspection.blocks) ||
    inspection.blocks < 1 ||
    inspection.blocks > 50_000
  )
    return 'structure';
  if (
    !Number.isSafeInteger(inspection.images) ||
    inspection.images < 0 ||
    inspection.images > 10
  )
    return 'images';
  if (
    !Number.isFinite(inspection.textDensity) ||
    inspection.textDensity < 0.1 ||
    inspection.textDensity > 1
  )
    return 'density';
  return null;
}
export function rankCandidates(copies, ratings = new Map(), now = Date.now()) {
  return copies
    .map((copy) => {
      const rating = ratings.get(copy.contentHash);
      const cap = (count) =>
        Number.isSafeInteger(count) && count >= 0 ? Math.min(50, count) : 0;
      const age = Math.max(0, now - copy.listedAt) / 3_600_000;
      return {
        ...copy,
        score:
          (cap(rating?.upvotes) - cap(rating?.downvotes) + 2) / (age + 2) ** 1.5
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.contentHash.localeCompare(b.contentHash) ||
        a.blobHash.localeCompare(b.blobHash)
    );
}
/**
 * Inspect original file bytes before deriving a safe display projection.
 * @param {unknown} copies
 * @param {{ inspect?: (article: import('../types.ts').Article) => import('../types.ts').Inspection | Promise<import('../types.ts').Inspection>, now?: number, diagnostics?: object }} [options]
 * @returns {Promise<Array<import('../types.ts').ArticleCopy & { listedAt: number }>>}
 */
export async function filterCandidates(
  copies,
  { inspect, now = Date.now(), diagnostics } = {}
) {
  if (typeof inspect !== 'function')
    throw new Error('Article inspection is required.');
  const counts = {
    candidates: Array.isArray(copies) ? Math.min(copies.length, 100) : 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    reasons: {
      integrity: 0,
      content: 0,
      structure: 0,
      images: 0,
      density: 0,
      inspection: 0
    }
  };
  const accepted = new Map();
  for (const supplied of Array.isArray(copies) ? copies.slice(0, 100) : []) {
    let decoded;
    try {
      if (
        typeof supplied?.blobHash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(supplied.blobHash)
      )
        throw new Error('Missing file hash.');
      decoded = await decodeArticle(supplied.bytes, {
        blobHash: supplied.blobHash,
        now
      });
      if (
        decoded.contentHash !== supplied.contentHash ||
        decoded.urlHash !== supplied.urlHash ||
        decoded.size !== supplied.size ||
        !Number.isSafeInteger(supplied.listedAt) ||
        supplied.listedAt < 0 ||
        supplied.listedAt > now + 60_000
      )
        throw new Error('Copy metadata mismatch.');
    } catch {
      counts.rejected++;
      counts.reasons.integrity++;
      continue;
    }
    const previous = accepted.get(decoded.contentHash);
    if (previous) {
      previous.listedAt = Math.min(previous.listedAt, supplied.listedAt);
      counts.duplicates++;
      continue;
    }
    try {
      const inspection = await inspect(decoded.article),
        reason = failure(inspection);
      if (reason) {
        counts.rejected++;
        counts.reasons[reason]++;
        continue;
      }
      accepted.set(decoded.contentHash, {
        ...decoded,
        listedAt: supplied.listedAt,
        article: {
          ...decoded.article,
          content: inspection.content,
          textContent: inspection.textContent
        }
      });
      counts.accepted++;
    } catch (error) {
      counts.rejected++;
      counts.reasons[
        /more than ten images|image.*limit/i.test(error?.message || '')
          ? 'images'
          : 'inspection'
      ]++;
    }
  }
  if (diagnostics && typeof diagnostics === 'object')
    Object.assign(diagnostics, counts);
  return rankCandidates([...accepted.values()], new Map(), now);
}
