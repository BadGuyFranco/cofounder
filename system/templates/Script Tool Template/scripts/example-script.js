#!/usr/bin/env node
/**
 * [Script Name] - [One-line description]
 *
 * Usage:
 *     node example-script.js "input" [--option value]
 *
 * Examples:
 *     node example-script.js "hello world"
 *     node example-script.js "data.txt" --output "./results/"
 *     node example-script.js "input" --verbose
 *
 * Arguments:
 *     input           Required input (file path, text, etc.)
 *
 * Options:
 *     --output DIR    Output directory (default: ./output/)
 *     --verbose       Enable verbose output
 *     --help          Show this help message
 *
 * Configuration:
 *     Environment variables loaded from /memory/tools/[Tool Name]/.env
 *     See /memory/README.md for setup.
 */

import { config } from 'dotenv';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// ENVIRONMENT CONFIGURATION - Load from /memory/
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate from script location to memory directory
// Path: /cofounder/tools/[Tool Name]/scripts/ -> /memory/tools/[Tool Name]/
const memoryEnvPath = resolve(__dirname, '../../../../memory/tools/[Tool Name]/.env');

if (existsSync(memoryEnvPath)) {
  config({ path: memoryEnvPath });
} else {
  console.log(`Warning: .env not found at ${memoryEnvPath}`);
  console.log('   Create /memory/tools/[Tool Name]/.env with your configuration');
  console.log('   See /memory/README.md for setup instructions');
}

// Configuration - Load from environment (NEVER hardcode API keys/models)
const API_KEY = process.env.API_KEY;
const MODEL_NAME = process.env.MODEL_NAME;

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_OUTPUT_DIR = './output';
let VERBOSE = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateConfig() {
  if (!API_KEY) {
    console.log('Error: API_KEY not found!');
    console.log('   Add API_KEY to /memory/tools/[Tool Name]/.env');
    process.exit(1);
  }

  if (!MODEL_NAME) {
    console.log('Error: MODEL_NAME not found!');
    console.log('   Add MODEL_NAME to /memory/tools/[Tool Name]/.env');
    process.exit(1);
  }

  return true;
}

function ensureOutputDirectory(outputDir) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

function processInput(inputData) {
  /**
   * Main processing logic.
   *
   * @param {string} inputData - The data to process
   * @returns {string} Processed result
   */
  const result = `Processed: ${inputData}`;
  return result;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function main(inputArg, outputDir = DEFAULT_OUTPUT_DIR) {
  /**
   * Main execution function.
   *
   * @param {string} inputArg - Input to process
   * @param {string} outputDir - Output directory path
   * @returns {number} Exit code (0 for success, 1 for error)
   */
  try {
    validateConfig();
    const outputPath = ensureOutputDirectory(outputDir);

    if (VERBOSE) {
      console.log(`Processing: ${inputArg}`);
      console.log(`Using model: ${MODEL_NAME}`);
    }

    const result = processInput(inputArg);

    // Write output
    const outputFile = join(outputPath, 'result.txt');
    writeFileSync(outputFile, String(result));

    console.log(`Success! Output saved to: ${outputFile}`);
    return 0;
  } catch (e) {
    console.log(`Error: ${e.message}`);
    if (VERBOSE) {
      console.error(e.stack);
    }
    return 1;
  }
}

// ============================================================================
// CLI
// ============================================================================

function showHelp() {
  console.log(`
[Script Name] - [One-line description]

Usage:
    node example-script.js "input" [--option value]

Examples:
    node example-script.js "hello world"
    node example-script.js "data.txt" --output "./results/"
    node example-script.js "input" --verbose

Arguments:
    input           Required input (file path, text, etc.)

Options:
    --output DIR    Output directory (default: ./output/)
    --verbose       Enable verbose output
    --help          Show this help message

Configuration:
    Environment variables loaded from /memory/tools/[Tool Name]/.env
    See /memory/README.md for setup.
`);
  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

const inputArg = args[0];
let outputDir = DEFAULT_OUTPUT_DIR;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && args[i + 1]) {
    outputDir = args[i + 1];
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    VERBOSE = true;
  }
}

const exitCode = main(inputArg, outputDir);
process.exit(exitCode);

// ============================================================================
// TEMPLATE INSTRUCTIONS (DELETE THIS SECTION)
// ============================================================================
/**
 * When creating your own scripts:
 *
 * 1. Update the path to /memory/ in the environment loading section
 * 2. Replace [Tool Name] with your actual tool name
 * 3. Update validateConfig() with your required env vars
 * 4. Implement processInput() with your actual logic
 * 5. Update CLI argument parsing as needed
 * 6. Delete this instructions section
 *
 * Path calculation for /memory/:
 * - Scripts at: /cofounder/tools/[Tool Name]/scripts/
 * - Memory at: /memory/tools/[Tool Name]/
 * - Relative: ../../../../memory/tools/[Tool Name]/.env
 */

