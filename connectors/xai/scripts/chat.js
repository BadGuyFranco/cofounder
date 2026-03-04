import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

const DEFAULT_MODEL = 'grok-3';

function showHelp() {
  console.log(`
Chat Script - Send messages to xAI Grok

Usage: node scripts/chat.js <command> [options]

Commands:
  ask <message>         Send a single message and get a response
  help                  Show this help

Options:
  --model <id>          Model to use (default: ${DEFAULT_MODEL})
  --system <text>       System prompt
  --max-tokens <n>      Max output tokens (default: 4096)
  --temperature <n>     Temperature 0-2 (default: 1)
  --json                Request JSON output format

Examples:
  node scripts/chat.js ask "Explain the xAI API in one paragraph"
  node scripts/chat.js ask "List 5 startup ideas" --model grok-3-mini
  node scripts/chat.js ask "Extract name and email" --json --system "You extract structured data. Respond with JSON only."
`);
}

async function ask(message, flags, cfg) {
  if (!message) throw new Error('Message required. Usage: ask "your message"');

  const body = {
    model: flags.model || DEFAULT_MODEL,
    messages: [],
    max_tokens: parseInt(flags['max-tokens'] || '4096'),
    temperature: parseFloat(flags.temperature || '1'),
  };

  if (flags.system) {
    body.messages.push({ role: 'system', content: flags.system });
  }

  body.messages.push({ role: 'user', content: message });

  if (flags.json) {
    body.response_format = { type: 'json_object' };
  }

  const data = await apiRequest('/chat/completions', { method: 'POST', body }, cfg);

  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';
  const usage = data.usage || {};

  console.log(content);
  console.error(`\n[tokens: ${usage.prompt_tokens || 0} in / ${usage.completion_tokens || 0} out | model: ${data.model}]`);
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
