#!/usr/bin/env node

/**
 * Go High Level Invoices Management
 * 
 * Commands:
 *   list                    List all invoices
 *   get <id>               Get invoice details
 *   create                 Create new invoice
 *   update <id>            Update invoice
 *   delete <id>            Delete invoice (DESTRUCTIVE)
 *   send <id>              Send invoice to customer (DESTRUCTIVE)
 *   void <id>              Void invoice (DESTRUCTIVE)
 *   record-payment <id>    Record manual payment (DESTRUCTIVE)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  apiRequestPaginated,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  formatCurrency,
  handleError
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;
const force = args.force || false;

async function listInvoices(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.status) params.append('status', args.status);
    if (args['contact-id']) params.append('contactId', args['contact-id']);
    if (args.limit) params.append('limit', args.limit);
    if (args['start-after']) params.append('startAfterId', args['start-after']);
    
    const endpoint = `/invoices/?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} invoices (${meta.pages} pages):\n`);
      displayInvoices(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const invoices = data.invoices || [];
      console.log(`Found ${invoices.length} invoices:\n`);
      displayInvoices(invoices);
      
      if (data.meta?.nextPageUrl) {
        console.log('\nMore invoices available. Use --all to fetch all, or --start-after <lastId>');
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayInvoices(invoices) {
  if (invoices.length === 0) {
    console.log('No invoices found.');
    return;
  }
  
  for (const inv of invoices) {
    console.log(`- ${inv.name || inv.title || 'Untitled Invoice'}`);
    console.log(`  ID: ${inv._id || inv.id}`);
    console.log(`  Status: ${inv.status || 'unknown'}`);
    console.log(`  Amount: ${formatCurrency(inv.total || inv.amountDue || 0)}`);
    if (inv.contactId) console.log(`  Contact: ${inv.contactId}`);
    if (inv.dueDate) console.log(`  Due: ${formatDate(inv.dueDate)}`);
    console.log('');
  }
}

async function getInvoice(invoiceId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Invoice Details:\n');
    const inv = data.invoice || data;
    console.log(`Name: ${inv.name || inv.title || 'Untitled'}`);
    console.log(`ID: ${inv._id || inv.id}`);
    console.log(`Status: ${inv.status}`);
    console.log(`Total: ${formatCurrency(inv.total)}`);
    console.log(`Amount Due: ${formatCurrency(inv.amountDue)}`);
    console.log(`Amount Paid: ${formatCurrency(inv.amountPaid || 0)}`);
    
    if (inv.contact) {
      console.log(`\nContact: ${inv.contact.name || inv.contact.email || inv.contactId}`);
    }
    
    if (inv.dueDate) console.log(`Due Date: ${formatDate(inv.dueDate)}`);
    if (inv.sentAt) console.log(`Sent: ${formatDate(inv.sentAt)}`);
    if (inv.paidAt) console.log(`Paid: ${formatDate(inv.paidAt)}`);
    
    if (inv.items && inv.items.length > 0) {
      console.log('\nLine Items:');
      for (const item of inv.items) {
        console.log(`  - ${item.name || item.description}`);
        console.log(`    Qty: ${item.qty || item.quantity || 1} x ${formatCurrency(item.price || item.amount)}`);
      }
    }
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createInvoice(locationConfig) {
  try {
    const contactId = args['contact-id'];
    const name = args.name;
    
    if (!contactId) {
      console.error('Error: --contact-id is required');
      process.exit(1);
    }
    
    if (!name) {
      console.error('Error: --name is required');
      process.exit(1);
    }
    
    // Build line items
    const items = [];
    if (args.item) {
      // Parse item format: "description:price:quantity"
      const itemParts = args.item.split(':');
      items.push({
        name: itemParts[0],
        price: parseFloat(itemParts[1]) || 0,
        qty: parseInt(itemParts[2]) || 1
      });
    }
    
    if (items.length === 0) {
      console.error('Error: At least one --item is required');
      console.error('Format: --item "Description:Price:Quantity"');
      console.error('Example: --item "Consulting:500:2"');
      process.exit(1);
    }
    
    const body = {
      altId: locationConfig.id,
      altType: 'location',
      contactId,
      name,
      items,
      currency: args.currency || 'USD'
    };
    
    if (args['due-date']) body.dueDate = args['due-date'];
    if (args.notes) body.notes = args.notes;
    
    const data = await apiRequest('POST', '/invoices/', locationConfig.key, body);
    
    console.log('Invoice created successfully!\n');
    const inv = data.invoice || data;
    console.log(`ID: ${inv._id || inv.id}`);
    console.log(`Name: ${inv.name}`);
    console.log(`Total: ${formatCurrency(inv.total)}`);
    console.log(`Status: ${inv.status}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updateInvoice(invoiceId, locationConfig) {
  try {
    const body = {
      altId: locationConfig.id,
      altType: 'location'
    };
    
    if (args.name) body.name = args.name;
    if (args.notes) body.notes = args.notes;
    if (args['due-date']) body.dueDate = args['due-date'];
    if (args.status) body.status = args.status;
    
    if (Object.keys(body).length <= 2) {
      console.error('Error: No fields to update');
      console.error('Use --name, --notes, --due-date, or --status');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/invoices/${invoiceId}`, locationConfig.key, body);
    
    console.log('Invoice updated successfully!\n');
    const inv = data.invoice || data;
    console.log(`ID: ${inv._id || inv.id}`);
    console.log(`Name: ${inv.name}`);
    console.log(`Status: ${inv.status}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteInvoice(invoiceId, locationConfig) {
  try {
    // Get invoice details first
    const invoiceData = await apiRequest(
      'GET',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    const inv = invoiceData.invoice || invoiceData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE an invoice',
      [
        `Invoice: ${inv.name || 'Untitled'}`,
        `Amount: ${formatCurrency(inv.total)}`,
        `Status: ${inv.status}`,
        '',
        'This will permanently delete the invoice.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Invoice deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function sendInvoice(invoiceId, locationConfig) {
  try {
    // Get invoice details first
    const invoiceData = await apiRequest(
      'GET',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    const inv = invoiceData.invoice || invoiceData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to SEND an invoice to the customer',
      [
        `Invoice: ${inv.name || 'Untitled'}`,
        `Amount: ${formatCurrency(inv.total)}`,
        `Contact: ${inv.contact?.email || inv.contactId}`,
        '',
        'An email will be sent to the customer.',
        'This cannot be undone.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    const body = {
      altId: locationConfig.id,
      altType: 'location'
    };
    
    await apiRequest('POST', `/invoices/${invoiceId}/send`, locationConfig.key, body);
    
    console.log('Invoice sent successfully!');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function voidInvoice(invoiceId, locationConfig) {
  try {
    // Get invoice details first
    const invoiceData = await apiRequest(
      'GET',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    const inv = invoiceData.invoice || invoiceData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to VOID an invoice',
      [
        `Invoice: ${inv.name || 'Untitled'}`,
        `Amount: ${formatCurrency(inv.total)}`,
        `Status: ${inv.status}`,
        '',
        'Voiding marks the invoice as cancelled.',
        'The customer will be notified.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    const body = {
      altId: locationConfig.id,
      altType: 'location'
    };
    
    await apiRequest('POST', `/invoices/${invoiceId}/void`, locationConfig.key, body);
    
    console.log('Invoice voided successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function recordPayment(invoiceId, locationConfig) {
  try {
    const amount = parseFloat(args.amount);
    
    if (!amount || isNaN(amount)) {
      console.error('Error: --amount is required (numeric value)');
      process.exit(1);
    }
    
    // Get invoice details first
    const invoiceData = await apiRequest(
      'GET',
      `/invoices/${invoiceId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    const inv = invoiceData.invoice || invoiceData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to RECORD A PAYMENT',
      [
        `Invoice: ${inv.name || 'Untitled'}`,
        `Invoice Total: ${formatCurrency(inv.total)}`,
        `Amount Due: ${formatCurrency(inv.amountDue)}`,
        `Recording: ${formatCurrency(amount)}`,
        '',
        'This will mark the invoice as partially/fully paid.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    const body = {
      altId: locationConfig.id,
      altType: 'location',
      amount,
      mode: args.mode || 'cash',
      notes: args.notes || ''
    };
    
    await apiRequest('POST', `/invoices/${invoiceId}/record-payment`, locationConfig.key, body);
    
    console.log('Payment recorded successfully!');
    console.log(`Amount: ${formatCurrency(amount)}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Invoice Management

Usage:
  node invoices.js <command> [options]

Commands:
  list                     List all invoices
  get <id>                Get invoice details
  create                  Create new invoice
  update <id>             Update invoice
  delete <id>             Delete invoice (DESTRUCTIVE)
  send <id>               Send invoice to customer (DESTRUCTIVE)
  void <id>               Void invoice (DESTRUCTIVE)
  record-payment <id>     Record manual payment (DESTRUCTIVE)
  locations               List configured locations

Options:
  --location "Name"       Specify GHL sub-account
  --contact-id <id>       Contact ID (for create)
  --name "Name"           Invoice name
  --item "Desc:Price:Qty" Line item (for create)
  --due-date "YYYY-MM-DD" Due date
  --notes "Notes"         Invoice notes
  --status "status"       Filter by status (list) or set status (update)
  --amount <number>       Payment amount (for record-payment)
  --mode "cash|check|etc" Payment mode (for record-payment)
  --currency "USD"        Currency code
  --all                   Fetch all pages
  --limit <n>             Results per page
  --verbose               Show full API response
  --force                 Skip confirmation prompts

Examples:
  node invoices.js list --location "My Account"
  node invoices.js get abc123 --location "My Account"
  node invoices.js create --contact-id xyz --name "Consulting" --item "Strategy Session:500:1" --location "My Account"
  node invoices.js send abc123 --location "My Account"
  node invoices.js record-payment abc123 --amount 250 --mode cash --location "My Account"

Invoice Statuses: draft, sent, paid, void, partially_paid
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'list':
      await listInvoices(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js get <invoice-id>');
        process.exit(1);
      }
      await getInvoice(args._[1], locationConfig);
      break;
    case 'create':
      await createInvoice(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js update <invoice-id> --name "New Name"');
        process.exit(1);
      }
      await updateInvoice(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js delete <invoice-id>');
        process.exit(1);
      }
      await deleteInvoice(args._[1], locationConfig);
      break;
    case 'send':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js send <invoice-id>');
        process.exit(1);
      }
      await sendInvoice(args._[1], locationConfig);
      break;
    case 'void':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js void <invoice-id>');
        process.exit(1);
      }
      await voidInvoice(args._[1], locationConfig);
      break;
    case 'record-payment':
      if (!args._[1]) {
        console.error('Error: Invoice ID required');
        console.error('Usage: node invoices.js record-payment <invoice-id> --amount 100');
        process.exit(1);
      }
      await recordPayment(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node invoices.js help" for usage');
      process.exit(1);
  }
}

main();
