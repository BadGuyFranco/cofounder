#!/usr/bin/env node

/**
 * Supabase Projects Script
 * Get project info and health status.
 *
 * Usage:
 *   node projects.js info
 *   node projects.js health
 *   node projects.js help
 */

import { parseArgs, loadConfig, restRequest } from './utils.js';

// Get project info
async function getProjectInfo(verbose, project) {
  const config = loadConfig(project);
  
  // Extract project ref from URL
  const urlMatch = config.url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = urlMatch ? urlMatch[1] : 'unknown';
  
  console.log('Project Information:');
  console.log(`  URL: ${config.url}`);
  console.log(`  Reference: ${projectRef}`);
  
  // Try to get database version
  try {
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.serviceKey,
        'Authorization': `Bearer ${config.serviceKey}`
      }
    });
    
    if (response.ok) {
      const postgrestVersion = response.headers.get('server') || 'Unknown';
      console.log(`  PostgREST: ${postgrestVersion}`);
      
      // Get available endpoints from OpenAPI spec
      const spec = JSON.parse(await response.text());
      const tables = Object.keys(spec.paths || {})
        .filter(p => p !== '/' && !p.startsWith('/rpc/'))
        .map(p => p.replace(/^\//, ''));
      
      console.log(`  Tables: ${tables.length}`);
      
      if (verbose) {
        console.log('\nAvailable tables:');
        for (const table of tables.sort()) {
          console.log(`    ${table}`);
        }
        
        const rpcs = Object.keys(spec.paths || {})
          .filter(p => p.startsWith('/rpc/'))
          .map(p => p.replace('/rpc/', ''));
        
        if (rpcs.length > 0) {
          console.log('\nRPC Functions:');
          for (const rpc of rpcs.sort()) {
            console.log(`    ${rpc}`);
          }
        }
      }
    }
  } catch (e) {
    console.log(`  Status: Unable to connect (${e.message})`);
  }
  
  // Check auth service
  try {
    const authResponse = await fetch(`${config.url}/auth/v1/health`, {
      headers: {
        'apikey': config.serviceKey
      }
    });
    console.log(`  Auth Service: ${authResponse.ok ? 'Healthy' : 'Unhealthy'}`);
  } catch (e) {
    console.log(`  Auth Service: Unable to check`);
  }
  
  // Check storage service
  try {
    const storageResponse = await fetch(`${config.url}/storage/v1/bucket`, {
      headers: {
        'apikey': config.serviceKey,
        'Authorization': `Bearer ${config.serviceKey}`
      }
    });
    if (storageResponse.ok) {
      const buckets = await storageResponse.json();
      console.log(`  Storage: ${buckets.length} bucket(s)`);
    } else {
      console.log(`  Storage: Enabled`);
    }
  } catch (e) {
    console.log(`  Storage: Unable to check`);
  }
  
  return { url: config.url, ref: projectRef };
}

// Check project health
async function checkHealth(verbose, project) {
  const config = loadConfig(project);
  const results = {
    database: false,
    auth: false,
    storage: false
  };
  
  console.log('Health Check:\n');
  
  // Database (PostgREST)
  try {
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.serviceKey,
        'Authorization': `Bearer ${config.serviceKey}`
      }
    });
    results.database = response.ok;
    console.log(`  Database:  ${response.ok ? 'OK' : 'FAIL'}`);
    if (!response.ok && verbose) {
      console.log(`    Status: ${response.status}`);
    }
  } catch (e) {
    console.log(`  Database:  FAIL (${e.message})`);
  }
  
  // Auth
  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: {
        'apikey': config.serviceKey
      }
    });
    results.auth = response.ok;
    console.log(`  Auth:      ${response.ok ? 'OK' : 'FAIL'}`);
    if (verbose) {
      const data = await response.json();
      console.log(`    Version: ${data.version || 'unknown'}`);
    }
  } catch (e) {
    console.log(`  Auth:      FAIL (${e.message})`);
  }
  
  // Storage
  try {
    const response = await fetch(`${config.url}/storage/v1/bucket`, {
      headers: {
        'apikey': config.serviceKey,
        'Authorization': `Bearer ${config.serviceKey}`
      }
    });
    results.storage = response.ok;
    console.log(`  Storage:   ${response.ok ? 'OK' : 'FAIL'}`);
  } catch (e) {
    console.log(`  Storage:   FAIL (${e.message})`);
  }
  
  // Overall status
  const allHealthy = Object.values(results).every(v => v);
  console.log(`\nOverall: ${allHealthy ? 'HEALTHY' : 'DEGRADED'}`);
  
  return results;
}

// Show help
function showHelp() {
  console.log('Supabase Projects Script');
  console.log('');
  console.log('Commands:');
  console.log('  info      Show project information');
  console.log('  health    Check project health');
  console.log('  help      Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --project <ref>  Target project (required if multiple configured)');
  console.log('  --verbose        Show detailed information');
  console.log('');
  console.log('Examples:');
  console.log('  # Show project info');
  console.log('  node projects.js info --project abc123');
  console.log('');
  console.log('  # Detailed project info');
  console.log('  node projects.js info --project abc123 --verbose');
  console.log('');
  console.log('  # Health check');
  console.log('  node projects.js health --project abc123');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const project = args.project;

  try {
    switch (command) {
      case 'info': {
        await getProjectInfo(verbose, project);
        break;
      }

      case 'health': {
        await checkHealth(verbose, project);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
