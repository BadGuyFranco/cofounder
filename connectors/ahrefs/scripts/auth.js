/**
 * Ahrefs Auth - verify connectivity and (optionally) a paid API key.
 *
 * `check` always tests the free public DR endpoint (no key, no units).
 * If AHREFS_API_KEY is configured, it also validates the key with a free
 * test query (target ahrefs.com), so paid-tier access is confirmed too.
 */

import {
  apiGet, apiGetPublic, extractDr, hasApiKey,
  parseFlags, output, outputError, today
} from './utils.js';

function showHelp() {
  console.log(`
Ahrefs Auth - verify connectivity and optional paid key

Usage: node scripts/auth.js <command>

Commands:
  check     Test the free DR endpoint, and validate a paid key if one is set
  help      Show this help

Examples:
  node scripts/auth.js check
`);
}

async function check() {
  const result = {};

  // 1. Free public endpoint - works for everyone, no key required.
  const pub = await apiGetPublic('/v3/public/domain-rating-free', { target: 'ahrefs.com', output: 'json' });
  result.free_dr = {
    ok: true,
    message: 'Free DR endpoint reachable (no key, no units).',
    sample: { target: 'ahrefs.com', domain_rating: extractDr(pub) }
  };

  // 2. Paid key - only if configured.
  if (hasApiKey()) {
    try {
      await apiGet('/v3/site-explorer/domain-rating', { target: 'ahrefs.com', date: today() });
      result.paid_key = { ok: true, message: 'Paid API key valid (verified with a free test query, zero units).' };
    } catch (error) {
      result.paid_key = { ok: false, error: error.message };
    }
  } else {
    result.paid_key = {
      configured: false,
      message: 'No AHREFS_API_KEY set. Free DR (dr command) works without it. Advanced data (overview, refdomains, anchors, organic keywords) needs a paid key. See SETUP.md.'
    };
  }

  output(result);
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
