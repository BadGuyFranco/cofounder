#!/usr/bin/env node
/**
 * Google Cloud Speech-to-Text Operations
 * Transcribe audio files to text with speaker detection and word timestamps.
 *
 * Usage:
 *   node speech.js transcribe ./audio.mp3 --account user@example.com
 *   node speech.js transcribe ./meeting.flac --speakers 3 --account user@example.com
 *   node speech.js transcribe-async ./long-audio.mp3 --account user@example.com
 *   node speech.js languages --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync, writeFileSync } from 'fs';
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
 * Get Speech-to-Text API client
 */
async function getSpeechClient(email) {
  const auth = await getAuthClient(email);
  return google.speech({ version: 'v1', auth });
}

/**
 * Detect audio encoding from file extension
 */
function detectEncoding(filePath) {
  const ext = extname(filePath).toLowerCase();
  const encodingMap = {
    '.flac': 'FLAC',
    '.wav': 'LINEAR16',
    '.mp3': 'MP3',
    '.ogg': 'OGG_OPUS',
    '.opus': 'OGG_OPUS',
    '.webm': 'WEBM_OPUS',
    '.m4a': 'MP3',
    '.aac': 'MP3'
  };
  return encodingMap[ext] || 'ENCODING_UNSPECIFIED';
}

/**
 * Transcribe a short audio file (< 60 seconds, < 10MB)
 */
async function transcribe(email, audioPath, options = {}) {
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const speech = await getSpeechClient(email);
  const audioContent = readFileSync(audioPath).toString('base64');
  const encoding = options.encoding || detectEncoding(audioPath);
  const languageCode = options.language || 'en-US';

  const config = {
    encoding,
    languageCode,
    enableAutomaticPunctuation: true,
    enableWordTimeOffsets: options.timestamps || false,
    model: options.model || 'latest_long'
  };

  if (options.sampleRate) {
    config.sampleRateHertz = parseInt(options.sampleRate);
  }

  if (options.speakers) {
    config.diarizationConfig = {
      enableSpeakerDiarization: true,
      minSpeakerCount: 1,
      maxSpeakerCount: parseInt(options.speakers)
    };
  }

  if (options.phrases) {
    config.speechContexts = [{
      phrases: options.phrases.split(',').map(p => p.trim())
    }];
  }

  const response = await speech.speech.recognize({
    requestBody: {
      config,
      audio: { content: audioContent }
    }
  });

  return formatTranscriptResults(response.data.results || [], options);
}

/**
 * Transcribe a long audio file via async operation (up to 480 minutes)
 * Requires the audio file to be accessible via a GCS URI or local path.
 * For local files, reads and sends synchronously in chunks (uses longRunningRecognize).
 */
async function transcribeAsync(email, audioPath, options = {}) {
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const speech = await getSpeechClient(email);
  const audioContent = readFileSync(audioPath).toString('base64');
  const encoding = options.encoding || detectEncoding(audioPath);
  const languageCode = options.language || 'en-US';

  const config = {
    encoding,
    languageCode,
    enableAutomaticPunctuation: true,
    enableWordTimeOffsets: options.timestamps || false,
    model: options.model || 'latest_long'
  };

  if (options.sampleRate) {
    config.sampleRateHertz = parseInt(options.sampleRate);
  }

  if (options.speakers) {
    config.diarizationConfig = {
      enableSpeakerDiarization: true,
      minSpeakerCount: 1,
      maxSpeakerCount: parseInt(options.speakers)
    };
  }

  console.log('Submitting long-running transcription job...');

  const operationResponse = await speech.speech.longrunningrecognize({
    requestBody: {
      config,
      audio: { content: audioContent }
    }
  });

  const operationName = operationResponse.data.name;
  console.log(`Operation started: ${operationName}`);
  console.log('Polling for completion...');

  // Poll until done
  const operations = google.speech({ version: 'v1', auth: await getAuthClient(email) });
  let done = false;
  let result;
  let attempts = 0;

  while (!done && attempts < 120) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;

    const opCheck = await operations.operations.get({ name: operationName });
    if (opCheck.data.done) {
      done = true;
      result = opCheck.data.response;
    } else {
      const progress = opCheck.data.metadata?.progressPercent;
      if (progress) process.stdout.write(`\r  Progress: ${progress}%    `);
    }
  }

  if (!done) {
    throw new Error(`Transcription timed out after ${attempts * 5} seconds. Operation: ${operationName}`);
  }

  console.log('\nTranscription complete.');
  return formatTranscriptResults(result?.results || [], options);
}

/**
 * Transcribe from a Google Cloud Storage URI
 */
async function transcribeGcs(email, gcsUri, options = {}) {
  const speech = await getSpeechClient(email);
  const languageCode = options.language || 'en-US';
  const encoding = options.encoding || 'ENCODING_UNSPECIFIED';

  const config = {
    encoding,
    languageCode,
    enableAutomaticPunctuation: true,
    model: options.model || 'latest_long'
  };

  if (options.sampleRate) config.sampleRateHertz = parseInt(options.sampleRate);
  if (options.speakers) {
    config.diarizationConfig = {
      enableSpeakerDiarization: true,
      minSpeakerCount: 1,
      maxSpeakerCount: parseInt(options.speakers)
    };
  }

  console.log(`Submitting GCS transcription: ${gcsUri}`);

  const operationResponse = await speech.speech.longrunningrecognize({
    requestBody: { config, audio: { uri: gcsUri } }
  });

  const operationName = operationResponse.data.name;
  console.log(`Operation: ${operationName}`);

  let done = false;
  let result;
  let attempts = 0;

  while (!done && attempts < 120) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;
    const opCheck = await speech.operations.get({ name: operationName });
    if (opCheck.data.done) {
      done = true;
      result = opCheck.data.response;
    }
  }

  if (!done) throw new Error('Transcription timed out');
  return formatTranscriptResults(result?.results || [], options);
}

/**
 * Format transcript results into readable output
 */
function formatTranscriptResults(results, options = {}) {
  if (!results.length) return { transcript: '', words: [], confidence: null };

  if (options.speakers) {
    // With diarization, use the last result which has all speaker tags
    const lastResult = results[results.length - 1];
    const words = lastResult.alternatives[0]?.words || [];
    const segments = [];
    let currentSpeaker = null;
    let currentText = [];

    for (const word of words) {
      const speaker = word.speakerTag;
      if (speaker !== currentSpeaker) {
        if (currentText.length) {
          segments.push({ speaker: `Speaker ${currentSpeaker}`, text: currentText.join(' ') });
        }
        currentSpeaker = speaker;
        currentText = [word.word];
      } else {
        currentText.push(word.word);
      }
    }
    if (currentText.length) {
      segments.push({ speaker: `Speaker ${currentSpeaker}`, text: currentText.join(' ') });
    }

    const fullTranscript = segments.map(s => `[${s.speaker}] ${s.text}`).join('\n');
    return { transcript: fullTranscript, segments, confidence: results[0].alternatives[0]?.confidence };
  }

  const transcript = results
    .map(r => r.alternatives[0]?.transcript || '')
    .join(' ')
    .trim();

  const confidence = results[0]?.alternatives[0]?.confidence;

  const wordTimings = options.timestamps
    ? (results[0]?.alternatives[0]?.words || []).map(w => ({
        word: w.word,
        start: w.startTime,
        end: w.endTime
      }))
    : [];

  return { transcript, confidence, words: wordTimings };
}

/**
 * List supported languages
 */
async function listLanguages(email) {
  const speech = await getSpeechClient(email);
  // Speech API does not have a list-languages endpoint; return common ones
  const common = [
    { code: 'en-US', name: 'English (United States)' },
    { code: 'en-GB', name: 'English (United Kingdom)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko-KR', name: 'Korean (South Korea)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'ru-RU', name: 'Russian (Russia)' }
  ];
  return common;
}

// CLI
function printHelp() {
  showHelp('Google Cloud Speech-to-Text Operations', {
    'Commands': [
      'transcribe FILE             Transcribe a short audio file (< 60s / < 10MB)',
      'transcribe-async FILE       Transcribe a long audio file (up to 8 hours)',
      'transcribe-gcs GCS_URI      Transcribe audio from Cloud Storage URI',
      'languages                   List commonly supported language codes',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--language CODE             Language code (default: en-US)',
      '--encoding FORMAT           Audio encoding: FLAC, LINEAR16, MP3, OGG_OPUS (auto-detected from extension)',
      '--sample-rate HZ            Sample rate in Hz (e.g. 44100, 16000)',
      '--speakers N                Enable speaker diarization, max N speakers',
      '--timestamps                Include word-level timestamps in output',
      '--model MODEL               Recognition model: latest_long, phone_call, video, medical_dictation',
      '--phrases "word1,word2"     Boost recognition of specific words or phrases',
      '--output FILE               Save transcript to file',
      '--json                      Output as JSON'
    ],
    'Supported Formats': [
      '.flac   Best quality, recommended',
      '.wav    Linear PCM, lossless',
      '.mp3    Compressed, widely supported',
      '.ogg    OGG/Opus format',
      '.webm   WebM/Opus (browser recordings)'
    ],
    'Examples': [
      'node speech.js transcribe ./interview.flac --account user@example.com',
      'node speech.js transcribe ./call.mp3 --speakers 2 --account user@example.com',
      'node speech.js transcribe-async ./webinar.mp3 --account user@example.com',
      'node speech.js transcribe ./audio.wav --language es-ES --account user@example.com',
      'node speech.js transcribe ./audio.mp3 --timestamps --json --account user@example.com',
      'node speech.js transcribe-gcs gs://my-bucket/recording.flac --account user@example.com'
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
    requireApi(email, 'speech', 'speech.js');
  }

  try {
    switch (command) {
      case 'transcribe': {
        if (!args[0]) throw new Error('Audio file path required');
        const result = await transcribe(email, args[0], {
          language: flags.language,
          encoding: flags.encoding,
          sampleRate: flags['sample-rate'],
          speakers: flags.speakers,
          timestamps: flags.timestamps,
          model: flags.model,
          phrases: flags.phrases
        });

        if (flags.output) {
          writeFileSync(flags.output, result.transcript);
          console.log(`\n✓ Transcript saved to: ${flags.output}`);
          if (result.confidence) console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        } else if (flags.json) {
          output(result);
        } else {
          if (result.confidence) console.log(`\nConfidence: ${(result.confidence * 100).toFixed(1)}%\n`);
          console.log(result.transcript);
        }
        break;
      }

      case 'transcribe-async': {
        if (!args[0]) throw new Error('Audio file path required');
        const result = await transcribeAsync(email, args[0], {
          language: flags.language,
          encoding: flags.encoding,
          sampleRate: flags['sample-rate'],
          speakers: flags.speakers,
          timestamps: flags.timestamps,
          model: flags.model
        });

        if (flags.output) {
          writeFileSync(flags.output, result.transcript);
          console.log(`\n✓ Transcript saved to: ${flags.output}`);
        } else if (flags.json) {
          output(result);
        } else {
          console.log('\n' + result.transcript);
        }
        break;
      }

      case 'transcribe-gcs': {
        if (!args[0]) throw new Error('GCS URI required (e.g. gs://bucket/file.flac)');
        const result = await transcribeGcs(email, args[0], {
          language: flags.language,
          encoding: flags.encoding,
          sampleRate: flags['sample-rate'],
          speakers: flags.speakers,
          model: flags.model
        });

        if (flags.output) {
          writeFileSync(flags.output, result.transcript);
          console.log(`\n✓ Transcript saved to: ${flags.output}`);
        } else if (flags.json) {
          output(result);
        } else {
          console.log('\n' + result.transcript);
        }
        break;
      }

      case 'languages': {
        const langs = await listLanguages(email);
        if (flags.json) {
          output(langs);
        } else {
          console.log('\nCommonly Supported Languages:\n');
          for (const l of langs) {
            console.log(`  ${l.code.padEnd(12)} ${l.name}`);
          }
          console.log('\nFull list: https://cloud.google.com/speech-to-text/docs/languages');
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
