#!/usr/bin/env node

/**
 * ClickUp Views Script
 * Manage views (list, board, calendar, etc.) on spaces, folders, and lists.
 *
 * Usage:
 *   node views.js list-space <space-id>
 *   node views.js list-folder <folder-id>
 *   node views.js list-list <list-id>
 *   node views.js get <view-id>
 *   node views.js tasks <view-id>
 *   node views.js create-space <space-id> --name "..." --type <type>
 *   node views.js create-folder <folder-id> --name "..." --type <type>
 *   node views.js create-list <list-id> --name "..." --type <type>
 *   node views.js update <view-id> [options]
 *   node views.js delete <view-id> [--force]
 *   node views.js help
 */

import { parseArgs, apiRequest, formatTask } from './utils.js';
import * as readline from 'readline';

/**
 * Format view for display
 */
function formatView(view) {
  const output = [];

  output.push(`${view.name}`);
  output.push(`  ID: ${view.id}`);
  output.push(`  Type: ${view.type}`);

  if (view.parent) {
    output.push(`  Parent: ${view.parent.type} (${view.parent.id})`);
  }

  if (view.visibility) {
    output.push(`  Visibility: ${view.visibility}`);
  }

  if (view.protected !== undefined) {
    output.push(`  Protected: ${view.protected}`);
  }

  if (view.date_created) {
    output.push(`  Created: ${new Date(parseInt(view.date_created)).toISOString()}`);
  }

  return output.join('\n');
}

/**
 * List views for a space
 */
async function listSpaceViews(spaceId, verbose) {
  const data = await apiRequest(`/space/${spaceId}/view`);

  const views = data.views || [];
  console.log(`Found ${views.length} view(s) in space:\n`);

  for (const view of views) {
    console.log(formatView(view));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return views;
}

/**
 * List views for a folder
 */
async function listFolderViews(folderId, verbose) {
  const data = await apiRequest(`/folder/${folderId}/view`);

  const views = data.views || [];
  console.log(`Found ${views.length} view(s) in folder:\n`);

  for (const view of views) {
    console.log(formatView(view));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return views;
}

/**
 * List views for a list
 */
async function listListViews(listId, verbose) {
  const data = await apiRequest(`/list/${listId}/view`);

  const views = data.views || [];
  console.log(`Found ${views.length} view(s) in list:\n`);

  for (const view of views) {
    console.log(formatView(view));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return views;
}

/**
 * Get a single view
 */
async function getView(viewId, verbose) {
  const data = await apiRequest(`/view/${viewId}`);

  const view = data.view;
  console.log(formatView(view));

  if (view.grouping) {
    console.log(`\nGrouping: ${JSON.stringify(view.grouping)}`);
  }

  if (view.sorting) {
    console.log(`Sorting: ${JSON.stringify(view.sorting)}`);
  }

  if (view.filters) {
    console.log(`Filters: ${JSON.stringify(view.filters)}`);
  }

  if (view.columns) {
    console.log(`Columns: ${JSON.stringify(view.columns)}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return view;
}

/**
 * Get tasks from a view
 */
async function getViewTasks(viewId, options, verbose) {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);

  const queryString = params.toString();
  const endpoint = `/view/${viewId}/task${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const tasks = data.tasks || [];
  console.log(`Found ${tasks.length} task(s) in view:\n`);

  for (const task of tasks) {
    console.log(formatTask(task, verbose));
    console.log('');
  }

  if (data.last_page !== undefined) {
    console.log(`Page info: last_page=${data.last_page}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return tasks;
}

/**
 * Create a view on a space
 */
async function createSpaceView(spaceId, name, type, options, verbose) {
  const body = {
    name,
    type,
    ...(options.grouping && { grouping: JSON.parse(options.grouping) }),
    ...(options.divide && { divide: JSON.parse(options.divide) }),
    ...(options.sorting && { sorting: JSON.parse(options.sorting) }),
    ...(options.filters && { filters: JSON.parse(options.filters) }),
    ...(options.columns && { columns: JSON.parse(options.columns) }),
    ...(options.teamSidebar && { team_sidebar: JSON.parse(options.teamSidebar) })
  };

  const data = await apiRequest(`/space/${spaceId}/view`, {
    method: 'POST',
    body
  });

  console.log('Created view:');
  console.log(formatView(data.view));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.view;
}

/**
 * Create a view on a folder
 */
async function createFolderView(folderId, name, type, options, verbose) {
  const body = {
    name,
    type,
    ...(options.grouping && { grouping: JSON.parse(options.grouping) }),
    ...(options.divide && { divide: JSON.parse(options.divide) }),
    ...(options.sorting && { sorting: JSON.parse(options.sorting) }),
    ...(options.filters && { filters: JSON.parse(options.filters) }),
    ...(options.columns && { columns: JSON.parse(options.columns) }),
    ...(options.teamSidebar && { team_sidebar: JSON.parse(options.teamSidebar) })
  };

  const data = await apiRequest(`/folder/${folderId}/view`, {
    method: 'POST',
    body
  });

  console.log('Created view:');
  console.log(formatView(data.view));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.view;
}

/**
 * Create a view on a list
 */
async function createListView(listId, name, type, options, verbose) {
  const body = {
    name,
    type,
    ...(options.grouping && { grouping: JSON.parse(options.grouping) }),
    ...(options.divide && { divide: JSON.parse(options.divide) }),
    ...(options.sorting && { sorting: JSON.parse(options.sorting) }),
    ...(options.filters && { filters: JSON.parse(options.filters) }),
    ...(options.columns && { columns: JSON.parse(options.columns) }),
    ...(options.teamSidebar && { team_sidebar: JSON.parse(options.teamSidebar) })
  };

  const data = await apiRequest(`/list/${listId}/view`, {
    method: 'POST',
    body
  });

  console.log('Created view:');
  console.log(formatView(data.view));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.view;
}

/**
 * Update a view
 */
async function updateView(viewId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.grouping) body.grouping = JSON.parse(options.grouping);
  if (options.divide) body.divide = JSON.parse(options.divide);
  if (options.sorting) body.sorting = JSON.parse(options.sorting);
  if (options.filters) body.filters = JSON.parse(options.filters);
  if (options.columns) body.columns = JSON.parse(options.columns);
  if (options.teamSidebar) body.team_sidebar = JSON.parse(options.teamSidebar);

  const data = await apiRequest(`/view/${viewId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated view:');
  console.log(formatView(data.view));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.view;
}

/**
 * Delete a view
 */
async function deleteView(viewId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(viewId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/view/${viewId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted view: ${viewId}`);
  return { success: true, id: viewId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(viewId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete view ${viewId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Views Script');
  console.log('');
  console.log('Commands:');
  console.log('  list-space <space-id>                  List views in a space');
  console.log('  list-folder <folder-id>                List views in a folder');
  console.log('  list-list <list-id>                    List views in a list');
  console.log('  get <view-id>                          Get view details');
  console.log('  tasks <view-id>                        Get tasks from a view');
  console.log('  create-space <space-id> --name --type  Create view on space');
  console.log('  create-folder <folder-id> --name --type Create view on folder');
  console.log('  create-list <list-id> --name --type    Create view on list');
  console.log('  update <view-id> [options]             Update a view');
  console.log('  delete <view-id>                       Delete a view');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --name "..."             View name');
  console.log('  --type <type>            View type (see types below)');
  console.log('  --grouping "{}"          Grouping config (JSON)');
  console.log('  --sorting "{}"           Sorting config (JSON)');
  console.log('  --filters "{}"           Filters config (JSON)');
  console.log('  --columns "{}"           Columns config (JSON)');
  console.log('  --page <n>               Page number (tasks command)');
  console.log('');
  console.log('View Types:');
  console.log('  list       - List view');
  console.log('  board      - Board/Kanban view');
  console.log('  calendar   - Calendar view');
  console.log('  gantt      - Gantt chart view');
  console.log('  timeline   - Timeline view');
  console.log('  table      - Table view');
  console.log('  box        - Box view');
  console.log('  activity   - Activity view');
  console.log('  map        - Map view');
  console.log('  workload   - Workload view');
  console.log('');
  console.log('Examples:');
  console.log('  # List views in a space');
  console.log('  node views.js list-space 90123456');
  console.log('');
  console.log('  # Get view details');
  console.log('  node views.js get abc-123-view');
  console.log('');
  console.log('  # Get tasks from a view');
  console.log('  node views.js tasks abc-123-view');
  console.log('');
  console.log('  # Create a board view on a list');
  console.log('  node views.js create-list 12345678 --name "Sprint Board" --type board');
  console.log('');
  console.log('  # Create a calendar view on a space');
  console.log('  node views.js create-space 90123456 --name "Team Calendar" --type calendar');
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
      case 'list-space': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          process.exit(1);
        }
        await listSpaceViews(spaceId, verbose);
        break;
      }

      case 'list-folder': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          process.exit(1);
        }
        await listFolderViews(folderId, verbose);
        break;
      }

      case 'list-list': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          process.exit(1);
        }
        await listListViews(listId, verbose);
        break;
      }

      case 'get': {
        const viewId = args._[1];
        if (!viewId) {
          console.error('Error: View ID is required');
          process.exit(1);
        }
        await getView(viewId, verbose);
        break;
      }

      case 'tasks': {
        const viewId = args._[1];
        if (!viewId) {
          console.error('Error: View ID is required');
          process.exit(1);
        }
        await getViewTasks(viewId, { page: args.page }, verbose);
        break;
      }

      case 'create-space': {
        const spaceId = args._[1];
        if (!spaceId || !args.name || !args.type) {
          console.error('Error: Space ID, --name, and --type are required');
          process.exit(1);
        }
        await createSpaceView(spaceId, args.name, args.type, {
          grouping: args.grouping,
          divide: args.divide,
          sorting: args.sorting,
          filters: args.filters,
          columns: args.columns,
          teamSidebar: args['team-sidebar']
        }, verbose);
        break;
      }

      case 'create-folder': {
        const folderId = args._[1];
        if (!folderId || !args.name || !args.type) {
          console.error('Error: Folder ID, --name, and --type are required');
          process.exit(1);
        }
        await createFolderView(folderId, args.name, args.type, {
          grouping: args.grouping,
          divide: args.divide,
          sorting: args.sorting,
          filters: args.filters,
          columns: args.columns,
          teamSidebar: args['team-sidebar']
        }, verbose);
        break;
      }

      case 'create-list': {
        const listId = args._[1];
        if (!listId || !args.name || !args.type) {
          console.error('Error: List ID, --name, and --type are required');
          process.exit(1);
        }
        await createListView(listId, args.name, args.type, {
          grouping: args.grouping,
          divide: args.divide,
          sorting: args.sorting,
          filters: args.filters,
          columns: args.columns,
          teamSidebar: args['team-sidebar']
        }, verbose);
        break;
      }

      case 'update': {
        const viewId = args._[1];
        if (!viewId) {
          console.error('Error: View ID is required');
          process.exit(1);
        }
        await updateView(viewId, {
          name: args.name,
          grouping: args.grouping,
          divide: args.divide,
          sorting: args.sorting,
          filters: args.filters,
          columns: args.columns,
          teamSidebar: args['team-sidebar']
        }, verbose);
        break;
      }

      case 'delete': {
        const viewId = args._[1];
        if (!viewId) {
          console.error('Error: View ID is required');
          process.exit(1);
        }
        await deleteView(viewId, args.force, verbose);
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
