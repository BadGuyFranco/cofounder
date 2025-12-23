# [Tool Name]

[One-line description of what this tool does]

## Quick Start

```bash
cd "/pro accelerator/tools/[Tool Name]"
python3 scripts/[main_script].py "input"
```

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

**All configuration is in `/memory/[Tool Name]/.env`**

```
API_KEY=your_key_here
MODEL_NAME=your_model_here
[SERVICE]_ORDER=service1,service2
```

**Location:** `/memory/[Tool Name]/.env` (persists across `/pro accelerator/` updates)

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
python3 scripts/[script].py "input" --option value
```

### [Task Type 2]

**Route to:** [process or script]

**When:** [conditions for this route]

## Usage

### Basic Command

```bash
python3 scripts/[script].py "required_arg"
```

### Common Tasks

#### [Task Name]

```bash
python3 scripts/[script].py "input" --option1 value
```

#### [Another Task]

```bash
python3 scripts/[script].py "input" --option2
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

### Missing Dependencies

**If you see:** `"No module named X"` or `"command not found"`

```bash
cd "/pro accelerator/tools/[Tool Name]"
pip3 install -r requirements.txt
```

### Configuration Issues

**API key not found:** Verify your API key is set in `/memory/[Tool Name]/.env`

**Model not found:** Verify MODEL_NAME is set in `/memory/[Tool Name]/.env`

**Memory directory missing:** Create `/memory/[Tool Name]/` and add your `.env` file. See `/memory/README.md` for structure.

### Common Errors

**Error: [Common error message]**
- **Cause:** [Why this happens]
- **Solution:** [How to fix it]

## Tips

- [Tip 1 for better results]
- [Tip 2 for better results]
- [Tip 3 for better results]


## Template Instructions (DELETE WHEN DONE)

**When filling out this template:**

1. Replace all `[placeholders]` with your actual values
2. Update Quick Start with a real working command
3. Update Configuration with your actual env vars
4. Remove "Routing" section if tool doesn't route to multiple processes
5. Remove "Available Services" if not applicable
6. Add real troubleshooting based on testing
7. Be specific in Tips based on actual usage
8. **Update cursor rules:** Add to routing table in `.cursor/rules/Always Apply.mdc`

**Script tool vs Behavior tool:**
- Script tools = Python/Node scripts with APIs and dependencies (this template)
- Behavior tools = Instructions and methodology only

**Pattern reference:** See Image Generator, Video Generator, and Browser Control for working examples.

**Delete this section when done.**

