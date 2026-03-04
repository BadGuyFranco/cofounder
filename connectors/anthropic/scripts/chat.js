import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

function showHelp() {
  console.log(`
Chat Script - Send messages to Anthropic Claude

Usage: node scripts/chat.js <command> [options]

Commands:
  ask <message>         Send a single message and get a response
  help                  Show this help

Options:
  --model <id>          Model to use (default: ${DEFAULT_MODEL})
  --system <text>       System prompt
  --max-tokens <n>      Max output tokens (default: 4096)
  --temperature <n>     Temperature 0-1 (default: 1)

Available models:
  claude-3-5-sonnet-20241022   Best balance of speed and intelligence
  claude-3-5-haiku-20241022    Fastest, lowest cost
  claude-3-opus-20240229       Most powerful (slower, higher cost)

Examples:
  node scripts/chat.js ask "Summarize this in 3 bullet points: ..."
  node scripts/chat.js ask "Write a product description" --model claude-3-5-haiku-20241022
  node scripts/chat.js ask "Review this code" --system "You are a senior TypeScript engineer."
`);
}

async function ask(message, flags, cfg) {
  if (!message) throw new Error('Message required. Usage: ask "your message"');

  const body = {
    model: flags.model || DEFAULT_MODEL,
    max_tokens: parseInt(flags['max-tokens'] || '4096'),
    messages: [{ role: 'user', content: message }],
  };

  if (flags.system) body.system = flags.system;
  if (flags.temperature !== undefined) body.temperature = parseFloat(flags.temperature);

  const data = await apiRequest('/messages', { method: 'POST', body }, cfg);

  const content = data.content?.[0]?.text || '';
  const usage = data.usage || {};

  console.log(content);
  console.error(`\n[tokens: ${usage.input_tokens || 0} in / ${usage.output_tokens || 0} out | model: ${data.model}]`);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';
  if (command === 'help') { showHelp(); return; }

  const cfg = loadConfig();

  try {
    switch (command) {
      case 'ask': await ask(args._.slice(1).join(' '), args, cfg); break;
      default: console.error(`Unknown command: ${command}`); showHelp(); process.exit(1);
    }
  } catch (error) { outputError(error); }
}

main();
