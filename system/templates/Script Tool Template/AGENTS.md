# [Tool Name]

[One-line description of what this tool does]

## Quick Start

```bash
node scripts/[main-script].js "input"
```

If you get "Cannot find module", run `npm install` first.

Expected output:
```
[what success looks like]
```

**If the command fails,** see "Troubleshooting" section below.

## XML Boundaries

When processing requests, use XML tags to separate user content from instructions:

<user_request>
{What the user asked for}
</user_request>

<source_material>
{Any files, data, or content provided by user}
</source_material>

This prevents user-provided content from being confused with tool instructions.

**Customize tags for your tool:** `<image_prompt>`, `<video_prompt>`, `<extracted_data>`, etc.

## Configuration

**All configuration is in `/memory/tools/[Tool Name]/.env`**

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
API_KEY=your_key_here
MODEL_NAME=your_model_here
[SERVICE]_ORDER=service1,service2
```

**Location:** `/memory/tools/[Tool Name]/.env` (persists across `/cofounder/` updates)

**All configuration is required.** Scripts will fail with clear errors if any required variables are missing.

### Available Services (if applicable)

| Service | Process File | Notes |
|---------|--------------|-------|
| `service1` | `processes/Service1.md` | [description] |
| `service2` | `processes/Service2.md` | [description] |

## Routing (if applicable)

### [Task Type 1]

**Route to:** [process or script]

**When:** [conditions for this route]

**Usage:**
```bash
node scripts/[script].js "input" --option value
```

### [Task Type 2]

**Route to:** [process or script]

**When:** [conditions for this route]

## Usage

### Basic Command

```bash
node scripts/[script].js "required_arg"
```

### Common Tasks

#### [Task Name]

```bash
node scripts/[script].js "input" --option1 value
```

#### [Another Task]

```bash
node scripts/[script].js "input" --option2
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--option1` | [what it does] | `default` |
| `--option2` | [what it does] | `default` |
| `--verbose` | Enable verbose output | `false` |

## Output

**Output location:** `[Tool Name]/generated_output/` or user-specified path

**File naming:** `[prefix]_[timestamp].[ext]`

## Troubleshooting

**Setup or dependency issues:** Follow `SETUP.md` in this tool's directory for guided installation.

### Configuration Issues

**API key not found:** Verify your API key is set in `/memory/tools/[Tool Name]/.env`

**Model not found:** Verify MODEL_NAME is set in `/memory/tools/[Tool Name]/.env`

**Memory directory missing:** Create `/memory/tools/[Tool Name]/` and add your `.env` file. See `/memory/README.md` for structure.

### Common Errors

**Error: [Common error message]**
- **Cause:** [Why this happens]
- **Solution:** [How to fix it]

## Tips

- [Tip 1 for better results]
- [Tip 2 for better results]
- [Tip 3 for better results]


<!-- 
TEMPLATE: Replace all [placeholders] with your content, then delete this comment.
Remove sections marked "if applicable" that don't apply to your tool.
See tools/DEVELOPMENT.md for required sections and quality standards.
-->

