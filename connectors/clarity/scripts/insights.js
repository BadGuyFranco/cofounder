/**
 * Clarity Live Insights - behavior and friction signals for the project.
 *
 * insights   Raw dashboard data, optionally broken down by up to 3 dimensions
 * signals    Friction digest: dead/rage/error clicks, quick backs, excessive
 *            scroll, script errors, plus traffic, summed across returned rows
 *
 * The token maps to one Clarity project (one site), so there is no --domain.
 * Quota: 10 requests/project/day; data window is the last 1-3 days only.
 */

import {
  getLiveInsights, canonicalDimension, clampDays, buildSignalsDigest,
  DIMENSIONS, parseFlags, splitList, output, outputError
} from './utils.js';

function showHelp() {
  console.log(`
Clarity Live Insights - behavior and friction signals

Usage: node scripts/insights.js <command> [options]

Commands:
  insights    Raw Live Insights, optionally broken down by dimensions
  signals     Friction digest (dead/rage/error clicks, quick backs, scroll, errors) + traffic
  help        Show this help

Options:
  --days <1-3>            Lookback window: last 24/48/72 hours (default: 1)
  --dimensions <a,b,c>    Up to 3 of: ${DIMENSIONS.join(', ')}
  --by <dimension>        Shortcut for a single dimension (e.g. --by URL for per-page)

Quota: 10 requests per project per day. Data window is the last 1-3 days only.

Examples:
  node scripts/insights.js signals --days 3
  node scripts/insights.js signals --days 3 --by URL
  node scripts/insights.js insights --days 1 --dimensions URL,Device
`);
}

function resolveDimensions(flags) {
  const raw = flags.dimensions ? splitList(flags.dimensions) : (flags.by ? [flags.by] : []);
  const dims = [];
  for (const d of raw) {
    const canon = canonicalDimension(d);
    if (!canon) throw new Error(`Unsupported dimension "${d}". Allowed: ${DIMENSIONS.join(', ')}`);
    dims.push(canon);
  }
  if (dims.length > 3) throw new Error('At most 3 dimensions are allowed per request.');
  return dims;
}

async function insights(flags) {
  const days = clampDays(flags.days || 1);
  const dimensions = resolveDimensions(flags);
  const data = await getLiveInsights(days, dimensions);
  output({ window_days: days, dimensions, metrics: data });
}

async function signals(flags) {
  const days = clampDays(flags.days || 1);
  const dimensions = resolveDimensions(flags);
  const data = await getLiveInsights(days, dimensions);
  output(buildSignalsDigest(data, days, dimensions));
}

async function main() {
  const { flags, positional } = parseFlags(process.argv.slice(2));
  const command = positional[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'insights':
        await insights(flags);
        break;
      case 'signals':
        await signals(flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error.message);
  }
}

main();
