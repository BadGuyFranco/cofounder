import { createHash } from 'crypto';

export function normalizeCandidate(input, context) {
  const discoveredAt = context.discoveredAt || new Date().toISOString();
  const url = input.url || input.link || '';
  const canonicalUrl = canonicalizeUrl(url);
  const title = cleanText(input.title || input.name || canonicalUrl || 'Untitled');
  const summary = cleanText(input.summary || input.description || input.excerpt || '');
  const content = cleanText(input.content || input.body || '');
  const publishedAt = normalizeDate(input.published_at || input.published || input.pubDate || input.isoDate || input.date);
  const topics = uniqueValues([...(context.requestTopics || []), ...(context.sourceTopics || []), ...(input.topics || [])]);
  const matchedTopics = matchTopics({ title, summary, content, url: canonicalUrl }, topics);

  return {
    id: hashId(`${canonicalUrl || title}|${publishedAt || ''}`),
    title,
    url,
    canonical_url: canonicalUrl || url,
    source: input.source || context.source?.source || context.source?.name || 'Unknown Source',
    source_type: input.source_type || context.source?.type || 'unknown',
    source_role: input.source_role || context.source?.role || 'discovery',
    author: cleanText(input.author || input.creator || ''),
    published_at: publishedAt,
    discovered_at: discoveredAt,
    summary,
    content,
    topics,
    matched_topics: matchedTopics,
    score: 0,
    score_reasons: [],
    discovered_by: {
      type: context.source?.type || 'unknown',
      source: context.source?.source || context.source?.name || 'Unknown Source',
      url: context.source?.url,
      connector: context.source?.connector,
      query: context.source?.query
    },
    raw: input.raw || input
  };
}

export function normalizeExternalItems(payload, context) {
  const items = extractItemArray(payload);
  return items.map((item) => normalizeCandidate(item, context));
}

function extractItemArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.candidates)) return payload.candidates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.children)) {
    return payload.data.children.map((child) => child.data || child);
  }
  if (payload && typeof payload === 'object') return [payload];
  return [];
}

export function canonicalizeUrl(value) {
  if (!value || typeof value !== 'string') return '';

  try {
    const url = new URL(value);
    url.hash = '';
    for (const param of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) {
      url.searchParams.delete(param);
    }
    const search = url.searchParams.toString();
    return `${url.origin}${url.pathname.replace(/\/$/, '')}${search ? `?${search}` : ''}`;
  } catch {
    return value.trim();
  }
}

export function normalizeTitle(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function matchTopics(fields, topics) {
  const haystack = `${fields.title} ${fields.summary} ${fields.content} ${fields.url}`.toLowerCase();
  return topics.filter((topic) => haystack.includes(String(topic).toLowerCase()));
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

function hashId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
