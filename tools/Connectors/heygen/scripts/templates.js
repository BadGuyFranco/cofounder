#!/usr/bin/env node

/**
 * HeyGen Templates Script
 * List and manage video templates.
 */

import { 
  parseArgs, 
  initScript, 
  apiRequest, 
  showHelp, 
  output, 
  handleError,
  truncate
} from './utils.js';

function displayHelp() {
  showHelp('HeyGen Templates', {
    'Description': 'List and view video templates',
    'Commands': [
      'list                        List available templates',
      'get <template_id>           Get template details and variables',
      'help                        Show this help'
    ],
    'List Options': [
      '--limit <n>                 Number of results (default: 100)'
    ],
    'Examples': [
      'node scripts/templates.js list',
      'node scripts/templates.js get tpl_abc123'
    ],
    'Usage': [
      'After finding a template, use videos.js to generate:',
      'node scripts/videos.js create-from-template --template tpl_123 --variables \'{"name":"John"}\''
    ]
  });
}

/**
 * List available templates
 */
async function listTemplates(args) {
  const limit = args.limit ? parseInt(args.limit) : 100;
  
  const data = await apiRequest('GET', '/v2/templates');
  
  const templates = data.data?.templates || [];
  
  if (templates.length === 0) {
    console.log('No templates found.');
    return;
  }
  
  console.log(`Templates (${templates.length}):\n`);
  
  const displayTemplates = templates.slice(0, limit);
  
  for (const template of displayTemplates) {
    console.log(`  ID: ${template.template_id}`);
    console.log(`  Name: ${template.name || '(unnamed)'}`);
    if (template.thumbnail_url) {
      console.log(`  Thumbnail: ${truncate(template.thumbnail_url, 60)}`);
    }
    console.log('');
  }
  
  if (templates.length > limit) {
    console.log(`  ... and ${templates.length - limit} more. Use --limit to see more.`);
  }
}

/**
 * Get template details including variables
 */
async function getTemplate(templateId) {
  const data = await apiRequest('GET', `/v2/template/${templateId}`);
  
  const template = data.data;
  
  if (!template) {
    console.error(`Template not found: ${templateId}`);
    process.exit(1);
  }
  
  console.log('Template Details:\n');
  console.log(`  ID: ${template.template_id}`);
  console.log(`  Name: ${template.name || '(unnamed)'}`);
  
  if (template.thumbnail_url) {
    console.log(`  Thumbnail: ${template.thumbnail_url}`);
  }
  
  // Show variables/elements that can be customized
  if (template.variables && Object.keys(template.variables).length > 0) {
    console.log('\n  Variables (customize these when generating):');
    for (const [key, config] of Object.entries(template.variables)) {
      const type = config.type || 'unknown';
      const required = config.required ? ' (required)' : '';
      console.log(`    ${key}: ${type}${required}`);
      if (config.default) {
        console.log(`      Default: ${JSON.stringify(config.default)}`);
      }
    }
  }
  
  // Show full data for debugging
  console.log('\n  Raw Data:');
  output(template);
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  // Show help if no command or help requested
  if (!command || command === 'help' || args.help) {
    displayHelp();
    return;
  }
  
  // Initialize (loads credentials, handles accounts)
  const ready = initScript(args);
  if (!ready) {
    displayHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'list':
        await listTemplates(args);
        break;
        
      case 'get':
        if (!args._[1]) {
          console.error('Error: Template ID required. Usage: get <template_id>');
          process.exit(1);
        }
        await getTemplate(args._[1]);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        displayHelp();
        process.exit(1);
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
