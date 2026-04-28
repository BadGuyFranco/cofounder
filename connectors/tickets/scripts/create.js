/**
 * Create a ticket in the CoBuilder ticketing system.
 *
 * Usage: node scripts/create.js --title "Bug title" --description "Details" --component server [options]
 *
 * Required:
 *   --title         Short summary of the issue
 *   --description   Full description (reproduction steps, expected vs actual)
 *   --component     CoBuilder package/area (server, ide, smart-layer, billing, etc.)
 *
 * Optional:
 *   --reporter-type  developer|agent|user (default: developer)
 *   --type           bug|feature|support|task (default: bug)
 *   --severity       critical|high|medium|low (default: medium)
 *   --visibility     private|team|internal|customer (default: internal)
 *   --team-id        Team UUID (required when visibility=team)
 *   --assigned-to    User UUID to assign the ticket to
 *   --tags           Comma-separated tags (e.g. "regression,ide-bugs-session")
 *   --environment    local|staging|production (default: null)
 *   --context        JSON string with packages, files, adrs, dependencies, related_tickets
 *   --metadata       JSON string with trace IDs, error stacks, etc.
 *   --org            Org UUID (default: CoBuilder HQ)
 *   --target         local|staging (default: local)
 *   --user-id        Override user ID
 */

import { loadConfig, apiRequest, parseArgs, output, outputError, parseJsonArg } from './utils.js';

function showHelp() {
  console.log(`
Create Ticket - File a bug in the CoBuilder ticketing system

Usage: node scripts/create.js --title "..." --description "..." --component <name> [options]

Required:
  --title           Short summary of the issue
  --description     Full description
  --component       CoBuilder package/area (server, ide, smart-layer, billing, etc.)

Optional:
  --reporter-type   developer|agent|user (default: developer)
  --type            bug|feature|support|task (default: bug)
  --severity        critical|high|medium|low (default: medium)
  --visibility      private|team|internal|customer (default: internal)
  --team-id         Team UUID (required when visibility=team)
  --assigned-to     User UUID to assign the ticket to
  --tags            Comma-separated tags (e.g. "regression,ide-bugs-session")
  --environment     local|staging|production
  --context         JSON: {"packages":[],"files":[],"adrs":[],"dependencies":[],"related_tickets":[]}
  --metadata        JSON: {"traceId":"...","errorStack":"..."}
  --org             Org UUID (default: CoBuilder HQ)
  --target          local|staging (default: local)
  --user-id         Override user ID

Examples:
  node scripts/create.js --title "Login fails" --description "Steps..." --component server --severity high
  node scripts/create.js --title "Type error" --description "..." --component ide --type bug --visibility internal
  node scripts/create.js --title "Add dark mode" --description "..." --component ide --type feature --tags "ui,theme"
`);
}

async function main() {
  const args = parseArgs();

  if (args._[0] === 'help' || args.help) { showHelp(); return; }

  if (!args.title) { console.error('Error: --title required'); showHelp(); process.exit(1); }
  if (!args.description) { console.error('Error: --description required'); showHelp(); process.exit(1); }
  if (!args.component) { console.error('Error: --component required'); showHelp(); process.exit(1); }

  const cfg = loadConfig(args);

  const body = {
    title: args.title,
    description: args.description,
    component: args.component,
    reporterType: args['reporter-type'] || 'developer',
    type: args.type || 'bug',
    severity: args.severity || 'medium',
    visibility: args.visibility || 'internal',
    orgId: cfg.orgId,
  };

  if (args['team-id']) body.teamId = args['team-id'];
  if (args['assigned-to']) body.assignedTo = args['assigned-to'];
  if (args.tags) body.tags = args.tags.split(',').map(t => t.trim());
  if (args.environment) body.environment = args.environment;
  if (args.context) body.context = parseJsonArg(args.context);
  if (args.metadata) body.metadata = parseJsonArg(args.metadata);

  try {
    const result = await apiRequest('/api/v1/tickets', { method: 'POST', body }, cfg);
    console.log(`Ticket created: ${result.id}`);
    output(result);
  } catch (error) {
    outputError(error);
  }
}

main();
