#!/usr/bin/env node
// sitemap-fetch.js
// Fetch, follow, parse, and normalize a site's sitemap(s) into a deterministic snapshot.
//
// Usage:
//   node sitemap-fetch.js --domain competitor.com
//   node sitemap-fetch.js --url https://competitor.com/sitemap_index.xml [--url ...]
//   node sitemap-fetch.js --domain competitor.com --out ../path/competitor.com-2026-06-03.json --pretty
//
// Flags:
//   --domain <host>   Discover sitemaps via robots.txt, then /sitemap.xml and /sitemap_index.xml.
//   --url <url>        Explicit sitemap or sitemap-index URL. Repeatable. Overrides discovery.
//   --max <n>          Cap on total URLs collected (default 50000). Sets "truncated": true when hit.
//   --date <YYYY-MM-DD> Stamp fetchedAt. Defaults to today. Pass for deterministic snapshots/tests.
//   --out <path>       Write snapshot JSON to this path. Defaults to stdout.
//   --pretty           Pretty-print JSON.
//
// Design rules (per AI SEO Operator Playbook, Helper Scripts):
//   - Follow sitemap-index files. Handle .gz and gzip-encoded responses.
//   - Never block the run: per-sitemap failures are collected into "errors" and skipped.
//   - Emit a snapshot even on partial failure. Exit 0 unless the CLI was misused.

import { gunzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const UA = 'SEO-Expert-SitemapFetch/1.0 (+https://github.com/cofounder)';
const FETCH_TIMEOUT_MS = 20000;
const MAX_INDEX_DEPTH = 5;

function parseArgs(argv) {
  const args = { urls: [], max: 50000, date: null, out: null, pretty: false, domain: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.urls.push(argv[++i]);
    else if (a === '--domain') args.domain = argv[++i];
    else if (a === '--max') args.max = parseInt(argv[++i], 10) || args.max;
    else if (a === '--date') args.date = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--pretty') args.pretty = true;
    else if (a === '-h' || a === '--help') args.help = true;
  }
  return args;
}

function today() {
  // Normal Node process: Date is available. Allow override via --date for determinism.
  return new Date().toISOString().slice(0, 10);
}

function hostFromDomain(domain) {
  return domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\/$/, '');
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/gi, '/');
}

async function fetchBytes(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Gzip by magic bytes or .gz extension, even if the server mislabels content-type.
    if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString('utf8');
    if (url.endsWith('.gz')) {
      try { return gunzipSync(buf).toString('utf8'); } catch { /* not actually gzipped */ }
    }
    return buf.toString('utf8');
  } finally {
    clearTimeout(t);
  }
}

function tagValues(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) {
    let v = m[1].trim();
    v = v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    out.push(decodeEntities(v));
  }
  return out;
}

// Split a urlset/sitemapindex into per-entry blocks so loc and lastmod stay paired.
function entryBlocks(xml, wrapper) {
  const re = new RegExp(`<${wrapper}[^>]*>([\\s\\S]*?)</${wrapper}>`, 'gi');
  const blocks = [];
  let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[1]);
  return blocks;
}

function isIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

function normalizeUrl(loc) {
  try {
    const u = new URL(loc);
    const path = u.pathname || '/';
    const segs = path.split('/').filter(Boolean);
    return { loc, path, slug: segs[segs.length - 1] || '', segment: segs[0] || '' };
  } catch {
    return { loc, path: loc, slug: '', segment: '' };
  }
}

async function discoverSitemaps(host) {
  const candidates = [];
  // robots.txt is the authoritative declaration of sitemap locations.
  try {
    const robots = await fetchBytes(`https://${host}/robots.txt`);
    for (const line of robots.split(/\r?\n/)) {
      const m = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (m) candidates.push(m[1].trim());
    }
  } catch { /* robots missing is fine */ }
  if (candidates.length === 0) {
    candidates.push(`https://${host}/sitemap.xml`, `https://${host}/sitemap_index.xml`);
  }
  return [...new Set(candidates)];
}

async function collect(seedUrls, max) {
  const urlsByLoc = new Map();
  const errors = [];
  const visited = new Set();
  const sitemapsSeen = [];
  let truncated = false;

  async function walk(url, depth) {
    if (truncated || visited.has(url) || depth > MAX_INDEX_DEPTH) return;
    visited.add(url);
    let xml;
    try {
      xml = await fetchBytes(url);
    } catch (e) {
      errors.push({ url, error: e.message });
      return;
    }
    if (isIndex(xml)) {
      const children = entryBlocks(xml, 'sitemap').flatMap((b) => tagValues(b, 'loc'));
      for (const child of children) {
        if (truncated) break;
        await walk(child, depth + 1);
      }
    } else {
      sitemapsSeen.push(url);
      for (const block of entryBlocks(xml, 'url')) {
        if (urlsByLoc.size >= max) { truncated = true; break; }
        const loc = tagValues(block, 'loc')[0];
        if (!loc) continue;
        const lastmodRaw = tagValues(block, 'lastmod')[0] || null;
        const lastmod = lastmodRaw ? lastmodRaw.slice(0, 10) : null;
        if (!urlsByLoc.has(loc)) urlsByLoc.set(loc, { ...normalizeUrl(loc), lastmod });
      }
    }
  }

  for (const u of seedUrls) {
    if (truncated) break;
    await walk(u, 0);
  }
  return { urls: [...urlsByLoc.values()], errors, sitemaps: sitemapsSeen, truncated };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.domain && args.urls.length === 0)) {
    console.error('Usage: node sitemap-fetch.js (--domain host | --url <sitemap-url> [--url ...]) [--max n] [--date YYYY-MM-DD] [--out path] [--pretty]');
    process.exit(args.help ? 0 : 1);
  }

  const host = args.domain ? hostFromDomain(args.domain) : hostFromDomain(new URL(args.urls[0]).host);
  const seedUrls = args.urls.length > 0 ? args.urls : await discoverSitemaps(host);
  const { urls, errors, sitemaps, truncated } = await collect(seedUrls, args.max);

  // Stable ordering so two runs of the same site diff cleanly.
  urls.sort((a, b) => (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0));

  const snapshot = {
    domain: host,
    fetchedAt: args.date || today(),
    sitemaps: sitemaps.length ? sitemaps : seedUrls,
    urls,
    count: urls.length,
    truncated,
  };
  if (errors.length) snapshot.errors = errors;
  if (urls.length === 0) {
    snapshot.note = 'N/A: no URLs parsed. Sitemap may be missing, blocked, or in an unsupported format.';
  }

  const json = JSON.stringify(snapshot, null, args.pretty ? 2 : 0);
  if (args.out) {
    writeFileSync(args.out, json);
    console.error(`Wrote ${urls.length} URLs to ${args.out}${truncated ? ' (truncated at --max)' : ''}${errors.length ? ` with ${errors.length} fetch error(s)` : ''}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((e) => {
  // Last-resort guard: still emit a labeled snapshot so a caller never hard-fails on this step.
  process.stdout.write(JSON.stringify({ urls: [], count: 0, note: `N/A: sitemap fetch failed (${e.message})` }) + '\n');
  process.exit(0);
});
