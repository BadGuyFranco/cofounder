#!/usr/bin/env node
/**
 * Cloudflare R2 Script
 * Manage R2 object storage buckets and objects.
 * 
 * Note: Requires Account-level API token permissions.
 * See SETUP.md for creating an R2-enabled token.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError, loadConfig } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
R2 Script - Manage Cloudflare R2 object storage

Usage: node scripts/r2.js <command> [options]

Commands:
  buckets                         List all R2 buckets
  create-bucket <name>            Create a new bucket
  delete-bucket <name>            Delete a bucket (must be empty)
  list <bucket>                   List objects in a bucket
  put <bucket> <key> <file>       Upload a file to a bucket
  get <bucket> <key> [outfile]    Download an object from a bucket
  delete <bucket> <key>           Delete an object from a bucket
  head <bucket> <key>             Get object metadata
  list-tokens                     List R2 API tokens (S3-compatible credentials)
  create-token <bucket>           Create R2 API token scoped to a bucket
  delete-token <token-id>         Delete an R2 API token
  help                            Show this help

Options:
  --prefix <prefix>       Filter objects by prefix (for list)
  --limit <n>             Limit number of results (for list)
  --permission <perm>     Token permission: object-read, object-read-write (default), admin-read-write
  --ttl <seconds>         Token TTL in seconds (0 = no expiry, default)

Examples:
  node scripts/r2.js buckets
  node scripts/r2.js create-bucket my-bucket
  node scripts/r2.js list my-bucket
  node scripts/r2.js list my-bucket --prefix "uploads/"
  node scripts/r2.js put my-bucket files/doc.pdf ./document.pdf
  node scripts/r2.js get my-bucket files/doc.pdf ./downloaded.pdf
  node scripts/r2.js delete my-bucket files/doc.pdf
  node scripts/r2.js delete-bucket my-bucket
  node scripts/r2.js list-tokens
  node scripts/r2.js create-token cobuilder-uploads
  node scripts/r2.js create-token cobuilder-uploads --permission object-read-write

Note: Requires Account-level token with Workers R2 Storage Edit permission.
`);
}

// Get account ID from zones (first available)
async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listBuckets() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/r2/buckets`);
  output(data.result?.buckets || []);
}

async function createBucket(name) {
  if (!name) {
    throw new Error('Bucket name required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/r2/buckets`, {
    method: 'POST',
    body: { name }
  });

  console.log(`Created bucket: ${name}`);
  output(data.result);
}

async function deleteBucket(name) {
  if (!name) {
    throw new Error('Bucket name required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/r2/buckets/${name}`, {
    method: 'DELETE'
  });

  console.log(`Deleted bucket: ${name}`);
}

async function listObjects(bucket, flags) {
  if (!bucket) {
    throw new Error('Bucket name required');
  }

  const accountId = await getAccountId();
  
  let endpoint = `/accounts/${accountId}/r2/buckets/${bucket}/objects`;
  const params = [];
  
  if (flags.prefix) {
    params.push(`prefix=${encodeURIComponent(flags.prefix)}`);
  }
  if (flags.limit) {
    params.push(`limit=${flags.limit}`);
  }
  
  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  const data = await apiRequest(endpoint);
  
  // Simplified output
  const objects = (data.result?.objects || []).map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded
  }));
  
  output(objects);
}

async function putObject(bucket, key, filePath) {
  if (!bucket || !key || !filePath) {
    throw new Error('Bucket, key, and file path required. Usage: put <bucket> <key> <file>');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const accountId = await getAccountId();
  const config = loadConfig();
  
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);

  // R2 object upload uses a different endpoint format
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': contentType
      },
      body: fileContent
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  console.log(`Uploaded: ${filePath} -> ${bucket}/${key}`);
}

async function getObject(bucket, key, outfile) {
  if (!bucket || !key) {
    throw new Error('Bucket and key required. Usage: get <bucket> <key> [outfile]');
  }

  const accountId = await getAccountId();
  const config = loadConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Object not found: ${bucket}/${key}`);
    }
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  if (outfile) {
    fs.writeFileSync(outfile, buffer);
    console.log(`Downloaded: ${bucket}/${key} -> ${outfile}`);
  } else {
    // Output to stdout
    process.stdout.write(buffer);
  }
}

async function deleteObject(bucket, key) {
  if (!bucket || !key) {
    throw new Error('Bucket and key required. Usage: delete <bucket> <key>');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`, {
    method: 'DELETE'
  });

  console.log(`Deleted: ${bucket}/${key}`);
}

async function headObject(bucket, key) {
  if (!bucket || !key) {
    throw new Error('Bucket and key required. Usage: head <bucket> <key>');
  }

  const accountId = await getAccountId();
  const config = loadConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
    {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Object not found: ${bucket}/${key}`);
    }
    throw new Error(`Head failed: ${response.status}`);
  }

  const metadata = {
    key: key,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    lastModified: response.headers.get('last-modified'),
    etag: response.headers.get('etag')
  };

  output(metadata);
}

async function listTokens() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/r2/tokens`);
  const tokens = (data.result || []).map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    buckets: t.buckets?.map(b => `${b.bucketName} (${b.permission})`).join(', '),
    created: t.createdOn,
    expires: t.expiresOn || 'never'
  }));
  output(tokens);
}

async function createToken(bucket, flags) {
  if (!bucket) {
    throw new Error('Bucket name required. Usage: create-token <bucket> [--permission object-read-write]');
  }

  const permission = flags.permission || 'object-read-write';
  const validPermissions = ['object-read', 'object-read-write', 'admin-read', 'admin-read-write'];
  if (!validPermissions.includes(permission)) {
    throw new Error(`Invalid permission "${permission}". Valid: ${validPermissions.join(', ')}`);
  }

  const accountId = await getAccountId();
  const ttl = flags.ttl !== undefined ? parseInt(flags.ttl) : 0;

  const body = {
    buckets: [{ bucketName: bucket, permission }]
  };
  if (ttl > 0) body.ttlSeconds = ttl;

  const data = await apiRequest(`/accounts/${accountId}/r2/tokens`, {
    method: 'POST',
    body
  });

  const token = data.result;
  console.log(`\n✓ R2 API token created for bucket: ${bucket}`);
  console.log(`  Permission: ${permission}`);
  console.log(`\n  Access Key ID:     ${token.accessKeyId}`);
  console.log(`  Secret Access Key: ${token.secretAccessKey}`);
  console.log(`  Token ID:          ${token.id}`);
  console.log(`\n  Endpoint: https://${accountId}.r2.cloudflarestorage.com`);
  console.log(`\n  ⚠  Save the Secret Access Key now — it will not be shown again.`);
}

async function deleteToken(tokenId) {
  if (!tokenId) {
    throw new Error('Token ID required. Usage: delete-token <token-id>');
  }

  const accountId = await getAccountId();
  await apiRequest(`/accounts/${accountId}/r2/tokens/${tokenId}`, {
    method: 'DELETE'
  });

  console.log(`✓ Deleted R2 API token: ${tokenId}`);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
  };
  return types[ext] || 'application/octet-stream';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'buckets':
        await listBuckets();
        break;

      case 'create-bucket':
        await createBucket(args._[1]);
        break;

      case 'delete-bucket':
        await deleteBucket(args._[1]);
        break;

      case 'list':
        await listObjects(args._[1], args);
        break;

      case 'put':
        await putObject(args._[1], args._[2], args._[3]);
        break;

      case 'get':
        await getObject(args._[1], args._[2], args._[3]);
        break;

      case 'delete':
        await deleteObject(args._[1], args._[2]);
        break;

      case 'head':
        await headObject(args._[1], args._[2]);
        break;

      case 'list-tokens':
        await listTokens();
        break;

      case 'create-token':
        await createToken(args._[1], args);
        break;

      case 'delete-token':
        await deleteToken(args._[1]);
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
