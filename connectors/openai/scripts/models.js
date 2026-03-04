import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Models Script - List available OpenAI models

Usage: node scripts/models.js <command> [options]

Commands:
  list        List all available models
  get <id>    Get a specific model
  help        Show this help

Examples:
  node scripts/models.js list
  node scripts/models.js get gpt-4o
`);
}

async function list(cfg) {
  const data = await apiRequest('/models', {}, cfg);
  const models = (data.data || [])
    .sort((a, b) => b.created - a.created)
    .map(m => ({
      id: m.id,
      created: new Date(m.created * 1000).toISOString().split('T')[0],
      owned_by: m.owned_by,
    }));
  output(models);
}

async function get(id, cfg) {
  if (!id) throw new Error('Model ID required. Usage: get <id>');
  const data = await apiRequest(`/models/${id}`, {}, cfg);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';
  if (command === 'help') { showHelp(); return; }
  const cfg = loadConfig();
  try {
    switch (command) {
      case 'list': await list(cfg); break;
      case 'get':  await get(args._[1], cfg); break;
      default: console.error(`Unknown command: ${command}`); showHelp(); process.exit(1);
    }
  } catch (error) { outputError(error); }
}

main();
