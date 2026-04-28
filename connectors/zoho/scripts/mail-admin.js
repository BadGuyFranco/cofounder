#!/usr/bin/env node

/**
 * Zoho Mail Admin — Organization-Level Administration
 * Manage domains, users, groups, policies, signatures, and audit logs.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, getProductBaseUrl, handleError, showHelp,
  confirmDestructiveAction, formatDate, saveOrgConfig
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- API helper ---

async function mailAdminRequest(method, endpoint, token, region, body = null) {
  const base = getProductBaseUrl('mail', region);
  const url = `${base}${endpoint}`;

  const opts = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}` } };

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (res.status === 204) return { success: true };

  const text = await res.text();
  if (!text) return { success: res.ok };

  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data.data?.errorCode || data.message || data.error || 'Mail Admin API request failed';
    const error = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --- ZOID auto-detection ---

async function getZoid(config, token, region) {
  if (config.zoid) return config.zoid;

  console.log('Auto-detecting organization ID (zoid)...');
  const data = await mailAdminRequest('GET', '/api/accounts', token, region);
  const accounts = data.data || [];

  if (accounts.length === 0) {
    console.error('Error: No mail accounts found. Cannot detect zoid.');
    process.exit(1);
  }

  const acct = accounts[0];
  const zoid = acct.zoid
    || acct.policyId?.zoid
    || acct.mailboxDetails?.zoid
    || acct.accountDetails?.zoid;

  if (!zoid) {
    console.error('Error: Could not extract zoid from account data.');
    console.error('Use --verbose with "discover" to inspect the account response.');
    process.exit(1);
  }

  // Persist for future calls
  config.zoid = zoid;
  saveOrgConfig(config.orgName, config);
  console.log(`Detected zoid: ${zoid} (saved to org config)\n`);

  return zoid;
}

// --- Help ---

function printHelp() {
  showHelp('Zoho Mail Admin', {
    'Organization': [
      'org                              Get organization details',
      'storage                          Get subscription/storage details',
      'user-storage <zuid>              Get user storage usage'
    ],
    'Domain Management': [
      'domains                          List all domains',
      'domain <name>                    Get domain details',
      'add-domain --domain <name>       Add a domain',
      'verify-domain <name>             Verify a domain',
      'delete-domain <name>             Delete a domain'
    ],
    'User Management': [
      'users                            List all users',
      'user <zuid_or_email>             Get user details',
      'add-user --email --password      Add a user to the organization',
      'delete-user <zuid>               Delete a user account',
      'reset-password <zuid> --password Reset user password',
      'enable-user <zuid>               Enable a user account',
      'disable-user <zuid>              Disable a user account',
      'change-role <zuid> --role <role> Change user role',
      'add-alias <zuid> --alias <addr>  Add email alias',
      'remove-alias <zuid> --alias      Remove email alias'
    ],
    'Group Management': [
      'groups                           List all groups',
      'group <zgid>                     Get group details',
      'create-group --name --email      Create a group',
      'update-group <zgid>              Update group settings',
      'delete-group <zgid>              Delete a group',
      'add-member <zgid> --email <addr>  Add member to group',
      'remove-member <zgid> --email     Remove member from group',
      'group-alias <zgid> --alias       Add alias to group'
    ],
    'Policy': [
      'policies                         List all policies',
      'policy <id>                      Get policy details'
    ],
    'Account Configuration': [
      'configure <accountId>            Update account settings',
      'vacation <accountId>             Set vacation reply'
    ],
    'Signatures': [
      'add-signature <zuid>             Add admin signature',
      'get-signature <zuid>             Get admin signature'
    ],
    'Logs': [
      'login-history                    Login history',
      'audit                            Audit records'
    ],
    'Utility': [
      'discover                         Auto-detect zoid, zuid, account details',
      'help                             Show this help'
    ],
    'Options': [
      '--org <name>                     Organization to use',
      '--domain <name>                  Domain name (for add-domain)',
      '--email <address>                Email address',
      '--password <pass>                Password (add-user, reset-password)',
      '--first-name <name>              First name (add-user)',
      '--last-name <name>               Last name (add-user)',
      '--display-name <name>            Display name',
      '--role <role>                    Role: member, admin, super_admin',
      '--alias <address>                Email alias',
      '--zuid <id>                      User ZUID (for group member ops)',
      '--name <name>                    Group/signature name',
      '--description <text>             Group description',
      '--content <text>                 Signature/vacation body',
      '--subject <text>                 Vacation subject',
      '--reply-to <address>             Reply-to address (configure)',
      '--signature <text>               Signature (configure)',
      '--forwarding-address <addr>      Forwarding address (configure)',
      '--from-date <date>               Vacation start date',
      '--to-date <date>                 Vacation end date',
      '--enable / --disable             Enable or disable (vacation)',
      '--verbose                        Show full API response',
      '--force                          Skip destructive confirmations'
    ],
    'Examples': [
      'node mail-admin.js discover',
      'node mail-admin.js org',
      'node mail-admin.js users',
      'node mail-admin.js user user@example.com',
      'node mail-admin.js add-user --email new@example.com --password "Str0ng!"',
      'node mail-admin.js domains',
      'node mail-admin.js groups',
      'node mail-admin.js create-group --name "Sales" --email sales@example.com',
      'node mail-admin.js login-history --verbose'
    ]
  });
}

// --- Organization ---

async function getOrg(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching organization details...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const org = data.data || data;

  console.log('Organization Details\n');
  console.log(`Organization Name: ${org.organizationName || org.orgName || 'N/A'}`);
  console.log(`ZOID: ${zoid}`);
  if (org.plan || org.planName) console.log(`Plan: ${org.plan || org.planName}`);
  if (org.userCount !== undefined) console.log(`User Count: ${org.userCount}`);
  if (org.totalStorage !== undefined) console.log(`Total Storage: ${org.totalStorage}`);
  if (org.usedStorage !== undefined) console.log(`Used Storage: ${org.usedStorage}`);
  if (org.primaryDomain) console.log(`Primary Domain: ${org.primaryDomain}`);
  if (org.country) console.log(`Country: ${org.country}`);
}

async function getStorage(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching storage details...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/storage`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const info = data.data || data;

  console.log('Storage & Subscription\n');
  if (info.planName || info.plan) console.log(`Plan: ${info.planName || info.plan}`);
  if (info.totalStorage !== undefined) console.log(`Total Storage: ${info.totalStorage}`);
  if (info.usedStorage !== undefined) console.log(`Used Storage: ${info.usedStorage}`);
  if (info.availableStorage !== undefined) console.log(`Available Storage: ${info.availableStorage}`);
  if (info.userCount !== undefined) console.log(`User Count: ${info.userCount}`);
  if (info.maxUsers !== undefined) console.log(`Max Users: ${info.maxUsers}`);
}

async function getUserStorage(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching storage for user ${zuid}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/storage/${zuid}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const info = data.data || data;

  console.log('User Storage\n');
  console.log(`ZUID: ${zuid}`);
  if (info.allocatedStorage !== undefined) console.log(`Allocated Storage: ${info.allocatedStorage}`);
  if (info.usedStorage !== undefined) console.log(`Used Storage: ${info.usedStorage}`);
  if (info.availableStorage !== undefined) console.log(`Available Storage: ${info.availableStorage}`);
  if (info.email || info.mailId) console.log(`Email: ${info.email || info.mailId}`);
}

// --- Domain Management ---

async function listDomains(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching domains...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/domains`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const domains = data.data?.domainVO || data.data || [];
  if (!Array.isArray(domains) || domains.length === 0) { console.log('No domains found.'); return; }

  console.log(`Found ${domains.length} domain(s):\n`);
  for (const d of domains) {
    const verified = d.isVerified || d.verified || d.verifiedDate ? '[VERIFIED]' : '[UNVERIFIED]';
    const primary = d.isPrimary || d.primary ? ' [PRIMARY]' : '';
    const mx = d.mxstatus === 'enabled' ? ' [MX OK]' : '';
    const spf = d.spfstatus ? ' [SPF OK]' : '';
    console.log(`- ${d.domainName || d.name} ${verified}${primary}${mx}${spf}`);
    if (d.mailHostingEnabled !== undefined) console.log(`  Hosting: ${d.mailHostingEnabled ? 'enabled' : 'disabled'}`);
    console.log('');
  }
}

async function getDomain(name, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching domain details for ${name}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/domains/${name}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const d = data.data || data;

  console.log('Domain Details\n');
  console.log(`Domain: ${d.domainName || d.name || name}`);
  if (d.domainId) console.log(`Domain ID: ${d.domainId}`);
  if (d.isVerified !== undefined) console.log(`Verified: ${d.isVerified}`);
  if (d.isPrimary !== undefined) console.log(`Primary: ${d.isPrimary}`);
  if (d.verificationMethod) console.log(`Verification Method: ${d.verificationMethod}`);
  if (d.mxRecords) console.log(`MX Records: ${JSON.stringify(d.mxRecords)}`);
  if (d.spfRecord) console.log(`SPF Record: ${d.spfRecord}`);
  if (d.dkimRecord) console.log(`DKIM Record: ${d.dkimRecord}`);
  if (d.createdTime) console.log(`Created: ${formatDate(d.createdTime)}`);
}

async function addDomain(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.domain) {
    console.error('Error: --domain <name> is required');
    process.exit(1);
  }

  console.log(`Adding domain ${args.domain}...\n`);
  const data = await mailAdminRequest('POST', `/api/organization/${zoid}/domains`, token, config.region, {
    domainName: args.domain
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Domain added successfully!');
  console.log(`Domain: ${args.domain}`);
  console.log('Run verify-domain to complete verification.');
}

async function verifyDomain(name, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Verifying domain ${name}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/domains/${name}`, token, config.region, {
    mode: 'domain_verify'
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const result = data.data || data;
  if (result.isVerified || result.verified || result.status === 'success') {
    console.log('Domain verified successfully!');
  } else {
    console.log('Domain verification initiated.');
    console.log('Check DNS records and try again if not yet verified.');
  }
}

async function deleteDomain(name, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  const confirmed = await confirmDestructiveAction(
    `Delete domain: ${name}`,
    [`Organization ZOID: ${zoid}`, 'All email addresses on this domain will stop working.'],
    args.force
  );
  if (!confirmed) return;

  console.log(`Deleting domain ${name}...\n`);
  const data = await mailAdminRequest('DELETE', `/api/organization/${zoid}/domains/${name}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Domain deleted successfully.');
}

// --- User Management ---

async function listUsers(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching users...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/accounts`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const users = data.data || [];
  if (users.length === 0) { console.log('No users found.'); return; }

  console.log(`Found ${users.length} user(s):\n`);
  for (const u of users) {
    const role = u.role ? ` (${u.role})` : '';
    const status = typeof u.accountStatus === 'string' ? u.accountStatus : (typeof u.status === 'string' ? u.status : '');
    const statusTag = status && status !== 'active' ? ` [${status.toUpperCase()}]` : '';
    console.log(`- ${u.mailId || u.primaryEmailAddress || u.emailId || 'N/A'}${role}${statusTag}`);
    console.log(`  ZUID: ${u.zuid || 'N/A'}`);
    console.log(`  Display Name: ${u.displayName || u.firstName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'N/A'}`);
    console.log('');
  }
}

async function getUser(zuidOrEmail, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching user ${zuidOrEmail}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/accounts/${zuidOrEmail}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const u = data.data || data;

  console.log('User Details\n');
  if (u.mailId || u.primaryEmailAddress) console.log(`Email: ${u.mailId || u.primaryEmailAddress}`);
  if (u.zuid) console.log(`ZUID: ${u.zuid}`);
  if (u.displayName) console.log(`Display Name: ${u.displayName}`);
  if (u.firstName) console.log(`First Name: ${u.firstName}`);
  if (u.lastName) console.log(`Last Name: ${u.lastName}`);
  if (u.role) console.log(`Role: ${u.role}`);
  if (u.accountStatus || u.status) console.log(`Status: ${u.accountStatus || u.status}`);
  if (u.emailAlias && u.emailAlias.length > 0) console.log(`Aliases: ${u.emailAlias.join(', ')}`);
  if (u.createdTime) console.log(`Created: ${formatDate(u.createdTime)}`);
  if (u.lastLogin) console.log(`Last Login: ${formatDate(u.lastLogin)}`);
}

async function addUser(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.email) {
    console.error('Error: --email is required');
    process.exit(1);
  }
  if (!args.password) {
    console.error('Error: --password is required');
    process.exit(1);
  }

  const body = {
    primaryEmailAddress: args.email,
    password: args.password
  };

  if (args['first-name']) body.firstName = args['first-name'];
  if (args['last-name']) body.lastName = args['last-name'];
  if (args['display-name']) body.displayName = args['display-name'];
  if (args.role) body.role = args.role;

  console.log(`Adding user ${args.email}...\n`);
  const data = await mailAdminRequest('POST', `/api/organization/${zoid}/accounts`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const result = data.data || data;
  console.log('User added successfully!');
  console.log(`Email: ${args.email}`);
  if (result.zuid) console.log(`ZUID: ${result.zuid}`);
}

async function deleteUser(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  const confirmed = await confirmDestructiveAction(
    `Delete user account: ${zuid}`,
    [`Organization ZOID: ${zoid}`, 'All user data and mailbox contents will be permanently deleted.'],
    args.force
  );
  if (!confirmed) return;

  console.log(`Deleting user ${zuid}...\n`);
  const data = await mailAdminRequest('DELETE', `/api/organization/${zoid}/accounts`, token, config.region, {
    zuid: zuid,
    mode: 'deleteUser'
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('User deleted successfully.');
}

async function resetPassword(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.password) {
    console.error('Error: --password is required');
    process.exit(1);
  }

  console.log(`Resetting password for user ${zuid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts/${zuid}`, token, config.region, {
    zuid: zuid,
    mode: 'resetPassword',
    newPassword: args.password
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Password reset successfully.');
}

async function enableUser(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Enabling user ${zuid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts/${zuid}`, token, config.region, {
    zuid: zuid,
    mode: 'enableUser'
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('User account enabled.');
}

async function disableUser(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Disabling user ${zuid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts/${zuid}`, token, config.region, {
    zuid: zuid,
    mode: 'disableUser'
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('User account disabled.');
}

async function changeRole(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.role) {
    console.error('Error: --role is required (member, admin, super_admin)');
    process.exit(1);
  }

  console.log(`Changing role for user ${zuid} to ${args.role}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts`, token, config.region, {
    zuid: zuid,
    role: args.role
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log(`Role changed to ${args.role}.`);
}

async function addAlias(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.alias) {
    console.error('Error: --alias <address> is required');
    process.exit(1);
  }

  const aliases = args.alias.split(',').map(a => a.trim());

  console.log(`Adding alias for user ${zuid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts/${zuid}`, token, config.region, {
    zuid: zuid,
    mode: 'addEmailAlias',
    emailAlias: aliases
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Alias added successfully!');
  console.log(`Alias: ${aliases.join(', ')}`);
}

async function removeAlias(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.alias) {
    console.error('Error: --alias <address> is required');
    process.exit(1);
  }

  const aliases = args.alias.split(',').map(a => a.trim());

  console.log(`Removing alias for user ${zuid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/accounts/${zuid}`, token, config.region, {
    zuid: zuid,
    mode: 'removeEmailAlias',
    emailAlias: aliases
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Alias removed successfully.');
  console.log(`Removed: ${aliases.join(', ')}`);
}

// --- Group Management ---

async function listGroups(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching groups...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/groups`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const groups = data.data?.groups || data.data || [];
  if (!Array.isArray(groups) || groups.length === 0) { console.log('No groups found.'); return; }

  console.log(`Found ${groups.length} group(s):\n`);
  for (const g of groups) {
    console.log(`- ${g.groupName || g.name || 'N/A'}`);
    console.log(`  Email: ${g.emailId || g.mailId || 'N/A'}`);
    console.log(`  ZGID: ${g.zgid || 'N/A'}`);
    if (g.membersCount !== undefined) console.log(`  Members: ${g.membersCount}`);
    console.log('');
  }
}

async function getGroup(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching group ${zgid}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/groups/${zgid}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const g = data.data || data;

  console.log('Group Details\n');
  if (g.groupName || g.name) console.log(`Name: ${g.groupName || g.name}`);
  console.log(`ZGID: ${zgid}`);
  if (g.emailId || g.mailId) console.log(`Email: ${g.emailId || g.mailId}`);
  if (g.description) console.log(`Description: ${g.description}`);
  if (g.membersCount !== undefined) console.log(`Members: ${g.membersCount}`);
  if (g.emailAlias && g.emailAlias.length > 0) console.log(`Aliases: ${g.emailAlias.join(', ')}`);
  if (g.members && g.members.length > 0) {
    console.log('\nMembers:');
    for (const m of g.members) {
      console.log(`  - ${m.mailId || m.emailId || m.zuid || 'N/A'}`);
    }
  }
}

async function createGroup(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  if (!args.email) {
    console.error('Error: --email is required');
    process.exit(1);
  }

  const body = {
    name: args.name,
    emailId: args.email
  };

  if (args.description) body.groupDescription = args.description;
  if (args.members) {
    body.mailGroupMemberList = args.members.split(',').map(email => ({
      memberEmailId: email.trim(),
      role: 'member'
    }));
  }

  console.log(`Creating group ${args.name}...\n`);
  const data = await mailAdminRequest('POST', `/api/organization/${zoid}/groups`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const result = data.data || data;
  console.log('Group created successfully!');
  console.log(`Name: ${args.name}`);
  console.log(`Email: ${args.email}`);
  if (result.zgid) console.log(`ZGID: ${result.zgid}`);
}

async function updateGroup(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  const body = {};
  if (args.name) body.groupName = args.name;
  if (args.description) body.description = args.description;

  if (Object.keys(body).length === 0) {
    console.error('Error: Provide --name or --description to update');
    process.exit(1);
  }

  console.log(`Updating group ${zgid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/groups/${zgid}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Group updated successfully.');
}

async function deleteGroup(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  const confirmed = await confirmDestructiveAction(
    `Delete group: ${zgid}`,
    [`Organization ZOID: ${zoid}`, 'The group and its email address will be permanently removed.'],
    args.force
  );
  if (!confirmed) return;

  console.log(`Deleting group ${zgid}...\n`);
  const data = await mailAdminRequest('DELETE', `/api/organization/${zoid}/groups/${zgid}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Group deleted successfully.');
}

async function addMember(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.email) {
    console.error('Error: --email is required');
    process.exit(1);
  }

  const role = args.role || 'member';

  console.log(`Adding member to group ${zgid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/groups/${zgid}`, token, config.region, {
    mode: 'addMailGroupMember',
    mailGroupMemberList: [{ memberEmailId: args.email, role }]
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Member added to group.');
  console.log(`Member: ${args.email}`);
}

async function removeMember(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.email) {
    console.error('Error: --email is required');
    process.exit(1);
  }

  console.log(`Removing member from group ${zgid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/groups/${zgid}`, token, config.region, {
    mode: 'deleteMailGroupMember',
    mailGroupMemberList: [{ memberEmailId: args.email }]
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Member removed from group.');
  console.log(`Member: ${args.email}`);
}

async function addGroupAlias(zgid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.alias) {
    console.error('Error: --alias <address> is required');
    process.exit(1);
  }

  const aliases = args.alias.split(',').map(a => a.trim());

  console.log(`Adding alias to group ${zgid}...\n`);
  const data = await mailAdminRequest('PUT', `/api/organization/${zoid}/groups/${zgid}`, token, config.region, {
    mode: 'addEmailAlias',
    emailAlias: aliases
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Group alias added successfully!');
  console.log(`Alias: ${aliases.join(', ')}`);
}

// --- Policy Management ---

async function listPolicies(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching policies...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/policy`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const policies = data.data || [];
  if (policies.length === 0) { console.log('No policies found.'); return; }

  console.log(`Found ${policies.length} policy/policies:\n`);
  for (const p of policies) {
    const status = p.status || p.isEnabled ? 'ACTIVE' : 'INACTIVE';
    console.log(`- ${p.policyName || p.name || 'N/A'} [${status}]`);
    if (p.policyId) console.log(`  Policy ID: ${p.policyId}`);
    if (p.policyType || p.type) console.log(`  Type: ${p.policyType || p.type}`);
    console.log('');
  }
}

async function getPolicy(policyId, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching policy ${policyId}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/policy/${policyId}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const p = data.data || data;

  console.log('Policy Details\n');
  if (p.policyName || p.name) console.log(`Name: ${p.policyName || p.name}`);
  console.log(`Policy ID: ${policyId}`);
  if (p.policyType || p.type) console.log(`Type: ${p.policyType || p.type}`);
  if (p.status !== undefined || p.isEnabled !== undefined) console.log(`Status: ${p.status || (p.isEnabled ? 'Active' : 'Inactive')}`);
  if (p.description) console.log(`Description: ${p.description}`);

  // Show additional policy properties
  const knownKeys = new Set(['policyName', 'name', 'policyType', 'type', 'status', 'isEnabled', 'description', 'policyId']);
  const extra = Object.entries(p).filter(([k]) => !knownKeys.has(k));
  if (extra.length > 0) {
    console.log('\nSettings:');
    for (const [key, value] of extra) {
      const display = typeof value === 'object' ? JSON.stringify(value) : value;
      console.log(`  ${key}: ${display}`);
    }
  }
}

// --- Account Configuration ---

async function configureAccount(accountId, args) {
  const { config, token } = await initScript(args);

  const body = {};
  if (args['display-name']) body.displayName = args['display-name'];
  if (args['reply-to']) body.replyTo = args['reply-to'];
  if (args.signature) body.signature = args.signature;
  if (args['forwarding-address']) body.forwardingAddress = args['forwarding-address'];

  if (Object.keys(body).length === 0) {
    console.error('Error: Provide at least one option to update');
    console.error('Options: --display-name, --reply-to, --signature, --forwarding-address');
    process.exit(1);
  }

  console.log(`Updating account ${accountId}...\n`);
  const data = await mailAdminRequest('PUT', `/api/accounts/${accountId}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Account updated successfully.');
}

async function setVacation(accountId, args) {
  const { config, token } = await initScript(args);

  const body = {};

  if (args.enable) body.vacationStatus = true;
  if (args.disable) body.vacationStatus = false;
  if (args.subject) body.vacationSubject = args.subject;
  if (args.content) body.vacationMessage = args.content;
  if (args['from-date']) body.fromDate = args['from-date'];
  if (args['to-date']) body.toDate = args['to-date'];

  if (Object.keys(body).length === 0) {
    console.error('Error: Provide vacation options');
    console.error('Options: --enable/--disable, --subject, --content, --from-date, --to-date');
    process.exit(1);
  }

  console.log(`Updating vacation reply for account ${accountId}...\n`);
  const data = await mailAdminRequest('PUT', `/api/accounts/${accountId}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  if (body.vacationStatus === false) {
    console.log('Vacation reply disabled.');
  } else {
    console.log('Vacation reply updated.');
    if (args.subject) console.log(`Subject: ${args.subject}`);
    if (args['from-date']) console.log(`From: ${args['from-date']}`);
    if (args['to-date']) console.log(`To: ${args['to-date']}`);
  }
}

// --- Signatures ---

async function addSignature(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  if (!args.content) {
    console.error('Error: --content is required');
    process.exit(1);
  }

  console.log(`Adding signature for user ${zuid}...\n`);
  const data = await mailAdminRequest('POST', `/api/organization/${zoid}/accounts/${zuid}/signature`, token, config.region, {
    name: args.name,
    content: args.content
  });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Signature added successfully!');
  console.log(`Name: ${args.name}`);
}

async function getSignature(zuid, args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log(`Fetching signature for user ${zuid}...\n`);
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/accounts/${zuid}/signature`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const sigs = data.data || data;

  if (Array.isArray(sigs)) {
    if (sigs.length === 0) { console.log('No signatures found.'); return; }
    console.log(`Found ${sigs.length} signature(s):\n`);
    for (const s of sigs) {
      console.log(`- ${s.name || 'Untitled'}`);
      if (s.id || s.signatureId) console.log(`  ID: ${s.id || s.signatureId}`);
      if (s.content) {
        const text = s.content.replace(/<[^>]*>/g, '').trim();
        console.log(`  Content: ${text.substring(0, 120)}${text.length > 120 ? '...' : ''}`);
      }
      console.log('');
    }
  } else {
    console.log('Signature\n');
    if (sigs.name) console.log(`Name: ${sigs.name}`);
    if (sigs.content) {
      const text = sigs.content.replace(/<[^>]*>/g, '').trim();
      console.log(`Content: ${text}`);
    }
  }
}

// --- Logs ---

async function loginHistory(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching login history...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/accounts/reports/loginHistory`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const records = data.data || [];
  if (records.length === 0) { console.log('No login history found.'); return; }

  console.log(`Login History (${records.length} entries):\n`);
  for (const r of records) {
    const time = r.loginTime ? formatDate(r.loginTime) : r.time || 'N/A';
    console.log(`- ${r.emailId || r.mailId || r.userName || 'N/A'}`);
    console.log(`  Time: ${time}`);
    if (r.ipAddress || r.ip) console.log(`  IP: ${r.ipAddress || r.ip}`);
    if (r.browser) console.log(`  Browser: ${r.browser}`);
    if (r.status) console.log(`  Status: ${r.status}`);
    console.log('');
  }
}

async function auditRecords(args) {
  const { config, token } = await initScript(args);
  const zoid = await getZoid(config, token, config.region);

  console.log('Fetching audit records...\n');
  const data = await mailAdminRequest('GET', `/api/organization/${zoid}/activity`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const records = data.data || [];
  if (records.length === 0) { console.log('No audit records found.'); return; }

  console.log(`Audit Records (${records.length} entries):\n`);
  for (const r of records) {
    const time = r.time ? formatDate(r.time) : r.activityTime ? formatDate(r.activityTime) : 'N/A';
    console.log(`- ${r.action || r.activityType || r.operation || 'N/A'}`);
    console.log(`  Time: ${time}`);
    if (r.performedBy || r.adminName) console.log(`  By: ${r.performedBy || r.adminName}`);
    if (r.description || r.details) console.log(`  Details: ${r.description || r.details}`);
    console.log('');
  }
}

// --- Utility ---

async function discover(args) {
  const { config, token } = await initScript(args);

  console.log('Discovering mail account details...\n');
  const data = await mailAdminRequest('GET', '/api/accounts', token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const accounts = data.data || [];
  if (accounts.length === 0) {
    console.log('No mail accounts found.');
    return;
  }

  console.log(`Found ${accounts.length} account(s):\n`);
  for (const acct of accounts) {
    console.log(`- ${acct.mailId || acct.accountName || 'N/A'}`);
    console.log(`  Account ID: ${acct.accountId || 'N/A'}`);
    console.log(`  ZUID: ${acct.zuid || 'N/A'}`);
    console.log(`  ZOID: ${acct.zoid || acct.policyId?.zoid || 'N/A'}`);
    console.log(`  Display Name: ${acct.displayName || 'N/A'}`);
    console.log(`  Type: ${acct.accountType || 'N/A'}`);
    if (acct.role) console.log(`  Role: ${acct.role}`);
    if (acct.incomingServer) console.log(`  Server: ${acct.incomingServer}`);
    console.log('');
  }

  // Auto-detect and save zoid
  const firstZoid = accounts[0].zoid || accounts[0].policyId?.zoid || accounts[0].mailboxDetails?.zoid || accounts[0].accountDetails?.zoid;
  if (firstZoid) {
    console.log(`Detected ZOID: ${firstZoid}`);
    if (!config.zoid) {
      config.zoid = firstZoid;
      saveOrgConfig(config.orgName, config);
      console.log('Saved zoid to org config.');
    }
  }

  const firstZuid = accounts[0].zuid;
  if (firstZuid) {
    console.log(`Primary ZUID: ${firstZuid}`);
  }
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  try {
    switch (command) {
      // Organization
      case 'org':
        await getOrg(args);
        break;
      case 'storage':
        await getStorage(args);
        break;
      case 'user-storage':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js user-storage <zuid>');
          process.exit(1);
        }
        await getUserStorage(args._[1], args);
        break;

      // Domain Management
      case 'domains':
        await listDomains(args);
        break;
      case 'domain':
        if (!args._[1]) {
          console.error('Error: Domain name required');
          console.error('Usage: node mail-admin.js domain <name>');
          process.exit(1);
        }
        await getDomain(args._[1], args);
        break;
      case 'add-domain':
        await addDomain(args);
        break;
      case 'verify-domain':
        if (!args._[1]) {
          console.error('Error: Domain name required');
          console.error('Usage: node mail-admin.js verify-domain <name>');
          process.exit(1);
        }
        await verifyDomain(args._[1], args);
        break;
      case 'delete-domain':
        if (!args._[1]) {
          console.error('Error: Domain name required');
          console.error('Usage: node mail-admin.js delete-domain <name>');
          process.exit(1);
        }
        await deleteDomain(args._[1], args);
        break;

      // User Management
      case 'users':
        await listUsers(args);
        break;
      case 'user':
        if (!args._[1]) {
          console.error('Error: ZUID or email required');
          console.error('Usage: node mail-admin.js user <zuid_or_email>');
          process.exit(1);
        }
        await getUser(args._[1], args);
        break;
      case 'add-user':
        await addUser(args);
        break;
      case 'delete-user':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js delete-user <zuid>');
          process.exit(1);
        }
        await deleteUser(args._[1], args);
        break;
      case 'reset-password':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js reset-password <zuid> --password "NewPass"');
          process.exit(1);
        }
        await resetPassword(args._[1], args);
        break;
      case 'enable-user':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js enable-user <zuid>');
          process.exit(1);
        }
        await enableUser(args._[1], args);
        break;
      case 'disable-user':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js disable-user <zuid>');
          process.exit(1);
        }
        await disableUser(args._[1], args);
        break;
      case 'change-role':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js change-role <zuid> --role admin');
          process.exit(1);
        }
        await changeRole(args._[1], args);
        break;
      case 'add-alias':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js add-alias <zuid> --alias user2@example.com');
          process.exit(1);
        }
        await addAlias(args._[1], args);
        break;
      case 'remove-alias':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js remove-alias <zuid> --alias user2@example.com');
          process.exit(1);
        }
        await removeAlias(args._[1], args);
        break;

      // Group Management
      case 'groups':
        await listGroups(args);
        break;
      case 'group':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js group <zgid>');
          process.exit(1);
        }
        await getGroup(args._[1], args);
        break;
      case 'create-group':
        await createGroup(args);
        break;
      case 'update-group':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js update-group <zgid> --name "New Name"');
          process.exit(1);
        }
        await updateGroup(args._[1], args);
        break;
      case 'delete-group':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js delete-group <zgid>');
          process.exit(1);
        }
        await deleteGroup(args._[1], args);
        break;
      case 'add-member':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js add-member <zgid> --email <member_email>');
          process.exit(1);
        }
        await addMember(args._[1], args);
        break;
      case 'remove-member':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js remove-member <zgid> --email <member_email>');
          process.exit(1);
        }
        await removeMember(args._[1], args);
        break;
      case 'group-alias':
        if (!args._[1]) {
          console.error('Error: ZGID required');
          console.error('Usage: node mail-admin.js group-alias <zgid> --alias alias@example.com');
          process.exit(1);
        }
        await addGroupAlias(args._[1], args);
        break;

      // Policy
      case 'policies':
        await listPolicies(args);
        break;
      case 'policy':
        if (!args._[1]) {
          console.error('Error: Policy ID required');
          console.error('Usage: node mail-admin.js policy <policyId>');
          process.exit(1);
        }
        await getPolicy(args._[1], args);
        break;

      // Account Configuration
      case 'configure':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail-admin.js configure <accountId> --display-name "Name"');
          process.exit(1);
        }
        await configureAccount(args._[1], args);
        break;
      case 'vacation':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail-admin.js vacation <accountId> --enable --subject "OOO"');
          process.exit(1);
        }
        await setVacation(args._[1], args);
        break;

      // Signatures
      case 'add-signature':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js add-signature <zuid> --name "Sig" --content "<html>..."');
          process.exit(1);
        }
        await addSignature(args._[1], args);
        break;
      case 'get-signature':
        if (!args._[1]) {
          console.error('Error: ZUID required');
          console.error('Usage: node mail-admin.js get-signature <zuid>');
          process.exit(1);
        }
        await getSignature(args._[1], args);
        break;

      // Logs
      case 'login-history':
        await loginHistory(args);
        break;
      case 'audit':
        await auditRecords(args);
        break;

      // Utility
      case 'discover':
        await discover(args);
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
