#!/usr/bin/env node
/**
 * Cloudflare Pages Script
 * Manage Pages projects and deployments.
 * 
 * Note: Requires Account-level API token permissions.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError, loadConfig } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Pages Script - Manage Cloudflare Pages projects

Usage: node scripts/pages.js <command> [options]

Commands:
  projects                        List all Pages projects
  create <name>                   Create a new project
  delete <name>                   Delete a project
  info <name>                     Get project details
  deployments <name>              List deployments for a project
  deployment <name> <id>          Get deployment details
  rollback <name> <id>            Rollback to a specific deployment
  domains <name>                  List custom domains for a project
  help                            Show this help

Create Options:
  --production-branch <branch>    Production branch name (default: main)

Examples:
  node scripts/pages.js projects
  node scripts/pages.js create my-site --production-branch main
  node scripts/pages.js info my-site
  node scripts/pages.js deployments my-site
  node scripts/pages.js rollback my-site abc123
  node scripts/pages.js domains my-site
  node scripts/pages.js delete my-site

Note: Requires Account-level token with Cloudflare Pages Edit permission.
Note: For deploying, use 'wrangler pages deploy' or connect to Git in dashboard.
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listProjects() {
  const accountId = await getAccountId();
  const projects = await fetchAllPages(`/accounts/${accountId}/pages/projects`);
  
  const simplified = projects.map(p => ({
    name: p.name,
    subdomain: p.subdomain,
    production_branch: p.production_branch,
    created_on: p.created_on,
    domains: p.domains?.map(d => d.name) || []
  }));
  
  output(simplified);
}

async function createProject(name, flags) {
  if (!name) {
    throw new Error('Project name required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    body: {
      name,
      production_branch: flags['production-branch'] || 'main'
    }
  });

  console.log(`Created project: ${name}`);
  console.log(`Subdomain: ${data.result.subdomain}.pages.dev`);
  output(data.result);
}

async function deleteProject(name) {
  if (!name) {
    throw new Error('Project name required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/pages/projects/${name}`, {
    method: 'DELETE'
  });

  console.log(`Deleted project: ${name}`);
}

async function getProjectInfo(name) {
  if (!name) {
    throw new Error('Project name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/pages/projects/${name}`);
  output(data.result);
}

async function listDeployments(name) {
  if (!name) {
    throw new Error('Project name required');
  }

  const accountId = await getAccountId();
  const deployments = await fetchAllPages(`/accounts/${accountId}/pages/projects/${name}/deployments`);
  
  const simplified = deployments.map(d => ({
    id: d.id,
    url: d.url,
    environment: d.environment,
    created_on: d.created_on,
    latest_stage: d.latest_stage?.name,
    source: d.source?.type
  }));
  
  output(simplified);
}

async function getDeployment(name, deploymentId) {
  if (!name || !deploymentId) {
    throw new Error('Project name and deployment ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/pages/projects/${name}/deployments/${deploymentId}`);
  output(data.result);
}

async function rollbackDeployment(name, deploymentId) {
  if (!name || !deploymentId) {
    throw new Error('Project name and deployment ID required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/pages/projects/${name}/deployments/${deploymentId}/rollback`, {
    method: 'POST'
  });

  console.log(`Rolled back to deployment: ${deploymentId}`);
  output(data.result);
}

async function listDomains(name) {
  if (!name) {
    throw new Error('Project name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/pages/projects/${name}/domains`);
  output(data.result);
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
      case 'projects':
        await listProjects();
        break;

      case 'create':
        await createProject(args._[1], args);
        break;

      case 'delete':
        await deleteProject(args._[1]);
        break;

      case 'info':
        await getProjectInfo(args._[1]);
        break;

      case 'deployments':
        await listDeployments(args._[1]);
        break;

      case 'deployment':
        await getDeployment(args._[1], args._[2]);
        break;

      case 'rollback':
        await rollbackDeployment(args._[1], args._[2]);
        break;

      case 'domains':
        await listDomains(args._[1]);
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
