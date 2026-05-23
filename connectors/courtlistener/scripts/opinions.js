import { initScript, parseArgs, apiRequest, authHeaders, output, outputError, CL_BASE } from './utils.js';

function showHelp() {
  console.log(`
CourtListener Opinions - fetch case metadata and full opinion text

Usage: node scripts/opinions.js <command> <id> [--flags]

Commands:
  cluster <id>    Get an opinion cluster: case name, citations, court, date,
                  and links to sub-opinions. (Cluster id from a citation lookup.)
  text <id>       Get a single opinion's full text by opinion id.
  help            Show this help

Flags:
  --field <name>  For "text": print only one field (plain_text | html |
                  html_with_citations). Default prints the full object.

Examples:
  node scripts/opinions.js cluster 5326417
  node scripts/opinions.js text 5156245 --field plain_text
`);
}

async function getCluster(token, id) {
  const data = await apiRequest(`${CL_BASE}/clusters/${id}/`, {
    headers: authHeaders(token),
  });
  output(data);
}

async function getOpinionText(token, id, field) {
  const data = await apiRequest(`${CL_BASE}/opinions/${id}/`, {
    headers: authHeaders(token),
  });
  if (field && data[field] !== undefined) {
    console.log(data[field]);
  } else {
    output(data);
  }
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { token } = init;
  const { command, args, flags } = parseArgs();

  try {
    switch (command) {
      case 'cluster':
        if (!args[0]) throw new Error('Cluster id required. Usage: cluster <id>');
        await getCluster(token, args[0]);
        break;
      case 'text':
        if (!args[0]) throw new Error('Opinion id required. Usage: text <id>');
        await getOpinionText(token, args[0], flags.field);
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
