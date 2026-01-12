#!/usr/bin/env node

/**
 * X.com Trends
 * Get trending topics by location.
 * Note: Uses v1.1 endpoint as v2 trends are limited.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, getCredentials, generateOAuthHeader,
  handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

const TRENDS_URL = 'https://api.twitter.com/1.1/trends/place.json';
const AVAILABLE_URL = 'https://api.twitter.com/1.1/trends/available.json';

// Help documentation
function printHelp() {
  showHelp('X.com Trends', {
    'Commands': [
      'get [woeid]               Get trends for location (default: worldwide)',
      'locations                 List available trend locations',
      'help                      Show this help'
    ],
    'Options': [
      '--verbose                 Show full API response'
    ],
    'Common WOEIDs': [
      '1          - Worldwide',
      '23424977   - United States',
      '23424975   - United Kingdom',
      '2459115    - New York',
      '2442047    - Los Angeles',
      '2357536    - Austin',
      '2391279    - Denver'
    ],
    'Examples': [
      'node trends.js get',
      'node trends.js get 23424977',
      'node trends.js locations'
    ],
    'Notes': [
      'WOEID = Where On Earth ID (Yahoo geographic identifier)',
      'Use "locations" to find WOEIDs for specific places',
      'Trends update approximately every 5 minutes'
    ]
  });
}

// Get trends for a location
async function getTrends(woeid, args) {
  const credentials = getCredentials();
  
  const url = `${TRENDS_URL}?id=${woeid}`;
  const oauthHeader = generateOAuthHeader('GET', TRENDS_URL, { id: woeid }, credentials);
  
  console.log(`Fetching trends for WOEID ${woeid}...\n`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': oauthHeader
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.message || 'Failed to fetch trends');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const location = data[0]?.locations?.[0]?.name || 'Unknown';
  const trends = data[0]?.trends || [];
  
  console.log(`Trends for ${location}:\n`);
  
  for (let i = 0; i < trends.length; i++) {
    const trend = trends[i];
    const volume = trend.tweet_volume ? `(${trend.tweet_volume.toLocaleString()} tweets)` : '';
    console.log(`${i + 1}. ${trend.name} ${volume}`);
  }
  
  console.log(`\nAs of: ${data[0]?.as_of || 'Unknown'}`);
}

// List available trend locations
async function listLocations(args) {
  const credentials = getCredentials();
  
  const oauthHeader = generateOAuthHeader('GET', AVAILABLE_URL, {}, credentials);
  
  console.log('Fetching available trend locations...\n');
  
  const response = await fetch(AVAILABLE_URL, {
    method: 'GET',
    headers: {
      'Authorization': oauthHeader
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.message || 'Failed to fetch locations');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  // Group by country
  const byCountry = {};
  for (const loc of data) {
    const country = loc.country || 'Worldwide';
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(loc);
  }
  
  console.log(`Found ${data.length} locations:\n`);
  
  // Show worldwide first
  if (byCountry['']) {
    console.log('Worldwide:');
    for (const loc of byCountry['']) {
      console.log(`  ${loc.name} (WOEID: ${loc.woeid})`);
    }
    console.log('');
    delete byCountry[''];
  }
  
  // Show US cities
  if (byCountry['United States']) {
    console.log('United States:');
    for (const loc of byCountry['United States'].slice(0, 20)) {
      console.log(`  ${loc.name} (WOEID: ${loc.woeid})`);
    }
    if (byCountry['United States'].length > 20) {
      console.log(`  ... and ${byCountry['United States'].length - 20} more`);
    }
    console.log('');
  }
  
  // Show other countries
  const otherCountries = Object.keys(byCountry).filter(c => c !== 'United States').sort();
  console.log(`Other countries: ${otherCountries.slice(0, 20).join(', ')}${otherCountries.length > 20 ? '...' : ''}`);
  console.log('\nUse --verbose to see all locations');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'get':
        const woeid = args._[1] || '1'; // Default to worldwide
        await getTrends(woeid, args);
        break;
      case 'locations':
        await listLocations(args);
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
