#!/usr/bin/env node

/**
 * HuggingFace Inference Script
 * Run models via the Inference API.
 *
 * Usage:
 *   node inference.js text <model> --prompt "..."
 *   node inference.js image <model> --prompt "..."
 *   node inference.js embed <model> --text "..."
 *   node inference.js classify <model> --text "..."
 *   node inference.js help
 */

import { parseArgs, inferenceRequest, inferenceWithRetry, saveBinaryOutput, getExtensionFromContentType, formatBytes } from './utils.js';
import path from 'path';

/**
 * Text generation
 * @param {string} model - Model ID
 * @param {string} prompt - Input prompt
 * @param {object} options - Generation options
 */
async function generateText(model, prompt, options = {}) {
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  console.log('');

  const payload = {
    inputs: prompt,
    parameters: {}
  };

  if (options.maxTokens) {
    payload.parameters.max_new_tokens = parseInt(options.maxTokens);
  }
  if (options.temperature) {
    payload.parameters.temperature = parseFloat(options.temperature);
  }
  if (options.topP) {
    payload.parameters.top_p = parseFloat(options.topP);
  }

  let result;
  if (options.wait) {
    result = await inferenceWithRetry(model, payload);
  } else {
    result = await inferenceRequest(model, payload);
  }

  // Handle different response formats
  if (Array.isArray(result)) {
    const text = result[0]?.generated_text || result[0];
    console.log('Generated text:');
    console.log(text);
  } else if (result.generated_text) {
    console.log('Generated text:');
    console.log(result.generated_text);
  } else {
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/**
 * Image generation
 * @param {string} model - Model ID
 * @param {string} prompt - Text prompt
 * @param {object} options - Generation options
 */
async function generateImage(model, prompt, options = {}) {
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  console.log('');

  const payload = {
    inputs: prompt
  };

  if (options.negativePrompt) {
    payload.negative_prompt = options.negativePrompt;
  }

  let result;
  if (options.wait) {
    console.log('Waiting for model (may take a moment)...');
    result = await inferenceWithRetry(model, payload);
  } else {
    result = await inferenceRequest(model, payload);
  }

  // Handle binary image response
  if (result.type === 'binary') {
    const ext = getExtensionFromContentType(result.contentType);
    const timestamp = Date.now();
    const filename = `image_${timestamp}${ext}`;
    const outputPath = options.output || path.join(process.cwd(), filename);
    
    saveBinaryOutput(result.buffer, outputPath);
    console.log(`Image saved: ${outputPath}`);
    console.log(`Size: ${formatBytes(result.buffer.length)}`);
    return { path: outputPath, size: result.buffer.length };
  }

  // Handle URL response
  if (result.url || (Array.isArray(result) && result[0]?.url)) {
    const url = result.url || result[0].url;
    console.log(`Image URL: ${url}`);
    return { url };
  }

  console.log('Response:');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Generate embeddings
 * @param {string} model - Model ID
 * @param {string|string[]} texts - Text(s) to embed
 * @param {object} options - Options
 */
async function generateEmbeddings(model, texts, options = {}) {
  const inputTexts = Array.isArray(texts) ? texts : [texts];
  
  console.log(`Model: ${model}`);
  console.log(`Texts: ${inputTexts.length} input(s)`);
  console.log('');

  const payload = {
    inputs: inputTexts
  };

  let result;
  if (options.wait) {
    result = await inferenceWithRetry(model, payload);
  } else {
    result = await inferenceRequest(model, payload);
  }

  // Handle response
  if (Array.isArray(result)) {
    console.log(`Generated ${result.length} embedding(s)`);
    
    for (let i = 0; i < result.length; i++) {
      const embedding = result[i];
      const dims = Array.isArray(embedding) ? embedding.length : 'unknown';
      console.log(`  [${i}] Dimensions: ${dims}`);
      
      if (options.verbose && Array.isArray(embedding)) {
        const preview = embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ');
        console.log(`       Preview: [${preview}, ...]`);
      }
    }

    if (options.output) {
      const fs = await import('fs');
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(`\nSaved to: ${options.output}`);
    }
  } else {
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/**
 * Text classification
 * @param {string} model - Model ID
 * @param {string} text - Text to classify
 * @param {object} options - Options
 */
async function classifyText(model, text, options = {}) {
  console.log(`Model: ${model}`);
  console.log(`Text: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
  console.log('');

  const payload = {
    inputs: text
  };

  let result;
  if (options.wait) {
    result = await inferenceWithRetry(model, payload);
  } else {
    result = await inferenceRequest(model, payload);
  }

  // Handle response
  if (Array.isArray(result) && Array.isArray(result[0])) {
    console.log('Classification results:');
    for (const item of result[0]) {
      const score = (item.score * 100).toFixed(1);
      console.log(`  ${item.label}: ${score}%`);
    }
  } else if (Array.isArray(result)) {
    console.log('Classification results:');
    for (const item of result) {
      const score = (item.score * 100).toFixed(1);
      console.log(`  ${item.label}: ${score}%`);
    }
  } else {
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/**
 * Summarization
 * @param {string} model - Model ID
 * @param {string} text - Text to summarize
 * @param {object} options - Options
 */
async function summarize(model, text, options = {}) {
  console.log(`Model: ${model}`);
  console.log(`Input length: ${text.length} characters`);
  console.log('');

  const payload = {
    inputs: text,
    parameters: {}
  };

  if (options.maxLength) {
    payload.parameters.max_length = parseInt(options.maxLength);
  }
  if (options.minLength) {
    payload.parameters.min_length = parseInt(options.minLength);
  }

  let result;
  if (options.wait) {
    result = await inferenceWithRetry(model, payload);
  } else {
    result = await inferenceRequest(model, payload);
  }

  // Handle response
  if (Array.isArray(result) && result[0]?.summary_text) {
    console.log('Summary:');
    console.log(result[0].summary_text);
  } else {
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/**
 * Speech to text (ASR)
 * @param {string} model - Model ID
 * @param {string} audioPath - Path to audio file
 * @param {object} options - Options
 */
async function transcribe(model, audioPath, options = {}) {
  const fs = await import('fs');
  
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log(`Model: ${model}`);
  console.log(`Audio: ${audioPath}`);
  console.log('');

  const audioBuffer = fs.readFileSync(audioPath);
  
  // For audio, we send raw binary
  const config = (await import('./utils.js')).loadConfig();
  const baseUrl = `https://api-inference.huggingface.co/models/${model}`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'audio/flac' // Whisper accepts various formats
    },
    body: audioBuffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const result = await response.json();

  if (result.text) {
    console.log('Transcription:');
    console.log(result.text);
  } else {
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

// Show help
function showHelp() {
  console.log(`HuggingFace Inference Script

Commands:
  text <model>        Generate text
  image <model>       Generate image
  embed <model>       Generate embeddings
  classify <model>    Classify text
  summarize <model>   Summarize text
  transcribe <model>  Speech to text
  help                Show this help

Common Options:
  --wait              Wait for model to load (retry on 503)
  --verbose           Show detailed output

Text Generation Options:
  --prompt <text>     Input prompt (required)
  --max-tokens <n>    Max tokens to generate
  --temperature <n>   Sampling temperature (0-2)
  --top-p <n>         Top-p sampling (0-1)

Image Generation Options:
  --prompt <text>     Text prompt (required)
  --negative-prompt   What to avoid in the image
  --output <path>     Save image to path

Embedding Options:
  --text <text>       Text to embed (required)
  --output <path>     Save embeddings to JSON file

Classification Options:
  --text <text>       Text to classify (required)

Summarization Options:
  --text <text>       Text to summarize (required)
  --max-length <n>    Max summary length
  --min-length <n>    Min summary length

Transcription Options:
  --audio <path>      Path to audio file (required)

Examples:
  # Generate text
  node inference.js text meta-llama/Meta-Llama-3-8B-Instruct \\
    --prompt "Explain quantum computing in simple terms"

  # Generate image
  node inference.js image black-forest-labs/FLUX.1-dev \\
    --prompt "A serene mountain lake at sunset" --wait

  # Generate embeddings
  node inference.js embed sentence-transformers/all-MiniLM-L6-v2 \\
    --text "Hello world"

  # Classify sentiment
  node inference.js classify distilbert-base-uncased-finetuned-sst-2-english \\
    --text "I love this product!"

  # Summarize text
  node inference.js summarize facebook/bart-large-cnn \\
    --text "Long article text here..."

  # Transcribe audio
  node inference.js transcribe openai/whisper-large-v3 \\
    --audio ./recording.mp3 --wait

Popular models:
  Text:   meta-llama/Meta-Llama-3-8B-Instruct
  Image:  black-forest-labs/FLUX.1-dev
  Embed:  sentence-transformers/all-MiniLM-L6-v2
  ASR:    openai/whisper-large-v3
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const model = args._[1];
  const verbose = args.verbose || false;
  const wait = args.wait || false;

  try {
    switch (command) {
      case 'text': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js text <model> --prompt "..."');
          process.exit(1);
        }
        if (!args.prompt) {
          console.error('Error: --prompt is required');
          process.exit(1);
        }
        await generateText(model, args.prompt, {
          maxTokens: args['max-tokens'],
          temperature: args.temperature,
          topP: args['top-p'],
          wait,
          verbose
        });
        break;
      }

      case 'image': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js image <model> --prompt "..."');
          process.exit(1);
        }
        if (!args.prompt) {
          console.error('Error: --prompt is required');
          process.exit(1);
        }
        await generateImage(model, args.prompt, {
          negativePrompt: args['negative-prompt'],
          output: args.output,
          wait,
          verbose
        });
        break;
      }

      case 'embed': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js embed <model> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          process.exit(1);
        }
        await generateEmbeddings(model, args.text, {
          output: args.output,
          wait,
          verbose
        });
        break;
      }

      case 'classify': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js classify <model> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          process.exit(1);
        }
        await classifyText(model, args.text, { wait, verbose });
        break;
      }

      case 'summarize': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js summarize <model> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          process.exit(1);
        }
        await summarize(model, args.text, {
          maxLength: args['max-length'],
          minLength: args['min-length'],
          wait,
          verbose
        });
        break;
      }

      case 'transcribe': {
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node inference.js transcribe <model> --audio <path>');
          process.exit(1);
        }
        if (!args.audio) {
          console.error('Error: --audio is required');
          process.exit(1);
        }
        await transcribe(model, args.audio, { wait, verbose });
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.status === 503) {
      console.error('\nModel is loading. Try again with --wait flag.');
    }
    if (error.status === 401) {
      console.error('\nAuthentication failed. Check your API token.');
    }
    if (error.status === 403) {
      console.error('\nAccess denied. This model may be gated. Visit the model page to accept terms.');
    }
    process.exit(1);
  }
}

main();
