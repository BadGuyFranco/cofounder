import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Models Script - List available Anthropic models

Usage: node scripts/models.js <command>

Commands:
  list        List all available models
  help        Show this help

Examples:
  node scripts/models.js list
`);
}

async function list(cfg) {
  const data = await apiRequest('/models', {}, cfg);
  const models = (data.data || []).map(m => ({
    id: m.id,
    display_name: m.display_name,
    created_at: m.created_at,
  }));
  output(models);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';
  if (command === 'help') { showHelp(); return; }
  const cfg = loadConfig();
  try {
    switch (command) {
      case 'list': await list(cfg); break;
      default: console.error(`Unknown command: ${command}`); showHelp(); process.exit(1);
    }
  } catch (error) { outputError(error); }
}

main();
