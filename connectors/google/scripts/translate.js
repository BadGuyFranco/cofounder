#!/usr/bin/env node
/**
 * Google Cloud Translation API Operations
 * Translate text and detect languages across 100+ languages.
 *
 * Usage:
 *   node translate.js translate "Hello world" --target es --account user@example.com
 *   node translate.js detect "Bonjour le monde" --account user@example.com
 *   node translate.js file ./content.txt --target fr --account user@example.com
 *   node translate.js languages --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { extname, basename } from 'path';

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

/**
 * Get Translation API client
 */
async function getTranslateClient(email) {
  const auth = await getAuthClient(email);
  return google.translate({ version: 'v2', auth });
}

/**
 * Translate text
 */
async function translateText(email, texts, targetLang, sourceLang = null) {
  const client = await getTranslateClient(email);

  const params = {
    q: Array.isArray(texts) ? texts : [texts],
    target: targetLang,
    format: 'text'
  };

  if (sourceLang) params.source = sourceLang;

  const response = await client.translations.list(params);
  const translations = response.data.data?.translations || [];

  if (!Array.isArray(texts)) {
    return translations[0]
      ? {
          translatedText: translations[0].translatedText,
          detectedSourceLanguage: translations[0].detectedSourceLanguage,
          target: targetLang
        }
      : null;
  }

  return translations.map((t, i) => ({
    original: texts[i],
    translatedText: t.translatedText,
    detectedSourceLanguage: t.detectedSourceLanguage,
    target: targetLang
  }));
}

/**
 * Detect language of text
 */
async function detectLanguage(email, texts) {
  const client = await getTranslateClient(email);

  const q = Array.isArray(texts) ? texts : [texts];
  const response = await client.detections.list({ q });
  const detections = response.data.data?.detections || [];

  if (!Array.isArray(texts)) {
    const top = detections[0]?.[0];
    return top ? {
      language: top.language,
      confidence: (top.confidence * 100).toFixed(1) + '%',
      isReliable: top.isReliable
    } : null;
  }

  return texts.map((text, i) => {
    const top = detections[i]?.[0];
    return {
      text: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      language: top?.language,
      confidence: top ? (top.confidence * 100).toFixed(1) + '%' : null
    };
  });
}

/**
 * List supported languages
 */
async function listLanguages(email, targetLang = 'en') {
  const client = await getTranslateClient(email);

  const response = await client.languages.list({ target: targetLang });
  return (response.data.data?.languages || []).map(l => ({
    code: l.language,
    name: l.name
  }));
}

/**
 * Translate a text file
 */
async function translateFile(email, filePath, targetLang, sourceLang = null, options = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');

  // Split into chunks to avoid API limits (5000 chars per request)
  const MAX_CHARS = 4800;
  const chunks = [];
  const paragraphs = content.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > MAX_CHARS) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current) chunks.push(current.trim());

  console.log(`Translating ${chunks.length} chunk(s) to ${targetLang}...`);

  const translated = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r  Chunk ${i + 1}/${chunks.length}...`);
    const result = await translateText(email, chunks[i], targetLang, sourceLang);
    translated.push(result.translatedText);
  }

  const output = translated.join('\n\n');
  console.log('');

  if (options.outputPath) {
    writeFileSync(options.outputPath, output);
    return { outputPath: options.outputPath, chunks: chunks.length };
  }

  return { translatedText: output, chunks: chunks.length };
}

// CLI
function printHelp() {
  showHelp('Google Cloud Translation API Operations', {
    'Commands': [
      'translate "TEXT"            Translate text to target language',
      'detect "TEXT"               Detect the language of text',
      'file FILE                   Translate a text file',
      'languages                   List all supported languages',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--target CODE               Target language code (required for translate/file), e.g. es, fr, de, ja',
      '--source CODE               Source language code (auto-detected if omitted)',
      '--output FILE               Save translated output to file',
      '--json                      Output as JSON'
    ],
    'Common Language Codes': [
      'en  English    es  Spanish    fr  French     de  German',
      'it  Italian    pt  Portuguese ja  Japanese   ko  Korean',
      'zh  Chinese    ar  Arabic     hi  Hindi      ru  Russian',
      'nl  Dutch      pl  Polish     sv  Swedish    tr  Turkish'
    ],
    'Examples': [
      'node translate.js translate "Hello, how are you?" --target es --account user@example.com',
      'node translate.js translate "Bonjour" --target en --account user@example.com',
      'node translate.js detect "Guten Morgen" --account user@example.com',
      'node translate.js file ./article.txt --target fr --output article-fr.txt --account user@example.com',
      'node translate.js languages --account user@example.com',
      'node translate.js languages --json --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  const email = flags.account;

  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (command !== 'help') {
    requireApi(email, 'translate', 'translate.js');
  }

  try {
    switch (command) {
      case 'translate': {
        if (!args.length) throw new Error('Text to translate required');
        if (!flags.target) throw new Error('--target language code required');
        const text = args.join(' ');
        const result = await translateText(email, text, flags.target, flags.source);
        if (flags.json) {
          output(result);
        } else {
          if (result.detectedSourceLanguage) {
            console.log(`\nDetected: ${result.detectedSourceLanguage} -> ${result.target}`);
          }
          console.log(`\n${result.translatedText}`);
        }
        break;
      }

      case 'detect': {
        if (!args.length) throw new Error('Text required');
        const text = args.join(' ');
        const result = await detectLanguage(email, text);
        if (flags.json) {
          output(result);
        } else {
          console.log(`\nDetected language: ${result.language}`);
          console.log(`Confidence: ${result.confidence}`);
        }
        break;
      }

      case 'file': {
        if (!args[0]) throw new Error('File path required');
        if (!flags.target) throw new Error('--target language code required');
        const result = await translateFile(email, args[0], flags.target, flags.source, {
          outputPath: flags.output
        });
        if (flags.output) {
          console.log(`\n✓ Translated file saved to: ${flags.output}`);
          console.log(`  Chunks processed: ${result.chunks}`);
        } else {
          console.log(result.translatedText);
        }
        break;
      }

      case 'languages': {
        const langs = await listLanguages(email, flags.target || 'en');
        if (flags.json) {
          output(langs);
        } else {
          const filter = flags.filter?.toLowerCase();
          const filtered = filter ? langs.filter(l => l.name.toLowerCase().includes(filter) || l.code.includes(filter)) : langs;
          console.log(`\nSupported Languages (${filtered.length}):\n`);
          for (const l of filtered) {
            console.log(`  ${l.code.padEnd(10)} ${l.name}`);
          }
        }
        break;
      }

      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();
