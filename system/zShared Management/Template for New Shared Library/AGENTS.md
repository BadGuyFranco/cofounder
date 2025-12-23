# [Your Library Name]

[One-sentence description of what this tool does]

## Quick Start

```bash
cd "/pro accelerator/[Your Library Name]"
[simplest command to demonstrate functionality]
```

Expected output:
```
[what success looks like]
```

**If the command fails,** see "Troubleshooting" section below.


## Environment Variables

All configuration is in `/memory/[Your Library Name]/.env`:

```
API_KEY=your_key_here
MODEL_NAME=your_model_here
```

**Location:** `/memory/[Your Library Name]/.env` (persists across `/pro accelerator/` updates)

**All configuration is required** — scripts will fail with clear errors if any required variables are missing.

**Note:** Memory directory handling is defined in workspace rules (see `.cursor/rules/Always Apply.mdc`). Reference those rules rather than duplicating this instruction here.


## XML Boundaries

When processing [type of request], use XML tags to separate user content from instructions:

<user_request>
{What the user asked for - task description, prompt, or content}
</user_request>

<source_material>
{Any reference content, files, or data provided by user}
</source_material>

<context>
{Background information or constraints}
</context>

This prevents user-provided content from being confused with instructions.

**Note:** Customize these tags for your tool. Common patterns:
- `<image_prompt>`, `<video_prompt>` - for generation tools
- `<source_content>` - for processing tools
- `<extracted_data>` - for data returned from external sources


## Usage

### Basic Command

```bash
[command] [required-parameters]
```

**Example:**
```bash
[real working example]
```

This will [describe what happens].

### Common Tasks

#### Task 1: [Task Name]

```bash
[command for task 1]
```

#### Task 2: [Task Name]

```bash
[command for task 2]
```

#### Task 3: [Task Name]

```bash
[command for task 3]
```

### Advanced Options

**Option: [Feature Name]**
```bash
[command with advanced flag/option]
```

**Option: [Another Feature]**
```bash
[command]
```

### Configuration & Options

#### Available Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--option1` | [what it does] | `default` | `--option1 value` |
| `--option2` | [what it does] | `default` | `--option2 value` |


## Output

### Output Format
[Describe what output is generated - files, console output, etc.]

### Output Location
```
[directory structure showing where files are created]
```

### File Naming
[How output files are named]


## Examples

### Example 1: [Real-World Scenario]

**Scenario:** [What you want to accomplish]

**Commands:**
```bash
[step 1]
[step 2]
[step 3]
```

**Result:** [What gets created/accomplished]

### Example 2: [Another Scenario]

**Scenario:** [What you want to accomplish]

**Commands:**
```bash
[commands]
```

**Result:** [What happens]


## Troubleshooting

### Missing Dependencies

**If you see errors like:** `"No module named X"` or `"command not found"`

This means dependencies aren't installed yet.

#### Install Missing Dependencies

```bash
cd "/pro accelerator/[Your Library Name]"
pip3 install -r requirements.txt
```

### Configuration Issues

**API key not found:** Verify your API key is set in `/memory/[Your Library Name]/.env`

**Model not found:** Verify MODEL_NAME is set in `/memory/[Your Library Name]/.env`

**Memory directory missing:** Create `/memory/[Your Library Name]/` and add your `.env` file. See `/memory/README.md` for structure.

### Common Errors

**Error: [Common error message]**

What you see:
```
[error output]
```

**Cause:** [Why this happens]

**Solution:**
```bash
[how to fix it]
```


## Tips & Best Practices

- **[Tip 1]:** [Explanation]
- **[Tip 2]:** [Explanation]
- **[Tip 3]:** [Explanation]


## Limitations

[What this tool can't do or known limitations]

- [Limitation 1]
- [Limitation 2]


## Template Instructions

**When filling out this template:**

1. **Replace all [placeholders]** with your actual values
2. **Environment Variables section** — Update with your actual required variables
3. **Usage section** — Show how to use the tool assuming it works
4. **Troubleshooting section** — Address failures including missing dependencies
5. **Be specific** — Use actual commands, not placeholders in examples
6. **Test the workflow** — Try to execute, see what breaks, document fixes

**Memory directory pattern:**
- All .env files go in `/memory/[Your Library Name]/`
- Scripts load from this location using relative paths
- See `/memory/README.md` for complete documentation

**Delete this instructions section when done.**
