#!/usr/bin/env node
/**
 * Google Cloud Text-to-Speech Operations
 * Generate high-quality voiceovers from text using Neural2 and Studio voices.
 *
 * Usage:
 *   node tts.js synthesize "Hello world" --output hello.mp3 --account user@example.com
 *   node tts.js synthesize-file ./script.txt --output voiceover.mp3 --account user@example.com
 *   node tts.js voices --account user@example.com
 *   node tts.js voices --language en-US --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { writeFileSync, readFileSync, existsSync } from 'fs';

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
 * Get Text-to-Speech API client
 */
async function getTtsClient(email) {
  const auth = await getAuthClient(email);
  return google.texttospeech({ version: 'v1', auth });
}

/**
 * List available voices
 */
async function listVoices(email, languageCode = null) {
  const tts = await getTtsClient(email);
  const params = {};
  if (languageCode) params.languageCode = languageCode;

  const response = await tts.voices.list(params);
  return (response.data.voices || []).map(v => ({
    name: v.name,
    languageCodes: v.languageCodes,
    ssmlGender: v.ssmlGender,
    naturalSampleRateHertz: v.naturalSampleRateHertz,
    tier: v.name.includes('Studio') ? 'Studio' : v.name.includes('Neural2') ? 'Neural2' : v.name.includes('Wavenet') ? 'WaveNet' : 'Standard'
  }));
}

/**
 * Synthesize text to audio
 */
async function synthesize(email, text, options = {}) {
  const tts = await getTtsClient(email);

  const languageCode = options.language || 'en-US';
  const voiceName = options.voice || null;
  const gender = options.gender?.toUpperCase() || 'NEUTRAL';
  const audioEncoding = options.format?.toUpperCase() || 'MP3';
  const speakingRate = parseFloat(options.rate || '1.0');
  const pitch = parseFloat(options.pitch || '0.0');
  const volumeGainDb = parseFloat(options.volume || '0.0');

  // Determine if text is SSML
  const isSsml = text.trim().startsWith('<speak>') || options.ssml;

  const requestBody = {
    input: isSsml ? { ssml: text } : { text },
    voice: {
      languageCode,
      ssmlGender: gender
    },
    audioConfig: {
      audioEncoding,
      speakingRate,
      pitch,
      volumeGainDb,
      effectsProfileId: options.profile ? [options.profile] : undefined
    }
  };

  if (voiceName) {
    requestBody.voice.name = voiceName;
  }

  const response = await tts.text.synthesize({ requestBody });
  return Buffer.from(response.data.audioContent, 'base64');
}

/**
 * Get recommended voices for common use cases
 */
function getRecommendedVoices() {
  return {
    'Voiceover (US English, male)': 'en-US-Neural2-D',
    'Voiceover (US English, female)': 'en-US-Neural2-F',
    'Voiceover (US English, neutral)': 'en-US-Neural2-A',
    'Studio quality (male)': 'en-US-Studio-M',
    'Studio quality (female)': 'en-US-Studio-O',
    'Natural (UK English, male)': 'en-GB-Neural2-B',
    'Natural (UK English, female)': 'en-GB-Neural2-A',
    'Spanish (Spain, female)': 'es-ES-Neural2-A',
    'Spanish (Mexico, male)': 'es-US-Neural2-B',
    'French (France, female)': 'fr-FR-Neural2-A',
    'German (Germany, male)': 'de-DE-Neural2-B',
    'Portuguese (Brazil, female)': 'pt-BR-Neural2-A',
    'Japanese (female)': 'ja-JP-Neural2-B',
    'Korean (female)': 'ko-KR-Neural2-A'
  };
}

// CLI
function printHelp() {
  showHelp('Google Cloud Text-to-Speech Operations', {
    'Commands': [
      'synthesize "TEXT"           Convert text to speech',
      'synthesize-file FILE        Convert a text file to speech',
      'voices                      List available voices',
      'recommended                 Show recommended voices for common use cases',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--output FILE               Output audio file (default: output.mp3)',
      '--voice NAME                Voice name, e.g. en-US-Neural2-D (see voices command)',
      '--language CODE             Language code (default: en-US)',
      '--gender GENDER             MALE, FEMALE, or NEUTRAL (default: NEUTRAL)',
      '--format FORMAT             Output format: MP3, OGG_OPUS, LINEAR16, MULAW (default: MP3)',
      '--rate N                    Speaking rate: 0.25 to 4.0 (default: 1.0)',
      '--pitch N                   Pitch adjustment: -20.0 to 20.0 semitones (default: 0)',
      '--volume N                  Volume gain in dB: -96.0 to 16.0 (default: 0)',
      '--profile ID                Effects profile: telephony-class-application, headphone-class-device',
      '--ssml                      Force SSML interpretation (auto-detected if text starts with <speak>)'
    ],
    'Voice Tiers': [
      'Studio    Highest quality, most natural, best for professional content',
      'Neural2   High quality, good for most uses, broader language support',
      'WaveNet   Good quality, wide language/voice selection',
      'Standard  Basic quality, fastest, lowest cost'
    ],
    'Examples': [
      'node tts.js synthesize "Welcome to our platform" --output intro.mp3 --account user@example.com',
      'node tts.js synthesize "Hello" --voice en-US-Neural2-D --output hello.mp3 --account user@example.com',
      'node tts.js synthesize-file ./script.txt --voice en-US-Studio-M --output voiceover.mp3 --account user@example.com',
      'node tts.js synthesize "Bonjour" --language fr-FR --voice fr-FR-Neural2-A --output fr.mp3 --account user@example.com',
      'node tts.js voices --language en-US --account user@example.com',
      'node tts.js voices --account user@example.com --json | grep Neural2',
      'node tts.js recommended --account user@example.com'
    ],
    'SSML Example': [
      'Use SSML for precise control:',
      '  <speak>Hello <break time="500ms"/> world. <emphasis>Important.</emphasis></speak>'
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
    requireApi(email, 'tts', 'tts.js');
  }

  try {
    switch (command) {
      case 'synthesize': {
        if (!args[0]) throw new Error('Text to synthesize required');
        const outputPath = flags.output || 'output.mp3';
        const audioBuffer = await synthesize(email, args.join(' '), {
          language: flags.language,
          voice: flags.voice,
          gender: flags.gender,
          format: flags.format,
          rate: flags.rate,
          pitch: flags.pitch,
          volume: flags.volume,
          profile: flags.profile,
          ssml: flags.ssml
        });
        writeFileSync(outputPath, audioBuffer);
        console.log(`\n✓ Audio saved to: ${outputPath}`);
        console.log(`  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);
        break;
      }

      case 'synthesize-file': {
        if (!args[0]) throw new Error('Text file path required');
        if (!existsSync(args[0])) throw new Error(`File not found: ${args[0]}`);
        const text = readFileSync(args[0], 'utf-8');
        const outputPath = flags.output || 'output.mp3';

        // Split long text into chunks if needed (API limit: 5000 bytes per request)
        const MAX_BYTES = 4800;
        const encoder = new TextEncoder();
        const chunks = [];
        let current = '';

        for (const sentence of text.split(/(?<=[.!?])\s+/)) {
          const candidate = current ? current + ' ' + sentence : sentence;
          if (encoder.encode(candidate).length > MAX_BYTES) {
            if (current) chunks.push(current);
            current = sentence;
          } else {
            current = candidate;
          }
        }
        if (current) chunks.push(current);

        if (chunks.length === 1) {
          const audioBuffer = await synthesize(email, text, {
            language: flags.language,
            voice: flags.voice,
            gender: flags.gender,
            format: flags.format,
            rate: flags.rate,
            pitch: flags.pitch,
            volume: flags.volume
          });
          writeFileSync(outputPath, audioBuffer);
          console.log(`\n✓ Audio saved to: ${outputPath}`);
          console.log(`  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);
        } else {
          console.log(`Text split into ${chunks.length} chunks for synthesis...`);
          const buffers = [];
          for (let i = 0; i < chunks.length; i++) {
            process.stdout.write(`\r  Chunk ${i + 1}/${chunks.length}...`);
            const buf = await synthesize(email, chunks[i], {
              language: flags.language,
              voice: flags.voice,
              gender: flags.gender,
              format: flags.format,
              rate: flags.rate,
              pitch: flags.pitch,
              volume: flags.volume
            });
            buffers.push(buf);
          }
          const combined = Buffer.concat(buffers);
          writeFileSync(outputPath, combined);
          console.log(`\n✓ Audio saved to: ${outputPath} (${chunks.length} chunks combined)`);
          console.log(`  Size: ${(combined.length / 1024).toFixed(1)} KB`);
        }
        break;
      }

      case 'voices': {
        const voices = await listVoices(email, flags.language);
        if (flags.json) {
          output(voices);
        } else {
          const tier = flags.tier?.toLowerCase();
          const filtered = tier ? voices.filter(v => v.tier.toLowerCase() === tier) : voices;
          console.log(`\nAvailable Voices (${filtered.length}):\n`);
          for (const v of filtered) {
            console.log(`  ${v.name.padEnd(30)} ${v.ssmlGender.padEnd(8)} ${v.tier}  ${v.languageCodes.join(', ')}`);
          }
          console.log('\nTip: Use --language CODE to filter, --tier Studio/Neural2/WaveNet to filter by quality');
        }
        break;
      }

      case 'recommended': {
        const voices = getRecommendedVoices();
        console.log('\nRecommended Voices:\n');
        for (const [use, name] of Object.entries(voices)) {
          console.log(`  ${name.padEnd(28)} ${use}`);
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
