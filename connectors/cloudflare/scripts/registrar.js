#!/usr/bin/env node
/**
 * Cloudflare Registrar Script
 * Manage domains registered through Cloudflare Registrar.
 * 
 * Note: Only manages domains already registered with Cloudflare.
 * Does NOT support domain availability searches.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Registrar Script - Manage Cloudflare-registered domains

Usage: node scripts/registrar.js <command> [options]

Commands:
  list                            List all registered domains
  info <domain>                   Get domain registration details
  update <domain>                 Update domain settings
  contacts <domain>               Get domain contacts
  set-contacts <domain>           Set domain contacts
  transfer-in <domain>            Initiate transfer to Cloudflare
  transfer-status <domain>        Check transfer status
  help                            Show this help

Update Options:
  --auto-renew                    Enable auto-renewal
  --no-auto-renew                 Disable auto-renewal
  --locked                        Lock domain (prevent transfers)
  --unlocked                      Unlock domain (allow transfers)

Set Contacts Options:
  --first-name <name>             First name
  --last-name <name>              Last name
  --email <email>                 Email address
  --phone <phone>                 Phone number (+1.5551234567)
  --address1 <address>            Street address
  --city <city>                   City
  --state <state>                 State/Province
  --zip <zip>                     Postal code
  --country <code>                Country code (US, CA, etc.)
  --organization <org>            Organization (optional)

Transfer In Options:
  --auth-code <code>              Authorization/EPP code from current registrar

Examples:
  node scripts/registrar.js list
  node scripts/registrar.js info example.com
  node scripts/registrar.js update example.com --auto-renew --locked
  node scripts/registrar.js contacts example.com
  node scripts/registrar.js transfer-in example.com --auth-code ABC123
  node scripts/registrar.js transfer-status example.com

Note: Domain availability searches are NOT supported by Cloudflare API.
Note: Cloudflare offers at-cost registration (no markup).
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listDomains() {
  const accountId = await getAccountId();
  const domains = await fetchAllPages(`/accounts/${accountId}/registrar/domains`);
  
  const simplified = domains.map(d => ({
    name: d.name,
    status: d.status,
    expires_at: d.expires_at,
    auto_renew: d.auto_renew,
    locked: d.locked,
    registrant_contact: d.registrant_contact?.email
  }));
  
  output(simplified);
}

async function getDomainInfo(domain) {
  if (!domain) {
    throw new Error('Domain name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}`);
  output(data.result);
}

async function updateDomain(domain, flags) {
  if (!domain) {
    throw new Error('Domain name required');
  }

  const accountId = await getAccountId();
  
  const updates = {};
  
  if (flags['auto-renew']) updates.auto_renew = true;
  if (flags['no-auto-renew']) updates.auto_renew = false;
  if (flags.locked) updates.locked = true;
  if (flags.unlocked) updates.locked = false;

  if (Object.keys(updates).length === 0) {
    throw new Error('No update options provided. Use --auto-renew, --no-auto-renew, --locked, or --unlocked');
  }

  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}`, {
    method: 'PUT',
    body: updates
  });

  console.log(`Updated domain: ${domain}`);
  output(data.result);
}

async function getDomainContacts(domain) {
  if (!domain) {
    throw new Error('Domain name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}`);
  
  output({
    registrant: data.result.registrant_contact,
    admin: data.result.admin_contact,
    tech: data.result.tech_contact,
    billing: data.result.billing_contact
  });
}

async function setDomainContacts(domain, flags) {
  if (!domain) {
    throw new Error('Domain name required');
  }

  const requiredFields = ['first-name', 'last-name', 'email', 'phone', 'address1', 'city', 'state', 'zip', 'country'];
  const missing = requiredFields.filter(f => !flags[f]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.map(f => '--' + f).join(', ')}`);
  }

  const accountId = await getAccountId();
  
  const contact = {
    first_name: flags['first-name'],
    last_name: flags['last-name'],
    email: flags.email,
    phone: flags.phone,
    address: flags.address1,
    address2: flags.address2 || '',
    city: flags.city,
    state: flags.state,
    zip: flags.zip,
    country: flags.country,
    organization: flags.organization || ''
  };

  // Set same contact for all contact types
  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}/contacts`, {
    method: 'PUT',
    body: {
      registrant: contact,
      admin: contact,
      tech: contact,
      billing: contact
    }
  });

  console.log(`Updated contacts for: ${domain}`);
  output(data.result);
}

async function initiateTransfer(domain, flags) {
  if (!domain) {
    throw new Error('Domain name required');
  }
  if (!flags['auth-code']) {
    throw new Error('--auth-code required (get from current registrar)');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}/transfer`, {
    method: 'POST',
    body: {
      auth_code: flags['auth-code']
    }
  });

  console.log(`Transfer initiated for: ${domain}`);
  console.log('Note: Transfer typically takes 5-7 days to complete.');
  output(data.result);
}

async function getTransferStatus(domain) {
  if (!domain) {
    throw new Error('Domain name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/registrar/domains/${domain}`);
  
  output({
    domain: data.result.name,
    status: data.result.status,
    transfer_in: data.result.transfer_in
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'list':
        await listDomains();
        break;

      case 'info':
        await getDomainInfo(args._[1]);
        break;

      case 'update':
        await updateDomain(args._[1], args);
        break;

      case 'contacts':
        await getDomainContacts(args._[1]);
        break;

      case 'set-contacts':
        await setDomainContacts(args._[1], args);
        break;

      case 'transfer-in':
        await initiateTransfer(args._[1], args);
        break;

      case 'transfer-status':
        await getTransferStatus(args._[1]);
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
