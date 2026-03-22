import { readFileSync } from 'fs';
import { basename } from 'path';
import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

const STRIPE_API = 'https://api.stripe.com/v1';

function showHelp() {
  console.log(`
Files Script - Stripe files and file links

Usage: node scripts/files.js <command> [args] [options]

Commands:
  upload                      Upload a file (multipart)
  list                        List files
  get <id>                    Get file by ID
  create-link                 Create a file link
  list-links                  List file links
  get-link <id>               Get file link by ID
  update-link <id>            Update a file link
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --file <path|id>            Local path (upload) or Stripe file ID file_xxx (create-link, list-links)
  --purpose <string>          Stripe purpose (upload), e.g. identity_document, dispute_evidence
  --expires-at <unix|iso>     Unix seconds or ISO date (create-link, update-link)
  --limit <n>                 Max results for list / list-links
  --metadata <json>           JSON object (update-link)

Examples:
  node scripts/files.js upload --file ./doc.pdf --purpose dispute_evidence
  node scripts/files.js list --purpose identity_document --limit 10
  node scripts/files.js get file_xxx
  node scripts/files.js create-link --file file_xxx --expires-at 1735689600
  node scripts/files.js list-links --file file_xxx
`);
}

function parseExpiresAt(raw) {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`Invalid --expires-at: ${raw}`);
  return Math.floor(ms / 1000);
}

function parseMetadataJson(raw) {
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON for --metadata: ${e.message}`);
  }
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    throw new Error('--metadata must be a JSON object');
  }
  return meta;
}

async function uploadFile(args, cfg) {
  if (!args.file) throw new Error('--file path required for upload');
  if (!args.purpose) throw new Error('--purpose required for upload');

  const buffer = readFileSync(args.file);
  const form = new FormData();
  form.append('purpose', args.purpose);
  form.append('file', new Blob([buffer]), basename(args.file));

  const response = await fetch(`${STRIPE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.secretKey}`,
      'Stripe-Version': '2024-06-20',
    },
    body: form,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text}`);
  }

  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`${msg} (${response.status})`);
  }

  console.log(`File uploaded: ${data.id}`);
  output(data);
}

async function listFiles(args, cfg) {
  const params = {};
  if (args.purpose) params.purpose = args.purpose;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/files', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/files', params, cfg);
    output(rows);
  }
}

async function getFile(id, cfg) {
  if (!id) throw new Error('File ID required. Usage: get <id>');
  const data = await apiRequest(`/files/${id}`, {}, cfg);
  output(data);
}

async function createLink(args, cfg) {
  if (!args.file) throw new Error('--file file_xxx required for create-link');
  const body = { file: args.file };
  const exp = parseExpiresAt(args['expires-at']);
  if (exp !== undefined) body.expires_at = exp;
  const data = await apiRequest('/file_links', { method: 'POST', body }, cfg);
  console.log(`File link created: ${data.id}`);
  output(data);
}

async function listLinks(args, cfg) {
  const params = {};
  if (args.file) params.file = args.file;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/file_links', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/file_links', params, cfg);
    output(rows);
  }
}

async function getLink(id, cfg) {
  if (!id) throw new Error('File link ID required. Usage: get-link <id>');
  const data = await apiRequest(`/file_links/${id}`, {}, cfg);
  output(data);
}

async function updateLink(id, args, cfg) {
  if (!id) throw new Error('File link ID required. Usage: update-link <id>');
  const body = {};
  const exp = parseExpiresAt(args['expires-at']);
  if (exp !== undefined) body.expires_at = exp;
  if (args.metadata) body.metadata = parseMetadataJson(args.metadata);
  if (Object.keys(body).length === 0) {
    throw new Error('Nothing to update. Use --expires-at and/or --metadata');
  }
  const data = await apiRequest(`/file_links/${id}`, { method: 'POST', body }, cfg);
  console.log(`File link updated: ${data.id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'upload':
        await uploadFile(args, cfg);
        break;
      case 'list':
        await listFiles(args, cfg);
        break;
      case 'get':
        await getFile(args._[1], cfg);
        break;
      case 'create-link':
        await createLink(args, cfg);
        break;
      case 'list-links':
        await listLinks(args, cfg);
        break;
      case 'get-link':
        await getLink(args._[1], cfg);
        break;
      case 'update-link':
        await updateLink(args._[1], args, cfg);
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
