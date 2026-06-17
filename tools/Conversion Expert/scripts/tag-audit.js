#!/usr/bin/env node
/**
 * Instrumentation auditor for the Conversion Expert.
 *
 * Fetches a live URL and reports which analytics / behavior tags are present
 * (Microsoft Clarity, GA4, GTM, Hotjar, Plausible, Meta Pixel, Segment),
 * extracting each tag's ID where possible. Phase 0 of an audit: "is this site
 * even instrumented, and with what?"
 *
 * Dependency-free (global fetch, Node 18+). No credentials needed.
 *
 * Limitation: this reads the SERVED HTML. A tag injected purely client-side
 * after hydration (rare; most loaders appear in SSR HTML) may be missed. For a
 * post-hydration DOM check, use the Browser Control tool. This is flagged in
 * the output as `method: served-html`.
 *
 * Usage:
 *   node scripts/tag-audit.js --url https://example.com
 *   node scripts/tag-audit.js --url https://example.com --raw   (also print raw matches)
 */

const DETECTORS = [
  {
    key: 'clarity',
    label: 'Microsoft Clarity',
    patterns: [
      /clarity\.ms\/tag\/([a-z0-9]+)/i,
      /["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]+)["']/i
    ]
  },
  {
    key: 'ga4',
    label: 'Google Analytics 4',
    patterns: [
      /gtag\/js\?id=(G-[A-Z0-9]+)/i,
      /gtag\(\s*["']config["']\s*,\s*["'](G-[A-Z0-9]+)["']/i
    ]
  },
  {
    key: 'gtm',
    label: 'Google Tag Manager',
    patterns: [
      /gtm\.js\?id=(GTM-[A-Z0-9]+)/i,
      /(GTM-[A-Z0-9]+)/
    ]
  },
  {
    key: 'hotjar',
    label: 'Hotjar',
    patterns: [/hjid\s*[:=]\s*(\d+)/i, /static\.hotjar\.com/i]
  },
  {
    key: 'plausible',
    label: 'Plausible',
    patterns: [/plausible\.io\/js\/[^"']*/i]
  },
  {
    key: 'metaPixel',
    label: 'Meta Pixel',
    patterns: [/fbq\(\s*["']init["']\s*,\s*["'](\d+)["']/i, /connect\.facebook\.net\/[^"']*fbevents\.js/i]
  },
  {
    key: 'segment',
    label: 'Segment',
    patterns: [/cdn\.segment\.com\/analytics\.js\/v1\/([a-z0-9]+)/i, /cdn\.segment\.com/i]
  }
];

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[key] = next; i++; }
      else { flags[key] = true; }
    }
  }
  return flags;
}

function detect(html) {
  const found = {};
  for (const d of DETECTORS) {
    let present = false;
    let id = null;
    for (const re of d.patterns) {
      const m = html.match(re);
      if (m) {
        present = true;
        if (m[1] && !id) id = m[1];
      }
    }
    found[d.key] = { label: d.label, present, id };
  }
  return found;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CoFounder-ConversionExpert/1.0; instrumentation-audit)' }
  });
  const html = await res.text();
  return { status: res.status, finalUrl: res.url, html };
}

function showHelp() {
  console.log(`
Instrumentation auditor - which analytics/behavior tags are on a site

Usage: node scripts/tag-audit.js --url <url> [--raw]

Options:
  --url <url>   Page to audit (required)
  --raw         Include a short raw-HTML snippet around each match

Detects: Microsoft Clarity, GA4, GTM, Hotjar, Plausible, Meta Pixel, Segment.
Reads served HTML (method: served-html). For client-only injection, use Browser Control.

Examples:
  node scripts/tag-audit.js --url https://www.example.com
`);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help || !flags.url) {
    showHelp();
    process.exit(flags.url ? 0 : 1);
  }

  let url = String(flags.url);
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const { status, finalUrl, html } = await fetchHtml(url);
    const tags = detect(html);
    const present = Object.values(tags).filter((t) => t.present).map((t) => t.label);
    const missing = Object.values(tags).filter((t) => !t.present).map((t) => t.label);

    const result = {
      url,
      final_url: finalUrl,
      http_status: status,
      method: 'served-html',
      html_bytes: html.length,
      tags,
      summary: {
        present,
        clarity_installed: tags.clarity.present,
        ga4_installed: tags.ga4.present
      },
      missing_note: missing.length ? `Not detected in served HTML: ${missing.join(', ')}. If any are loaded client-side only, confirm with Browser Control.` : null
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    process.exit(1);
  }
}

main();
