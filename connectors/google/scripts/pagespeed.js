#!/usr/bin/env node
/**
 * Google PageSpeed Insights
 * Runs PageSpeed Insights on any URL and returns Core Web Vitals,
 * performance score, and specific improvement opportunities.
 *
 * API key loaded automatically from /memory/connectors/google/.env as PAGESPEED_API_KEY.
 * Falls back to anonymous (free) quota if no key is present.
 *
 * Usage:
 *   node pagespeed.js --url https://example.com
 *   node pagespeed.js --url https://example.com --strategy mobile
 *   node pagespeed.js --url https://example.com --strategy both
 *   node pagespeed.js --url https://example.com --json
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import {
  output,
  showHelp,
  loadEnvFile
} from './utils.js';

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Auth: API key in .env > anonymous
// PSI is a project-level API - it uses API keys, not user OAuth tokens.
// ---------------------------------------------------------------------------

function resolveAuth() {
  const env = loadEnvFile();
  if (env.PAGESPEED_API_KEY) {
    return { type: 'apikey', key: env.PAGESPEED_API_KEY };
  }
  return { type: 'anonymous' };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function runPageSpeed(url, strategy, auth) {
  const params = new URLSearchParams({ url, strategy });
  const headers = {};

  if (auth.type === 'oauth') {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'apikey') {
    params.set('key', auth.key);
  }

  const res = await fetch(`${PSI_ENDPOINT}?${params}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    let msg = `PageSpeed API error ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.error?.message) msg += `: ${parsed.error.message}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const RATING = {
  FAST: 'Good',
  AVERAGE: 'Needs Improvement',
  SLOW: 'Poor',
  NONE: 'N/A'
};

function getRating(category) {
  return RATING[category] || category || 'N/A';
}

function scoreLabel(score) {
  if (score === null || score === undefined) return 'N/A';
  const pct = Math.round(score * 100);
  if (pct >= 90) return `${pct} (Good)`;
  if (pct >= 50) return `${pct} (Needs Improvement)`;
  return `${pct} (Poor)`;
}

function extractFieldData(data) {
  const exp = data.loadingExperience;
  if (!exp || exp.overall_category === 'NONE') return null;

  const metrics = exp.metrics || {};
  return {
    overall: getRating(exp.overall_category),
    lcp: metrics.LARGEST_CONTENTFUL_PAINT_MS
      ? { p75: `${(metrics.LARGEST_CONTENTFUL_PAINT_MS.percentiles.p75 / 1000).toFixed(2)}s`, rating: getRating(metrics.LARGEST_CONTENTFUL_PAINT_MS.category) }
      : null,
    inp: metrics.INTERACTION_TO_NEXT_PAINT
      ? { p75: `${metrics.INTERACTION_TO_NEXT_PAINT.percentiles.p75}ms`, rating: getRating(metrics.INTERACTION_TO_NEXT_PAINT.category) }
      : null,
    cls: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
      ? { p75: (metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentiles.p75 / 100).toFixed(3), rating: getRating(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category) }
      : null,
    fcp: metrics.FIRST_CONTENTFUL_PAINT_MS
      ? { p75: `${(metrics.FIRST_CONTENTFUL_PAINT_MS.percentiles.p75 / 1000).toFixed(2)}s`, rating: getRating(metrics.FIRST_CONTENTFUL_PAINT_MS.category) }
      : null
  };
}

function extractLabData(data) {
  const audits = data.lighthouseResult?.audits || {};
  const categories = data.lighthouseResult?.categories || {};

  return {
    performanceScore: categories.performance?.score ?? null,
    lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
    tbt: audits['total-blocking-time']?.displayValue || 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
    fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
    si: audits['speed-index']?.displayValue || 'N/A',
    ttfb: audits['server-response-time']?.displayValue || 'N/A'
  };
}

function extractOpportunities(data) {
  const audits = data.lighthouseResult?.audits || {};
  const opportunities = [];

  for (const [id, audit] of Object.entries(audits)) {
    if (
      audit.details?.type === 'opportunity' &&
      audit.score !== null &&
      audit.score < 0.9 &&
      audit.details?.overallSavingsMs > 100
    ) {
      opportunities.push({
        title: audit.title,
        savings: audit.details.overallSavingsMs
          ? `~${Math.round(audit.details.overallSavingsMs)}ms savings`
          : '',
        score: audit.score
      });
    }
  }

  return opportunities.sort((a, b) => (b.savings > a.savings ? 1 : -1));
}

function extractDiagnostics(data) {
  const audits = data.lighthouseResult?.audits || {};
  const failed = [];

  const diagnosticIds = [
    'uses-optimized-images', 'uses-webp-images', 'uses-responsive-images',
    'offscreen-images', 'render-blocking-resources', 'unused-css-rules',
    'unused-javascript', 'uses-text-compression', 'uses-long-cache-ttl',
    'dom-size', 'bootup-time', 'font-display', 'third-party-summary',
    'no-document-write', 'duplicated-javascript', 'legacy-javascript'
  ];

  for (const id of diagnosticIds) {
    const audit = audits[id];
    if (audit && audit.score !== null && audit.score < 0.9) {
      failed.push({
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue || ''
      });
    }
  }

  return failed.sort((a, b) => a.score - b.score);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printResult(url, strategy, data) {
  const field = extractFieldData(data);
  const lab = extractLabData(data);
  const opportunities = extractOpportunities(data);
  const diagnostics = extractDiagnostics(data);

  const strategyLabel = strategy.charAt(0).toUpperCase() + strategy.slice(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${strategyLabel} - ${url}`);
  console.log('='.repeat(60));
  console.log(`\nPerformance Score: ${scoreLabel(lab.performanceScore)}`);

  if (field) {
    console.log(`\n--- Core Web Vitals (Field Data - Real Users) ---`);
    console.log(`Overall:  ${field.overall}`);
    if (field.lcp) console.log(`LCP:      ${field.lcp.p75.padEnd(10)} ${field.lcp.rating}`);
    if (field.inp) console.log(`INP:      ${field.inp.p75.padEnd(10)} ${field.inp.rating}`);
    if (field.cls) console.log(`CLS:      ${field.cls.p75.padEnd(10)} ${field.cls.rating}`);
    if (field.fcp) console.log(`FCP:      ${field.fcp.p75.padEnd(10)} ${field.fcp.rating}`);
  } else {
    console.log(`\n(No field data - site may have insufficient Chrome UX Report data)`);
  }

  console.log(`\n--- Lab Data (Simulated) ---`);
  console.log(`LCP:         ${lab.lcp}`);
  console.log(`TBT:         ${lab.tbt}  (lab proxy for INP)`);
  console.log(`CLS:         ${lab.cls}`);
  console.log(`FCP:         ${lab.fcp}`);
  console.log(`TTFB:        ${lab.ttfb}`);
  console.log(`Speed Index: ${lab.si}`);

  if (opportunities.length > 0) {
    console.log(`\n--- Top Opportunities ---`);
    for (const opp of opportunities.slice(0, 8)) {
      const savings = opp.savings ? ` (${opp.savings})` : '';
      console.log(`  - ${opp.title}${savings}`);
    }
  }

  if (diagnostics.length > 0) {
    console.log(`\n--- Failed Diagnostics ---`);
    for (const diag of diagnostics.slice(0, 8)) {
      const val = diag.displayValue ? ` - ${diag.displayValue}` : '';
      console.log(`  - ${diag.title}${val}`);
    }
  }

  console.log('');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  showHelp('Google PageSpeed Insights', {
    'Commands': [
      'help   Show this help'
    ],
    'Options': [
      '--url URL             URL to analyze (required)',
      '--strategy STRATEGY   mobile, desktop, or both (default: both)',
      '--json                Output raw JSON'
    ],
    'Examples': [
      'node pagespeed.js --url https://example.com',
      'node pagespeed.js --url https://example.com --strategy mobile',
      'node pagespeed.js --url https://example.com --strategy both --json'
    ],
    'Auth': [
      'PSI uses API keys, not OAuth. Add PAGESPEED_API_KEY to /memory/connectors/google/.env',
      'Without a key the free anonymous quota is used (fine for normal use).',
      'Enable: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com',
      'Create key: https://console.cloud.google.com/apis/credentials'
    ],
    'Thresholds': [
      'LCP   Good < 2.5s    Needs Improvement < 4.0s   Poor >= 4.0s',
      'INP   Good < 200ms   Needs Improvement < 500ms  Poor >= 500ms',
      'CLS   Good < 0.1     Needs Improvement < 0.25   Poor >= 0.25',
      'TTFB  Good < 800ms   Needs Improvement < 1.8s   Poor >= 1.8s'
    ]
  });
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help || flags.h || !flags.url) {
    printHelp();
    if (!flags.url) {
      console.error('\nError: --url is required');
      process.exit(1);
    }
    return;
  }

  const url = flags.url;
  const strategyArg = (flags.strategy || 'both').toLowerCase();

  if (!['mobile', 'desktop', 'both'].includes(strategyArg)) {
    console.error('Error: --strategy must be mobile, desktop, or both');
    process.exit(1);
  }

  const auth = resolveAuth();
  const strategies = strategyArg === 'both' ? ['mobile', 'desktop'] : [strategyArg];
  const authLabel = auth.type === 'apikey' ? 'API key' : 'anonymous quota';

  console.log(`\nRunning PageSpeed Insights for: ${url} [${authLabel}]`);

  const results = {};

  for (const strategy of strategies) {
    try {
      const data = await runPageSpeed(url, strategy, auth);
      results[strategy] = data;
      if (!flags.json) printResult(url, strategy, data);
    } catch (err) {
      if (err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
        console.error(`\nPageSpeed Insights daily quota exceeded.`);
        console.error(`\nTo fix: add PAGESPEED_API_KEY to /memory/connectors/google/.env`);
        console.error(`  1. Enable: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com`);
        console.error(`  2. Create key: https://console.cloud.google.com/apis/credentials`);
        console.error(`  3. Add to .env: PAGESPEED_API_KEY=your_key_here`);
      } else {
        console.error(`\nError (${strategy}): ${err.message}`);
      }
      process.exit(1);
    }
  }

  if (flags.json) output(results);
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
