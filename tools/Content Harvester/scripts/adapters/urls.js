import { normalizeCandidate } from '../lib/normalize.js';

export async function collectUrl(source, context) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': context.userAgent,
      Accept: 'text/html, application/xhtml+xml, */*;q=0.8'
    },
    signal: AbortSignal.timeout(context.timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return [normalizeCandidate(extractMetadata(html, source.url, source), {
    ...context,
    source,
    sourceTopics: source.topics || []
  })];
}

export async function collectManualUrls(source, context) {
  const candidates = [];
  const errors = [];

  for (const url of source.urls || []) {
    try {
      const [candidate] = await collectUrl({ ...source, type: 'url', url }, context);
      candidates.push(candidate);
    } catch (error) {
      errors.push({
        source: source.source || source.name || url,
        source_type: source.type,
        message: error.message,
        retryable: true,
        url
      });
    }
  }

  return { candidates, errors };
}

function extractMetadata(html, url, source) {
  return {
    title: meta(html, 'og:title') || meta(html, 'twitter:title') || titleTag(html) || url,
    url,
    source: source.source || source.name || hostName(url),
    source_type: source.type,
    source_role: source.role,
    author: meta(html, 'author') || meta(html, 'article:author'),
    published_at: meta(html, 'article:published_time') || meta(html, 'date') || meta(html, 'pubdate'),
    summary: meta(html, 'og:description') || meta(html, 'twitter:description') || metaName(html, 'description'),
    content: '',
    raw: {
      extracted_meta: true
    }
  };
}

function meta(html, property) {
  const escaped = escapeRegex(property);
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i')
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }

  return '';
}

function metaName(html, name) {
  return meta(html, name);
}

function titleTag(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? decodeHtml(match[1]) : '';
}

function hostName(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return 'Manual URL';
  }
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
