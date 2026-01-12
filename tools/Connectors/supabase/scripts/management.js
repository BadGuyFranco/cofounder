#!/usr/bin/env node

/**
 * Supabase Management Script
 * Account-level operations: list projects, create projects, get API keys.
 *
 * Uses Personal Access Token for account-wide access.
 *
 * Usage:
 *   node management.js list
 *   node management.js create <name> [--org <org-id>] [--region <region>] [--plan free]
 *   node management.js keys <project-ref>
 *   node management.js info <project-ref>
 *   node management.js pause <project-ref>
 *   node management.js restore <project-ref>
 *   node management.js delete <project-ref> [--force]
 *   node management.js configure <project-ref>
 *   node management.js help
 */

import { parseArgs, formatDate } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MANAGEMENT_API_URL = 'https://api.supabase.com/v1';

// Load account access token
function loadAccessToken() {
  const memoryEnvPath = path.join(
    process.env.HOME || '',
    'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/supabase/.env'
  );
  const localEnvPath = path.join(__dirname, '..', '.env');

  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN not found.');
    console.error('');
    console.error('Create a Personal Access Token at:');
    console.error('  https://supabase.com/dashboard/account/tokens');
    console.error('');
    console.error('Then add to /memory/Connectors/supabase/.env:');
    console.error('  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx');
    process.exit(1);
  }

  return process.env.SUPABASE_ACCESS_TOKEN;
}

// Make Management API request
async function managementRequest(endpoint, options = {}) {
  const token = loadAccessToken();
  const url = `${MANAGEMENT_API_URL}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Management API request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

// Get projects directory path
function getProjectsDir() {
  return path.join(
    process.env.HOME || '',
    'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/supabase/projects'
  );
}

// List all projects
async function listProjects(verbose) {
  const projects = await managementRequest('/projects');

  if (!projects || projects.length === 0) {
    console.log('No projects found.');
    console.log('');
    console.log('Create one with: node management.js create "my-project"');
    return [];
  }

  console.log(`Found ${projects.length} project(s):\n`);

  for (const project of projects) {
    const status = project.status || 'unknown';
    const statusIcon = status === 'ACTIVE_HEALTHY' ? '[active]' : `[${status.toLowerCase()}]`;
    
    console.log(`  ${project.name} (${project.id}) ${statusIcon}`);
    console.log(`    Region: ${project.region}`);
    console.log(`    URL: https://${project.id}.supabase.co`);
    
    if (verbose) {
      console.log(`    Created: ${formatDate(project.created_at)}`);
      console.log(`    Org: ${project.organization_id}`);
    }
    console.log('');
  }

  // Check which projects are configured
  const projectsDir = getProjectsDir();
  if (fs.existsSync(projectsDir)) {
    const configured = fs.readdirSync(projectsDir)
      .filter(f => f.endsWith('.env'))
      .map(f => f.replace('.env', ''));
    
    if (configured.length > 0) {
      console.log('Configured projects (have local credentials):');
      for (const ref of configured) {
        console.log(`  - ${ref}`);
      }
    }
  }

  return projects;
}

// Get project info
async function getProjectInfo(projectRef, verbose) {
  const project = await managementRequest(`/projects/${projectRef}`);

  console.log(`Project: ${project.name}`);
  console.log(`  Reference: ${project.id}`);
  console.log(`  URL: https://${project.id}.supabase.co`);
  console.log(`  Region: ${project.region}`);
  console.log(`  Status: ${project.status}`);
  console.log(`  Created: ${formatDate(project.created_at)}`);
  console.log(`  Organization: ${project.organization_id}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(project, null, 2));
  }

  return project;
}

// Get API keys for a project
async function getApiKeys(projectRef, verbose) {
  const keys = await managementRequest(`/projects/${projectRef}/api-keys`);

  console.log(`API Keys for project: ${projectRef}\n`);

  for (const key of keys) {
    console.log(`  ${key.name}:`);
    console.log(`    ${key.api_key}`);
    console.log('');
  }

  if (verbose) {
    console.log('Full response:');
    console.log(JSON.stringify(keys, null, 2));
  }

  return keys;
}

// Create a new project
async function createProject(name, options, verbose) {
  // Get organizations first if org not specified
  let orgId = options.org;
  
  if (!orgId) {
    const orgs = await managementRequest('/organizations');
    if (orgs.length === 0) {
      console.error('Error: No organizations found. Create one in the Supabase dashboard first.');
      process.exit(1);
    }
    if (orgs.length === 1) {
      orgId = orgs[0].id;
      console.log(`Using organization: ${orgs[0].name}`);
    } else {
      console.log('Available organizations:');
      for (const org of orgs) {
        console.log(`  ${org.id}: ${org.name}`);
      }
      console.error('\nError: Multiple organizations found. Specify one with --org <org-id>');
      process.exit(1);
    }
  }

  // Generate a random database password
  const dbPass = generatePassword();

  const body = {
    name: name,
    organization_id: orgId,
    region: options.region || 'us-east-1',
    plan: options.plan || 'free',
    db_pass: dbPass
  };

  console.log(`Creating project "${name}"...`);
  console.log(`  Region: ${body.region}`);
  console.log(`  Plan: ${body.plan}`);
  console.log('');

  const project = await managementRequest('/projects', {
    method: 'POST',
    body: body
  });

  console.log('Project created successfully!');
  console.log(`  Reference: ${project.id}`);
  console.log(`  URL: https://${project.id}.supabase.co`);
  console.log(`  Database Password: ${dbPass}`);
  console.log('');
  console.log('Note: Project may take 1-2 minutes to fully provision.');
  console.log('');
  console.log('To configure this project for local use:');
  console.log(`  node management.js configure ${project.id}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(project, null, 2));
  }

  return project;
}

// Sanitize project name for use as filename
function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .substring(0, 50);            // Limit length
}

// Configure a project (save credentials locally)
async function configureProject(projectRef, verbose) {
  console.log(`Configuring project: ${projectRef}`);
  console.log('');

  // Get project info to get the human-readable name
  let projectName = projectRef;
  try {
    const project = await managementRequest(`/projects/${projectRef}`);
    projectName = project.name || projectRef;
    console.log(`Project name: ${projectName}`);
  } catch (e) {
    console.log('Note: Could not fetch project name, using ref as name.');
  }

  // Get API keys
  const keys = await managementRequest(`/projects/${projectRef}/api-keys`);
  
  const serviceKey = keys.find(k => k.name === 'service_role');
  const anonKey = keys.find(k => k.name === 'anon');

  if (!serviceKey) {
    console.error('Error: Could not find service_role key for this project.');
    process.exit(1);
  }

  // Create projects directory if needed
  const projectsDir = getProjectsDir();
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  // Create sanitized filename from project name
  const sanitizedName = sanitizeProjectName(projectName);
  
  // Check if file already exists (avoid duplicates)
  let filename = sanitizedName;
  let counter = 1;
  while (fs.existsSync(path.join(projectsDir, `${filename}.env`))) {
    // Check if it's the same project (by ref)
    const existingContent = fs.readFileSync(path.join(projectsDir, `${filename}.env`), 'utf-8');
    if (existingContent.includes(`SUPABASE_PROJECT_REF=${projectRef}`)) {
      // Same project, overwrite
      break;
    }
    // Different project with same name, add number
    filename = `${sanitizedName}-${++counter}`;
  }

  // Write project-specific env file
  const envPath = path.join(projectsDir, `${filename}.env`);
  const envContent = `# Project: ${projectName}
# Reference: ${projectRef}
# Configured: ${new Date().toISOString()}

SUPABASE_PROJECT_REF=${projectRef}
SUPABASE_URL=https://${projectRef}.supabase.co
SUPABASE_SERVICE_KEY=${serviceKey.api_key}
SUPABASE_ANON_KEY=${anonKey ? anonKey.api_key : ''}
`;

  fs.writeFileSync(envPath, envContent);

  console.log('');
  console.log(`Credentials saved to: ${envPath}`);
  console.log('');
  console.log('You can now use this project with other scripts:');
  console.log(`  node scripts/tables.js list --project ${filename}`);
  console.log(`  node scripts/records.js list my_table --project ${filename}`);

  return { ref: projectRef, name: filename, configured: true };
}

// Pause a project
async function pauseProject(projectRef, verbose) {
  console.log(`Pausing project: ${projectRef}...`);
  
  await managementRequest(`/projects/${projectRef}/pause`, {
    method: 'POST'
  });

  console.log('Project paused successfully.');
  console.log('Note: Paused projects do not incur compute charges.');
}

// Restore a paused project
async function restoreProject(projectRef, verbose) {
  console.log(`Restoring project: ${projectRef}...`);
  
  await managementRequest(`/projects/${projectRef}/restore`, {
    method: 'POST'
  });

  console.log('Project restore initiated.');
  console.log('Note: May take a few minutes to fully restore.');
}

// Delete a project
async function deleteProject(projectRef, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(projectRef);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  console.log(`Deleting project: ${projectRef}...`);
  
  await managementRequest(`/projects/${projectRef}`, {
    method: 'DELETE'
  });

  console.log('Project deleted successfully.');

  // Remove local config if exists
  const projectsDir = getProjectsDir();
  const envPath = path.join(projectsDir, `${projectRef}.env`);
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
    console.log('Local credentials removed.');
  }

  return { ref: projectRef, deleted: true };
}

// List organizations
async function listOrganizations(verbose) {
  const orgs = await managementRequest('/organizations');

  console.log(`Found ${orgs.length} organization(s):\n`);

  for (const org of orgs) {
    console.log(`  ${org.name} (${org.id})`);
    if (verbose) {
      console.log(`    Billing: ${org.billing_email || 'not set'}`);
    }
  }

  return orgs;
}

// Generate random password
function generatePassword(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Confirm deletion
async function confirmDelete(projectRef) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Delete project ${projectRef}? This cannot be undone. Type the project ref to confirm: `, (answer) => {
      rl.close();
      resolve(answer === projectRef);
    });
  });
}

// Show help
function showHelp() {
  console.log('Supabase Management Script');
  console.log('');
  console.log('Account-level operations using Personal Access Token.');
  console.log('');
  console.log('Commands:');
  console.log('  list                              List all projects');
  console.log('  orgs                              List organizations');
  console.log('  info <project-ref>                Get project details');
  console.log('  keys <project-ref>                Get API keys for a project');
  console.log('  create <name> [options]           Create a new project');
  console.log('  configure <project-ref>           Save project credentials locally');
  console.log('  pause <project-ref>               Pause a project');
  console.log('  restore <project-ref>             Restore a paused project');
  console.log('  delete <project-ref>              Delete a project');
  console.log('  help                              Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                         Show detailed output');
  console.log('  --org <org-id>                    Organization ID (for create)');
  console.log('  --region <region>                 Region (default: us-east-1)');
  console.log('  --plan <plan>                     Plan: free, pro (default: free)');
  console.log('  --force                           Skip delete confirmation');
  console.log('');
  console.log('Available Regions:');
  console.log('  us-east-1      US East (N. Virginia)');
  console.log('  us-west-1      US West (N. California)');
  console.log('  eu-west-1      Europe (Ireland)');
  console.log('  eu-west-2      Europe (London)');
  console.log('  eu-central-1   Europe (Frankfurt)');
  console.log('  ap-southeast-1 Asia Pacific (Singapore)');
  console.log('  ap-northeast-1 Asia Pacific (Tokyo)');
  console.log('  ap-south-1     Asia Pacific (Mumbai)');
  console.log('  sa-east-1      South America (Sao Paulo)');
  console.log('');
  console.log('Setup:');
  console.log('  1. Create a Personal Access Token at:');
  console.log('     https://supabase.com/dashboard/account/tokens');
  console.log('');
  console.log('  2. Add to /memory/Connectors/supabase/.env:');
  console.log('     SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx');
  console.log('');
  console.log('Examples:');
  console.log('  # List all projects');
  console.log('  node management.js list');
  console.log('');
  console.log('  # Create a new project');
  console.log('  node management.js create "my-app" --region us-west-1');
  console.log('');
  console.log('  # Get API keys and configure locally');
  console.log('  node management.js configure abcdefghijkl');
  console.log('');
  console.log('  # Get just the keys');
  console.log('  node management.js keys abcdefghijkl');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        await listProjects(verbose);
        break;
      }

      case 'orgs': {
        await listOrganizations(verbose);
        break;
      }

      case 'info': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js info <project-ref>');
          process.exit(1);
        }
        await getProjectInfo(projectRef, verbose);
        break;
      }

      case 'keys': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js keys <project-ref>');
          process.exit(1);
        }
        await getApiKeys(projectRef, verbose);
        break;
      }

      case 'create': {
        const name = args._[1];
        if (!name) {
          console.error('Error: Project name is required');
          console.error('Usage: node management.js create <name> [--org <org-id>] [--region <region>]');
          process.exit(1);
        }
        await createProject(name, {
          org: args.org,
          region: args.region,
          plan: args.plan
        }, verbose);
        break;
      }

      case 'configure': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js configure <project-ref>');
          process.exit(1);
        }
        await configureProject(projectRef, verbose);
        break;
      }

      case 'pause': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js pause <project-ref>');
          process.exit(1);
        }
        await pauseProject(projectRef, verbose);
        break;
      }

      case 'restore': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js restore <project-ref>');
          process.exit(1);
        }
        await restoreProject(projectRef, verbose);
        break;
      }

      case 'delete': {
        const projectRef = args._[1];
        if (!projectRef) {
          console.error('Error: Project reference is required');
          console.error('Usage: node management.js delete <project-ref>');
          process.exit(1);
        }
        await deleteProject(projectRef, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
