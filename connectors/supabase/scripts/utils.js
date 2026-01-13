/**
 * Supabase Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 * 
 * Supports multiple projects via --project flag or SUPABASE_PROJECT env var.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base paths
const MEMORY_BASE = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/supabase'
);

// Load environment from memory directory or local
const memoryEnvPath = path.join(MEMORY_BASE, '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

/**
 * Sanitize project name for use as filename
 * @param {string} name - Project name
 * @returns {string} - Sanitized name (lowercase, spaces to hyphens)
 */
export function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .substring(0, 50);            // Limit length
}

/**
 * Find project config file by name or ref
 * @param {string} projectId - Project name or reference ID
 * @returns {string|null} - Path to project env file, or null if not found
 */
export function findProjectConfig(projectId) {
  const projectsDir = path.join(MEMORY_BASE, 'projects');
  
  if (!fs.existsSync(projectsDir)) {
    return null;
  }
  
  // First, try exact match (human-readable name)
  const exactPath = path.join(projectsDir, `${projectId}.env`);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }
  
  // Second, search for project by ref inside .env files
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.env'));
  for (const file of files) {
    const filePath = path.join(projectsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if this file contains the project ref
    if (content.includes(`SUPABASE_PROJECT_REF=${projectId}`) ||
        content.includes(`https://${projectId}.supabase.co`)) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * Load configuration for a specific project or default
 * @param {string} projectId - Optional project name or reference ID
 */
export function loadConfig(projectId = null) {
  // First, load the base env (for access token)
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  // Check for project-specific config
  const id = projectId || process.env.SUPABASE_PROJECT;
  
  if (id) {
    const projectEnvPath = findProjectConfig(id);
    
    if (projectEnvPath) {
      // Load project-specific env (overrides base)
      dotenv.config({ path: projectEnvPath, override: true });
    } else {
      console.error(`Error: Project '${id}' not configured.`);
      console.error('');
      console.error('Configure it first:');
      console.error(`  node scripts/management.js configure <project-ref>`);
      console.error('');
      console.error('Or list available projects:');
      console.error('  node scripts/management.js list');
      process.exit(1);
    }
  }

  // Check for required project credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    // Check if any projects are configured
    const configuredProjects = listConfiguredProjects();

    if (configuredProjects.length === 0) {
      console.error('Error: No Supabase project configured.');
      console.error('');
      console.error('Setup steps:');
      console.error('  1. Add your access token to /memory/Connectors/supabase/.env:');
      console.error('     SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx');
      console.error('');
      console.error('  2. Configure a project:');
      console.error('     node scripts/management.js list');
      console.error('     node scripts/management.js configure <project-ref>');
      console.error('');
      console.error('See SETUP.md for detailed instructions.');
    } else if (configuredProjects.length === 1) {
      console.error(`Error: Project credentials not loaded. Specify the project:`);
      console.error(`  --project ${configuredProjects[0].name}`);
    } else {
      console.error('Error: Multiple projects configured. Specify which one to use:');
      console.error('');
      for (const p of configuredProjects) {
        console.error(`  --project ${p.name}`);
      }
    }
    process.exit(1);
  }

  return {
    url: process.env.SUPABASE_URL.replace(/\/$/, ''), // Remove trailing slash
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    projectRef: process.env.SUPABASE_PROJECT_REF
  };
}

/**
 * List configured projects with their details
 * @returns {Array} - Array of {name, ref, file} objects
 */
export function listConfiguredProjects() {
  const projectsDir = path.join(MEMORY_BASE, 'projects');
  
  if (!fs.existsSync(projectsDir)) {
    return [];
  }
  
  const projects = [];
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.env'));
  
  for (const file of files) {
    const filePath = path.join(projectsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = file.replace('.env', '');
    
    // Extract project ref from file content
    const refMatch = content.match(/SUPABASE_PROJECT_REF=([^\s\n]+)/);
    const ref = refMatch ? refMatch[1] : null;
    
    // Extract original name from comment if present
    const nameMatch = content.match(/# Project: (.+)/);
    const displayName = nameMatch ? nameMatch[1] : name;
    
    projects.push({
      name: name,           // Filename (for --project flag)
      displayName: displayName,  // Original project name
      ref: ref,             // Project reference ID
      file: filePath
    });
  }
  
  return projects;
}

// Parse command line arguments
export function parseArgs(args) {
  const result = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

// Make REST API request (PostgREST for database)
export async function restRequest(endpoint, options = {}) {
  const config = loadConfig(options.project);
  const url = endpoint.startsWith('http') ? endpoint : `${config.url}/rest/v1${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  // Handle empty responses (e.g., 204 No Content)
  const contentType = response.headers.get('content-type') || '';
  let data;
  
  // Parse as JSON for any JSON-like content type (including vnd.pgrst.object+json)
  if (contentType.includes('json')) {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'API request failed');
    error.status = response.status;
    error.code = data?.code;
    error.details = data;
    throw error;
  }

  return data;
}

// Make Management API request (for project settings, auth, etc.)
export async function managementRequest(endpoint, options = {}) {
  const config = loadConfig(options.project);
  const url = endpoint.startsWith('http') ? endpoint : `${config.url}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`,
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
    const error = new Error(data?.message || data?.error || data?.msg || 'API request failed');
    error.status = response.status;
    error.code = data?.code;
    error.details = data;
    throw error;
  }

  return data;
}

// Make Storage API request
export async function storageRequest(endpoint, options = {}) {
  const config = loadConfig(options.project);
  const url = `${config.url}/storage/v1${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`,
      ...options.headers
    }
  };

  // Don't set Content-Type for file uploads (let fetch handle it)
  if (options.body && !(options.body instanceof Buffer) && !(options.body instanceof Uint8Array)) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  } else if (options.body) {
    fetchOptions.body = options.body;
    if (options.contentType) {
      fetchOptions.headers['Content-Type'] = options.contentType;
    }
  }

  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } else if (options.returnBuffer) {
    data = await response.arrayBuffer();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Storage request failed');
    error.status = response.status;
    error.statusCode = data?.statusCode;
    error.details = data;
    throw error;
  }

  return data;
}

// Make Auth Admin API request
export async function authRequest(endpoint, options = {}) {
  const config = loadConfig(options.project);
  const url = `${config.url}/auth/v1/admin${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`,
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
    const error = new Error(data?.message || data?.msg || data?.error || 'Auth request failed');
    error.status = response.status;
    error.code = data?.code;
    error.details = data;
    throw error;
  }

  return data;
}

// Format record for display
export function formatRecord(record, columns = null) {
  const output = [];

  if (record.id !== undefined) {
    output.push(`ID: ${record.id}`);
  }

  const fields = columns || Object.keys(record);
  for (const name of fields) {
    if (record[name] !== undefined && name !== 'id') {
      const value = formatFieldValue(record[name]);
      output.push(`  ${name}: ${value}`);
    }
  }

  return output.join('\n');
}

// Format field value for display
export function formatFieldValue(value) {
  if (value === null || value === undefined) {
    return '(null)';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

// Parse JSON safely
export function parseJSON(str, fieldName) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Error: Invalid JSON in --${fieldName}`);
    console.error(`Received: ${str}`);
    process.exit(1);
  }
}

// Build query string from filter
export function buildFilterParams(filter) {
  if (!filter) return '';
  
  // Filter format: "column=operator.value" or "column=operator.(val1,val2)"
  // Multiple filters separated by &
  return filter;
}

// Sleep helper
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format bytes to human readable
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date to readable string
export function formatDate(dateString) {
  if (!dateString) return '(none)';
  const date = new Date(dateString);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}
