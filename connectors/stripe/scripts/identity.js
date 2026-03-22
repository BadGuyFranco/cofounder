import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Stripe Identity Script - Verification sessions and reports

Usage: node scripts/identity.js <command> [options]

Commands:
  create-session              Create verification session
  list-sessions               List verification sessions
  get-session <id>            Get verification session
  cancel-session <id>         Cancel verification session
  redact-session <id>         Redact verification session
  list-reports                List verification reports
  get-report <id>             Get verification report
  accounts                    List configured Stripe credential profiles
  help                        Show this help

Options:
  --account <name>            Credential profile
  --mode <test|live>          Test or live keys (default: test)
  --type <document|id_number> Verification type or report type filter
  --status <status>
  --session <id>              Verification session id (list-reports filter)
  --limit <n>                 Max list results (default: paginate all)
`);
}

async function createSession(args, cfg) {
  if (!args.type) throw new Error('--type required (document or id_number)');
  const body = { type: args.type };
  const data = await apiRequest('/identity/verification_sessions', { method: 'POST', body }, cfg);
  console.log(`Verification session created: ${data.id}`);
  output(data);
}

async function listSessions(args, cfg) {
  const params = {};
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/identity/verification_sessions', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/identity/verification_sessions', params, cfg);
    output(items);
  }
}

async function getSession(id, cfg) {
  if (!id) throw new Error('Session id required. Usage: get-session <id>');
  const data = await apiRequest(`/identity/verification_sessions/${id}`, {}, cfg);
  output(data);
}

async function cancelSession(id, cfg) {
  if (!id) throw new Error('Session id required. Usage: cancel-session <id>');
  const data = await apiRequest(`/identity/verification_sessions/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Verification session canceled: ${id}`);
  output(data);
}

async function redactSession(id, cfg) {
  if (!id) throw new Error('Session id required. Usage: redact-session <id>');
  const data = await apiRequest(`/identity/verification_sessions/${id}/redact`, { method: 'POST', body: {} }, cfg);
  console.log(`Verification session redacted: ${id}`);
  output(data);
}

async function listReports(args, cfg) {
  const params = {};
  if (args.session) params.verification_session = args.session;
  if (args.type) params.type = args.type;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/identity/verification_reports', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/identity/verification_reports', params, cfg);
    output(items);
  }
}

async function getReport(id, cfg) {
  if (!id) throw new Error('Report id required. Usage: get-report <id>');
  const data = await apiRequest(`/identity/verification_reports/${id}`, {}, cfg);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'create-session':
        await createSession(args, cfg);
        break;
      case 'list-sessions':
        await listSessions(args, cfg);
        break;
      case 'get-session':
        await getSession(args._[1], cfg);
        break;
      case 'cancel-session':
        await cancelSession(args._[1], cfg);
        break;
      case 'redact-session':
        await redactSession(args._[1], cfg);
        break;
      case 'list-reports':
        await listReports(args, cfg);
        break;
      case 'get-report':
        await getReport(args._[1], cfg);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
