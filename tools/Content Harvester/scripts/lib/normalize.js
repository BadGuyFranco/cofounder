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
  const externalUrls = uniqueValues(input.external_urls || input.externalUrls || []);
  const metrics = normalizeMetrics(input.metrics || input.public_metrics || input.raw?.public_metrics || {});
  const engagementScore = calculateEngagementScore(metrics);

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
    external_urls: externalUrls,
    metrics,
    engagement_score: engagementScore,
    is_reply: Boolean(input.is_reply || input.raw?.in_reply_to_user_id || title.trim().startsWith('@')),
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
  return topics.filter((topic) => {
    const normalized = String(topic).toLowerCase();
    const terms = TOPIC_TERMS[normalized] || [normalized, normalized.replace(/_/g, ' ')];
    return terms.some((term) => matchesTerm(haystack, term));
  });
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

function normalizeMetrics(metrics) {
  return {
    like_count: Number(metrics.like_count || 0),
    retweet_count: Number(metrics.retweet_count || 0),
    reply_count: Number(metrics.reply_count || 0),
    quote_count: Number(metrics.quote_count || 0),
    bookmark_count: Number(metrics.bookmark_count || 0),
    impression_count: Number(metrics.impression_count || 0)
  };
}

function calculateEngagementScore(metrics) {
  return (
    metrics.like_count +
    (metrics.bookmark_count * 2) +
    (metrics.retweet_count * 3) +
    (metrics.quote_count * 4) +
    metrics.reply_count
  );
}

function matchesTerm(haystack, term) {
  const normalized = String(term).toLowerCase().trim();
  if (!normalized) return false;
  if (!/^[a-z0-9]+$/.test(normalized)) return haystack.includes(normalized);

  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i').test(haystack);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TOPIC_TERMS = {
  model_release: ['model', 'models', 'weights', 'release', 'released', 'launch', 'launched', 'huggingface', 'hugging face'],
  github_repo: ['github', 'repo', 'repository', 'open source', 'open-source', 'opensource'],
  agent_framework: ['agent', 'agents', 'framework', 'orchestration', 'langgraph', 'crewai', 'openhands', 'openclaw'],
  inference_breakthrough: ['inference', 'serving', 'latency', 'throughput', 'speed', 'faster', 'lora', 'gpu'],
  long_context_architecture: ['long context', 'long-context', 'context window', 'attention', 'architecture', 'sub-quadratic', 'subquadratic'],
  coding_tool: ['coding', 'code', 'developer', 'github bot', 'claude code', 'codex'],
  private_beta: ['private beta', 'beta', 'preview', 'waitlist'],
  technical_explainer: ['explainer', 'paper', 'arxiv', 'analysis', 'deep dive', 'technical report'],
  market_implication: ['market', 'founder', 'startup', 'enterprise', 'cost', 'pricing', 'vendor', 'adoption']
};

function hashId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
