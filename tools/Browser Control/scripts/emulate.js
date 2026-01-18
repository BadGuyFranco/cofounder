#!/usr/bin/env node

/**
 * Browser Control - Emulate
 * 
 * Emulate devices, viewports, and conditions.
 * 
 * Usage:
 *   node scripts/emulate.js --device <name>
 *   node scripts/emulate.js --viewport <width>x<height>
 *   node scripts/emulate.js reset
 *   node scripts/emulate.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Device Emulation', {
    'Usage': [
      'node scripts/emulate.js --device <name>',
      'node scripts/emulate.js --viewport <width>x<height>',
      'node scripts/emulate.js reset'
    ],
    'Commands': [
      'reset             Reset to default desktop viewport'
    ],
    'Options': [
      '--device <name>       Emulate named device',
      '--viewport <WxH>      Set custom viewport (e.g., 375x812)',
      '--touch               Enable touch events',
      '--geolocation <lat,long>  Set geolocation',
      '--locale <code>       Set locale (e.g., en-US, fr-FR)',
      '--timezone <tz>       Set timezone (e.g., America/New_York)',
      '--port <n>            Server port (default: 9222)'
    ],
    'Common Devices': [
      'iPhone 14, iPhone 14 Pro, iPhone 14 Pro Max',
      'iPhone 13, iPhone 12, iPhone SE',
      'Pixel 7, Pixel 5, Galaxy S9+',
      'iPad Pro 11, iPad Mini, iPad'
    ],
    'Examples': [
      'node scripts/emulate.js --device "iPhone 14"',
      'node scripts/emulate.js --viewport 375x812',
      'node scripts/emulate.js --viewport 1920x1080',
      'node scripts/emulate.js --device "iPad Pro 11" --touch',
      'node scripts/emulate.js --geolocation 40.7128,-74.0060',
      'node scripts/emulate.js reset'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const hasEmulation = flags.device || flags.viewport || flags.touch || 
                       flags.geolocation || flags.locale || flags.timezone ||
                       command === 'reset';

  if (!hasEmulation) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  
  // Parse viewport
  let viewport = null;
  if (flags.viewport) {
    const [width, height] = flags.viewport.split('x').map(Number);
    viewport = { width, height };
  }

  // Parse geolocation
  let geolocation = null;
  if (flags.geolocation) {
    const [latitude, longitude] = flags.geolocation.split(',').map(Number);
    geolocation = { latitude, longitude };
  }

  const params = {
    action: command === 'reset' ? 'reset' : 'set',
    device: flags.device,
    viewport: viewport,
    touch: flags.touch === true,
    geolocation: geolocation,
    locale: flags.locale,
    timezone: flags.timezone
  };

  try {
    const result = await sendCommand('emulate', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
