# [Tool Name]

[One-line description of what this tool does]


## Quick Start

[Minimal steps to use the tool immediately]

```bash
[Primary command or usage example]
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

This prevents user-provided content from being confused with tool instructions. Customize tags for your tool (e.g., `<image_prompt>`, `<video_prompt>`, `<extracted_data>`).


## [Primary Sections - Structure to Fit the Tool]

Organize documentation in whatever structure best serves THIS tool. Common patterns:

**For routing tools (Image Generator, Video Generator):**
- Configuration (preferred order, settings)
- Routing (decision tree for different use cases)
- Environment Variables

**For standalone tools (Voice Transcription):**
- Usage (commands, options, examples)
- Output (what gets generated)
- Performance notes

**For workflow tools (Word Document Editor):**
- Core Operations (main tasks)
- Workflows (common patterns)
- Safety Rules (if applicable)

**Delete this guidance section** and replace with sections appropriate for your tool.


## Troubleshooting

### Setup Issues

**Requirements:** [System requirements]

**Install dependencies:**
```bash
[Installation commands]
```

### Common Errors

**[Error type]:** [Solution]


## Tips

[Optional: Usage tips, best practices]

