#!/usr/bin/env node

/**
 * WordPress Connector Utilities
 * Multi-site support with Application Password authentication.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs } from '../../../system/shared/utils.js';

// Built-in Node.js modules
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/wordpress/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/wordpress/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'wordpress');

let loadedSite = null;
let siteConfig = null;

/**
 * List available WordPress sites
 */
export function listSites() {
  const sites = [];
  
  // Check for default site
  if (fs.existsSync(path.join(MEMORY_DIR, '.env'))) {
    sites.push('default');
  }
  
  // Check for named site directories
  if (fs.existsSync(MEMORY_DIR)) {
    const entries = fs.readdirSync(MEMORY_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && fs.existsSync(path.join(MEMORY_DIR, entry.name, '.env'))) {
        sites.push(entry.name);
      }
    }
  }
  
  return sites;
}

/**
 * Load environment for a specific site
 */
export function loadEnv(localDir, site = null) {
  let envPath;
  
  if (site && site !== 'default') {
    envPath = path.join(MEMORY_DIR, site, '.env');
    if (!fs.existsSync(envPath)) {
      console.error(`Error: Site "${site}" not found.`);
      console.error(`Expected credentials at: ${envPath}`);
      console.error('');
      console.error('Available sites:');
      const sites = listSites();
      if (sites.length === 0) {
        console.error('  (none configured)');
      } else {
        for (const s of sites) {
          console.error(`  - ${s}`);
        }
      }
      console.error('');
      console.error('See SETUP.md for multi-site configuration.');
      process.exit(1);
    }
  } else {
    const memoryEnvPath = path.join(MEMORY_DIR, '.env');
    const localEnvPath = path.join(localDir, '.env');
    
    if (fs.existsSync(memoryEnvPath)) {
      envPath = memoryEnvPath;
    } else if (fs.existsSync(localEnvPath)) {
      envPath = localEnvPath;
    } else {
      const sites = listSites();
      if (sites.length > 0) {
        console.error('Error: No default site configured.');
        console.error('');
        console.error('Available sites (use --site <name>):');
        for (const s of sites) {
          console.error(`  - ${s}`);
        }
        console.error('');
        console.error('Example: node scripts/posts.js list --site myblog');
      } else {
        console.error('Error: No .env file found.');
        console.error('Create /memory/connectors/wordpress/.env with:');
        console.error('  WP_SITE_URL=https://yoursite.com');
        console.error('  WP_USERNAME=your_username');
        console.error('  WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx');
        console.error('');
        console.error('For multiple sites, create subdirectories:');
        console.error('  /memory/connectors/wordpress/myblog/.env');
        console.error('  /memory/connectors/wordpress/myshop/.env');
        console.error('');
        console.error('See SETUP.md for instructions.');
      }
      process.exit(1);
    }
  }
  
  dotenv.config({ path: envPath });
  loadedSite = site || 'default';
  return envPath;
}

/**
 * Get site configuration from environment
 */
export function getConfig() {
  if (siteConfig) return siteConfig;
  
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPassword = process.env.WP_APP_PASSWORD;
  
  if (!siteUrl) {
    console.error('Error: WP_SITE_URL is required.');
    console.error('Add it to your .env file: WP_SITE_URL=https://yoursite.com');
    process.exit(1);
  }
  
  if (!username || !appPassword) {
    console.error('Error: WP_USERNAME and WP_APP_PASSWORD are required.');
    console.error('Add them to your .env file.');
    console.error('');
    console.error('See SETUP.md for creating an Application Password.');
    process.exit(1);
  }
  
  // Normalize site URL (remove trailing slash)
  const normalizedUrl = siteUrl.replace(/\/+$/, '');
  
  // Create Basic Auth header
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
  
  siteConfig = {
    siteUrl: normalizedUrl,
    apiBase: `${normalizedUrl}/wp-json/wp/v2`,
    username,
    authHeader: `Basic ${credentials}`
  };
  
  return siteConfig;
}

/**
 * Get loaded site name
 */
export function getLoadedSite() {
  return loadedSite;
}

// Re-export parseArgs from shared utils
export { parseArgs };

/**
 * Make API request to WordPress REST API
 */
export async function apiRequest(endpoint, options = {}) {
  const config = getConfig();
  const { method = 'GET', body, params = {} } = options;
  
  // Build URL
  let url = endpoint.startsWith('http') ? endpoint : `${config.apiBase}${endpoint}`;
  
  // Add query parameters
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }
  const queryString = queryParams.toString();
  if (queryString) {
    url += (url.includes('?') ? '&' : '?') + queryString;
  }
  
  const fetchOptions = {
    method,
    headers: {
      'Authorization': config.authHeader,
      'Content-Type': 'application/json'
    }
  };
  
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  // Get total count headers for pagination
  const totalItems = response.headers.get('X-WP-Total');
  const totalPages = response.headers.get('X-WP-TotalPages');
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.code || 'API request failed');
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }
  
  // Attach pagination info if present
  if (totalItems || totalPages) {
    return {
      data,
      meta: {
        total: parseInt(totalItems) || 0,
        totalPages: parseInt(totalPages) || 0
      }
    };
  }
  
  return data;
}

/**
 * Upload media file to WordPress
 */
export async function uploadMedia(filePath, options = {}) {
  const config = getConfig();
  const { title, altText, caption, description } = options;
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine content type from extension
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  const url = `${config.apiBase}/media`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': config.authHeader,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': contentType
    },
    body: fileBuffer
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || 'Media upload failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Update media with additional fields if provided
  if (title || altText || caption || description) {
    const updates = {};
    if (title) updates.title = title;
    if (altText) updates.alt_text = altText;
    if (caption) updates.caption = caption;
    if (description) updates.description = description;
    
    return await apiRequest(`/media/${data.id}`, {
      method: 'POST',
      body: updates
    });
  }
  
  return data;
}

/**
 * Paginated list request
 */
export async function listAll(endpoint, options = {}) {
  const { all = false, perPage = 100, params = {} } = options;
  let allResults = [];
  let page = 1;
  let totalPages = 1;
  
  do {
    const requestParams = { ...params, per_page: perPage, page };
    const result = await apiRequest(endpoint, { params: requestParams });
    
    // Handle both wrapped and unwrapped responses
    const items = result.data || result;
    const meta = result.meta;
    
    if (Array.isArray(items)) {
      allResults = allResults.concat(items);
    }
    
    if (meta?.totalPages) {
      totalPages = meta.totalPages;
    }
    
    page++;
    
    if (!all) break;
    if (page > 100) {
      console.log('Warning: Reached 100 page limit');
      break;
    }
  } while (page <= totalPages && all);
  
  return allResults;
}

/**
 * Initialize script with site support
 */
export function initScript(localDir, args) {
  // Handle "sites" command
  if (args._[0] === 'sites') {
    printSites();
    process.exit(0);
  }
  
  // Skip credential loading for help command
  if (args._[0] === 'help' || args.help || args._.length === 0) {
    return;
  }
  
  // Load environment for specified site
  loadEnv(localDir, args.site);
  
  // Show which site if not default
  if (args.site && args.site !== 'default') {
    console.log(`Using site: ${args.site}\n`);
  }
}

/**
 * Print available sites
 */
export function printSites() {
  const sites = listSites();
  
  if (sites.length === 0) {
    console.log('No WordPress sites configured.\n');
    console.log('To set up a site:');
    console.log('1. Create /memory/connectors/wordpress/.env for a default site');
    console.log('2. Or create /memory/connectors/wordpress/<name>/.env for named sites');
    console.log('');
    console.log('See SETUP.md for detailed instructions.');
    return;
  }
  
  console.log('Available WordPress sites:\n');
  for (const site of sites) {
    console.log(`  - ${site}`);
  }
  console.log('');
  console.log('Usage: node scripts/<script>.js <command> --site <name>');
}

/**
 * Show help for a command
 */
export function showHelp(commandName, sections) {
  console.log(`\n${commandName}\n${'='.repeat(commandName.length)}\n`);
  
  for (const [title, content] of Object.entries(sections)) {
    console.log(`${title}:`);
    if (Array.isArray(content)) {
      for (const line of content) {
        console.log(`  ${line}`);
      }
    } else {
      console.log(`  ${content}`);
    }
    console.log('');
  }
  
  console.log('Site Options:');
  console.log('  --site <name>           Use a specific WordPress site');
  console.log('  sites                   List available sites');
  console.log('');
}

/**
 * Handle errors consistently
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (error.code) {
    console.error('Code:', error.code);
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

/**
 * Truncate text for display
 */
export function truncate(text, length = 60) {
  if (!text) return '';
  // Strip HTML tags
  const plain = text.replace(/<[^>]*>/g, '');
  if (plain.length <= length) return plain;
  return plain.substring(0, length - 3) + '...';
}

/**
 * Format post status for display
 */
export function formatStatus(status) {
  const statusMap = {
    publish: 'Published',
    draft: 'Draft',
    pending: 'Pending Review',
    private: 'Private',
    future: 'Scheduled',
    trash: 'Trash'
  };
  return statusMap[status] || status;
}

export { MEMORY_DIR };
