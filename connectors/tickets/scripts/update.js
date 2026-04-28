/**
 * Update a ticket in the CoBuilder ticketing system.
 *
 * Usage: node scripts/update.js <ticket-id> --status resolved [options]
 */

import { loadConfig, apiRequest, parseArgs, output, outputError, parseJsonArg } from './utils.js';

function showHelp() {
  console.log(`
Update Ticket - Modify a ticket in the CoBuilder ticketing system

Usage: node scripts/update.js <ticket-id> [options]

Options:
  --status        open|in_progress|waiting|resolved|closed|wont_fix
  --severity      critical|high|medium|low
  --type          bug|feature|support|task
  --visibility    private|team|internal|customer
  --component     Update component name
  --title         Update title
  --description   Update description
  --team-id       Team UUID (use "null" to clear)
  --assigned-to   User UUID (use "null" to clear)
  --tags          Comma-separated tags (use "null" to clear)
  --environment   Update environment
  --context       JSON string (replaces existing context)
  --metadata      JSON string (replaces existing metadata)
  --target        local|staging (default: local)
  --user-id       Override user ID

Examples:
  node scripts/update.js <id> --status in_progress
  node scripts/update.js <id> --status waiting
  node scripts/update.js <id> --status resolved
  node scripts/update.js <id> --severity high --component ide
  node scripts/update.js <id> --type feature --visibility team --team-id <uuid>
  node scripts/update.js <id> --assigned-to <uuid>
  node scripts/update.js <id> --tags "regression,critical-path"
  node scripts/update.js <id> --assigned-to null
`);
}

async function main() {
  const args = parseArgs();
  const id = args._[0];

  if (id === 'help' || args.help) { showHelp(); return; }
  if (!id) { console.error('Error: Ticket ID required'); showHelp(); process.exit(1); }

  const cfg = loadConfig(args);

  const body = {};
  if (args.status) body.status = args.status;
  if (args.severity) body.severity = args.severity;
  if (args.type) body.type = args.type;
  if (args.visibility) body.visibility = args.visibility;
  if (args.component) body.component = args.component;
  if (args.title) body.title = args.title;
  if (args.description) body.description = args.description;
  if (args.environment) body.environment = args.environment;
  if (args.context) body.context = parseJsonArg(args.context);
  if (args.metadata) body.metadata = parseJsonArg(args.metadata);

  // Nullable fields: "null" string clears the value
  if (args['team-id'] != null) body.teamId = args['team-id'] === 'null' ? null : args['team-id'];
  if (args['assigned-to'] != null) body.assignedTo = args['assigned-to'] === 'null' ? null : args['assigned-to'];
  if (args.tags != null) {
    body.tags = args.tags === 'null' ? null : args.tags.split(',').map(t => t.trim());
  }

  if (Object.keys(body).length === 0) {
    console.error('Error: At least one field to update is required');
    showHelp();
    process.exit(1);
  }

  try {
    const result = await apiRequest(`/api/v1/tickets/${id}`, { method: 'PATCH', body }, cfg);
    console.log(`Ticket updated: ${result.id} (status: ${result.status})`);
    output(result);
  } catch (error) {
    outputError(error);
  }
}

main();
