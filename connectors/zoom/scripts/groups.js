/**
 * Zoom Groups Script
 * Manage user groups
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Groups Script - Manage user groups

Usage: node scripts/groups.js <command> [options]

Commands:
  list                    List all groups
  get <group_id>          Get group details
  create                  Create a new group
  update <group_id>       Update group settings
  delete <group_id>       Delete a group
  members <group_id>      List group members
  add-members <group_id>  Add members to group
  remove-member <grp_id>  Remove member from group
  settings <group_id>     Get group settings
  lock-settings <grp_id>  Get group locked settings
  help                    Show this help

Options:
  --page_size <n>         Results per page (max 300)
  --page_number <n>       Page number
  --next_page_token <t>   Pagination token

  For create/update:
  --name <name>           Group name (required for create)

  For add-members:
  --members <json>        JSON array of member objects: [{"id":"user_id"},{"email":"user@example.com"}]

  For remove-member:
  --member_id <id>        Member ID to remove (required)

Examples:
  node scripts/groups.js list
  node scripts/groups.js get groupId123
  node scripts/groups.js create --name "Engineering Team"
  node scripts/groups.js update groupId123 --name "Dev Team"
  node scripts/groups.js delete groupId123
  node scripts/groups.js members groupId123
  node scripts/groups.js add-members groupId123 --members '[{"email":"user@example.com"}]'
  node scripts/groups.js remove-member groupId123 --member_id userId456
  node scripts/groups.js settings groupId123
`);
}

async function listGroups(token, flags) {
  const query = buildQuery(flags, ['page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/groups${query}`, {}, token);
  output(data);
}

async function getGroup(token, groupId) {
  const data = await apiRequest(`/groups/${groupId}`, {}, token);
  output(data);
}

async function createGroup(token, flags) {
  if (!flags.name) {
    throw new Error('Group name required. Usage: create --name "Group Name"');
  }

  const body = {
    name: flags.name
  };

  const data = await apiRequest('/groups', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function updateGroup(token, groupId, flags) {
  if (!flags.name) {
    throw new Error('Group name required. Usage: update <group_id> --name "New Name"');
  }

  const body = {
    name: flags.name
  };

  const data = await apiRequest(`/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function deleteGroup(token, groupId) {
  const data = await apiRequest(`/groups/${groupId}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function listMembers(token, groupId, flags) {
  const query = buildQuery(flags, ['page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/groups/${groupId}/members${query}`, {}, token);
  output(data);
}

async function addMembers(token, groupId, flags) {
  if (!flags.members) {
    throw new Error('Members required. Usage: add-members <group_id> --members \'[{"email":"user@example.com"}]\'');
  }

  let members;
  try {
    members = JSON.parse(flags.members);
  } catch (e) {
    throw new Error('Members must be valid JSON array. Example: \'[{"id":"userId"},{"email":"user@example.com"}]\'');
  }

  const body = {
    members: members
  };

  const data = await apiRequest(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function removeMember(token, groupId, flags) {
  if (!flags.member_id) {
    throw new Error('Member ID required. Usage: remove-member <group_id> --member_id <member_id>');
  }

  const data = await apiRequest(`/groups/${groupId}/members/${flags.member_id}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function getGroupSettings(token, groupId) {
  const data = await apiRequest(`/groups/${groupId}/settings`, {}, token);
  output(data);
}

async function getLockedSettings(token, groupId) {
  const data = await apiRequest(`/groups/${groupId}/lock_settings`, {}, token);
  output(data);
}

async function main() {
  const init = await initScript(showHelp);
  if (!init) return;

  const { token } = init;
  const { command, args, flags } = parseArgs();

  try {
    switch (command) {
      case 'list':
        await listGroups(token, flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('Group ID required. Usage: get <group_id>');
        await getGroup(token, args[0]);
        break;
      case 'create':
        await createGroup(token, flags);
        break;
      case 'update':
        if (!args[0]) throw new Error('Group ID required. Usage: update <group_id> --name "Name"');
        await updateGroup(token, args[0], flags);
        break;
      case 'delete':
        if (!args[0]) throw new Error('Group ID required. Usage: delete <group_id>');
        await deleteGroup(token, args[0]);
        break;
      case 'members':
        if (!args[0]) throw new Error('Group ID required. Usage: members <group_id>');
        await listMembers(token, args[0], flags);
        break;
      case 'add-members':
        if (!args[0]) throw new Error('Group ID required. Usage: add-members <group_id> --members "[...]"');
        await addMembers(token, args[0], flags);
        break;
      case 'remove-member':
        if (!args[0]) throw new Error('Group ID required. Usage: remove-member <group_id> --member_id <id>');
        await removeMember(token, args[0], flags);
        break;
      case 'settings':
        if (!args[0]) throw new Error('Group ID required. Usage: settings <group_id>');
        await getGroupSettings(token, args[0]);
        break;
      case 'lock-settings':
        if (!args[0]) throw new Error('Group ID required. Usage: lock-settings <group_id>');
        await getLockedSettings(token, args[0]);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
