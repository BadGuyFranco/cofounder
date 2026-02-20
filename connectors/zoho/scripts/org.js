#!/usr/bin/env node

/**
 * Zoho CRM Organization Management
 * View organization details, settings, and configuration.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Organization', {
    'Commands': [
      'get                         Get organization details',
      'features                    List enabled features',
      'business-hours              Get business hours',
      'fiscal-year                 Get fiscal year settings',
      'holidays                    List holidays',
      'currencies                  List currencies',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node org.js get',
      'node org.js get --verbose',
      'node org.js features',
      'node org.js business-hours',
      'node org.js fiscal-year',
      'node org.js holidays',
      'node org.js currencies'
    ],
    'Note': [
      'Organization settings are read-only via API.',
      'Use Zoho CRM web UI to modify organization settings.'
    ]
  });
}

// Get organization details
async function getOrganization(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching organization details...\n');
  
  const data = await apiRequest('GET', '/org', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const orgs = data.org || [];
  
  if (orgs.length === 0) {
    console.error('Error: Could not retrieve organization details');
    process.exit(1);
  }
  
  const org = orgs[0];
  
  console.log('Organization Details\n');
  console.log(`Company Name: ${org.company_name || 'N/A'}`);
  console.log(`Domain: ${org.domain_name || 'N/A'}`);
  console.log(`ZGID: ${org.zgid || 'N/A'}`);
  console.log(`Primary ZUID: ${org.primary_zuid || 'N/A'}`);
  
  console.log('\nEdition & Licensing:');
  console.log(`  Edition: ${org.edition || 'N/A'}`);
  console.log(`  License Type: ${org.license_type || 'N/A'}`);
  
  if (org.license_details) {
    console.log(`  Paid Expiry: ${org.license_details.paid_expiry || 'N/A'}`);
    console.log(`  Users Purchased: ${org.license_details.users_license_purchased || 'N/A'}`);
    console.log(`  Trial Type: ${org.license_details.trial_type || 'N/A'}`);
  }
  
  console.log('\nContact Information:');
  if (org.primary_email) console.log(`  Primary Email: ${org.primary_email}`);
  if (org.phone) console.log(`  Phone: ${org.phone}`);
  if (org.mobile) console.log(`  Mobile: ${org.mobile}`);
  if (org.fax) console.log(`  Fax: ${org.fax}`);
  if (org.website) console.log(`  Website: ${org.website}`);
  
  console.log('\nLocation:');
  if (org.street) console.log(`  Street: ${org.street}`);
  if (org.city) console.log(`  City: ${org.city}`);
  if (org.state) console.log(`  State: ${org.state}`);
  if (org.country) console.log(`  Country: ${org.country}`);
  if (org.country_code) console.log(`  Country Code: ${org.country_code}`);
  if (org.zip) console.log(`  Zip: ${org.zip}`);
  
  console.log('\nSettings:');
  console.log(`  Timezone: ${org.time_zone || 'N/A'}`);
  console.log(`  Currency: ${org.currency_symbol || ''} ${org.currency || 'N/A'} (${org.iso_code || 'N/A'})`);
  console.log(`  Multi-Currency: ${org.mc_status ? 'Enabled' : 'Disabled'}`);
  console.log(`  Employee Count: ${org.employee_count || 'N/A'}`);
  
  if (org.type) {
    console.log(`  Environment: ${org.type}`);  // production, sandbox, etc.
  }
  
  console.log('\nFeatures:');
  console.log(`  HIPAA Compliance: ${org.hipaa_compliance_enabled ? 'Yes' : 'No'}`);
  console.log(`  Privacy Settings: ${org.privacy_settings ? 'Enabled' : 'Disabled'}`);
  console.log(`  Google Apps: ${org.gapps_enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Translation: ${org.translation_enabled ? 'Enabled' : 'Disabled'}`);
}

// List enabled features
async function listFeatures(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching organization features...\n');
  
  const data = await apiRequest('GET', '/org', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const orgs = data.org || [];
  
  if (orgs.length === 0) {
    console.error('Error: Could not retrieve organization details');
    process.exit(1);
  }
  
  const org = orgs[0];
  
  console.log('Organization Features\n');
  
  const features = [
    { name: 'Multi-Currency', enabled: org.mc_status },
    { name: 'HIPAA Compliance', enabled: org.hipaa_compliance_enabled },
    { name: 'Privacy Settings', enabled: org.privacy_settings },
    { name: 'Google Apps Integration', enabled: org.gapps_enabled },
    { name: 'Translation', enabled: org.translation_enabled },
    { name: 'Lite User Support', enabled: org.lite_users_enabled },
    { name: 'Zia Portal', enabled: !!org.zia_portal_id }
  ];
  
  for (const feature of features) {
    const status = feature.enabled ? '[ENABLED]' : '[DISABLED]';
    console.log(`${feature.name}: ${status}`);
  }
}

// Get business hours
async function getBusinessHours(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching business hours...\n');
  
  const data = await apiRequest('GET', '/settings/business_hours', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const businessHours = data.business_hours;
  
  if (!businessHours) {
    console.log('No business hours configured.');
    return;
  }
  
  console.log('Business Hours\n');
  console.log(`Type: ${businessHours.business_days?.type || 'N/A'}`);
  
  if (businessHours.business_days?.hours) {
    console.log('\nSchedule:');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const dayConfig of businessHours.business_days.hours) {
      const dayName = days[dayConfig.day] || `Day ${dayConfig.day}`;
      if (dayConfig.start && dayConfig.end) {
        console.log(`  ${dayName}: ${dayConfig.start} - ${dayConfig.end}`);
      } else {
        console.log(`  ${dayName}: Closed`);
      }
    }
  }
}

// Get fiscal year settings
async function getFiscalYear(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching fiscal year settings...\n');
  
  const data = await apiRequest('GET', '/settings/fiscal_year', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const fiscalYear = data.fiscal_year;
  
  if (!fiscalYear) {
    console.log('Fiscal year not configured.');
    return;
  }
  
  console.log('Fiscal Year Settings\n');
  console.log(`Start Month: ${fiscalYear.start_month || 'N/A'}`);
  console.log(`Display Based On: ${fiscalYear.display_based_on || 'N/A'}`);
}

// List holidays
async function listHolidays(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching holidays...\n');
  
  const data = await apiRequest('GET', '/settings/holidays', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const holidays = data.holidays || [];
  
  if (holidays.length === 0) {
    console.log('No holidays configured.');
    return;
  }
  
  console.log(`Found ${holidays.length} holidays:\n`);
  
  for (const holiday of holidays) {
    console.log(`- ${holiday.name}`);
    console.log(`  Date: ${holiday.date}`);
    if (holiday.type) console.log(`  Type: ${holiday.type}`);
    if (holiday.year) console.log(`  Year: ${holiday.year}`);
    console.log('');
  }
}

// List currencies
async function listCurrencies(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching currencies...\n');
  
  const data = await apiRequest('GET', '/org/currencies', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const currencies = data.currencies || [];
  
  if (currencies.length === 0) {
    console.log('No currencies configured (multi-currency may be disabled).');
    return;
  }
  
  console.log(`Found ${currencies.length} currencies:\n`);
  
  for (const currency of currencies) {
    const isBase = currency.is_base ? ' [BASE]' : '';
    const isActive = currency.is_active ? '' : ' [INACTIVE]';
    console.log(`- ${currency.name} (${currency.iso_code})${isBase}${isActive}`);
    console.log(`  Symbol: ${currency.symbol}`);
    console.log(`  Exchange Rate: ${currency.exchange_rate || 1}`);
    console.log(`  Format: ${currency.format?.decimal_separator || '.'} decimal, ${currency.format?.thousand_separator || ','} thousand`);
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'get':
        await getOrganization(args);
        break;
      case 'features':
        await listFeatures(args);
        break;
      case 'business-hours':
        await getBusinessHours(args);
        break;
      case 'fiscal-year':
        await getFiscalYear(args);
        break;
      case 'holidays':
        await listHolidays(args);
        break;
      case 'currencies':
        await listCurrencies(args);
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
