import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

const DEFAULT_MODEL = 'gpt-4o';

function showHelp() {
  console.log(`
Chat Script - Send messages to OpenAI

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

Available models:
  gpt-4o               Best balance — vision, speed, intelligence
  gpt-4o-mini          Fast and cheap, most tasks
  o3-mini              Reasoning model (slower, very accurate)
  o1                   Strongest reasoning model

Examples:
  node scripts/chat.js ask "Write a cold email for a SaaS product"
  node scripts/chat.js ask "What model are you?" --model gpt-4o-mini
  node scripts/chat.js ask "Parse this into JSON: ..." --json
  node scripts/chat.js ask "Review this plan" --system "You are a senior product manager."
`);
}

async function ask(message, flags, cfg) {
  if (!message) throw new Error('Message required. Usage: ask "your message"');

  const body = {
    model: flags.model || DEFAULT_MODEL,
    messages: [],
    max_tokens: parseInt(flags['max-tokens'] || '4096'),
  };

  if (flags.temperature !== undefined) {
    body.temperature = parseFloat(flags.temperature);
  }

  if (flags.system) {
    body.messages.push({ role: 'system', content: flags.system });
  }

  body.messages.push({ role: 'user', content: message });

  if (flags.json) {
    body.response_format = { type: 'json_object' };
  }

  const data = await apiRequest('/chat/completions', { method: 'POST', body }, cfg);

  const content = data.choices?.[0]?.message?.content || '';
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
