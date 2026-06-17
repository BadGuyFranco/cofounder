/**
 * Clarity Auth - verify the Data Export token works.
 *
 * `check` makes one minimal Live Insights call (numOfDays=1, no dimensions).
 * Note: every successful call counts against the 10-requests-per-day quota.
 */

import { getLiveInsights, hasToken, parseFlags, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Clarity Auth - verify the Data Export token

Usage: node scripts/auth.js <command>

Commands:
  check     Confirm the token is valid with one minimal Live Insights call
  help      Show this help

Note: a successful check spends 1 of your 10 daily API requests.

Examples:
  node scripts/auth.js check
`);
}

async function check() {
  if (!hasToken()) {
    output({
      ok: false,
      configured: false,
      message: 'No CLARITY_API_TOKEN set. Add it to /memory/connectors/clarity/.env. See SETUP.md.'
    });
    return;
  }

  const data = await getLiveInsights(1, []);
  const metrics = Array.isArray(data) ? data.map((m) => m.metricName).filter(Boolean) : [];
  output({
    ok: true,
    message: 'Token valid. Data Export API reachable.',
    metrics_returned: metrics,
    note: 'This check used 1 of your 10 daily API requests.'
  });
}

async function main() {
  const { positional } = parseFlags(process.argv.slice(2));
  const command = positional[0] || 'check';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'check':
        await check();
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
