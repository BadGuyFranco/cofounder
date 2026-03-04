import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Models Script - List available xAI models

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
    created: m.created ? new Date(m.created * 1000).toISOString().split('T')[0] : null,
    owned_by: m.owned_by,
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
