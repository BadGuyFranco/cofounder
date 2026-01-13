#!/usr/bin/env node

/**
 * HuggingFace Repos Script
 * Create, delete, and manage repositories.
 *
 * Usage:
 *   node repos.js create <name> --type <model|dataset|space>
 *   node repos.js delete <name> --type <model|dataset|space>
 *   node repos.js list
 *   node repos.js update <name> --type <type> [--private|--public]
 *   node repos.js help
 */

import { parseArgs, hubApiRequest } from './utils.js';

/**
 * Create a new repository
 * @param {string} name - Repository name
 * @param {string} type - Repository type (model, dataset, space)
 * @param {object} options - Creation options
 */
async function createRepo(name, type, options = {}) {
  const validTypes = ['model', 'dataset', 'space'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  console.log(`Creating ${type} repository: ${name}`);

  const body = {
    name,
    type,
    private: options.private || false
  };

  if (type === 'space' && options.sdk) {
    body.sdk = options.sdk;
  }

  const result = await hubApiRequest('/repos/create', {
    method: 'POST',
    body
  });

  console.log(`\nRepository created successfully!`);
  console.log(`  Name: ${result.name || name}`);
  console.log(`  Type: ${type}`);
  console.log(`  Visibility: ${options.private ? 'private' : 'public'}`);
  
  const urlPrefix = type === 'model' ? '' : `${type}s/`;
  console.log(`  URL: https://huggingface.co/${urlPrefix}${result.name || name}`);

  return result;
}

/**
 * Delete a repository
 * @param {string} repoId - Repository ID (owner/name or just name)
 * @param {string} type - Repository type
 */
async function deleteRepo(repoId, type) {
  const validTypes = ['model', 'dataset', 'space'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  console.log(`Deleting ${type} repository: ${repoId}`);
  console.log('This action cannot be undone.\n');

  const body = {
    name: repoId,
    type
  };

  await hubApiRequest('/repos/delete', {
    method: 'DELETE',
    body
  });

  console.log(`Repository deleted successfully.`);

  return true;
}

/**
 * List user's repositories
 * @param {string} type - Filter by type (optional)
 * @param {boolean} verbose - Show full response
 */
async function listRepos(type, verbose) {
  const user = await hubApiRequest('/whoami-v2');
  const username = user.name;

  console.log(`Repositories owned by ${username}:\n`);

  const types = type ? [type] : ['model', 'dataset', 'space'];
  let totalCount = 0;

  for (const repoType of types) {
    let endpoint;
    let label;
    
    if (repoType === 'model') {
      endpoint = `/models?author=${username}`;
      label = 'Models';
    } else if (repoType === 'dataset') {
      endpoint = `/datasets?author=${username}`;
      label = 'Datasets';
    } else if (repoType === 'space') {
      endpoint = `/spaces?author=${username}`;
      label = 'Spaces';
    }

    const repos = await hubApiRequest(endpoint);
    
    if (repos.length > 0) {
      console.log(`${label}:`);
      for (const repo of repos) {
        const visibility = repo.private ? 'private' : 'public';
        const id = repo.id || repo.modelId || repo.name;
        console.log(`  ${id} (${visibility})`);
      }
      console.log('');
      totalCount += repos.length;
    }
  }

  if (totalCount === 0) {
    console.log('No repositories found.');
  } else {
    console.log(`Total: ${totalCount} repositories`);
  }
}

/**
 * Update repository settings
 * @param {string} repoId - Repository ID
 * @param {string} type - Repository type
 * @param {object} settings - Settings to update
 */
async function updateRepo(repoId, type, settings) {
  const validTypes = ['model', 'dataset', 'space'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  console.log(`Updating ${type} repository: ${repoId}`);

  const body = {
    name: repoId,
    type
  };

  if (settings.private !== undefined) {
    body.private = settings.private;
  }

  if (settings.gated !== undefined) {
    body.gated = settings.gated;
  }

  await hubApiRequest('/repos/update', {
    method: 'PUT',
    body
  });

  console.log(`\nRepository updated successfully!`);
  if (settings.private !== undefined) {
    console.log(`  Visibility: ${settings.private ? 'private' : 'public'}`);
  }
  if (settings.gated !== undefined) {
    console.log(`  Gated: ${settings.gated}`);
  }

  return true;
}

/**
 * Move/rename a repository
 * @param {string} fromRepo - Current repository ID
 * @param {string} toRepo - New repository ID
 * @param {string} type - Repository type
 */
async function moveRepo(fromRepo, toRepo, type) {
  const validTypes = ['model', 'dataset', 'space'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  console.log(`Moving ${type} repository: ${fromRepo} -> ${toRepo}`);

  await hubApiRequest('/repos/move', {
    method: 'POST',
    body: {
      fromRepo,
      toRepo,
      type
    }
  });

  console.log(`\nRepository moved successfully!`);
  console.log(`  From: ${fromRepo}`);
  console.log(`  To: ${toRepo}`);

  return true;
}

// Show help
function showHelp() {
  console.log(`HuggingFace Repos Script

Commands:
  create <name>             Create a new repository
  delete <name>             Delete a repository
  list                      List your repositories
  update <name>             Update repository settings
  move <from> <to>          Rename/move a repository
  help                      Show this help

Options:
  --type <type>       Repository type: model, dataset, or space (required for most commands)
  --private           Create as private repository
  --public            Make repository public
  --gated <value>     Set gated access (true, false, auto, manual)
  --sdk <sdk>         SDK for spaces (gradio, streamlit, docker, static)
  --verbose           Show full API responses

Examples:
  # Create a model repository
  node repos.js create my-model --type model

  # Create a private dataset
  node repos.js create my-dataset --type dataset --private

  # Create a Gradio space
  node repos.js create my-app --type space --sdk gradio

  # Delete a repository
  node repos.js delete my-model --type model

  # List all your repositories
  node repos.js list

  # List only your models
  node repos.js list --type model

  # Make a repository private
  node repos.js update my-model --type model --private

  # Make a repository public
  node repos.js update my-model --type model --public

  # Rename a repository
  node repos.js move old-name new-name --type model

Repository types:
  - model: Machine learning models
  - dataset: Training/evaluation datasets
  - space: Interactive demos and apps
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'create': {
        const name = args._[1];
        if (!name) {
          console.error('Error: Repository name is required');
          console.error('Usage: node repos.js create <name> --type <model|dataset|space>');
          process.exit(1);
        }
        if (!args.type) {
          console.error('Error: --type is required (model, dataset, or space)');
          process.exit(1);
        }
        await createRepo(name, args.type, {
          private: args.private || false,
          sdk: args.sdk
        });
        break;
      }

      case 'delete': {
        const name = args._[1];
        if (!name) {
          console.error('Error: Repository name is required');
          console.error('Usage: node repos.js delete <name> --type <model|dataset|space>');
          process.exit(1);
        }
        if (!args.type) {
          console.error('Error: --type is required (model, dataset, or space)');
          process.exit(1);
        }
        await deleteRepo(name, args.type);
        break;
      }

      case 'list': {
        await listRepos(args.type, verbose);
        break;
      }

      case 'update': {
        const name = args._[1];
        if (!name) {
          console.error('Error: Repository name is required');
          console.error('Usage: node repos.js update <name> --type <type> [--private|--public]');
          process.exit(1);
        }
        if (!args.type) {
          console.error('Error: --type is required (model, dataset, or space)');
          process.exit(1);
        }
        
        const settings = {};
        if (args.private) settings.private = true;
        if (args.public) settings.private = false;
        if (args.gated !== undefined) settings.gated = args.gated;

        if (Object.keys(settings).length === 0) {
          console.error('Error: No settings to update. Use --private, --public, or --gated');
          process.exit(1);
        }

        await updateRepo(name, args.type, settings);
        break;
      }

      case 'move': {
        const fromRepo = args._[1];
        const toRepo = args._[2];
        if (!fromRepo || !toRepo) {
          console.error('Error: Both source and destination are required');
          console.error('Usage: node repos.js move <from> <to> --type <type>');
          process.exit(1);
        }
        if (!args.type) {
          console.error('Error: --type is required (model, dataset, or space)');
          process.exit(1);
        }
        await moveRepo(fromRepo, toRepo, args.type);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.status === 401) {
      console.error('\nAuthentication failed. Check your API token.');
    }
    if (error.status === 403) {
      console.error('\nPermission denied. Make sure your token has write access.');
    }
    if (error.status === 404) {
      console.error('\nRepository not found.');
    }
    if (error.status === 409) {
      console.error('\nRepository already exists with that name.');
    }
    process.exit(1);
  }
}

main();
