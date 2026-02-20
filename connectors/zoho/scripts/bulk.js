#!/usr/bin/env node

/**
 * Zoho CRM Bulk Operations
 * Bulk read and write operations for large datasets.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {
  initScript, parseArgs, apiRequest, handleError, showHelp, MEMORY_DIR
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Bulk Operations', {
    'Commands': [
      'read <module>               Create bulk read job',
      'write <module>              Create bulk write job',
      'status <job_id>             Check job status',
      'download <job_id>           Download job results',
      'jobs                        List recent bulk jobs',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--file <path>               CSV file for bulk write',
      '--output <path>             Output path for downloads',
      '--criteria <string>         Filter criteria for bulk read',
      '--fields <list>             Comma-separated fields for bulk read',
      '--page <n>                  Page number for bulk read',
      '--operation <type>          Write operation: insert, update, upsert',
      '--callback <url>            Callback URL for job completion',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node bulk.js read Leads --fields "Last_Name,Email,Company"',
      'node bulk.js read Contacts --criteria "((Created_Time:greater_than:2024-01-01))"',
      'node bulk.js write Leads --file leads.csv --operation insert',
      'node bulk.js status 1234567890',
      'node bulk.js download 1234567890 --output results.zip',
      'node bulk.js jobs'
    ],
    'Bulk Read': [
      'Creates a job to export records from a module.',
      'Results are provided as a ZIP file containing CSV(s).',
      'Max 200,000 records per job.'
    ],
    'Bulk Write': [
      'Creates a job to import records from a CSV file.',
      'Operations: insert (new only), update (existing only), upsert (both)',
      'Max 25,000 records per file.'
    ]
  });
}

// Create bulk read job
async function createBulkRead(moduleName, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Creating bulk read job for ${moduleName}...\n`);
  
  const body = {
    query: {
      module: { api_name: moduleName }
    }
  };
  
  // Add fields if specified
  if (args.fields) {
    body.query.fields = args.fields.split(',').map(f => ({ api_name: f.trim() }));
  }
  
  // Add criteria if specified
  if (args.criteria) {
    body.query.criteria = { criteria: args.criteria };
  }
  
  // Add page if specified
  if (args.page) {
    body.query.page = parseInt(args.page);
  }
  
  // Add callback URL if specified
  if (args.callback) {
    body.callback = { url: args.callback, method: 'post' };
  }
  
  const data = await apiRequest('POST', '/crm/bulk/v8/read', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const job = data.data[0];
    console.log('Bulk read job created!\n');
    console.log(`Job ID: ${job.details.id}`);
    console.log(`Status: ${job.status}`);
    console.log('\nUse "bulk.js status <job_id>" to check progress.');
    console.log('Use "bulk.js download <job_id>" when complete.');
  }
}

// Create bulk write job
async function createBulkWrite(moduleName, args) {
  const { config, token } = await initScript(args);
  
  if (!args.file) {
    console.error('Error: --file <path> is required');
    console.error('Provide path to a CSV file with records to import.');
    process.exit(1);
  }
  
  // Check if file exists
  if (!fs.existsSync(args.file)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }
  
  const operation = args.operation || 'insert';
  if (!['insert', 'update', 'upsert'].includes(operation)) {
    console.error('Error: --operation must be insert, update, or upsert');
    process.exit(1);
  }
  
  console.log(`Creating bulk write job for ${moduleName}...\n`);
  console.log(`File: ${args.file}`);
  console.log(`Operation: ${operation}\n`);
  
  // Read file content
  const fileContent = fs.readFileSync(args.file);
  const fileName = path.basename(args.file);
  
  // Step 1: Upload the file
  const formData = new FormData();
  formData.append('file', new Blob([fileContent]), fileName);
  
  const uploadResponse = await fetch(`https://content.zohoapis.${config.region === 'us' ? 'com' : config.region}/crm/v8/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`
    },
    body: formData
  });
  
  const uploadData = await uploadResponse.json();
  
  if (!uploadResponse.ok) {
    console.error('Error uploading file:', uploadData);
    process.exit(1);
  }
  
  const fileId = uploadData.data[0].details.id;
  console.log(`File uploaded: ${fileId}`);
  
  // Step 2: Create bulk write job
  const body = {
    operation: operation,
    resource: [{
      type: 'data',
      module: { api_name: moduleName },
      file_id: fileId
    }]
  };
  
  // Add callback URL if specified
  if (args.callback) {
    body.callback = { url: args.callback, method: 'post' };
  }
  
  const data = await apiRequest('POST', '/crm/bulk/v8/write', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const job = data.data[0];
    console.log('\nBulk write job created!\n');
    console.log(`Job ID: ${job.details.id}`);
    console.log(`Status: ${job.status}`);
    console.log('\nUse "bulk.js status <job_id>" to check progress.');
  }
}

// Check job status
async function checkJobStatus(jobId, args) {
  const { config, token } = await initScript(args);
  
  // Try bulk read first
  let data;
  let jobType = 'read';
  
  try {
    data = await apiRequest('GET', `/crm/bulk/v8/read/${jobId}`, token, null, { region: config.region });
  } catch (e) {
    // Try bulk write
    try {
      data = await apiRequest('GET', `/crm/bulk/v8/write/${jobId}`, token, null, { region: config.region });
      jobType = 'write';
    } catch (e2) {
      console.error(`Error: Job not found: ${jobId}`);
      process.exit(1);
    }
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const job = data.data?.[0] || data;
  
  console.log(`Bulk ${jobType.toUpperCase()} Job Status\n`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Status: ${job.state || job.status || 'Unknown'}`);
  
  if (job.result) {
    console.log('\nResults:');
    if (job.result.count !== undefined) {
      console.log(`  Total Records: ${job.result.count}`);
    }
    if (job.result.download_url) {
      console.log(`  Download URL: ${job.result.download_url}`);
    }
  }
  
  if (job.operation) {
    console.log(`Operation: ${job.operation}`);
  }
  
  if (job.created_time) {
    console.log(`Created: ${new Date(job.created_time).toLocaleString()}`);
  }
}

// Download job results
async function downloadJobResults(jobId, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Downloading results for job ${jobId}...\n`);
  
  // Get job status first
  let data;
  let jobType = 'read';
  
  try {
    data = await apiRequest('GET', `/crm/bulk/v8/read/${jobId}`, token, null, { region: config.region });
  } catch (e) {
    try {
      data = await apiRequest('GET', `/crm/bulk/v8/write/${jobId}`, token, null, { region: config.region });
      jobType = 'write';
    } catch (e2) {
      console.error(`Error: Job not found: ${jobId}`);
      process.exit(1);
    }
  }
  
  const job = data.data?.[0] || data;
  
  if (job.state !== 'COMPLETED' && job.status !== 'COMPLETED') {
    console.error(`Error: Job is not complete. Current status: ${job.state || job.status}`);
    process.exit(1);
  }
  
  // Download the file
  const downloadUrl = job.result?.download_url;
  
  if (!downloadUrl) {
    console.error('Error: No download URL available for this job');
    process.exit(1);
  }
  
  const response = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`
    }
  });
  
  if (!response.ok) {
    console.error(`Error downloading file: ${response.status}`);
    process.exit(1);
  }
  
  const buffer = await response.arrayBuffer();
  const outputPath = args.output || `bulk_${jobType}_${jobId}.zip`;
  
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  
  console.log(`Downloaded to: ${outputPath}`);
  console.log(`Size: ${Math.round(buffer.byteLength / 1024)} KB`);
}

// List recent jobs
async function listJobs(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching recent bulk jobs...\n');
  
  // Get both read and write jobs
  let readJobs = [];
  let writeJobs = [];
  
  try {
    const readData = await apiRequest('GET', '/crm/bulk/v8/read', token, null, { region: config.region });
    readJobs = readData.data || [];
  } catch (e) {
    // May not have read jobs
  }
  
  try {
    const writeData = await apiRequest('GET', '/crm/bulk/v8/write', token, null, { region: config.region });
    writeJobs = writeData.data || [];
  } catch (e) {
    // May not have write jobs
  }
  
  if (args.verbose) {
    console.log('Read Jobs:', JSON.stringify(readJobs, null, 2));
    console.log('Write Jobs:', JSON.stringify(writeJobs, null, 2));
    return;
  }
  
  const allJobs = [
    ...readJobs.map(j => ({ ...j, type: 'READ' })),
    ...writeJobs.map(j => ({ ...j, type: 'WRITE' }))
  ].sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
  
  if (allJobs.length === 0) {
    console.log('No bulk jobs found.');
    return;
  }
  
  console.log(`Found ${allJobs.length} jobs:\n`);
  
  for (const job of allJobs.slice(0, 20)) {
    const status = job.state || job.status || 'Unknown';
    console.log(`- [${job.type}] ${job.id}`);
    console.log(`  Status: ${status}`);
    if (job.created_time) {
      console.log(`  Created: ${new Date(job.created_time).toLocaleString()}`);
    }
    if (job.result?.count !== undefined) {
      console.log(`  Records: ${job.result.count}`);
    }
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'read':
        if (!args._[1]) {
          console.error('Error: Module name required');
          console.error('Usage: node bulk.js read <module> --fields "Field1,Field2"');
          process.exit(1);
        }
        await createBulkRead(args._[1], args);
        break;
      case 'write':
        if (!args._[1]) {
          console.error('Error: Module name required');
          console.error('Usage: node bulk.js write <module> --file data.csv --operation insert');
          process.exit(1);
        }
        await createBulkWrite(args._[1], args);
        break;
      case 'status':
        if (!args._[1]) {
          console.error('Error: Job ID required');
          console.error('Usage: node bulk.js status <job_id>');
          process.exit(1);
        }
        await checkJobStatus(args._[1], args);
        break;
      case 'download':
        if (!args._[1]) {
          console.error('Error: Job ID required');
          console.error('Usage: node bulk.js download <job_id> --output results.zip');
          process.exit(1);
        }
        await downloadJobResults(args._[1], args);
        break;
      case 'jobs':
        await listJobs(args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
