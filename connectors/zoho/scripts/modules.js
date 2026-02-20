#!/usr/bin/env node

/**
 * Zoho CRM Modules Management
 * View and manage CRM modules, including custom modules.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Modules', {
    'Commands': [
      'list                        List all modules',
      'get <api_name>              Get module metadata',
      'create                      Create a custom module',
      'update <api_name>           Update a custom module',
      'layouts <api_name>          List layouts for a module',
      'related-lists <api_name>    List related lists for a module',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--name <name>               Module singular name',
      '--plural <name>             Module plural name',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node modules.js list',
      'node modules.js get Leads',
      'node modules.js get Contacts --verbose',
      'node modules.js layouts Deals',
      'node modules.js related-lists Accounts',
      'node modules.js create --name "Custom Object" --plural "Custom Objects"'
    ],
    'Standard Modules': [
      'Leads, Contacts, Accounts, Deals, Products, Tasks, Calls, Events,',
      'Notes, Quotes, Invoices, Vendors, Price_Books, Sales_Orders, Purchase_Orders'
    ]
  });
}

// List all modules
async function listModules(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching modules...\n');
  
  const data = await apiRequest('GET', '/settings/modules', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const modules = data.modules || [];
  
  // Group by type
  const standard = modules.filter(m => !m.generated_type || m.generated_type === 'default');
  const custom = modules.filter(m => m.generated_type === 'custom');
  const inventory = modules.filter(m => ['Quotes', 'Invoices', 'Sales_Orders', 'Purchase_Orders', 'Vendors', 'Price_Books'].includes(m.api_name));
  
  console.log(`Found ${modules.length} modules:\n`);
  
  console.log('Standard Modules:');
  for (const mod of standard.filter(m => !inventory.includes(m))) {
    const viewable = mod.viewable ? '' : ' [hidden]';
    console.log(`  - ${mod.plural_label || mod.module_name} (${mod.api_name})${viewable}`);
  }
  
  if (inventory.length > 0) {
    console.log('\nInventory Modules:');
    for (const mod of inventory) {
      const viewable = mod.viewable ? '' : ' [hidden]';
      console.log(`  - ${mod.plural_label || mod.module_name} (${mod.api_name})${viewable}`);
    }
  }
  
  if (custom.length > 0) {
    console.log('\nCustom Modules:');
    for (const mod of custom) {
      console.log(`  - ${mod.plural_label || mod.module_name} (${mod.api_name})`);
    }
  }
}

// Get module metadata
async function getModule(apiName, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/settings/modules/${apiName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const modules = data.modules || [];
  
  if (modules.length === 0) {
    console.error(`Error: Module not found: ${apiName}`);
    process.exit(1);
  }
  
  const mod = modules[0];
  
  console.log(`Module: ${mod.plural_label || mod.module_name}\n`);
  console.log(`API Name: ${mod.api_name}`);
  console.log(`Singular: ${mod.singular_label || 'N/A'}`);
  console.log(`Plural: ${mod.plural_label || 'N/A'}`);
  console.log(`Type: ${mod.generated_type || 'standard'}`);
  console.log(`Viewable: ${mod.viewable ? 'Yes' : 'No'}`);
  console.log(`Creatable: ${mod.creatable ? 'Yes' : 'No'}`);
  console.log(`Editable: ${mod.editable ? 'Yes' : 'No'}`);
  console.log(`Deletable: ${mod.deletable ? 'Yes' : 'No'}`);
  
  if (mod.quick_create !== undefined) {
    console.log(`Quick Create: ${mod.quick_create ? 'Yes' : 'No'}`);
  }
  
  if (mod.business_card_field_limit) {
    console.log(`Business Card Limit: ${mod.business_card_field_limit}`);
  }
  
  // Related modules
  if (mod.related_lists && mod.related_lists.length > 0) {
    console.log(`\nRelated Lists (${mod.related_lists.length}):`);
    for (const rel of mod.related_lists.slice(0, 10)) {
      console.log(`  - ${rel.display_label || rel.name} (${rel.api_name})`);
    }
    if (mod.related_lists.length > 10) {
      console.log(`  ... and ${mod.related_lists.length - 10} more`);
    }
  }
}

// Create custom module
async function createModule(args) {
  const { config, token } = await initScript(args);
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const module = {
    singular_label: args.name,
    plural_label: args.plural || args.name + 's'
  };
  
  const body = { modules: [module] };
  
  const data = await apiRequest('POST', '/settings/modules', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.modules && data.modules[0]) {
    const result = data.modules[0];
    if (result.status === 'success') {
      console.log('Custom module created successfully!\n');
      console.log(`API Name: ${result.details.api_name}`);
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update custom module
async function updateModule(apiName, args) {
  const { config, token } = await initScript(args);
  
  const module = {};
  
  if (args.name) module.singular_label = args.name;
  if (args.plural) module.plural_label = args.plural;
  
  if (Object.keys(module).length === 0) {
    console.error('Error: No updates specified. Use --name or --plural.');
    process.exit(1);
  }
  
  const body = { modules: [module] };
  
  const data = await apiRequest('PUT', `/settings/modules/${apiName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.modules && data.modules[0]) {
    const result = data.modules[0];
    if (result.status === 'success') {
      console.log('Module updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// List layouts for a module
async function listLayouts(apiName, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Fetching layouts for ${apiName}...\n`);
  
  const data = await apiRequest('GET', `/settings/layouts?module=${apiName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const layouts = data.layouts || [];
  
  console.log(`Found ${layouts.length} layouts:\n`);
  
  for (const layout of layouts) {
    const status = layout.status === 1 ? '' : ' [inactive]';
    console.log(`- ${layout.name}${status}`);
    console.log(`  ID: ${layout.id}`);
    if (layout.visible !== undefined) {
      console.log(`  Visible: ${layout.visible ? 'Yes' : 'No'}`);
    }
    console.log('');
  }
}

// List related lists for a module
async function listRelatedLists(apiName, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Fetching related lists for ${apiName}...\n`);
  
  const data = await apiRequest('GET', `/settings/related_lists?module=${apiName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const relatedLists = data.related_lists || [];
  
  console.log(`Found ${relatedLists.length} related lists:\n`);
  
  for (const rel of relatedLists) {
    console.log(`- ${rel.display_label || rel.name}`);
    console.log(`  API Name: ${rel.api_name}`);
    console.log(`  Module: ${rel.module?.api_name || 'N/A'}`);
    console.log(`  Type: ${rel.type || 'N/A'}`);
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listModules(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Module API name required');
          console.error('Usage: node modules.js get <api_name>');
          process.exit(1);
        }
        await getModule(args._[1], args);
        break;
      case 'create':
        await createModule(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Module API name required');
          process.exit(1);
        }
        await updateModule(args._[1], args);
        break;
      case 'layouts':
        if (!args._[1]) {
          console.error('Error: Module API name required');
          process.exit(1);
        }
        await listLayouts(args._[1], args);
        break;
      case 'related-lists':
        if (!args._[1]) {
          console.error('Error: Module API name required');
          process.exit(1);
        }
        await listRelatedLists(args._[1], args);
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
