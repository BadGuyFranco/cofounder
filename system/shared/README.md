# Shared Utilities

Shared code used by connectors and tools.

## ensure-deps.js

Automatically installs npm dependencies on first run or when `package.json` changes. Prevents the confusing "Cannot find module" error.

### How It Works

1. Script imports `ensureDeps` (uses only built-in Node.js modules)
2. `ensureDeps()` checks if `node_modules` exists
3. If missing, runs `npm install` automatically
4. If `node_modules` exists but `package.json` is newer (after a cofounder update), runs `npm install` to get new packages
5. Exits with message to re-run command
6. On second run, dependencies are current, script continues normally

### Usage in Scripts

```javascript
#!/usr/bin/env node

// Step 1: Import and run dependency check (MUST be first)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Step 2: Dynamic import of modules that use npm packages
const { parseArgs, apiRequest } = await import('./utils.js');

// Step 3: Rest of script
async function main() {
  // ...
}

main();
```

### Why Dynamic Imports?

ES modules resolve all static imports before any code runs. If `utils.js` imports an npm package like `dotenv`, and `node_modules` doesn't exist, the script fails immediately.

By using dynamic imports (`await import()`), we ensure the dependency check runs first.

### User Experience

First run (no dependencies):
```
$ node scripts/bases.js list

First-time setup: Installing dependencies...

added 5 packages in 2s

Dependencies installed successfully.
Please re-run your command.
```

Second run (dependencies installed):
```
$ node scripts/bases.js list
Found 3 base(s):
...
```

## utils.js

Common utility functions used across connectors and tools.

### parseArgs(args)

Parse command line arguments into `{ _: [], key: value }` format.

```javascript
import { parseArgs } from '../../../system/shared/utils.js';

const args = parseArgs(process.argv.slice(2));
// node script.js list --limit 10 --verbose
// Returns: { _: ['list'], limit: '10', verbose: true }
```

### sleep(ms)

Promise-based delay.

```javascript
import { sleep } from '../../../system/shared/utils.js';

await sleep(1000); // Wait 1 second
```

### parseJSON(str, fieldName)

Safe JSON parsing with user-friendly error handling.

```javascript
import { parseJSON } from '../../../system/shared/utils.js';

const config = parseJSON(args.config, 'config');
// If invalid JSON, exits with helpful error message
```
