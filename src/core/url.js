const TRACKERS = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_ga|_gl)$/i;

/** Keep content-defining query parameters; strip fragments and known trackers. */
export function normalizeUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 8192) throw new Error('Invalid article URL.');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS article URL without credentials.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (TRACKERS.test(key)) url.searchParams.delete(key);
  return url.href;
}
