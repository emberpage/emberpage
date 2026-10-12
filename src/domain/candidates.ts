import { Predicate } from 'effect';
import type { Article, ArticleCopy, Inspection, Rating } from './types.ts';
import { decodeArticle } from './article.ts';
const MIN_ARTICLE_CHARACTERS = 1000;
function failure(inspection: Inspection | null | undefined) {
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
    inspection.blocks > 50000
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
export function rankCandidates<
  T extends ArticleCopy & {
    listedAt: number;
  }
>(
  copies: T[],
  ratings: Map<string, Partial<Rating>> | undefined = new Map(),
  now: number | undefined = Date.now()
) {
  return copies
    .map((copy: T) => {
      const rating: Partial<Rating> | undefined = ratings.get(copy.contentHash);
      const cap: (count: unknown) => number = (count: unknown) =>
        Predicate.isNumber(count) && Number.isSafeInteger(count) && count >= 0
          ? Math.min(50, count)
          : 0;
      const age: number = Math.max(0, now - copy.listedAt) / 3600000;
      return {
        ...copy,
        score:
          (cap(rating?.upvotes) - cap(rating?.downvotes) + 2) / (age + 2) ** 1.5
      };
    })
    .sort(
      (
        a: T & {
          score: number;
        },
        b: T & {
          score: number;
        }
      ) =>
        b.score - a.score ||
        a.contentHash.localeCompare(b.contentHash) ||
        a.blobHash.localeCompare(b.blobHash)
    );
}
export async function filterCandidates(
  copies: unknown,
  {
    inspect,
    now = Date.now(),
    diagnostics
  }:
    | {
        inspect?:
          ((article: Article) => Inspection | Promise<Inspection>) | undefined;
        now?: number | undefined;
        diagnostics?: object | undefined;
      }
    | undefined = {}
): Promise<Array<ArticleCopy & { listedAt: number }>> {
  if (typeof inspect !== 'function')
    throw new Error('Article inspection is required.');
  const counts: {
    candidates: number;
    accepted: number;
    rejected: number;
    duplicates: number;
    reasons: {
      integrity: number;
      content: number;
      structure: number;
      images: number;
      density: number;
      inspection: number;
    };
  } = {
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
  const accepted: Map<
    string,
    ArticleCopy & {
      listedAt: number;
    }
  > = new Map();
  const inputs: unknown[] = Array.isArray(copies)
    ? (copies.slice(0, 100) as unknown[])
    : [];
  for (const input of inputs) {
    const supplied: Partial<ArticleCopy> = input as Partial<
      import('./types.ts').ArticleCopy
    >;
    let decoded: ArticleCopy;
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
        typeof supplied.listedAt !== 'number' ||
        !Number.isSafeInteger(supplied.listedAt) ||
        supplied.listedAt < 0 ||
        supplied.listedAt > now + 60000
      )
        throw new Error('Copy metadata mismatch.');
    } catch {
      counts.rejected++;
      counts.reasons.integrity++;
      continue;
    }
    const previous:
      | (ArticleCopy & {
          listedAt: number;
        })
      | undefined = accepted.get(decoded.contentHash);
    if (previous) {
      previous.listedAt = Math.min(previous.listedAt, supplied.listedAt);
      counts.duplicates++;
      continue;
    }
    try {
      const inspection: Inspection = await inspect(decoded.article),
        reason:
          'inspection' | 'content' | 'structure' | 'images' | 'density' | null =
          failure(inspection);
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
    } catch (error: unknown) {
      counts.rejected++;
      counts.reasons[
        /more than ten images|image.*limit/i.test(
          error instanceof Error ? error.message : ''
        )
          ? 'images'
          : 'inspection'
      ]++;
    }
  }
  if (diagnostics && typeof diagnostics === 'object')
    Object.assign(diagnostics, counts);
  return rankCandidates([...accepted.values()], new Map(), now);
}
