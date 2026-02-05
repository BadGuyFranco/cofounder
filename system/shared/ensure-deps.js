/**
 * Shared Dependency Checker
 * @version 2.0.0 - 2026-02-01
 * 
 * Automatically installs npm dependencies on first run.
 * Uses only built-in Node.js modules so it works before npm install.
 * 
 * Compatible with cloud-synced filesystems (Google Drive, Dropbox, etc.) where
 * some machines may have read-only access. If node_modules exists, the script
 * proceeds without attempting any write operations.
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
 * Ensures npm dependencies are installed.
 * 
 * Behavior:
 *   - If node_modules exists: proceed immediately (no writes, no checks)
 *   - If node_modules missing: attempt npm install
 * 
 * This simple approach is reliable on cloud-synced filesystems where:
 *   - Permission checks may not reflect actual write capability
 *   - Marker files may not sync between machines
 *   - Some machines have read-only access
 * 
 * The marker file (.deps-installed) is only used on machines with write access
 * to track package.json changes for dependency updates.
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
  
  // If node_modules exists, proceed without any write operations
  // This ensures compatibility with read-only filesystems and cloud sync
  if (existsSync(nodeModulesPath)) {
    // Optionally check for package.json updates (only if marker exists)
    // Skip this check entirely if marker is missing to avoid write attempts
    if (existsSync(markerPath)) {
      const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
      const currentHash = createHash('md5').update(packageJsonContent).digest('hex');
      const installedHash = readFileSync(markerPath, 'utf8').trim();
      
      if (installedHash !== currentHash) {
        // Package.json changed, try to update dependencies
        console.log('Dependencies updated: Installing new packages...\n');
        try {
          execSync('npm install', { 
            cwd: packageDir, 
            stdio: 'inherit',
            shell: process.platform === 'win32'
          });
          writeFileSync(markerPath, currentHash);
          console.log('\nDependencies updated successfully.\n');
        } catch (error) {
          // Installation failed, but node_modules exists so continue anyway
          console.warn('\nCould not update dependencies (possibly read-only filesystem).');
          console.warn('Continuing with existing packages.\n');
        }
      }
    }
    return;
  }
  
  // No node_modules - attempt first-time installation
  console.log('First-time setup: Installing dependencies...\n');
  
  try {
    execSync('npm install', { 
      cwd: packageDir, 
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    
    // Write marker file with package.json hash
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const currentHash = createHash('md5').update(packageJsonContent).digest('hex');
    writeFileSync(markerPath, currentHash);
    
    console.log('\nDependencies installed successfully.\n');
  } catch (error) {
    console.error('\nFailed to install dependencies.');
    console.error('If this is a read-only filesystem, dependencies must be');
    console.error('installed on a machine with write access first.\n');
    console.error(`Directory: ${packageDir}\n`);
    process.exit(1);
  }
}
