/**
 * Shared Dependency Checker
 * 
 * Automatically installs npm dependencies on first run or when package.json changes.
 * Uses only built-in Node.js modules so it works before npm install.
 * 
 * Usage in scripts:
 *   import { ensureDeps } from '../../shared/ensure-deps.js';
 *   ensureDeps(import.meta.url);
 *   
 *   // Then use dynamic import for modules that need npm packages:
 *   const { parseArgs, apiRequest } = await import('./utils.js');
 */

import { existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

/**
 * Ensures npm dependencies are installed and up-to-date.
 * Runs npm install if:
 *   - node_modules is missing (first run)
 *   - package.json is newer than node_modules (dependencies changed after update)
 * 
 * @param {string} metaUrl - Pass import.meta.url from the calling script
 */
export function ensureDeps(metaUrl) {
  const scriptPath = fileURLToPath(metaUrl);
  const scriptDir = dirname(scriptPath);
  
  // Find the package.json directory (walk up from script location)
  let packageDir = scriptDir;
  while (packageDir !== dirname(packageDir)) {
    if (existsSync(join(packageDir, 'package.json'))) {
      break;
    }
    packageDir = dirname(packageDir);
  }
  
  const packageJsonPath = join(packageDir, 'package.json');
  const nodeModulesPath = join(packageDir, 'node_modules');
  
  // Check if we found a package.json
  if (!existsSync(packageJsonPath)) {
    // No package.json found, nothing to install
    return;
  }
  
  // Determine if we need to install
  let needsInstall = false;
  let reason = '';
  
  if (!existsSync(nodeModulesPath)) {
    // No node_modules at all
    needsInstall = true;
    reason = 'First-time setup: Installing dependencies...\n';
  } else {
    // Check if package.json is newer than node_modules
    const packageJsonTime = statSync(packageJsonPath).mtimeMs;
    const nodeModulesTime = statSync(nodeModulesPath).mtimeMs;
    
    if (packageJsonTime > nodeModulesTime) {
      needsInstall = true;
      reason = 'Dependencies updated: Installing new packages...\n';
    }
  }
  
  if (!needsInstall) {
    return;
  }
  
  // Install dependencies
  console.log(reason);
  
  try {
    execSync('npm install', { 
      cwd: packageDir, 
      stdio: 'inherit',
      // Use shell on Windows for better compatibility
      shell: process.platform === 'win32'
    });
    console.log('\nDependencies installed successfully.');
    console.log('Please re-run your command.\n');
    process.exit(0);
  } catch (error) {
    console.error('\nFailed to install dependencies automatically.');
    console.error('Please run manually:\n');
    console.error(`  cd "${packageDir}"`);
    console.error('  npm install\n');
    process.exit(1);
  }
}
