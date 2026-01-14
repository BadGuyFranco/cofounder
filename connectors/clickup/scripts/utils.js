/**
 * ClickUp Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory for credentials
const memoryEnvPath = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/connectors/clickup/.env'
);
const localEnvPath = path.join(__dirname, '..', '.env');

// ClickUp API base URL
const API_BASE = 'https://api.clickup.com/api/v2';

/**
 * Load configuration from .env file
 * @returns {object} Configuration object with apiKey
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/clickup/.env with your CLICKUP_API_KEY');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.CLICKUP_API_KEY) {
    console.error('Error: CLICKUP_API_KEY not found in environment.');
    console.error('Add CLICKUP_API_KEY=pk_XXXX to your .env file.');
    process.exit(1);
  }

  return {
    apiKey: process.env.CLICKUP_API_KEY
  };
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments with _ array for positional args
 */
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

/**
 * Make API request with rate limiting and error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': config.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    const response = await fetch(url, fetchOptions);

    // Handle rate limiting (ClickUp returns 429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || 60;
      console.error(`Rate limited. Waiting ${retryAfter} seconds...`);
      await sleep(parseInt(retryAfter) * 1000);
      retries++;
      continue;
    }

    // Handle empty responses (some DELETE operations)
    if (response.status === 204) {
      return { success: true };
    }

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(data.err || data.error || data.message || 'API request failed');
      error.code = data.ECODE;
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format task for display
 * @param {object} task - Task object from API
 * @param {boolean} verbose - Show all fields
 * @returns {string} Formatted task string
 */
export function formatTask(task, verbose = false) {
  const output = [];

  output.push(`${task.name}`);
  output.push(`  ID: ${task.id}`);

  if (task.status) {
    output.push(`  Status: ${task.status.status}`);
  }

  if (task.priority) {
    output.push(`  Priority: ${task.priority.priority || 'None'}`);
  }

  if (task.due_date) {
    const dueDate = new Date(parseInt(task.due_date));
    output.push(`  Due: ${dueDate.toISOString().split('T')[0]}`);
  }

  if (task.assignees && task.assignees.length > 0) {
    const names = task.assignees.map(a => a.username || a.email).join(', ');
    output.push(`  Assignees: ${names}`);
  }

  if (task.tags && task.tags.length > 0) {
    const tags = task.tags.map(t => t.name).join(', ');
    output.push(`  Tags: ${tags}`);
  }

  if (verbose) {
    if (task.description) {
      output.push(`  Description: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);
    }
    if (task.date_created) {
      output.push(`  Created: ${new Date(parseInt(task.date_created)).toISOString()}`);
    }
    if (task.date_updated) {
      output.push(`  Updated: ${new Date(parseInt(task.date_updated)).toISOString()}`);
    }
    if (task.list) {
      output.push(`  List: ${task.list.name} (${task.list.id})`);
    }
    if (task.folder) {
      output.push(`  Folder: ${task.folder.name} (${task.folder.id})`);
    }
    if (task.space) {
      output.push(`  Space: ${task.space.id}`);
    }
    if (task.url) {
      output.push(`  URL: ${task.url}`);
    }
  }

  return output.join('\n');
}

/**
 * Format list for display
 * @param {object} list - List object from API
 * @returns {string} Formatted list string
 */
export function formatList(list) {
  const output = [];

  output.push(`${list.name}`);
  output.push(`  ID: ${list.id}`);

  if (list.task_count !== undefined) {
    output.push(`  Tasks: ${list.task_count}`);
  }

  if (list.folder) {
    output.push(`  Folder: ${list.folder.name} (${list.folder.id})`);
  }

  if (list.space) {
    output.push(`  Space: ${list.space.name} (${list.space.id})`);
  }

  return output.join('\n');
}

/**
 * Format folder for display
 * @param {object} folder - Folder object from API
 * @returns {string} Formatted folder string
 */
export function formatFolder(folder) {
  const output = [];

  output.push(`${folder.name}`);
  output.push(`  ID: ${folder.id}`);

  if (folder.task_count !== undefined) {
    output.push(`  Tasks: ${folder.task_count}`);
  }

  if (folder.lists) {
    output.push(`  Lists: ${folder.lists.length}`);
  }

  return output.join('\n');
}

/**
 * Format space for display
 * @param {object} space - Space object from API
 * @returns {string} Formatted space string
 */
export function formatSpace(space) {
  const output = [];

  output.push(`${space.name}`);
  output.push(`  ID: ${space.id}`);

  if (space.private !== undefined) {
    output.push(`  Private: ${space.private}`);
  }

  if (space.statuses) {
    const statuses = space.statuses.map(s => s.status).join(', ');
    output.push(`  Statuses: ${statuses}`);
  }

  return output.join('\n');
}

/**
 * Format workspace (team) for display
 * @param {object} workspace - Workspace object from API
 * @returns {string} Formatted workspace string
 */
export function formatWorkspace(workspace) {
  const output = [];

  output.push(`${workspace.name}`);
  output.push(`  ID: ${workspace.id}`);

  if (workspace.members) {
    output.push(`  Members: ${workspace.members.length}`);
  }

  return output.join('\n');
}

/**
 * Parse JSON safely
 * @param {string} str - JSON string
 * @param {string} fieldName - Field name for error messages
 * @returns {object} Parsed JSON
 */
export function parseJSON(str, fieldName) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Error: Invalid JSON in --${fieldName}`);
    console.error(`Received: ${str}`);
    process.exit(1);
  }
}

/**
 * Convert date string to ClickUp timestamp (milliseconds)
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO)
 * @returns {number} Timestamp in milliseconds
 */
export function toTimestamp(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.error(`Error: Invalid date format: ${dateStr}`);
    console.error('Use YYYY-MM-DD or ISO format.');
    process.exit(1);
  }
  return date.getTime();
}

/**
 * Priority mapping (ClickUp uses 1-4 where 1 is urgent)
 */
export const PRIORITIES = {
  'urgent': 1,
  'high': 2,
  'normal': 3,
  'low': 4,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4
};

/**
 * Convert priority string to number
 * @param {string} priority - Priority string
 * @returns {number} Priority number (1-4)
 */
export function toPriority(priority) {
  const normalized = String(priority).toLowerCase();
  if (PRIORITIES[normalized]) {
    return PRIORITIES[normalized];
  }
  console.error(`Error: Invalid priority: ${priority}`);
  console.error('Valid priorities: urgent, high, normal, low (or 1-4)');
  process.exit(1);
}
