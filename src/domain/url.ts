import { Predicate } from 'effect';
const TRACKERS: RegExp =
  /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_ga|_gl)$/i;
export function normalizeUrl(raw: unknown) {
  if (!Predicate.isString(raw) || raw.length > 8192)
    throw new Error('Invalid article URL.');
  const url: URL = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('Use an HTTP or HTTPS article URL without credentials.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (TRACKERS.test(key)) url.searchParams.delete(key);
  return url.href;
}
