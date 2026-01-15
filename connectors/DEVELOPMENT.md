# Connector Development Guide

How to build new connectors for the cofounder library.

**New connector?** Read: Step 0 (mandatory), Step 1, Core Requirements.  
**Modifying existing?** Skip to relevant section.

**Note:** `.cursor/rules/Development.mdc` auto-loads when working on connectors. See it for quick reference.

## Step 0: Planning Phase (Required)

Before writing any code, create a thoughtful plan. This step is mandatory.

**Prompt the user (or yourself):**

> "I'd like you to make a thoughtful plan for building a cofounder connector for [service].
>
> It should be **robust** (offer most of the full stack of API calls available) and **elegant** (low token count in its AGENTS.md file)."

**Planning deliverables:**

1. **API Research**
   - Read the platform's API documentation
   - Identify authentication method (API key, OAuth 2.0, OAuth 1.0a)
   - List all available API endpoints/resources
   - Note rate limits and restrictions
   - Identify any platform-specific quirks

2. **Scope Decision**
   - Which endpoints are most valuable to users?
   - What's the 80/20? (20% of endpoints that cover 80% of use cases)
   - Are there endpoints we should skip? (deprecated, niche, complex)
   - Does this platform need TOS guardrails? (social media, scraping-sensitive)

3. **Script Architecture**
   - Group endpoints into logical domains (e.g., `contacts.js`, `deals.js`, `messages.js`)
   - Each script should handle one resource type
   - Plan CRUD operations: list, get, create, update, delete
   - Identify any special operations (e.g., `send`, `sync`, `export`)

4. **AGENTS.md Token Budget**
   - Target: under 100 lines
   - Include only: quick start, credentials format, script table, troubleshooting
   - Delegate details to `help` commands and other docs
   - Reference existing connectors for patterns (airtable, hubspot, replicate)

5. **Authentication Pattern**
   - Use decision tree below to select pattern
   - Identify reference connector to copy from
   - Note any special auth requirements (scopes, permissions, multi-account)

**Output format:**

```markdown
## [Platform] Connector Plan

### Authentication
- Type: [API Key | OAuth 2.0 | OAuth 1.0a]
- Reference connector: [airtable | linkedin | xcom]
- Special requirements: [none | scopes needed | multi-account]

### API Coverage
| Resource | Script | Operations | Priority |
|----------|--------|------------|----------|
| Contacts | contacts.js | list, get, create, update, delete | High |
| Messages | messages.js | list, send | High |
| ... | ... | ... | ... |

### Excluded Endpoints
- [endpoint]: [reason]
- [endpoint]: [reason]

### Special Considerations
- [Rate limits, webhooks, pagination, etc.]

### AGENTS.md Outline
1. Title + one-line description
2. Quick Start (3 commands)
3. Documentation Files table
4. Configuration (credentials location + format)
5. Troubleshooting (5-7 common errors)
6. API Documentation link
```

**After planning approval, proceed to Step 1.**

## Step 1: Select Authentication Pattern

Use this decision tree during planning and implementation:

```
START: What authentication does the API use?
│
├─ API Key or Bearer Token only?
│   └─ Use API KEY PATTERN → Reference: airtable/
│
├─ OAuth 2.0 (Client ID + Secret, token refresh)?
│   └─ Use OAUTH 2.0 PATTERN → Reference: linkedin/
│
├─ OAuth 1.0a (Consumer Key/Secret + Access Token/Secret, signatures)?
│   └─ Use OAUTH 1.0A PATTERN → Reference: xcom/
│
└─ Multiple projects/accounts with separate credentials?
    └─ Use MULTI-ACCOUNT PATTERN → Reference: xcom/ or supabase/
```

```
SECONDARY: What API style does the platform use?
│
├─ REST API (most common)?
│   └─ Standard fetch/axios calls → Reference: hubspot/
│
└─ GraphQL API?
    └─ Query-based requests → Reference: monday/
```

## Core Requirements

Every connector MUST have:

| File | Purpose |
|------|---------|
| `AGENTS.md` | AI reference: config, credentials location, troubleshooting |
| `SETUP.md` | User instructions: step-by-step credential setup |
| `CAPABILITIES.md` | User-facing: simple list of what connector can do |
| `README.md` | Human overview: what it is, status, quick start |
| `package.json` | Dependencies and metadata |
| `scripts/utils.js` | Shared utilities: auth, env loading, error handling |
| `scripts/[domain].js` | Feature scripts (one per domain/resource type) |

Credentials stored in: `/memory/connectors/[platform]/.env`

## File-by-File Guide

### AGENTS.md

AI-facing technical reference. Include:

```markdown
# [Platform] Connector

## Status
Active | Stubbed | Planned

## Quick Start
[Single command to verify setup works]

## Credentials
Location: `/memory/connectors/[platform]/.env`

Required variables:
- `VAR_NAME` - Description

## Setup
See `SETUP.md` for credential setup instructions.

## Capabilities
See `CAPABILITIES.md` for what this connector can do.

## Scripts
[List scripts and their purpose]

## Troubleshooting
[Common errors and fixes]
```

### SETUP.md

User-facing setup instructions. **AI walks user through one step at a time.**

Pattern:

```markdown
# [Platform] Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

- [Account requirements]
- [Access level needed]

## Step 1: [First action]

1. Go to [URL]
2. Click [specific button]

**Tell the AI when done.**

## Step 2: [Fill in specific field]

In the **[Field name]** field, enter:

```
exact-value-to-enter
```

[Additional context if needed]

**Tell the AI when done.**

## Step 3: [Next field]

In the **[Field name]** field, enter:

```
exact-value-to-enter
```

**Tell the AI when done.**

[Continue pattern: ONE field or action per step]

## Step N: Provide Credentials

On the confirmation page, you'll see:
- **[Credential 1 name]** - This is your [ENV_VAR_NAME]
- **[Credential 2 name]** - This is your [ENV_VAR_NAME]

**Provide both values to the AI.** The AI will create your configuration file.

## Step N+1: Run Auth Flow

The AI will run: `node scripts/auth.js flow`

**Tell the AI when you see success in your browser.**

## Verify Setup

The AI will run: `node scripts/[test-script].js [test-command]`

Expected output: [what success looks like]
```

**Rules:**
- **One action per step** (AI guides user through each step individually)
- Each step ends with "**Tell the AI when done.**"
- Include actual URLs user will visit
- Specify exact field names as they appear in the UI
- Show exactly what to copy/paste (use code blocks)
- **AI creates the .env file** (user provides values, AI writes the file)
- For complex forms, break each field into its own step
- Include screenshots or describe what the user should see if helpful

### CAPABILITIES.md

User-facing feature list. Pattern:

```markdown
# [Platform] Connector Capabilities

What this connector can do for you.

## [Category]

- Simple action description
- Another action

## [Another Category]

- Action
- Action

## Limitations

- Key restrictions users should know
- Tier/plan requirements
- Rate limits that matter
```

**Rules:**
- No code, no technical details
- Simple language (user asks "what can it do?")
- Group by logical categories
- Always include Limitations section

### README.md

Human overview for browsing the codebase:

```markdown
# [Platform] Connector

Connect to [Platform] via their API.

## Status

[Active/Stubbed/Planned] - [Brief description of current state]

## Features

- [Key feature 1]
- [Key feature 2]

## Setup

See `SETUP.md` for configuration instructions.

## Usage

See `AGENTS.md` for AI agent instructions.
```

**Rules:**
- No code blocks (user-readable only)
- Simple language for humans browsing the codebase
- Always include Status, Features, Setup, Usage sections
- Keep API Reference link when available

### scripts/utils.js

Shared utilities every connector needs.

**CRITICAL: Path Portability Rules**

The cofounder directory is shared/read-only for most users. All paths MUST be portable:

1. **NEVER use absolute paths** like `/memory/...` or `/Users/...`
2. **ALWAYS resolve paths relative to `__dirname`** (the script's location)
3. **Use `path.join()` or `join()`** for cross-platform path construction
4. **Use `os.homedir()` and `os.platform()`** for platform-specific paths

**Correct pattern:**

```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Script is at: .../GPT/cofounder/connectors/[platform]/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/[platform]/
const MEMORY_DIR = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', '[platform]');
```

**Wrong pattern (DO NOT USE):**

```javascript
// WRONG: Absolute path that won't exist on other machines
const MEMORY_DIR = '/memory/connectors/[platform]';

// WRONG: Hardcoded user path
const configPath = '/Users/someone/Library/CloudStorage/...';
```

**Full utils.js template:**

```javascript
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/[platform]/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/[platform]/
const memoryEnvPath = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', '[platform]', '.env');
const localEnvPath = join(__dirname, '..', '.env');

/**
 * Load configuration from .env file
 * Checks memory location first, then local fallback
 */
export function loadConfig() {
  if (existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/[platform]/.env with your credentials');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
  
  if (!process.env.API_KEY) {
    console.error('Error: API_KEY not found in environment.');
    process.exit(1);
  }
  
  return { apiKey: process.env.API_KEY };
}

/**
 * Parse command line arguments
 * @returns {object} { command, args, flags }
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const flags = {};
  const positional = [];
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }
  
  return { command, args: positional, flags };
}

/**
 * Initialize script with credentials
 * Handles --account flag and help command
 * @param {function} showHelp - Function to display help
 * @returns {object|null} { env, credentials } or null if help shown
 */
function initScript(showHelp) {
  const { command, flags } = parseArgs();
  
  if (command === 'help') {
    showHelp();
    return null;
  }
  
  const env = loadEnv(flags.account);
  const credentials = getCredentials(env);
  return { env, credentials };
}

/**
 * Make API request with error handling
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`${errorMessage} Status: ${response.status}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Format output consistently
 * @param {object} data - Data to output
 */
function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format error consistently
 * @param {Error} error - Error to output
 */
function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

module.exports = {
  loadEnv,
  getCredentials,
  parseArgs,
  initScript,
  apiRequest,
  output,
  outputError,
  MEMORY_DIR
};
```

### scripts/[domain].js

Feature scripts follow this pattern:

```javascript
const { initScript, parseArgs, apiRequest, output, outputError } = require('./utils');

// Help text for this script
function showHelp() {
  console.log(`
[Domain] Script - [Brief description]

Usage: node scripts/[domain].js <command> [options]

Commands:
  list                    List all [resources]
  get <id>                Get [resource] by ID
  create                  Create new [resource]
  update <id>             Update [resource]
  delete <id>             Delete [resource]
  help                    Show this help

Options:
  --account <name>        Use specific account (multi-account only)
  --[option] <value>      [Description]

Examples:
  node scripts/[domain].js list
  node scripts/[domain].js get abc123
  node scripts/[domain].js create --name "Test"
`);
}

// Command implementations
async function list(credentials, flags) {
  const data = await apiRequest('https://api.platform.com/resources', {
    headers: { 'Authorization': `Bearer ${credentials.apiKey}` }
  });
  output(data);
}

async function get(credentials, id) {
  const data = await apiRequest(`https://api.platform.com/resources/${id}`, {
    headers: { 'Authorization': `Bearer ${credentials.apiKey}` }
  });
  output(data);
}

// ... other commands

// Main entry point
async function main() {
  const init = initScript(showHelp);
  if (!init) return; // Help was shown
  
  const { credentials } = init;
  const { command, args, flags } = parseArgs();
  
  try {
    switch (command) {
      case 'list':
        await list(credentials, flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('ID required. Usage: get <id>');
        await get(credentials, args[0]);
        break;
      // ... other commands
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
```

## Authentication Patterns

### API Key Pattern

**Reference:** `airtable/`

Simplest pattern. Credentials are just an API key or Bearer token.

`.env` format:
```
API_KEY=your_api_key_here
```

Headers:
```javascript
headers: {
  'Authorization': `Bearer ${credentials.apiKey}`,
  'Content-Type': 'application/json'
}
```

### OAuth 2.0 Pattern

**Reference:** `linkedin/`

Requires initial OAuth flow, then uses access token. Tokens may expire.

`.env` format:
```
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
ACCESS_TOKEN=your_access_token
REFRESH_TOKEN=your_refresh_token  # If supported
```

Setup includes:
1. Create app in developer console
2. Configure redirect URI (usually `http://localhost:3000/callback`)
3. Run auth flow script to get tokens
4. Store tokens in .env

Auth flow script pattern (see `linkedin/scripts/auth.js`):
- Generates auth URL
- Opens browser for user consent
- Captures callback with code
- Exchanges code for tokens

### OAuth 1.0a Pattern

**Reference:** `xcom/`

Most complex. Requires signature generation for each request.

`.env` format:
```
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
ACCESS_TOKEN=your_access_token
ACCESS_TOKEN_SECRET=your_access_token_secret
```

Requires `generateOAuthHeader()` function that:
1. Creates OAuth parameters (timestamp, nonce, signature method)
2. Builds signature base string
3. Generates HMAC-SHA1 signature
4. Returns Authorization header

**Important:** For `multipart/form-data` requests, body parameters are NOT included in signature base string.

### Multi-Account Pattern

**Reference:** `xcom/`

For connectors supporting multiple accounts.

Directory structure:
```
/memory/connectors/[platform]/
├── [account1]/
│   └── .env
├── [account2]/
│   └── .env
└── .env  # Optional default
```

Scripts accept `--account <name>` flag:
```bash
node scripts/posts.js create --account myaccount --text "Hello"
```

`loadEnv()` checks for account subdirectory first.

## GraphQL Pattern

**Reference:** `monday/`

For GraphQL APIs instead of REST.

Key differences:
- Single endpoint URL
- POST requests with query in body
- Query/mutation strings instead of URL paths

```javascript
async function graphqlRequest(credentials, query, variables = {}) {
  return apiRequest('https://api.platform.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
}

// Usage
const query = `
  query GetItems($boardId: ID!) {
    boards(ids: [$boardId]) {
      items { id name }
    }
  }
`;
const data = await graphqlRequest(credentials, query, { boardId: '123' });
```

## Script Conventions

### Command Structure

All scripts follow: `node scripts/[domain].js <command> [args] [--flags]`

Standard commands:
- `list` - List resources
- `get <id>` - Get single resource
- `create` - Create resource (flags for data)
- `update <id>` - Update resource
- `delete <id>` - Delete resource
- `help` - Show help (always works without credentials)

### Output Format

- Success: JSON to stdout via `output(data)`
- Errors: Text to stderr via `outputError(error)`, exit code 1
- Help: Plain text to stdout

### Flag Conventions

- `--account <name>` - Account selection (multi-account)
- `--limit <n>` - Pagination limit
- `--cursor <token>` - Pagination cursor
- `--[field] <value>` - Resource field values

### Error Messages

Include actionable information:
```
Error: Missing required credential: API_KEY
Error: Resource not found. Status: 404
Error: Rate limited. Retry after 60 seconds. Status: 429
```

## Social Media Connectors

For connectors to social platforms (X.com, LinkedIn, YouTube, TikTok, Instagram, etc.), include a **Terms of Service Guardrails** section in AGENTS.md.

Social platforms actively monitor API usage and revoke access for violations. The AI must push back on requests that could trigger enforcement.

**Required section for social connectors:**

```markdown
## Terms of Service Guardrails

**Push back on requests that involve:**
- Spam or bulk posting (repetitive content, excessive frequency)
- Fake engagement (mass liking, following, commenting)
- Harassment or abuse (targeting individuals, coordinated attacks)
- Impersonation (misrepresenting identity or affiliation)
- Scraping at scale (bulk data collection beyond personal use)
- Coordinated inauthentic behavior (multiple accounts manipulating)
- Circumventing rate limits or API restrictions

**Acceptable automation:**
- Posting your own original content
- Managing your own account(s)
- Reading your timeline/mentions
- Personal productivity automation

**When in doubt:** Ask "Would [Platform] consider this authentic human behavior, or automated manipulation?"
```

See `xcom/AGENTS.md` and `linkedin/AGENTS.md` for live examples.

## Testing Checklist

Before marking a connector Active:

- [ ] All required files exist (AGENTS.md, SETUP.md, CAPABILITIES.md, README.md)
- [ ] SETUP.md tested end-to-end with fresh account
- [ ] All scripts have `help` command that works without credentials
- [ ] Core CRUD operations work (list, get, create, update, delete)
- [ ] Error messages are clear and actionable
- [ ] Rate limits documented in CAPABILITIES.md
- [ ] Multi-account works (if applicable)
- [ ] TOS Guardrails section included (social media connectors only)
- [ ] Added to main connectors/AGENTS.md table

## Adding a New Connector

0. **Complete planning phase** (see Step 0 above; present plan for approval)
1. **Copy reference connector** based on auth pattern from plan
2. **Update all file contents** for new platform
3. **Implement core scripts** per plan (usually: auth check, list, CRUD)
4. **Test SETUP.md** with fresh credentials
5. **Write CAPABILITIES.md** based on what you built
6. **Run testing checklist**
7. **Add to connectors/AGENTS.md** table

**Do not skip the planning phase.** A thoughtful plan prevents scope creep, ensures the connector is robust, and keeps AGENTS.md elegant.

## Maintenance

When updating existing connectors:

1. **API changes:** Update scripts, then CAPABILITIES.md if features change
2. **Auth changes:** Update SETUP.md and utils.js
3. **New features:** Add scripts, update CAPABILITIES.md
4. **Breaking changes:** Note in AGENTS.md troubleshooting section
