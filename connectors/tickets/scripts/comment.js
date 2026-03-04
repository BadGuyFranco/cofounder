/**
 * Add a comment to a ticket in the CoBuilder ticketing system.
 *
 * Usage: node scripts/comment.js <ticket-id> --body "Comment text" [options]
 */

import { loadConfig, apiRequest, parseArgs, output, outputError, parseJsonArg } from './utils.js';

function showHelp() {
  console.log(`
Comment on Ticket - Add a comment to a ticket

Usage: node scripts/comment.js <ticket-id> --body "Comment text" [options]

Required:
  --body              Comment text

Optional:
  --commenter-type    developer|agent|user (default: developer)
  --metadata          JSON string with additional data
  --target            local|staging (default: local)
  --user-id           Override user ID

Examples:
  node scripts/comment.js <id> --body "Fixed by updating the import path"
  node scripts/comment.js <id> --body "Investigated: root cause is X" --commenter-type agent
`);
}

async function main() {
  const args = parseArgs();
  const id = args._[0];

  if (id === 'help' || args.help) { showHelp(); return; }
  if (!id) { console.error('Error: Ticket ID required'); showHelp(); process.exit(1); }
  if (!args.body) { console.error('Error: --body required'); showHelp(); process.exit(1); }

  const cfg = loadConfig(args);

  const body = {
    body: args.body,
  };

  if (args['commenter-type']) body.commenterType = args['commenter-type'];
  if (args.metadata) body.metadata = parseJsonArg(args.metadata);

  try {
    const result = await apiRequest(`/api/v1/tickets/${id}/comments`, { method: 'POST', body }, cfg);
    console.log(`Comment added to ticket ${id}`);
    output(result);
  } catch (error) {
    outputError(error);
  }
}

main();
