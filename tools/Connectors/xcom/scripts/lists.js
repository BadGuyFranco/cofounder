#!/usr/bin/env node

/**
 * X.com Lists Management
 * Create, manage, and interact with X Lists.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated, confirmDestructiveAction,
  formatDate, handleError, showHelp, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Lists', {
    'Commands': [
      'owned [user_id]            List owned lists (yours if no user)',
      'memberships [user_id]      Lists a user is a member of',
      'get <list_id>              Get list details',
      'create <name>              Create a new list',
      'update <list_id>           Update list details',
      'delete <list_id>           Delete a list (destructive)',
      'members <list_id>          List members of a list',
      'add-member <list_id> <uid> Add a user to your list',
      'remove-member <lid> <uid>  Remove a user from your list',
      'tweets <list_id>           Get recent tweets from a list',
      'follow <list_id>           Follow a list',
      'unfollow <list_id>         Unfollow a list',
      'help                       Show this help'
    ],
    'Options': [
      '--description <text>       List description (create/update)',
      '--private                  Make list private (create/update)',
      '--limit <n>                Max results (default: 100)',
      '--all                      Fetch all pages',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node lists.js owned',
      'node lists.js create "AI Thought Leaders" --description "People building AI"',
      'node lists.js create "Private Notes" --private',
      'node lists.js members 1234567890123456789',
      'node lists.js add-member 1234567890 9876543210',
      'node lists.js tweets 1234567890123456789 --limit 50'
    ],
    'Notes': [
      'Lists can be public or private',
      'You can have up to 1000 lists',
      'Each list can have up to 5000 members'
    ]
  });
}

const LIST_FIELDS = 'created_at,description,follower_count,member_count,private,owner_id';
const USER_FIELDS = 'name,username,public_metrics';
const TWEET_FIELDS = 'created_at,public_metrics,author_id';

// List owned lists
async function listOwnedLists(userId, args) {
  const targetUserId = userId || await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'list.fields': LIST_FIELDS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching owned lists...\n');
  
  const data = await apiRequest('GET', `/users/${targetUserId}/owned_lists`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const lists = data.data || [];
  console.log(`Found ${lists.length} lists:\n`);
  
  for (const list of lists) {
    displayList(list);
  }
}

// List memberships
async function listMemberships(userId, args) {
  const targetUserId = userId || await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'list.fields': LIST_FIELDS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching list memberships...\n');
  
  const data = await apiRequest('GET', `/users/${targetUserId}/list_memberships`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const lists = data.data || [];
  console.log(`Member of ${lists.length} lists:\n`);
  
  for (const list of lists) {
    displayList(list);
  }
}

// Display list
function displayList(list) {
  const visibility = list.private ? 'Private' : 'Public';
  console.log(`${list.name} [${visibility}]`);
  if (list.description) console.log(`  ${list.description}`);
  console.log(`  Members: ${list.member_count || 0} | Followers: ${list.follower_count || 0}`);
  console.log(`  ID: ${list.id}`);
  console.log(`  Created: ${formatDate(list.created_at)}`);
  console.log('');
}

// Get list details
async function getList(listId, args) {
  const data = await apiRequest('GET', `/lists/${listId}`, {
    params: { 'list.fields': LIST_FIELDS }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  displayList(data.data);
}

// Create a list
async function createList(name, args) {
  const body = { name };
  
  if (args.description) {
    body.description = args.description;
  }
  
  if (args.private) {
    body.private = true;
  }
  
  console.log('Creating list...\n');
  
  const data = await apiRequest('POST', '/lists', { body });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('List created successfully!\n');
  console.log(`ID: ${data.data.id}`);
  console.log(`Name: ${data.data.name}`);
}

// Update a list
async function updateList(listId, args) {
  const body = {};
  
  if (args.name) body.name = args.name;
  if (args.description) body.description = args.description;
  if (args.private !== undefined) body.private = args.private === true || args.private === 'true';
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    console.error('Use --name, --description, or --private');
    process.exit(1);
  }
  
  console.log('Updating list...\n');
  
  const data = await apiRequest('PUT', `/lists/${listId}`, { body });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.updated) {
    console.log('List updated successfully!');
  } else {
    console.log('Update may have failed. Check the list.');
  }
}

// Delete a list
async function deleteList(listId, args) {
  // Get list info first
  let listInfo = listId;
  try {
    const listData = await apiRequest('GET', `/lists/${listId}`, {
      params: { 'list.fields': 'name' }
    });
    listInfo = listData.data.name;
  } catch (e) {
    // Continue with just the ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete list: ${listInfo}`,
    [`List ID: ${listId}`, 'All members and settings will be lost.'],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/lists/${listId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('List deleted successfully.');
}

// List members
async function listMembers(listId, args) {
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching list members...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/lists/${listId}/members`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} members:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/lists/${listId}/members`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} members:\n`);
    
    for (const user of users) {
      displayUser(user);
    }
  }
}

// Display user
function displayUser(user) {
  const metrics = user.public_metrics || {};
  console.log(`${user.name} (@${user.username})`);
  console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0} | ID: ${user.id}`);
  console.log('');
}

// Add member to list
async function addMember(listId, userId, args) {
  console.log('Adding member to list...\n');
  
  const data = await apiRequest('POST', `/lists/${listId}/members`, {
    body: { user_id: userId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.is_member) {
    console.log('User added to list successfully!');
  } else {
    console.log('Add may have failed. Check the list and user.');
  }
}

// Remove member from list
async function removeMember(listId, userId, args) {
  const confirmed = await confirmDestructiveAction(
    `Remove user ${userId} from list ${listId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/lists/${listId}/members/${userId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('User removed from list successfully.');
}

// Get tweets from list
async function listTweets(listId, args) {
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'author_id',
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching tweets from list...\n');
  
  const data = await apiRequest('GET', `/lists/${listId}/tweets`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tweets = data.data || [];
  console.log(`Found ${tweets.length} tweets:\n`);
  
  for (const tweet of tweets) {
    const author = data.includes?.users?.find(u => u.id === tweet.author_id);
    const metrics = tweet.public_metrics || {};
    
    const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;
    
    console.log(`${authorName}`);
    console.log(`${tweet.text}`);
    console.log(`  ${formatDate(tweet.created_at)} | ❤️ ${metrics.like_count || 0} | 🔁 ${metrics.retweet_count || 0}`);
    console.log(`  ID: ${tweet.id}`);
    console.log('');
  }
}

// Follow a list
async function followList(listId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Following list...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/followed_lists`, {
    body: { list_id: listId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.following) {
    console.log('List followed successfully!');
  } else {
    console.log('Follow may have failed. Check the list.');
  }
}

// Unfollow a list
async function unfollowList(listId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Unfollow list: ${listId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/followed_lists/${listId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('List unfollowed successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'owned':
        await listOwnedLists(args._[1], args);
        break;
      case 'memberships':
        await listMemberships(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await getList(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: List name required');
          console.error('Usage: node lists.js create "List Name" --description "..."');
          process.exit(1);
        }
        await createList(args._[1], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await updateList(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await deleteList(args._[1], args);
        break;
      case 'members':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await listMembers(args._[1], args);
        break;
      case 'add-member':
        if (!args._[1] || !args._[2]) {
          console.error('Error: List ID and User ID required');
          console.error('Usage: node lists.js add-member <list_id> <user_id>');
          process.exit(1);
        }
        await addMember(args._[1], args._[2], args);
        break;
      case 'remove-member':
        if (!args._[1] || !args._[2]) {
          console.error('Error: List ID and User ID required');
          console.error('Usage: node lists.js remove-member <list_id> <user_id>');
          process.exit(1);
        }
        await removeMember(args._[1], args._[2], args);
        break;
      case 'tweets':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await listTweets(args._[1], args);
        break;
      case 'follow':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await followList(args._[1], args);
        break;
      case 'unfollow':
        if (!args._[1]) {
          console.error('Error: List ID required');
          process.exit(1);
        }
        await unfollowList(args._[1], args);
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
