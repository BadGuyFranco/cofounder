import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { normalizeCandidate } from '../lib/normalize.js';

const { XMLParser } = await import('fast-xml-parser');

export async function collectFeed(source, context) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': context.userAgent,
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
    },
    signal: AbortSignal.timeout(context.timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text'
  });
  const parsed = parser.parse(xml);
  const items = extractFeedItems(parsed);

  return items.map((item) => normalizeCandidate(mapFeedItem(item, source), {
    ...context,
    source,
    sourceTopics: source.topics || []
  }));
}

function extractFeedItems(parsed) {
  if (parsed?.rss?.channel?.item) {
    return asArray(parsed.rss.channel.item);
  }

  if (parsed?.feed?.entry) {
    return asArray(parsed.feed.entry);
  }

  return [];
}

function mapFeedItem(item, source) {
  const link = extractLink(item.link);
  const content = item['content:encoded'] || item.content || item.summary || item.description || '';
  return {
    title: nodeText(item.title),
    url: link,
    source: source.source || source.name,
    source_type: source.type,
    source_role: source.role,
    author: extractAuthor(item),
    published_at: item.pubDate || item.published || item.updated || item['dc:date'],
    summary: item.description || item.summary || '',
    content,
    raw: item
  };
}

function extractLink(link) {
  if (Array.isArray(link)) {
    const alternate = link.find((entry) => entry?.['@_rel'] === 'alternate') || link[0];
    return extractLink(alternate);
  }

  if (link && typeof link === 'object') {
    return link['@_href'] || link.href || link['#text'] || '';
  }

  return nodeText(link);
}

function extractAuthor(item) {
  const author = item.author || item['dc:creator'] || item.creator;
  if (author && typeof author === 'object') {
    return author.name || author.email || author['#text'] || '';
  }
  return nodeText(author);
}

function nodeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value['#text'] || '';
  return String(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
