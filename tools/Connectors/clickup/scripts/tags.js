#!/usr/bin/env node

/**
 * ClickUp Tags Script
 * Manage tags in spaces and on tasks.
 *
 * Usage:
 *   node tags.js list <space-id>
 *   node tags.js create <space-id> --name "Tag Name"
 *   node tags.js update <space-id> <tag-name> --new-name "New Name"
 *   node tags.js delete <space-id> <tag-name> [--force]
 *   node tags.js add <task-id> <tag-name>
 *   node tags.js remove <task-id> <tag-name>
 *   node tags.js help
 */

import { parseArgs, apiRequest } from './utils.js';
import * as readline from 'readline';

/**
 * Format tag for display
 */
function formatTag(tag) {
  const output = [];

  output.push(`${tag.name}`);

  if (tag.tag_fg) {
    output.push(`  Foreground: ${tag.tag_fg}`);
  }

  if (tag.tag_bg) {
    output.push(`  Background: ${tag.tag_bg}`);
  }

  return output.join('\n');
}

/**
 * List tags in a space
 */
async function listTags(spaceId, verbose) {
  const data = await apiRequest(`/space/${spaceId}/tag`);

  const tags = data.tags || [];
  console.log(`Found ${tags.length} tag(s):\n`);

  for (const tag of tags) {
    console.log(formatTag(tag));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return tags;
}

/**
 * Create a tag in a space
 */
async function createTag(spaceId, name, options, verbose) {
  const body = {
    tag: {
      name,
      ...(options.tagFg && { tag_fg: options.tagFg }),
      ...(options.tagBg && { tag_bg: options.tagBg })
    }
  };

  const data = await apiRequest(`/space/${spaceId}/tag`, {
    method: 'POST',
    body
  });

  console.log('Created tag:');
  console.log(`  Name: ${name}`);
  if (options.tagFg) console.log(`  Foreground: ${options.tagFg}`);
  if (options.tagBg) console.log(`  Background: ${options.tagBg}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Update a tag (rename)
 */
async function updateTag(spaceId, tagName, options, verbose) {
  const body = {
    tag: {
      ...(options.newName && { name: options.newName }),
      ...(options.tagFg && { tag_fg: options.tagFg }),
      ...(options.tagBg && { tag_bg: options.tagBg })
    }
  };

  const encodedTagName = encodeURIComponent(tagName);
  const data = await apiRequest(`/space/${spaceId}/tag/${encodedTagName}`, {
    method: 'PUT',
    body
  });

  console.log('Updated tag:');
  console.log(`  Original: ${tagName}`);
  if (options.newName) console.log(`  New name: ${options.newName}`);
  if (options.tagFg) console.log(`  Foreground: ${options.tagFg}`);
  if (options.tagBg) console.log(`  Background: ${options.tagBg}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Delete a tag from a space
 */
async function deleteTag(spaceId, tagName, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(tagName);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  const encodedTagName = encodeURIComponent(tagName);
  await apiRequest(`/space/${spaceId}/tag/${encodedTagName}`, {
    method: 'DELETE'
  });

  console.log(`Deleted tag: ${tagName}`);
  return { success: true, name: tagName };
}

/**
 * Add a tag to a task
 */
async function addTagToTask(taskId, tagName, verbose) {
  const encodedTagName = encodeURIComponent(tagName);
  const data = await apiRequest(`/task/${taskId}/tag/${encodedTagName}`, {
    method: 'POST'
  });

  console.log(`Added tag "${tagName}" to task ${taskId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Remove a tag from a task
 */
async function removeTagFromTask(taskId, tagName, verbose) {
  const encodedTagName = encodeURIComponent(tagName);
  const data = await apiRequest(`/task/${taskId}/tag/${encodedTagName}`, {
    method: 'DELETE'
  });

  console.log(`Removed tag "${tagName}" from task ${taskId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Confirm deletion
 */
async function confirmDelete(tagName) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete tag "${tagName}"? This will remove it from all tasks. (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Tags Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <space-id>                        List tags in a space');
  console.log('  create <space-id> --name "..."         Create a tag');
  console.log('  update <space-id> <tag-name> [options] Update a tag');
  console.log('  delete <space-id> <tag-name>           Delete a tag');
  console.log('  add <task-id> <tag-name>               Add tag to task');
  console.log('  remove <task-id> <tag-name>            Remove tag from task');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --name "..."             Tag name (create)');
  console.log('  --new-name "..."         New tag name (update)');
  console.log('  --tag-fg "#RRGGBB"       Foreground color');
  console.log('  --tag-bg "#RRGGBB"       Background color');
  console.log('');
  console.log('Examples:');
  console.log('  # List tags in a space');
  console.log('  node tags.js list 90123456');
  console.log('');
  console.log('  # Create a tag');
  console.log('  node tags.js create 90123456 --name "urgent" --tag-bg "#ff0000"');
  console.log('');
  console.log('  # Rename a tag');
  console.log('  node tags.js update 90123456 "urgent" --new-name "critical"');
  console.log('');
  console.log('  # Delete a tag');
  console.log('  node tags.js delete 90123456 "old-tag"');
  console.log('');
  console.log('  # Add tag to a task');
  console.log('  node tags.js add abc123 "urgent"');
  console.log('');
  console.log('  # Remove tag from a task');
  console.log('  node tags.js remove abc123 "urgent"');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node tags.js list <space-id>');
          process.exit(1);
        }
        await listTags(spaceId, verbose);
        break;
      }

      case 'create': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node tags.js create <space-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          process.exit(1);
        }
        await createTag(spaceId, args.name, {
          tagFg: args['tag-fg'],
          tagBg: args['tag-bg']
        }, verbose);
        break;
      }

      case 'update': {
        const spaceId = args._[1];
        const tagName = args._[2];
        if (!spaceId || !tagName) {
          console.error('Error: Space ID and tag name are required');
          console.error('Usage: node tags.js update <space-id> <tag-name> [options]');
          process.exit(1);
        }
        await updateTag(spaceId, tagName, {
          newName: args['new-name'],
          tagFg: args['tag-fg'],
          tagBg: args['tag-bg']
        }, verbose);
        break;
      }

      case 'delete': {
        const spaceId = args._[1];
        const tagName = args._[2];
        if (!spaceId || !tagName) {
          console.error('Error: Space ID and tag name are required');
          console.error('Usage: node tags.js delete <space-id> <tag-name>');
          process.exit(1);
        }
        await deleteTag(spaceId, tagName, args.force, verbose);
        break;
      }

      case 'add': {
        const taskId = args._[1];
        const tagName = args._[2];
        if (!taskId || !tagName) {
          console.error('Error: Task ID and tag name are required');
          console.error('Usage: node tags.js add <task-id> <tag-name>');
          process.exit(1);
        }
        await addTagToTask(taskId, tagName, verbose);
        break;
      }

      case 'remove': {
        const taskId = args._[1];
        const tagName = args._[2];
        if (!taskId || !tagName) {
          console.error('Error: Task ID and tag name are required');
          console.error('Usage: node tags.js remove <task-id> <tag-name>');
          process.exit(1);
        }
        await removeTagFromTask(taskId, tagName, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
