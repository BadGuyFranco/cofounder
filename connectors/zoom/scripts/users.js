/**
 * Zoom Users Script
 * Manage Zoom users in your account
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Users Script - Manage Zoom users

Usage: node scripts/users.js <command> [options]

Commands:
  list                    List all users
  get <user_id>           Get user by ID or email (use 'me' for current user)
  create                  Create a new user
  update <user_id>        Update user settings
  delete <user_id>        Delete/disassociate user
  pending                 List pending users
  settings <user_id>      Get user settings
  permissions <user_id>   Get user permissions
  token <user_id>         Get user token (ZAK)
  email <user_id>         Update user email
  password <user_id>      Update user password
  status <user_id>        Update user status (activate/deactivate)
  picture <user_id>       Upload user profile picture
  assistants <user_id>    List user's scheduling assistants
  schedulers <user_id>    List users who can schedule for this user
  help                    Show this help

Options:
  --status <status>       Filter by status: active, inactive, pending
  --page_size <n>         Results per page (max 300, default 30)
  --page_number <n>       Page number (default 1)
  --role_id <id>          Filter by role ID
  --include_fields <f>    Include additional fields (host_key, custom_attributes)
  
  For create:
  --email <email>         User email (required)
  --type <n>              User type: 1=Basic, 2=Licensed, 3=On-prem (default 1)
  --first_name <name>     First name
  --last_name <name>      Last name
  --action <action>       create, autoCreate, custCreate, ssoCreate (default create)

  For update:
  --first_name <name>     First name
  --last_name <name>      Last name  
  --type <n>              User type
  --dept <dept>           Department
  --job_title <title>     Job title
  --company <company>     Company name
  --pmi <pmi>             Personal Meeting ID
  --timezone <tz>         Timezone (e.g., America/Los_Angeles)
  --language <lang>       Language (e.g., en-US)

  For delete:
  --action <action>       delete, disassociate (default disassociate)
  --transfer_email <e>    Transfer data to this email
  --transfer_meeting      Transfer meetings (true/false)
  --transfer_webinar      Transfer webinars (true/false)
  --transfer_recording    Transfer recordings (true/false)

  For status:
  --action <action>       activate or deactivate

Examples:
  node scripts/users.js list
  node scripts/users.js list --status active --page_size 100
  node scripts/users.js get me
  node scripts/users.js get user@example.com
  node scripts/users.js create --email new@example.com --type 2 --first_name John
  node scripts/users.js update userId123 --dept Engineering --job_title Developer
  node scripts/users.js delete userId123 --action disassociate
  node scripts/users.js status userId123 --action deactivate
`);
}

async function listUsers(token, flags) {
  const query = buildQuery(flags, ['status', 'page_size', 'page_number', 'role_id', 'include_fields']);
  const data = await apiRequest(`/users${query}`, {}, token);
  output(data);
}

async function getUser(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}`, {}, token);
  output(data);
}

async function createUser(token, flags) {
  if (!flags.email) {
    throw new Error('Email required. Usage: create --email user@example.com');
  }

  const body = {
    action: flags.action || 'create',
    user_info: {
      email: flags.email,
      type: parseInt(flags.type) || 1,
      first_name: flags.first_name || '',
      last_name: flags.last_name || ''
    }
  };

  const data = await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function updateUser(token, userId, flags) {
  const body = {};
  
  const fields = ['first_name', 'last_name', 'type', 'dept', 'job_title', 
                  'company', 'pmi', 'timezone', 'language', 'vanity_name',
                  'host_key', 'manager'];
  
  for (const field of fields) {
    if (flags[field] !== undefined) {
      body[field] = field === 'type' ? parseInt(flags[field]) : flags[field];
    }
  }

  if (Object.keys(body).length === 0) {
    throw new Error('No fields to update. See help for available options.');
  }

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function deleteUser(token, userId, flags) {
  const params = new URLSearchParams();
  params.append('action', flags.action || 'disassociate');
  
  if (flags.transfer_email) params.append('transfer_email', flags.transfer_email);
  if (flags.transfer_meeting) params.append('transfer_meeting', flags.transfer_meeting);
  if (flags.transfer_webinar) params.append('transfer_webinar', flags.transfer_webinar);
  if (flags.transfer_recording) params.append('transfer_recording', flags.transfer_recording);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}${query}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function listPendingUsers(token, flags) {
  const query = buildQuery(flags, ['page_size', 'page_number']);
  const data = await apiRequest(`/users?status=pending${query.replace('?', '&')}`, {}, token);
  output(data);
}

async function getUserSettings(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/settings`, {}, token);
  output(data);
}

async function getUserPermissions(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/permissions`, {}, token);
  output(data);
}

async function getUserToken(token, userId, flags) {
  const type = flags.type || 'token';
  const query = `?type=${type}`;
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/token${query}`, {}, token);
  output(data);
}

async function updateUserEmail(token, userId, flags) {
  if (!flags.email) {
    throw new Error('Email required. Usage: email <user_id> --email new@example.com');
  }

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/email`, {
    method: 'PUT',
    body: JSON.stringify({ email: flags.email })
  }, token);
  output(data);
}

async function updateUserPassword(token, userId, flags) {
  if (!flags.password) {
    throw new Error('Password required. Usage: password <user_id> --password newpass123');
  }

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password: flags.password })
  }, token);
  output(data);
}

async function updateUserStatus(token, userId, flags) {
  if (!flags.action || !['activate', 'deactivate'].includes(flags.action)) {
    throw new Error('Action required: activate or deactivate. Usage: status <user_id> --action activate');
  }

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ action: flags.action })
  }, token);
  output(data);
}

async function listAssistants(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/assistants`, {}, token);
  output(data);
}

async function listSchedulers(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/schedulers`, {}, token);
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
        await listUsers(token, flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('User ID or email required. Usage: get <user_id>');
        await getUser(token, args[0]);
        break;
      case 'create':
        await createUser(token, flags);
        break;
      case 'update':
        if (!args[0]) throw new Error('User ID required. Usage: update <user_id> [options]');
        await updateUser(token, args[0], flags);
        break;
      case 'delete':
        if (!args[0]) throw new Error('User ID required. Usage: delete <user_id>');
        await deleteUser(token, args[0], flags);
        break;
      case 'pending':
        await listPendingUsers(token, flags);
        break;
      case 'settings':
        if (!args[0]) throw new Error('User ID required. Usage: settings <user_id>');
        await getUserSettings(token, args[0]);
        break;
      case 'permissions':
        if (!args[0]) throw new Error('User ID required. Usage: permissions <user_id>');
        await getUserPermissions(token, args[0]);
        break;
      case 'token':
        if (!args[0]) throw new Error('User ID required. Usage: token <user_id>');
        await getUserToken(token, args[0], flags);
        break;
      case 'email':
        if (!args[0]) throw new Error('User ID required. Usage: email <user_id> --email new@example.com');
        await updateUserEmail(token, args[0], flags);
        break;
      case 'password':
        if (!args[0]) throw new Error('User ID required. Usage: password <user_id> --password newpass');
        await updateUserPassword(token, args[0], flags);
        break;
      case 'status':
        if (!args[0]) throw new Error('User ID required. Usage: status <user_id> --action activate');
        await updateUserStatus(token, args[0], flags);
        break;
      case 'assistants':
        if (!args[0]) throw new Error('User ID required. Usage: assistants <user_id>');
        await listAssistants(token, args[0]);
        break;
      case 'schedulers':
        if (!args[0]) throw new Error('User ID required. Usage: schedulers <user_id>');
        await listSchedulers(token, args[0]);
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
