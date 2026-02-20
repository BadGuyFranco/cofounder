#!/usr/bin/env node
/**
 * Google Cloud Natural Language API Operations
 * Analyze text for entities, sentiment, syntax, categories, and content safety.
 *
 * Usage:
 *   node language.js analyze "Your text here" --account user@example.com
 *   node language.js entities "Apple is based in Cupertino." --account user@example.com
 *   node language.js sentiment "I love this product!" --account user@example.com
 *   node language.js classify "Text about technology and software." --account user@example.com
 *   node language.js analyze-file ./article.txt --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';

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
 * Get Natural Language API client
 */
async function getNlpClient(email) {
  const auth = await getAuthClient(email);
  return google.language({ version: 'v2', auth });
}

/**
 * Build document object for API requests
 */
function buildDocument(text, type = 'PLAIN_TEXT', language = null) {
  const doc = { content: text, type };
  if (language) doc.languageCode = language;
  return doc;
}

/**
 * Run full analysis (entities + sentiment + syntax + categories)
 */
async function analyzeAll(email, text, options = {}) {
  const nlp = await getNlpClient(email);
  const document = buildDocument(text, options.html ? 'HTML' : 'PLAIN_TEXT', options.language);

  const features = {
    extractEntities: true,
    extractDocumentSentiment: true,
    classifyText: text.length >= 20,
    moderateText: options.moderate || false
  };

  const response = await nlp.documents.annotateText({ requestBody: { document, features } });
  const data = response.data;

  return {
    language: data.languageCode,
    sentiment: formatSentiment(data.documentSentiment),
    entities: formatEntities(data.entities || []),
    categories: (data.categories || []).map(c => ({
      name: c.name,
      confidence: (c.confidence * 100).toFixed(1) + '%'
    })),
    moderationCategories: data.moderationCategories || []
  };
}

/**
 * Extract entities only
 */
async function extractEntities(email, text, options = {}) {
  const nlp = await getNlpClient(email);
  const document = buildDocument(text, options.html ? 'HTML' : 'PLAIN_TEXT', options.language);

  const response = await nlp.documents.analyzeEntities({ requestBody: { document } });
  return formatEntities(response.data.entities || []);
}

/**
 * Analyze sentiment only
 */
async function analyzeSentiment(email, text, options = {}) {
  const nlp = await getNlpClient(email);
  const document = buildDocument(text, options.html ? 'HTML' : 'PLAIN_TEXT', options.language);

  const response = await nlp.documents.analyzeSentiment({ requestBody: { document } });
  const data = response.data;

  return {
    document: formatSentiment(data.documentSentiment),
    sentences: (data.sentences || []).map(s => ({
      text: s.text?.content,
      sentiment: formatSentiment(s.sentiment)
    }))
  };
}

/**
 * Classify text into content categories
 */
async function classifyText(email, text, options = {}) {
  if (text.length < 20) {
    throw new Error('Text must be at least 20 characters for classification');
  }
  const nlp = await getNlpClient(email);
  const document = buildDocument(text, options.html ? 'HTML' : 'PLAIN_TEXT', options.language);

  const response = await nlp.documents.classifyText({ requestBody: { document } });
  return (response.data.categories || []).map(c => ({
    name: c.name,
    confidence: (c.confidence * 100).toFixed(1) + '%',
    confidenceRaw: c.confidence
  }));
}

/**
 * Moderate text for harmful content
 */
async function moderateText(email, text, options = {}) {
  const nlp = await getNlpClient(email);
  const document = buildDocument(text, 'PLAIN_TEXT', options.language);

  const response = await nlp.documents.moderateText({ requestBody: { document } });
  return (response.data.moderationCategories || []).map(c => ({
    name: c.name,
    confidence: (c.confidence * 100).toFixed(1) + '%',
    confidenceRaw: c.confidence,
    flagged: c.confidence > 0.5
  }));
}

/**
 * Format sentiment score into readable output
 */
function formatSentiment(sentiment) {
  if (!sentiment) return null;
  const score = parseFloat(sentiment.score || 0);
  const magnitude = parseFloat(sentiment.magnitude || 0);
  let label;
  if (score >= 0.25) label = 'POSITIVE';
  else if (score <= -0.25) label = 'NEGATIVE';
  else label = 'NEUTRAL';

  return {
    score: score.toFixed(3),
    magnitude: magnitude.toFixed(3),
    label,
    interpretation: interpretSentiment(score, magnitude)
  };
}

function interpretSentiment(score, magnitude) {
  if (magnitude < 0.1) return 'No strong emotion';
  if (score >= 0.5 && magnitude >= 1) return 'Clearly positive';
  if (score <= -0.5 && magnitude >= 1) return 'Clearly negative';
  if (score >= 0.25) return 'Mildly positive';
  if (score <= -0.25) return 'Mildly negative';
  if (magnitude >= 2) return 'Mixed or complex emotions';
  return 'Neutral';
}

/**
 * Format entities into readable output
 */
function formatEntities(entities) {
  return entities
    .sort((a, b) => (b.salience || 0) - (a.salience || 0))
    .map(e => ({
      name: e.name,
      type: e.type,
      salience: ((e.salience || 0) * 100).toFixed(1) + '%',
      sentiment: e.sentiment ? formatSentiment(e.sentiment) : null,
      metadata: e.metadata || {}
    }));
}

// CLI
function printHelp() {
  showHelp('Google Cloud Natural Language API Operations', {
    'Commands': [
      'analyze "TEXT"              Full analysis: entities, sentiment, categories',
      'entities "TEXT"             Extract named entities (people, places, orgs, etc.)',
      'sentiment "TEXT"            Analyze document and sentence-level sentiment',
      'classify "TEXT"             Classify text into content categories',
      'moderate "TEXT"             Check text for harmful/sensitive content',
      'analyze-file FILE           Run full analysis on a text file',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--language CODE             Language code, e.g. en, es, fr (auto-detected if omitted)',
      '--html                      Treat input as HTML (strips tags before analysis)',
      '--json                      Output as JSON'
    ],
    'Entity Types': [
      'PERSON, LOCATION, ORGANIZATION, EVENT, WORK_OF_ART,',
      'CONSUMER_GOOD, OTHER, PHONE_NUMBER, ADDRESS, DATE, NUMBER, PRICE'
    ],
    'Sentiment Score': [
      '-1.0 = very negative, 0.0 = neutral, +1.0 = very positive',
      'Magnitude = strength of emotion (0 = weak, 3+ = strong)'
    ],
    'Examples': [
      'node language.js analyze "Apple announced new iPhone models in Cupertino." --account user@example.com',
      'node language.js sentiment "This product is amazing! Best purchase ever." --account user@example.com',
      'node language.js entities "Obama was born in Hawaii." --account user@example.com',
      'node language.js classify "Machine learning and AI are transforming industries." --account user@example.com',
      'node language.js moderate "Check this content for safety" --account user@example.com',
      'node language.js analyze-file ./blog-post.txt --account user@example.com --json'
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
    requireApi(email, 'natural_language', 'language.js');
  }

  function getText() {
    const text = args.join(' ');
    if (!text) throw new Error('Text content required');
    return text;
  }

  try {
    switch (command) {
      case 'analyze': {
        const text = getText();
        const result = await analyzeAll(email, text, { html: flags.html, language: flags.language, moderate: flags.moderate });
        if (flags.json) {
          output(result);
        } else {
          console.log(`\nLanguage: ${result.language}`);
          console.log(`\nSentiment: ${result.sentiment?.label} (score: ${result.sentiment?.score}, magnitude: ${result.sentiment?.magnitude})`);
          console.log(`  ${result.sentiment?.interpretation}`);
          if (result.entities.length) {
            console.log(`\nTop Entities (${result.entities.length}):`);
            for (const e of result.entities.slice(0, 10)) {
              console.log(`  [${e.type}] ${e.name} (salience: ${e.salience})`);
            }
          }
          if (result.categories.length) {
            console.log(`\nContent Categories:`);
            for (const c of result.categories) {
              console.log(`  ${c.confidence.padStart(6)}  ${c.name}`);
            }
          }
        }
        break;
      }

      case 'entities': {
        const text = getText();
        const entities = await extractEntities(email, text, { html: flags.html, language: flags.language });
        if (flags.json) {
          output(entities);
        } else {
          console.log(`\nEntities (${entities.length}):\n`);
          for (const e of entities) {
            console.log(`  [${e.type}] ${e.name} (salience: ${e.salience})`);
            if (Object.keys(e.metadata).length > 0) {
              console.log(`    Metadata: ${JSON.stringify(e.metadata)}`);
            }
          }
        }
        break;
      }

      case 'sentiment': {
        const text = getText();
        const result = await analyzeSentiment(email, text, { html: flags.html, language: flags.language });
        if (flags.json) {
          output(result);
        } else {
          const s = result.document;
          console.log(`\nOverall Sentiment: ${s.label}`);
          console.log(`  Score: ${s.score}  Magnitude: ${s.magnitude}`);
          console.log(`  ${s.interpretation}`);
          if (result.sentences.length > 1) {
            console.log(`\nSentence Breakdown:`);
            for (const sent of result.sentences) {
              console.log(`  [${sent.sentiment.label}] "${sent.text}"`);
            }
          }
        }
        break;
      }

      case 'classify': {
        const text = getText();
        const categories = await classifyText(email, text, { html: flags.html, language: flags.language });
        if (flags.json) {
          output(categories);
        } else {
          console.log(`\nContent Categories (${categories.length}):\n`);
          for (const c of categories) {
            console.log(`  ${c.confidence.padStart(6)}  ${c.name}`);
          }
        }
        break;
      }

      case 'moderate': {
        const text = getText();
        const categories = await moderateText(email, text, { language: flags.language });
        if (flags.json) {
          output(categories);
        } else {
          const flagged = categories.filter(c => c.flagged);
          console.log(`\nModeration Results:`);
          if (!flagged.length) {
            console.log('  No harmful content detected.');
          } else {
            console.log(`\n  Flagged categories:`);
            for (const c of flagged) {
              console.log(`  [FLAGGED] ${c.name}: ${c.confidence}`);
            }
          }
          const safe = categories.filter(c => !c.flagged && c.confidenceRaw > 0.01);
          if (safe.length) {
            console.log(`\n  Other categories (below threshold):`);
            for (const c of safe) {
              console.log(`  ${c.name}: ${c.confidence}`);
            }
          }
        }
        break;
      }

      case 'analyze-file': {
        if (!args[0]) throw new Error('File path required');
        if (!existsSync(args[0])) throw new Error(`File not found: ${args[0]}`);
        const text = readFileSync(args[0], 'utf-8');
        const result = await analyzeAll(email, text, { html: flags.html, language: flags.language, moderate: flags.moderate });
        output(result);
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
