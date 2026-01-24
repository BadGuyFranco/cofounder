#!/usr/bin/env node
/**
 * Google AI Operations (Gemini)
 * Text generation, image generation, image analysis, and video generation.
 * 
 * Usage:
 *   node ai.js text "Explain quantum computing"
 *   node ai.js image "A futuristic cityscape" --output ./city.png
 *   node ai.js vision ./photo.jpg "What's in this image?"
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { GoogleGenerativeAI } = await import('@google/generative-ai');

// Built-in Node.js modules
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, extname } from 'path';

// Local modules
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  getGeminiApiKey,
  loadEnvFile,
  isApiEnabled
} from './utils.js';

// Default models
const DEFAULT_TEXT_MODEL = 'gemini-2.0-flash';
const DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash-exp'; // Supports image generation
const DEFAULT_VIDEO_MODEL = 'veo-2'; // Video generation model

// Supported aspect ratios for image generation
const SUPPORTED_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

/**
 * Get initialized Gemini client
 */
function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error(
      'GOOGLE_AI_API_KEY not found.\n\n' +
      'Set up your API key:\n' +
      '1. Go to https://aistudio.google.com/apikey\n' +
      '2. Create an API key\n' +
      '3. Add to /memory/connectors/google/.env:\n' +
      '   GOOGLE_AI_API_KEY=your_key_here'
    );
  }
  
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Test API connection
 */
async function testConnection() {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: DEFAULT_TEXT_MODEL });
  
  const result = await model.generateContent('Say "Hello from Gemini" in exactly those words.');
  const response = result.response.text();
  
  return {
    success: true,
    model: DEFAULT_TEXT_MODEL,
    response: response.trim()
  };
}

/**
 * Generate text
 */
async function generateText(prompt, options = {}) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: options.model || DEFAULT_TEXT_MODEL,
    systemInstruction: options.system || undefined
  });
  
  const generationConfig = {};
  if (options.maxTokens) generationConfig.maxOutputTokens = parseInt(options.maxTokens);
  if (options.temperature) generationConfig.temperature = parseFloat(options.temperature);
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig
  });
  
  return {
    text: result.response.text(),
    model: options.model || DEFAULT_TEXT_MODEL
  };
}

/**
 * Analyze image with vision
 */
async function analyzeImage(imagePath, prompt = 'Describe this image in detail.', options = {}) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: options.model || DEFAULT_TEXT_MODEL
  });
  
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  
  const imageData = readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  // Determine MIME type
  const ext = extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';
  
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    }]
  });
  
  return {
    text: result.response.text(),
    imagePath
  };
}

/**
 * Generate image from text prompt
 */
async function generateImage(prompt, options = {}) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: options.model || DEFAULT_IMAGE_MODEL,
    generationConfig: {
      responseModalities: ['Text', 'Image']
    }
  });
  
  // Validate aspect ratio
  let aspectRatio = options.aspectRatio || '1:1';
  if (!SUPPORTED_ASPECT_RATIOS.includes(aspectRatio)) {
    console.log(`Warning: Unsupported aspect ratio '${aspectRatio}'. Using '1:1'.`);
    console.log(`Supported: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`);
    aspectRatio = '1:1';
  }
  
  console.log(`Generating image with Gemini...`);
  console.log(`Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  console.log(`Aspect ratio: ${aspectRatio}`);
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['Text', 'Image'],
      imageConfig: { aspectRatio }
    }
  });
  
  const response = result.response;
  
  if (!response || !response.candidates || response.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }
  
  // Extract image from response
  let imageData = null;
  let textResponse = null;
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      imageData = Buffer.from(part.inlineData.data, 'base64');
    }
    if (part.text) {
      textResponse = part.text;
    }
  }
  
  if (!imageData) {
    throw new Error(`No image data in response. ${textResponse ? `API said: ${textResponse}` : ''}`);
  }
  
  // Determine output path
  let outputPath = options.output;
  if (!outputPath) {
    const outDir = options.outputDir || './generated_images';
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const safePrompt = prompt.slice(0, 30).replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '-');
    outputPath = `${outDir}/gemini_${timestamp}_${safePrompt}.png`;
  }
  
  // Ensure parent directory exists
  const parentDir = dirname(outputPath);
  if (parentDir && !existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
  
  // Save the image
  writeFileSync(outputPath, imageData);
  
  const fileSize = statSync(outputPath).size / 1024;
  
  return {
    outputPath,
    fileSize: `${fileSize.toFixed(2)} KB`,
    aspectRatio,
    textResponse
  };
}

/**
 * Generate video from text prompt (Veo)
 * Note: Video generation may have limited availability
 */
async function generateVideo(prompt, options = {}) {
  // Note: Veo integration is still evolving
  // This is a placeholder for when the API becomes more widely available
  
  throw new Error(
    'Video generation (Veo) is currently in limited preview.\n\n' +
    'To use Veo:\n' +
    '1. Apply for access at https://labs.google/veo\n' +
    '2. Once approved, video generation will work through this interface\n\n' +
    'For now, you can use Gemini for image generation:\n' +
    '  node ai.js image "your prompt" --output ./image.png'
  );
}

/**
 * List available models
 */
async function listModels() {
  // Common Gemini models
  return [
    { id: 'gemini-2.0-flash', type: 'text', description: 'Fast text generation' },
    { id: 'gemini-2.0-flash-exp', type: 'multimodal', description: 'Text + image generation (experimental)' },
    { id: 'gemini-1.5-pro', type: 'text', description: 'Advanced text generation' },
    { id: 'gemini-1.5-flash', type: 'text', description: 'Fast text generation' },
    { id: 'veo-2', type: 'video', description: 'Video generation (limited preview)' }
  ];
}

/**
 * Chat conversation
 */
async function chat(messages, options = {}) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: options.model || DEFAULT_TEXT_MODEL,
    systemInstruction: options.system || undefined
  });
  
  // Convert messages to Gemini format
  const history = [];
  for (const msg of messages.slice(0, -1)) {
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }
  
  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1];
  
  const result = await chat.sendMessage(lastMessage.content);
  
  return {
    text: result.response.text(),
    model: options.model || DEFAULT_TEXT_MODEL
  };
}

// CLI
function printHelp() {
  showHelp('Google AI Operations (Gemini)', {
    'Commands': [
      'test                       Test API connection',
      'text PROMPT                Generate text response',
      'vision IMAGE_PATH PROMPT   Analyze an image',
      'image PROMPT               Generate an image',
      'video PROMPT               Generate a video (limited)',
      'models                     List available models',
      'help                       Show this help'
    ],
    'Options': [
      '--model NAME               Model to use',
      '--system TEXT              System instruction',
      '--output PATH              Output file path (for image/video)',
      '--output-dir DIR           Output directory',
      '--aspect-ratio RATIO       Image aspect ratio (e.g., 16:9)',
      '--max-tokens N             Max output tokens',
      '--temperature N            Temperature (0.0-2.0)',
      '--json                     Output as JSON'
    ],
    'Supported Aspect Ratios': [
      '1:1 (square), 16:9 (landscape), 9:16 (portrait)',
      '4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9 (ultrawide)'
    ],
    'Examples': [
      'node ai.js test',
      'node ai.js text "Explain quantum computing in simple terms"',
      'node ai.js text "Write a haiku" --system "You are a poet"',
      'node ai.js vision ./photo.jpg "What objects are in this image?"',
      'node ai.js image "A futuristic cityscape at sunset" --output ./city.png',
      'node ai.js image "Mountain landscape" --aspect-ratio 16:9',
      'node ai.js models'
    ],
    'Notes': [
      'Requires GOOGLE_AI_API_KEY in /memory/connectors/google/.env',
      'Get your key at https://aistudio.google.com/apikey',
      'Image generation requires gemini-2.0-flash-exp or newer',
      'Video generation (Veo) is in limited preview'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  try {
    switch (command) {
      case 'test': {
        console.log('Testing Gemini API connection...\n');
        const result = await testConnection();
        console.log(`✓ Connection successful`);
        console.log(`  Model: ${result.model}`);
        console.log(`  Response: ${result.response}`);
        break;
      }
      
      case 'text': {
        if (!args[0]) throw new Error('Prompt required');
        const prompt = args.join(' ');
        const result = await generateText(prompt, {
          model: flags.model,
          system: flags.system,
          maxTokens: flags['max-tokens'],
          temperature: flags.temperature
        });
        if (flags.json) {
          output(result);
        } else {
          console.log(result.text);
        }
        break;
      }
      
      case 'vision': {
        if (!args[0]) throw new Error('Image path required');
        const imagePath = args[0];
        const prompt = args.slice(1).join(' ') || 'Describe this image in detail.';
        const result = await analyzeImage(imagePath, prompt, {
          model: flags.model
        });
        if (flags.json) {
          output(result);
        } else {
          console.log(result.text);
        }
        break;
      }
      
      case 'image': {
        if (!args[0]) throw new Error('Prompt required');
        const prompt = args.join(' ');
        const result = await generateImage(prompt, {
          model: flags.model,
          output: flags.output,
          outputDir: flags['output-dir'],
          aspectRatio: flags['aspect-ratio'] || flags.a
        });
        console.log(`\n✓ Image generated`);
        console.log(`  Path: ${result.outputPath}`);
        console.log(`  Size: ${result.fileSize}`);
        console.log(`  Aspect ratio: ${result.aspectRatio}`);
        if (result.textResponse) {
          console.log(`  Note: ${result.textResponse}`);
        }
        break;
      }
      
      case 'video': {
        if (!args[0]) throw new Error('Prompt required');
        const prompt = args.join(' ');
        await generateVideo(prompt, {
          output: flags.output,
          outputDir: flags['output-dir']
        });
        break;
      }
      
      case 'models': {
        const models = await listModels();
        if (flags.json) {
          output(models);
        } else {
          console.log('\nAvailable Models:\n');
          for (const model of models) {
            console.log(`  ${model.id.padEnd(25)} [${model.type}]`);
            console.log(`    ${model.description}`);
          }
          console.log('\nUse --model NAME to specify a model.');
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
