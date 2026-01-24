/**
 * Shared Utilities for Connectors and Tools
 * 
 * Common functions used across multiple connectors and tools.
 * Import only the functions you need:
 *   import { parseArgs, sleep, parseJSON } from '../../../system/shared/utils.js';
 */

/**
 * Parse command line arguments into { _: [], key: value } format.
 * Handles --key value pairs and boolean flags.
 * 
 * @param {string[]} args - Array of command line arguments (usually process.argv.slice(2))
 * @returns {{ _: string[], [key: string]: string | boolean }} Parsed arguments
 * 
 * @example
 * // node script.js list --limit 10 --verbose
 * parseArgs(['list', '--limit', '10', '--verbose'])
 * // Returns: { _: ['list'], limit: '10', verbose: true }
 */
export function parseArgs(args) {
  const result = { _: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }
  return result;
}

/**
 * Promise-based delay.
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 * 
 * @example
 * await sleep(1000); // Wait 1 second
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parsing with user-friendly error handling.
 * Exits with error message if JSON is invalid.
 * 
 * @param {string} str - JSON string to parse
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {any} Parsed JSON value
 * 
 * @example
 * const config = parseJSON(args.config, 'config');
 */
export function parseJSON(str, fieldName) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Error: Invalid JSON in --${fieldName}`);
    console.error(`Received: ${str}`);
    process.exit(1);
  }
}
