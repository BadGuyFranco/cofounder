/**
 * List and search tickets in the CoBuilder ticketing system.
 *
 * Usage:
 *   node scripts/list.js                          List all tickets
 *   node scripts/list.js --status open             Filter by status
 *   node scripts/list.js search --q "trace"        Search by text
 *   node scripts/list.js get <ticket-id>           Get single ticket with comments
 */

import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
List/Search Tickets - Browse the CoBuilder ticketing system

Usage: node scripts/list.js [command] [options]

Commands:
  (default)           List tickets with optional filters
  search              Search tickets by text
  get <id>            Get a single ticket with comments
  help                Show this help

Filter Options (list and search):
  --status            open|in_progress|resolved|closed|wont_fix
  --severity          critical|high|medium|low
  --component         Filter by component name
  --limit             Max results (default: 50)
  --offset            Skip N results (default: 0)

Search Options:
  --q                 Search text (matches title and description)

Global Options:
  --target            local|staging (default: local)
  --user-id           Override user ID

Examples:
  node scripts/list.js
  node scripts/list.js --status open --severity high
  node scripts/list.js --component server
  node scripts/list.js search --q "typecheck"
  node scripts/list.js get 550e8400-e29b-41d4-a716-446655440000
`);
}

function formatTicketRow(t) {
  const sev = { critical: 'CRIT', high: 'HIGH', medium: 'MED ', low: 'LOW ' }[t.severity] || t.severity;
  const status = t.status.padEnd(11);
  return `  ${sev} | ${status} | ${t.component.padEnd(14)} | ${t.title}  [${t.id.slice(0, 8)}]`;
}

async function list(flags, cfg) {
  const params = {};
  if (flags.status) params.status = flags.status;
  if (flags.severity) params.severity = flags.severity;
  if (flags.component) params.component = flags.component;
  if (flags.limit) params.limit = flags.limit;
  if (flags.offset) params.offset = flags.offset;

  const data = await apiRequest('/api/v1/tickets', { params }, cfg);

  if (flags.json) {
    output(data);
    return;
  }

  console.log(`\nTickets (${data.count} results):\n`);
  if (data.tickets.length === 0) {
    console.log('  No tickets found.');
  } else {
    console.log('  SEV  | STATUS      | COMPONENT      | TITLE');
    console.log('  ---- | ----------- | -------------- | -----');
    for (const t of data.tickets) {
      console.log(formatTicketRow(t));
    }
  }
  console.log('');
}

async function search(flags, cfg) {
  const params = {};
  if (flags.q) params.q = flags.q;
  if (flags.status) params.status = flags.status;
  if (flags.severity) params.severity = flags.severity;
  if (flags.component) params.component = flags.component;
  if (flags.limit) params.limit = flags.limit;
  if (flags.offset) params.offset = flags.offset;

  const data = await apiRequest('/api/v1/tickets/search', { params }, cfg);

  if (flags.json) {
    output(data);
    return;
  }

  console.log(`\nSearch results (${data.count} matches):\n`);
  if (data.tickets.length === 0) {
    console.log('  No tickets found.');
  } else {
    console.log('  SEV  | STATUS      | COMPONENT      | TITLE');
    console.log('  ---- | ----------- | -------------- | -----');
    for (const t of data.tickets) {
      console.log(formatTicketRow(t));
    }
  }
  console.log('');
}

async function get(id, cfg) {
  if (!id) throw new Error('Ticket ID required. Usage: get <id>');
  const data = await apiRequest(`/api/v1/tickets/${id}`, {}, cfg);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'list';

  if (command === 'help' || args.help) { showHelp(); return; }

  const cfg = loadConfig(args);

  try {
    switch (command) {
      case 'list':   await list(args, cfg); break;
      case 'search': await search(args, cfg); break;
      case 'get':    await get(args._[1], cfg); break;
      default:
        // If the first arg looks like a UUID, treat it as "get"
        if (command.includes('-') && command.length > 8) {
          await get(command, cfg);
        } else {
          console.error(`Unknown command: ${command}`);
          showHelp();
          process.exit(1);
        }
    }
  } catch (error) {
    outputError(error);
  }
}

main();
