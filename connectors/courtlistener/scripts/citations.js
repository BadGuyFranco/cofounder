import { initScript, parseArgs, apiRequest, authHeaders, output, outputError, CL_BASE } from './utils.js';

function showHelp() {
  console.log(`
CourtListener Citations - verify and resolve legal citations

Usage: node scripts/citations.js <command> [args]

Commands:
  lookup "<citation or text>"   Resolve citations in text to matched cases.
                                Accepts a reporter cite (e.g. "255 P.3d 1083")
                                or a block of text containing citations.
  verify "<citation>"           Alias for lookup. Use to confirm a single cite
                                resolves to a real case before filing.
  help                          Show this help.

Examples:
  node scripts/citations.js lookup "255 P.3d 1083"
  node scripts/citations.js verify "165 Colo. 244"
`);
}

/**
 * Citation Lookup API: POST text, returns each detected citation with the
 * matched opinion clusters (case name, court, date, citations, URL).
 */
async function lookup(token, text) {
  const body = new URLSearchParams({ text });
  const data = await apiRequest(`${CL_BASE}/citation-lookup/`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/x-www-form-urlencoded' }),
    body,
  });
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { token } = init;
  const { command, args } = parseArgs();

  try {
    switch (command) {
      case 'lookup':
      case 'verify':
        if (!args[0]) throw new Error('Citation or text required. Usage: lookup "<citation>"');
        await lookup(token, args.join(' '));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
