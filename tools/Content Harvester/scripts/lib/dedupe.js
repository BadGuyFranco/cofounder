import { createHash } from 'crypto';
import { normalizeTitle } from './normalize.js';

export function dedupeCandidates(candidates) {
  const seenUrls = new Map();
  const seenTitles = new Map();
  const accepted = [];
  const rejected = [];

  for (const candidate of candidates) {
    const urlKey = candidate.canonical_url || candidate.url;
    const titleKey = normalizeTitle(candidate.title);

    if (urlKey && seenUrls.has(urlKey)) {
      rejected.push(toRejected(candidate, 'duplicate:url', seenUrls.get(urlKey).id));
      continue;
    }

    if (titleKey && seenTitles.has(titleKey)) {
      rejected.push(toRejected(candidate, 'duplicate:title', seenTitles.get(titleKey).id));
      continue;
    }

    if (urlKey) seenUrls.set(urlKey, candidate);
    if (titleKey) seenTitles.set(titleKey, candidate);
    accepted.push(candidate);
  }

  return { accepted, rejected };
}

export function clusterCandidates(candidates) {
  const groups = new Map();

  for (const candidate of candidates) {
    const key = candidate.canonical_url || normalizeTitle(candidate.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }

  return Array.from(groups.values())
    .filter((items) => items.length > 0)
    .map((items) => ({
      cluster_id: hashId(items.map((item) => item.id).join('|')),
      title: items[0].title,
      item_ids: items.map((item) => item.id),
      urls: Array.from(new Set(items.map((item) => item.canonical_url || item.url).filter(Boolean))),
      sources: Array.from(new Set(items.map((item) => item.source).filter(Boolean))),
      top_score: Math.max(...items.map((item) => item.score || 0))
    }))
    .sort((a, b) => b.top_score - a.top_score);
}

function toRejected(candidate, reason, duplicateOf) {
  return {
    reason,
    duplicate_of: duplicateOf,
    title: candidate.title,
    url: candidate.url || candidate.canonical_url,
    source: candidate.source,
    source_type: candidate.source_type
  };
}

function hashId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
