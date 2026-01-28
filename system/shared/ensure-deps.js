/**
 * Shared Dependency Checker
 * 
 * Automatically installs npm dependencies on first run or when package.json changes.
 * Uses only built-in Node.js modules so it works before npm install.
 * 
 * Usage in scripts:
 *   import { ensureDeps } from '../../../system/shared/ensure-deps.js';
 *   ensureDeps(import.meta.url);
 *   
 *   // Then use dynamic import for modules that need npm packages:
 *   const { parseArgs, apiRequest } = await import('./utils.js');
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

/**
 * Ensures npm dependencies are installed and up-to-date.
 * Runs npm install if:
 *   - node_modules is missing (first run)
 *   - .deps-installed marker is missing (incomplete previous install)
 *   - package.json content has changed since last install (hash mismatch)
 * 
 * Uses a marker file with package.json hash instead of timestamp comparison,
 * which is unreliable on cloud-synced filesystems like Google Drive.
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
  const markerPath = join(packageDir, '.deps-installed');
  
  // Check if we found a package.json
  if (!existsSync(packageJsonPath)) {
    // No package.json found, nothing to install
    return;
  }
  
  // Compute hash of package.json content
  const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
  const currentHash = createHash('md5').update(packageJsonContent).digest('hex');
  
  // Determine if we need to install
  let needsInstall = false;
  let reason = '';
  
  if (!existsSync(nodeModulesPath)) {
    // No node_modules at all
    needsInstall = true;
    reason = 'First-time setup: Installing dependencies...\n';
  } else if (!existsSync(markerPath)) {
    // node_modules exists but marker is missing (incomplete install or manual deletion)
    needsInstall = true;
    reason = 'Verifying dependencies...\n';
  } else {
    // Check if package.json has changed since last install
    const installedHash = readFileSync(markerPath, 'utf8').trim();
    if (installedHash !== currentHash) {
      needsInstall = true;
      reason = 'Dependencies updated: Installing new packages...\n';
    }
  }
  
  if (!needsInstall) {
    return;
  }
  
  // Remove marker before install (in case install fails)
  if (existsSync(markerPath)) {
    unlinkSync(markerPath);
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
    
    // Write marker file with current package.json hash
    writeFileSync(markerPath, currentHash);
    
    console.log('\nDependencies installed successfully.\n');
    // Continue execution instead of exiting; deps are now installed
  } catch (error) {
    console.error('\nFailed to install dependencies automatically.');
    console.error('Please run manually:\n');
    console.error(`  cd "${packageDir}"`);
    console.error('  npm install\n');
    process.exit(1);
  }
}
