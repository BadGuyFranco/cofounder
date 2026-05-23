import { initScript, parseArgs, apiRequest, authHeaders, output, outputError, CL_BASE } from './utils.js';

function showHelp() {
  console.log(`
CourtListener Search - search case law and opinions

Usage: node scripts/search.js <command> [--flags]

Commands:
  opinions    Search opinions / case law
  help        Show this help

Flags:
  --q <query>       Full-text or case-name query (e.g. "leave to amend")
  --court <id>      Court id filter (e.g. "colo" for Colorado Supreme Court)
  --type <t>        Result type: o=opinions (default), r=RECAP, oa=oral args
  --limit <n>       Max results to request (page size)

Examples:
  node scripts/search.js opinions --q "motion to dismiss plausibility" --court colo
  node scripts/search.js opinions --q "Fladung v. City of Boulder"
`);
}

async function searchOpinions(token, flags) {
  const params = new URLSearchParams();
  params.set('type', flags.type || 'o');
  if (flags.q) params.set('q', flags.q);
  if (flags.court) params.set('court', flags.court);
  if (flags.limit) params.set('page_size', String(flags.limit));
  const data = await apiRequest(`${CL_BASE}/search/?${params.toString()}`, {
    headers: authHeaders(token),
  });
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { token } = init;
  const { command, flags } = parseArgs();

  try {
    switch (command) {
      case 'opinions':
        await searchOpinions(token, flags);
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
