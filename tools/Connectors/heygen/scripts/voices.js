#!/usr/bin/env node

/**
 * HeyGen Voices Script
 * List available text-to-speech voices.
 */

import { 
  parseArgs, 
  initScript, 
  apiRequest, 
  showHelp, 
  output, 
  handleError,
  truncate
} from './utils.js';

function displayHelp() {
  showHelp('HeyGen Voices', {
    'Description': 'List available text-to-speech voices',
    'Commands': [
      'list                        List all available voices',
      'help                        Show this help'
    ],
    'List Options': [
      '--language <code>           Filter by language (e.g., en, es, de)',
      '--gender <male|female>      Filter by gender',
      '--limit <n>                 Number of results (default: 100)'
    ],
    'Examples': [
      'node scripts/voices.js list',
      'node scripts/voices.js list --language en',
      'node scripts/voices.js list --gender female',
      'node scripts/voices.js list --language en --gender male'
    ]
  });
}

/**
 * List available voices
 */
async function listVoices(args) {
  const limit = args.limit ? parseInt(args.limit) : 100;
  
  const data = await apiRequest('GET', '/v2/voices');
  
  let voices = data.data?.voices || [];
  
  if (voices.length === 0) {
    console.log('No voices found.');
    return;
  }
  
  // Apply filters
  if (args.language) {
    const langFilter = args.language.toLowerCase();
    voices = voices.filter(v => {
      const voiceLang = (v.language || v.language_code || '').toLowerCase();
      return voiceLang.startsWith(langFilter);
    });
  }
  
  if (args.gender) {
    const genderFilter = args.gender.toLowerCase();
    voices = voices.filter(v => {
      const voiceGender = (v.gender || '').toLowerCase();
      return voiceGender === genderFilter;
    });
  }
  
  if (voices.length === 0) {
    console.log('No voices match the specified filters.');
    return;
  }
  
  // Group by language for better display
  const byLanguage = {};
  for (const voice of voices) {
    const lang = voice.language || voice.language_code || 'Unknown';
    if (!byLanguage[lang]) {
      byLanguage[lang] = [];
    }
    byLanguage[lang].push(voice);
  }
  
  console.log(`Voices (${voices.length} total):\n`);
  
  let displayed = 0;
  for (const [language, langVoices] of Object.entries(byLanguage).sort()) {
    if (displayed >= limit) break;
    
    console.log(`${language}:`);
    for (const voice of langVoices) {
      if (displayed >= limit) break;
      
      const gender = voice.gender ? ` (${voice.gender})` : '';
      const name = voice.display_name || voice.name || voice.voice_id;
      console.log(`  - ${voice.voice_id}: ${name}${gender}`);
      
      if (voice.preview_audio) {
        console.log(`    Preview: ${truncate(voice.preview_audio, 50)}`);
      }
      
      displayed++;
    }
    console.log('');
  }
  
  if (voices.length > limit) {
    console.log(`... and ${voices.length - limit} more. Use --limit to see more.`);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  // Show help if no command or help requested
  if (!command || command === 'help' || args.help) {
    displayHelp();
    return;
  }
  
  // Initialize (loads credentials, handles accounts)
  const ready = initScript(args);
  if (!ready) {
    displayHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'list':
        await listVoices(args);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        displayHelp();
        process.exit(1);
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
