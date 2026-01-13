#!/usr/bin/env node

/**
 * Go High Level Payments (Read-Only)
 * 
 * Commands:
 *   orders                  List all orders
 *   order <id>             Get order details
 *   transactions           List all transactions
 *   transaction <id>       Get transaction details
 *   subscriptions          List all subscriptions
 *   subscription <id>      Get subscription details
 *   integration            Check payment integration status
 * 
 * NOTE: This connector is READ-ONLY for financial safety.
 * Refunds, cancellations, and other financial operations
 * should be performed through the Go High Level UI.
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

async function listOrders(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('altId', locationConfig.id);
    params.append('altType', 'location');
    
    if (args.limit) params.append('limit', args.limit);
    if (args.offset) params.append('offset', args.offset);
    if (args.status) params.append('status', args.status);
    if (args['contact-id']) params.append('contactId', args['contact-id']);
    if (args['start-date']) params.append('startAt', args['start-date']);
    if (args['end-date']) params.append('endAt', args['end-date']);
    
    const endpoint = `/payments/orders?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} orders (${meta.pages} pages):\n`);
      displayOrders(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const orders = data.orders || data.data || [];
      console.log(`Found ${orders.length} orders:\n`);
      displayOrders(orders);
      
      if (data.meta?.total > orders.length) {
        console.log(`\nShowing ${orders.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayOrders(orders) {
  if (orders.length === 0) {
    console.log('No orders found.');
    return;
  }
  
  for (const order of orders) {
    console.log(`- Order ${order._id || order.id}`);
    console.log(`  Status: ${order.status || 'unknown'}`);
    console.log(`  Amount: ${formatCurrency(order.amount / 100)}`);
    if (order.contactId || order.contact) {
      console.log(`  Contact: ${order.contact?.name || order.contact?.email || order.contactId}`);
    }
    if (order.items && order.items.length > 0) {
      console.log(`  Items: ${order.items.length}`);
    }
    console.log(`  Created: ${formatDate(order.createdAt)}`);
    console.log('');
  }
}

async function getOrder(orderId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/payments/orders/${orderId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Order Details:\n');
    const order = data.order || data;
    console.log(`Order ID: ${order._id || order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Amount: ${formatCurrency(order.amount / 100)}`);
    console.log(`Currency: ${order.currency || 'USD'}`);
    
    if (order.contact) {
      console.log('\nContact:');
      console.log(`  Name: ${order.contact.name || 'N/A'}`);
      console.log(`  Email: ${order.contact.email || 'N/A'}`);
    }
    
    if (order.items && order.items.length > 0) {
      console.log('\nItems:');
      for (const item of order.items) {
        console.log(`  - ${item.name || item.productId}`);
        console.log(`    Price: ${formatCurrency(item.price / 100)} x ${item.qty || 1}`);
      }
    }
    
    console.log(`\nCreated: ${formatDate(order.createdAt)}`);
    if (order.fulfillmentStatus) console.log(`Fulfillment: ${order.fulfillmentStatus}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listTransactions(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('altId', locationConfig.id);
    params.append('altType', 'location');
    
    if (args.limit) params.append('limit', args.limit);
    if (args.offset) params.append('offset', args.offset);
    if (args.status) params.append('status', args.status);
    if (args['contact-id']) params.append('contactId', args['contact-id']);
    if (args['start-date']) params.append('startAt', args['start-date']);
    if (args['end-date']) params.append('endAt', args['end-date']);
    if (args['payment-mode']) params.append('paymentMode', args['payment-mode']);
    
    const endpoint = `/payments/transactions?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} transactions (${meta.pages} pages):\n`);
      displayTransactions(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const transactions = data.transactions || data.data || [];
      console.log(`Found ${transactions.length} transactions:\n`);
      displayTransactions(transactions);
      
      if (data.meta?.total > transactions.length) {
        console.log(`\nShowing ${transactions.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayTransactions(transactions) {
  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }
  
  for (const txn of transactions) {
    console.log(`- ${txn._id || txn.id}`);
    console.log(`  Type: ${txn.type || 'payment'}`);
    console.log(`  Status: ${txn.status || 'unknown'}`);
    console.log(`  Amount: ${formatCurrency(txn.amount / 100)}`);
    if (txn.paymentMode) console.log(`  Mode: ${txn.paymentMode}`);
    console.log(`  Date: ${formatDate(txn.createdAt)}`);
    console.log('');
  }
}

async function getTransaction(transactionId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/payments/transactions/${transactionId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Transaction Details:\n');
    const txn = data.transaction || data;
    console.log(`Transaction ID: ${txn._id || txn.id}`);
    console.log(`Type: ${txn.type || 'payment'}`);
    console.log(`Status: ${txn.status}`);
    console.log(`Amount: ${formatCurrency(txn.amount / 100)}`);
    console.log(`Currency: ${txn.currency || 'USD'}`);
    console.log(`Payment Mode: ${txn.paymentMode || 'N/A'}`);
    
    if (txn.contact) {
      console.log('\nContact:');
      console.log(`  Name: ${txn.contact.name || 'N/A'}`);
      console.log(`  Email: ${txn.contact.email || 'N/A'}`);
    }
    
    if (txn.orderId) console.log(`\nOrder ID: ${txn.orderId}`);
    if (txn.subscriptionId) console.log(`Subscription ID: ${txn.subscriptionId}`);
    console.log(`Created: ${formatDate(txn.createdAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listSubscriptions(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('altId', locationConfig.id);
    params.append('altType', 'location');
    
    if (args.limit) params.append('limit', args.limit);
    if (args.offset) params.append('offset', args.offset);
    if (args.status) params.append('status', args.status);
    if (args['contact-id']) params.append('contactId', args['contact-id']);
    
    const endpoint = `/payments/subscriptions?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} subscriptions (${meta.pages} pages):\n`);
      displaySubscriptions(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const subscriptions = data.subscriptions || data.data || [];
      console.log(`Found ${subscriptions.length} subscriptions:\n`);
      displaySubscriptions(subscriptions);
      
      if (data.meta?.total > subscriptions.length) {
        console.log(`\nShowing ${subscriptions.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displaySubscriptions(subscriptions) {
  if (subscriptions.length === 0) {
    console.log('No subscriptions found.');
    return;
  }
  
  for (const sub of subscriptions) {
    console.log(`- ${sub._id || sub.id}`);
    console.log(`  Status: ${sub.status || 'unknown'}`);
    console.log(`  Amount: ${formatCurrency(sub.amount / 100)}`);
    if (sub.interval) console.log(`  Interval: ${sub.interval}`);
    if (sub.contact) console.log(`  Contact: ${sub.contact.name || sub.contact.email}`);
    if (sub.nextBillingDate) console.log(`  Next Billing: ${formatDate(sub.nextBillingDate)}`);
    console.log(`  Created: ${formatDate(sub.createdAt)}`);
    console.log('');
  }
}

async function getSubscription(subscriptionId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/payments/subscriptions/${subscriptionId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Subscription Details:\n');
    const sub = data.subscription || data;
    console.log(`Subscription ID: ${sub._id || sub.id}`);
    console.log(`Status: ${sub.status}`);
    console.log(`Amount: ${formatCurrency(sub.amount / 100)}`);
    console.log(`Currency: ${sub.currency || 'USD'}`);
    console.log(`Interval: ${sub.interval || 'N/A'}`);
    
    if (sub.contact) {
      console.log('\nContact:');
      console.log(`  Name: ${sub.contact.name || 'N/A'}`);
      console.log(`  Email: ${sub.contact.email || 'N/A'}`);
    }
    
    if (sub.product) {
      console.log('\nProduct:');
      console.log(`  Name: ${sub.product.name || 'N/A'}`);
      console.log(`  ID: ${sub.product._id || sub.productId}`);
    }
    
    console.log(`\nCreated: ${formatDate(sub.createdAt)}`);
    if (sub.startAt) console.log(`Started: ${formatDate(sub.startAt)}`);
    if (sub.nextBillingDate) console.log(`Next Billing: ${formatDate(sub.nextBillingDate)}`);
    if (sub.cancelledAt) console.log(`Cancelled: ${formatDate(sub.cancelledAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function checkIntegration(locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/payments/integrations/provider/whitelabel?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('Payment Integration Status:\n');
    
    if (data.integration || data.provider) {
      const integration = data.integration || data;
      console.log(`Provider: ${integration.provider || integration.name || 'Connected'}`);
      console.log(`Status: ${integration.status || 'Active'}`);
      if (integration.liveMode !== undefined) {
        console.log(`Mode: ${integration.liveMode ? 'Live' : 'Test'}`);
      }
    } else {
      console.log('No payment integration configured.');
      console.log('\nTo accept payments, set up Stripe or another payment provider in Go High Level.');
    }
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Payments (Read-Only)

Usage:
  node payments.js <command> [options]

Commands:
  orders                   List all orders
  order <id>              Get order details
  transactions            List all transactions
  transaction <id>        Get transaction details
  subscriptions           List all subscriptions
  subscription <id>       Get subscription details
  integration             Check payment integration status
  locations               List configured locations

Options:
  --location "Name"       Specify GHL sub-account
  --contact-id <id>       Filter by contact
  --status "status"       Filter by status
  --start-date "YYYY-MM-DD"  Start date filter
  --end-date "YYYY-MM-DD"    End date filter
  --payment-mode "mode"   Filter by payment mode (transactions)
  --all                   Fetch all pages
  --limit <n>             Results per page
  --offset <n>            Skip first n results
  --verbose               Show full API response

Examples:
  node payments.js orders --location "WISER"
  node payments.js order ord123 --location "WISER"
  node payments.js transactions --status completed --location "WISER"
  node payments.js subscriptions --status active --location "WISER"
  node payments.js integration --location "WISER"

Order Statuses: pending, completed, cancelled, refunded
Transaction Statuses: pending, succeeded, failed
Subscription Statuses: active, cancelled, past_due, unpaid

NOTE: This connector is READ-ONLY for financial safety.
Refunds and cancellations should be done through the GHL UI.
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
    case 'orders':
      await listOrders(locationConfig);
      break;
    case 'order':
      if (!args._[1]) {
        console.error('Error: Order ID required');
        process.exit(1);
      }
      await getOrder(args._[1], locationConfig);
      break;
    case 'transactions':
      await listTransactions(locationConfig);
      break;
    case 'transaction':
      if (!args._[1]) {
        console.error('Error: Transaction ID required');
        process.exit(1);
      }
      await getTransaction(args._[1], locationConfig);
      break;
    case 'subscriptions':
      await listSubscriptions(locationConfig);
      break;
    case 'subscription':
      if (!args._[1]) {
        console.error('Error: Subscription ID required');
        process.exit(1);
      }
      await getSubscription(args._[1], locationConfig);
      break;
    case 'integration':
      await checkIntegration(locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node payments.js help" for usage');
      process.exit(1);
  }
}

main();
