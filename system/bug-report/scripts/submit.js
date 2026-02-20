#!/usr/bin/env node

/**
 * Bug Report Submission
 * 
 * Submits CoFounder bug reports to the maintainer's Zoho CRM via a
 * Zoho Web Form (public POST URL, no authentication needed).
 * Falls back to saving reports locally if the web form is not configured.
 * 
 * Usage:
 *   node submit.js submit --component "tools/X" --summary "..." --error "..." [options]
 *   node submit.js submit-artifact --file <path> --context "..."
 *   node submit.js list
 *   node submit.js help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COFOUNDER_ROOT = path.join(__dirname, '..', '..', '..');
const MEMORY_ROOT = path.join(COFOUNDER_ROOT, '..', 'memory');
const PENDING_DIR = path.join(MEMORY_ROOT, 'bug-reports', 'pending');
const SUBMITTED_DIR = path.join(MEMORY_ROOT, 'bug-reports', 'submitted');
const CONFIG_PATH = path.join(COFOUNDER_ROOT, 'system', 'bug-report', 'config.json');
const API_KEY_PATH = path.join(MEMORY_ROOT, 'system', 'cofounder-api-key.json');

/**
 * Load the web form configuration.
 * Returns { webFormUrl, webFormHiddenFields } or null if not configured.
 */
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!config.webFormUrl) return null;
    return config;
  } catch {
    return null;
  }
}

/**
 * Load the user's CoFounder API key from /memory/system/cofounder-api-key.json.
 * Returns the key string or null if not found.
 */
function loadApiKey() {
  try {
    if (!fs.existsSync(API_KEY_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(API_KEY_PATH, 'utf8'));
    return data.apiKey || null;
  } catch {
    return null;
  }
}

// Simple arg parsing (avoid import cycle with cli-utils)
function parseArgs(args = process.argv.slice(2)) {
  const result = { _: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
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

function printHelp() {
  console.log(`
Bug Report Submission
=====================

Commands:
  submit              Submit a bug report with individual fields
  submit-artifact     Submit from a pending error artifact file
  list                List pending error artifacts
  help                Show this help

Submit options:
  --component <name>    Component path (e.g., "tools/Image Generator")
  --summary <text>      Short description of the issue
  --error <text>        Error message
  --context <text>      What the user was doing (optional)
  --agent-context <t>   What workflow/command the agent was running (optional)
  --command <text>      The command that was executed (optional)
  --script <path>       Relative script path (optional)
  --stack <text>        Stack trace excerpt (optional)
  --severity <level>    High, Medium, or Low (default: Medium)
  --notify              User wants email notification when fixed (optional)
  --os <info>           OS info (optional, auto-detected)
  --node <version>      Node version (optional, auto-detected)

Submit-artifact options:
  --file <path>         Path to pending artifact JSON file
  --context <text>      What the user was doing (optional)
  --agent-context <t>   What workflow/command the agent was running (optional)
  --severity <level>    High, Medium, or Low (default: Medium)
  --notify              User wants email notification when fixed (optional)

Examples:
  node submit.js submit --component "tools/Image Generator" --summary "SVG conversion fails" --error "Cannot read property..." --command "node scripts/svg-to-png.js --input logo.svg" --agent-context "Following Image Generator AGENTS.md SVG workflow"
  node submit.js submit-artifact --file /memory/bug-reports/pending/1234-tools-Image-Generator.json --context "Converting logo SVG"
  node submit.js list
`);
}

/**
 * Build a report object from CLI flags.
 */
function buildReportFromFlags(args) {
  if (!args.component || !args.summary || !args.error) {
    console.error('Error: --component, --summary, and --error are required.');
    console.error('Run: node submit.js help');
    process.exit(1);
  }

  return {
    timestamp: new Date().toISOString(),
    component: args.component,
    summary: args.summary,
    error: args.error,
    script: args.script || 'unknown',
    stack: args.stack || '',
    command: args.command || '',
    context: args.context || '',
    agentContext: args['agent-context'] || '',
    severity: (args.severity || 'Medium').charAt(0).toUpperCase() + (args.severity || 'Medium').slice(1).toLowerCase(),
    notify: !!args.notify,
    environment: {
      platform: args.os || process.platform,
      nodeVersion: args.node || process.version
    }
  };
}

/**
 * Build a report object from a pending artifact file.
 */
function buildReportFromArtifact(filePath, args) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Artifact file not found: ${filePath}`);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return {
    timestamp: artifact.timestamp || new Date().toISOString(),
    component: artifact.component || 'unknown',
    summary: artifact.error ? artifact.error.slice(0, 120) : 'Script failure',
    error: artifact.error || 'Unknown error',
    script: artifact.script || 'unknown',
    stack: Array.isArray(artifact.stack) ? artifact.stack.join('\n') : (artifact.stack || ''),
    command: Array.isArray(artifact.command) ? artifact.command.join(' ') : (artifact.command || ''),
    context: args.context || '',
    agentContext: args['agent-context'] || '',
    severity: (args.severity || 'Medium').charAt(0).toUpperCase() + (args.severity || 'Medium').slice(1).toLowerCase(),
    notify: !!args.notify,
    environment: artifact.environment || {
      platform: process.platform,
      nodeVersion: process.version
    },
    artifactFile: filePath
  };
}

/**
 * Format the report as a structured description.
 * Designed to be paste-ready as a debugging prompt for the maintainer.
 */
function formatDescription(report) {
  const env = report.environment || {};
  const envLine = [
    env.platform || 'unknown',
    env.release || '',
    env.arch ? `(${env.arch})` : '',
    env.nodeVersion ? `Node ${env.nodeVersion}` : ''
  ].filter(Boolean).join(' ');

  const lines = [
    '## What broke',
    '',
    `Component: ${report.component}`,
    `Script: ${report.script}`,
    `Runtime: ${envLine}`,
    '',
    `Error: ${report.error}`,
    ''
  ];

  if (report.stack) {
    lines.push('Stack trace:');
    lines.push(report.stack);
    lines.push('');
  }

  if (report.command) {
    lines.push('## How to reproduce');
    lines.push('');
    lines.push(`Command: ${report.command}`);
    lines.push('');
  }

  if (report.context || report.agentContext) {
    lines.push('## Context');
    lines.push('');
    if (report.context) {
      lines.push(`User was doing: ${report.context}`);
    }
    if (report.agentContext) {
      lines.push(`Agent was executing: ${report.agentContext}`);
    }
    lines.push('');
  }

  lines.push('## Where to look');
  lines.push('');
  lines.push(`Start at: ${report.script}`);
  if (report.stack) {
    const stackLines = report.stack.split('\n');
    const appFrame = stackLines.find(l => l.includes('/cofounder/') && !l.includes('node_modules'));
    if (appFrame) {
      lines.push(`First app frame: ${appFrame.trim()}`);
    }
  }
  lines.push(`Component root: ${report.component}/`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Map severity to Zoho CRM priority value.
 */
function mapPriority(severity) {
  if (severity === 'High') return 'High';
  if (severity === 'Low') return 'Low';
  return 'Medium';
}

/**
 * Submit report to Zoho CRM via Web Form.
 * Web Forms accept form-encoded POST data at a public URL.
 * No authentication required; the form URL itself provides access.
 *
 * Field names must match the web form HTML exactly:
 *   Subject, Description, Priority, Status, Type, Case Origin, Email
 *   CASECF3 = CoFounder API Key (custom field)
 *   CASECF2 = Notify On Fix (custom field)
 */
async function submitToWebForm(report, config) {
  const subject = `[CoFounder Bug] ${report.component} - ${report.summary}`.slice(0, 300);
  const description = formatDescription(report);
  const apiKey = loadApiKey();

  const formData = new URLSearchParams();

  // Add hidden fields from config (Zoho web form metadata)
  if (config.webFormHiddenFields) {
    for (const [key, value] of Object.entries(config.webFormHiddenFields)) {
      formData.append(key, value);
    }
  }

  // Standard Case fields (names match form HTML)
  formData.append('Subject', subject);
  formData.append('Description', description);
  formData.append('Priority', mapPriority(report.severity));
  formData.append('Case Origin', 'CoFounder');
  formData.append('Type', 'Bug');
  formData.append('Status', 'New');

  // Custom fields use Zoho's internal names from the web form HTML
  // Email is intentionally omitted; it is resolved from the Contact
  // at resolve time using the CoFounder API Key (see AGENTS.md Step 5)
  formData.append('CASECF3', apiKey || '');
  formData.append('CASECF2', report.notify ? 'true' : 'false');

  const response = await fetch(config.webFormUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    redirect: 'follow'
  });

  // Web forms typically return 200 with a redirect/success page
  // A non-server-error response is considered success
  if (response.status >= 500) {
    const text = await response.text().catch(() => '');
    throw new Error(`Web form returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return {
    success: true,
    id: 'submitted'
  };
}

/**
 * Save report as local markdown fallback.
 */
function saveLocally(report) {
  if (!fs.existsSync(SUBMITTED_DIR)) {
    fs.mkdirSync(SUBMITTED_DIR, { recursive: true });
  }

  const filename = `${Date.now()}-${report.component.replace(/[\s/\\]/g, '-')}.md`;
  const filePath = path.join(SUBMITTED_DIR, filename);

  const env = report.environment || {};
  const envLine = [
    env.platform || 'unknown',
    env.release || '',
    env.arch ? `(${env.arch})` : '',
    env.nodeVersion ? `Node ${env.nodeVersion}` : ''
  ].filter(Boolean).join(' ');

  const content = [
    `# Bug Report: ${report.component}`,
    '',
    `**Date:** ${report.timestamp}`,
    `**Severity:** ${report.severity}`,
    `**Script:** ${report.script}`,
    `**Runtime:** ${envLine}`,
    '',
    '## What Broke',
    '',
    '```',
    report.error,
    '```',
    ''
  ];

  if (report.stack) {
    content.push('## Stack Trace', '', '```', report.stack, '```', '');
  }

  if (report.command) {
    content.push('## How to Reproduce', '', '```', report.command, '```', '');
  }

  if (report.context || report.agentContext) {
    content.push('## Context', '');
    if (report.context) {
      content.push(`**User was doing:** ${report.context}`);
    }
    if (report.agentContext) {
      content.push(`**Agent was executing:** ${report.agentContext}`);
    }
    content.push('');
  }

  content.push(
    '## Where to Look', '',
    `- Start at: ${report.script}`,
    `- Component root: ${report.component}/`,
    ''
  );

  fs.writeFileSync(filePath, content.join('\n'));
  return filePath;
}

/**
 * Remove a pending artifact after successful submission.
 */
function archiveArtifact(artifactPath) {
  try {
    if (artifactPath && fs.existsSync(artifactPath)) {
      fs.unlinkSync(artifactPath);
    }
  } catch { /* non-critical */ }
}

/**
 * List pending error artifacts.
 */
function listPending() {
  if (!fs.existsSync(PENDING_DIR)) {
    console.log('No pending bug report artifacts.');
    return;
  }

  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No pending bug report artifacts.');
    return;
  }

  console.log(`Pending bug report artifacts (${files.length}):\n`);
  for (const file of files) {
    try {
      const artifact = JSON.parse(fs.readFileSync(path.join(PENDING_DIR, file), 'utf8'));
      console.log(`  ${file}`);
      console.log(`    Component: ${artifact.component}`);
      console.log(`    Error: ${(artifact.error || '').slice(0, 80)}`);
      console.log(`    Time: ${artifact.timestamp}`);
      console.log('');
    } catch {
      console.log(`  ${file} (unable to read)`);
    }
  }
}

/**
 * Submit a report: try web form first, fall back to local.
 */
async function submitReport(report, artifactPath) {
  console.log(`Submitting bug report for ${report.component}...`);

  const config = loadConfig();

  if (config) {
    try {
      const result = await submitToWebForm(report, config);
      if (result.success) {
        console.log('Bug report submitted successfully.');
        if (report.notify) {
          const apiKey = loadApiKey();
          if (apiKey) {
            console.log('Notification requested: you will be emailed when this is resolved.');
          } else {
            console.log('Notification requested but no CoFounder API key found. You will not be notified.');
          }
        }
        if (artifactPath) archiveArtifact(artifactPath);
        return;
      }
    } catch (err) {
      console.log(`Web form submission failed: ${err.message}`);
      console.log('Saving locally as fallback.');
    }
  } else {
    console.log('Bug report web form not configured. Saving report locally.');
    console.log('See system/bug-report/SETUP.md for configuration instructions.');
  }

  const filePath = saveLocally(report);
  if (artifactPath) archiveArtifact(artifactPath);
  console.log(`Report saved: ${filePath}`);
}

// Main
async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help' || args.help || args.h) {
    printHelp();
    return;
  }

  if (command === 'list') {
    listPending();
    return;
  }

  if (command === 'submit') {
    const report = buildReportFromFlags(args);
    await submitReport(report);
    return;
  }

  if (command === 'submit-artifact') {
    if (!args.file) {
      console.error('Error: --file is required for submit-artifact.');
      console.error('Run: node submit.js list  to see pending artifacts.');
      process.exit(1);
    }

    const report = buildReportFromArtifact(args.file, args);
    await submitReport(report, args.file);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run: node submit.js help');
  process.exit(1);
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
