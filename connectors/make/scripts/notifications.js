#!/usr/bin/env node

/**
 * Make.com Notifications Script
 * Manage user notifications.
 * 
 * Usage:
 *   node notifications.js list [--limit 20]
 *   node notifications.js unread
 *   node notifications.js mark-read <notification-id>
 *   node notifications.js mark-all-read
 */

import { get, post, patch, parseArgs, printTable, formatOutput } from './utils.js';

// List notifications
async function listNotifications(limit, verbose) {
  const params = {};
  if (limit) {
    params.pg = { limit: parseInt(limit) };
  }
  
  const response = await get('/notifications', params);
  const notifications = response.notifications || response;
  
  if (verbose) {
    formatOutput(notifications, true);
    return;
  }
  
  if (!notifications || notifications.length === 0) {
    console.log('No notifications found.');
    return;
  }
  
  console.log(`Found ${notifications.length} notification(s):\n`);
  
  printTable(notifications, [
    { key: 'id', label: 'ID' },
    { key: 'type', label: 'Type' },
    { key: 'message', label: 'Message', getter: n => (n.message || '').substring(0, 50) },
    { key: 'read', label: 'Read', getter: n => n.read ? 'Yes' : 'No' },
    { key: 'created', label: 'Created' }
  ]);
}

// Get unread notification count
async function getUnreadCount(verbose) {
  const response = await get('/users/me/unread-notifications');
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const count = response.unreadNotifications || response.count || 0;
  console.log(`Unread notifications: ${count}`);
}

// Mark notification as read
async function markRead(notificationId, verbose) {
  const response = await patch(`/notifications/${notificationId}`, { read: true });
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Notification ${notificationId} marked as read.`);
}

// Mark all notifications as read
async function markAllRead(verbose) {
  const response = await post('/notifications/mark-all-read', {});
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log('All notifications marked as read.');
}

// Show help
function showHelp() {
  console.log('Make.com Notifications Script');
  console.log('');
  console.log('Manage user notifications.');
  console.log('');
  console.log('Commands:');
  console.log('  list [--limit 20]              List notifications');
  console.log('  unread                         Get unread count');
  console.log('  mark-read <notification-id>    Mark notification as read');
  console.log('  mark-all-read                  Mark all as read');
  console.log('');
  console.log('Options:');
  console.log('  --limit <n>       Number of notifications to show');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node notifications.js list --limit 10');
  console.log('  node notifications.js unread');
  console.log('  node notifications.js mark-read 12345');
  console.log('  node notifications.js mark-all-read');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        await listNotifications(args.limit, verbose);
        break;
      }
      
      case 'unread': {
        await getUnreadCount(verbose);
        break;
      }
      
      case 'mark-read': {
        const notificationId = args._[1];
        if (!notificationId) {
          console.error('Error: Notification ID is required');
          console.error('Usage: node notifications.js mark-read <notification-id>');
          process.exit(1);
        }
        await markRead(notificationId, verbose);
        break;
      }
      
      case 'mark-all-read': {
        await markAllRead(verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
