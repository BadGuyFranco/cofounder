#!/usr/bin/env node

/**
 * Go High Level Funnels & Websites Script
 * Manage funnels and websites (read-only info).
 * 
 * Usage:
 *   node funnels.js list --location "Name"
 *   node funnels.js get <funnel-id> --location "Name"
 *   node funnels.js pages <funnel-id> --location "Name"
 *   node funnels.js websites --location "Name"
 *   node funnels.js website <website-id> --location "Name"
 *   node funnels.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List funnels
async function listFunnels(location, verbose) {
  const data = await apiRequest('GET', `/funnels/?locationId=${location.id}`, location.key);
  
  const funnels = data.funnels || [];
  console.log(`Found ${funnels.length} funnels:\n`);
  
  for (const funnel of funnels) {
    console.log(`- ${funnel.name}`);
    console.log(`  ID: ${funnel.id}`);
    if (funnel.stepsCount) console.log(`  Steps: ${funnel.stepsCount}`);
    if (funnel.updatedAt) console.log(`  Updated: ${formatDate(funnel.updatedAt)}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return funnels;
}

// Get funnel details
async function getFunnel(funnelId, location, verbose) {
  const data = await apiRequest('GET', `/funnels/${funnelId}`, location.key);
  
  const funnel = data.funnel || data;
  console.log(`Funnel: ${funnel.name}`);
  console.log(`ID: ${funnel.id}`);
  console.log(`Location: ${funnel.locationId}`);
  if (funnel.stepsCount) console.log(`Steps: ${funnel.stepsCount}`);
  if (funnel.domainUrl) console.log(`Domain: ${funnel.domainUrl}`);
  if (funnel.faviconUrl) console.log(`Favicon: ${funnel.faviconUrl}`);
  console.log(`Created: ${formatDate(funnel.createdAt)}`);
  console.log(`Updated: ${formatDate(funnel.updatedAt)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return funnel;
}

// List funnel pages
async function listFunnelPages(funnelId, location, verbose) {
  const data = await apiRequest('GET', `/funnels/${funnelId}/pages?locationId=${location.id}`, location.key);
  
  const pages = data.pages || [];
  console.log(`Found ${pages.length} pages in funnel:\n`);
  
  for (const page of pages) {
    console.log(`- ${page.name}`);
    console.log(`  ID: ${page.id}`);
    if (page.path) console.log(`  Path: ${page.path}`);
    if (page.url) console.log(`  URL: ${page.url}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return pages;
}

// List websites
async function listWebsites(location, verbose) {
  const data = await apiRequest('GET', `/websites/?locationId=${location.id}`, location.key);
  
  const websites = data.websites || [];
  console.log(`Found ${websites.length} websites:\n`);
  
  for (const site of websites) {
    console.log(`- ${site.name}`);
    console.log(`  ID: ${site.id}`);
    if (site.domain) console.log(`  Domain: ${site.domain}`);
    if (site.updatedAt) console.log(`  Updated: ${formatDate(site.updatedAt)}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return websites;
}

// Get website details
async function getWebsite(websiteId, location, verbose) {
  const data = await apiRequest('GET', `/websites/${websiteId}`, location.key);
  
  const site = data.website || data;
  console.log(`Website: ${site.name}`);
  console.log(`ID: ${site.id}`);
  if (site.domain) console.log(`Domain: ${site.domain}`);
  if (site.locationId) console.log(`Location: ${site.locationId}`);
  console.log(`Created: ${formatDate(site.createdAt)}`);
  console.log(`Updated: ${formatDate(site.updatedAt)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return site;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list':
      case 'funnels': {
        const location = resolveLocation(args.location, locationsConfig);
        await listFunnels(location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const funnelId = args._[1];
        
        if (!funnelId) {
          console.error('Error: Funnel ID is required');
          console.error('Usage: node funnels.js get <funnel-id> --location "Name"');
          process.exit(1);
        }
        
        await getFunnel(funnelId, location, verbose);
        break;
      }
      
      case 'pages': {
        const location = resolveLocation(args.location, locationsConfig);
        const funnelId = args._[1];
        
        if (!funnelId) {
          console.error('Error: Funnel ID is required');
          console.error('Usage: node funnels.js pages <funnel-id> --location "Name"');
          process.exit(1);
        }
        
        await listFunnelPages(funnelId, location, verbose);
        break;
      }
      
      case 'websites': {
        const location = resolveLocation(args.location, locationsConfig);
        await listWebsites(location, verbose);
        break;
      }
      
      case 'website': {
        const location = resolveLocation(args.location, locationsConfig);
        const websiteId = args._[1];
        
        if (!websiteId) {
          console.error('Error: Website ID is required');
          console.error('Usage: node funnels.js website <website-id> --location "Name"');
          process.exit(1);
        }
        
        await getWebsite(websiteId, location, verbose);
        break;
      }
      
      default:
        console.log('Go High Level Funnels & Websites Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"                List all funnels');
        console.log('  get <funnel-id> --location            Get funnel details');
        console.log('  pages <funnel-id> --location          List pages in a funnel');
        console.log('  websites --location "Name"            List all websites');
        console.log('  website <website-id> --location       Get website details');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('');
        console.log('Note: Funnels and websites are read-only via API.');
        console.log('Use the GHL builder to create/edit funnels and websites.');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
