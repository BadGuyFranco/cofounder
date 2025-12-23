# Standard Directory Structure

This document describes the recommended directory structure for shared functionality.

## Core Documentation Strategy

**Two-file system:**

**README.md** = Brief human-facing overview
- Quick Start at the top
- Key features
- Common use cases
- Assumes everything is already installed
- ~30-50 lines typical

**AGENTS.md** = Complete AI agent instructions
- Dependency verification commands
- Installation instructions
- Complete usage documentation
- Troubleshooting (installation and usage)
- Everything AI needs to use the library successfully

## Minimal Structure

Every shared directory must have:

```
Your Functionality/
├── README.md                    # Brief human overview (REQUIRED)
├── AGENTS.md                    # Complete AI instructions (REQUIRED)
└── [your scripts/tools]         # Actual functionality
```

## Recommended Structure

For more complex functionality:

```
Your Functionality/
├── README.md                    # Brief human overview (REQUIRED)
├── AGENTS.md                    # Complete AI instructions (REQUIRED)
├── CHANGELOG.md                 # Version history (OPTIONAL - rarely used)
├── requirements.txt             # Python dependencies (if applicable)
├── package.json                 # Node.js dependencies (if applicable)
│
├── [main scripts]               # Primary scripts in root
├── script1.py
├── script2.js
│
├── setup/                       # Setup helper scripts (OPTIONAL)
│   ├── setup.sh
│   └── check_status.sh
│
├── examples/                    # Example usage (OPTIONAL)
│   ├── Example 1 - Basic.md
│   ├── Example 2 - Advanced.md
│   └── sample_input.txt
│
├── output/                      # Output directory (created at runtime)
│   └── (generated files)
│
├── config/                      # Configuration files (if needed)
│   ├── default.conf
│   └── example.env
│
└── docs/                        # Additional documentation (OPTIONAL)
    ├── API Reference.md
    ├── Architecture.md
    └── Advanced Guide.md
```

## Directory Naming Conventions

**Use Title Case with spaces:**
- ✅ `Browser Control`
- ✅ `Image Generator`
- ✅ `Voice Transcription`
- ❌ `browser-control`
- ❌ `image_generator`

**Special prefixes:**
- `z` prefix for management/templates: `zShared Management`, `zArchive`
- This sorts them to the bottom in most file explorers

## File Naming Conventions

### Documentation Files

**All caps (high priority):**
- `README.md` - For human users
- `AGENTS.md` - For AI agents

**Title Case with spaces:**
- `Standard Directory Structure.md`
- `Installation Guide.md`
- `API Reference.md`

### Code Files

**Follow language conventions:**
- Python: `snake_case.py` (e.g., `transcribe_audio.py`)
- JavaScript: `camelCase.js` or `kebab-case.js` (e.g., `generateImage.js`)
- Shell scripts: `kebab-case.sh` (e.g., `check-status.sh`)

### Configuration Files

**Standard names:**
- `.env` (environment variables)
- `requirements.txt` (Python)
- `package.json` (Node.js)
- `config.yaml` or `config.json`

## File Organization Guidelines

### Root Directory Files

**Keep in root:**
- README.md (always)
- AGENTS.md (always)
- CHANGELOG.md (if used - rarely needed for internal libraries)
- Main/primary scripts
- Dependency manifests (requirements.txt, package.json, .env)

**Don't clutter root with:**
- Example files → put in `examples/`
- Setup scripts → put in `setup/`
- Additional documentation → put in `docs/`
- Test files → put in `tests/`
- Output files → put in `output/`

### Subdirectories

Create subdirectories when:
- You have 5+ scripts → organize by function
- You have setup/installation helpers → `setup/`
- You have multiple example files → `examples/`
- You have extensive additional docs → `docs/`
- You need configuration files → `config/`
- You generate output files → `output/`

**Common subdirectories:**

#### `/setup/` (optional)
- Automated installation scripts
- Dependency checkers
- Setup helpers
- See `setup/README.md` for guidance

#### `/examples/` (optional)
- Working example usage
- Sample input files
- Expected output files
- Step-by-step tutorials

```
examples/
├── Example 1 - Basic Usage.md
├── Example 2 - Advanced Features.md
├── sample_input.txt
└── expected_output.txt
```

#### `/docs/` (optional)
- Detailed technical documentation
- API reference
- Architecture diagrams
- Advanced guides

```
docs/
├── API Reference.md
├── Architecture.md
├── Advanced Usage.md
└── Contributing Guide.md
```

#### `/config/` (optional)
- Configuration files
- Example configurations
- Templates

```
config/
├── default.conf
├── example.env
└── settings.yaml
```

#### `/output/` (created at runtime)
- Generated files
- Processed output
- Test results

```
output/
├── (files created by scripts)
└── .gitignore  # Add to ignore generated files
```

#### `/tests/` (optional)
- Unit tests
- Integration tests
- Test data

```
tests/
├── test_main.py
├── test_helper.py
└── fixtures/
```

## Documentation Standards

### README.md Structure

```markdown
# [Library Name]

[One-sentence description]

## Quick Start

[2-3 commands to get started]

## Documentation

- **AGENTS.md** - Complete instructions for AI agents

## Key Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Common Use Cases

[2-3 sentences about when to use this]
```

**Length:** ~30-50 lines  
**Focus:** Brief overview, assumes installed  
**Audience:** Humans who want quick reference

### AGENTS.md Structure

```markdown
# [Library Name] - AI Agent Instructions

[One-sentence description]

## Dependencies & Installation

### Check if Dependencies are Installed
[Verification commands]

### Install Missing Dependencies
[Installation commands]

### System Requirements
[Requirements list]

### Troubleshooting Installation
[Common installation issues and fixes]

## Quick Start

[Basic usage example]

## Usage

### Basic Command
[Common commands with examples]

### Common Tasks
[Task-specific instructions]

### Advanced Options
[Advanced features]

## Output

[What gets generated]

## Examples

[Real-world scenarios]

## Troubleshooting

[Common usage errors and solutions]

## Tips & Best Practices

[Helpful tips]
```

**Length:** As long as needed (typically 200-500 lines)  
**Focus:** Complete instructions including installation  
**Audience:** AI agents that need to execute tasks

### CHANGELOG.md (optional - rarely used in practice)

```markdown
# Changelog

## [Version] - YYYY-MM-DD

### Added
- [New features]

### Changed
- [Changes to existing features]

### Fixed
- [Bug fixes]

### Removed
- [Removed features]
```

## Common Patterns

### Python-Based Library

```
Your Python Tool/
├── README.md
├── AGENTS.md
├── requirements.txt
├── main_script.py
├── helper_functions.py
├── setup/
│   └── setup.sh
└── output/
```

### Node.js-Based Library

```
Your Node Tool/
├── README.md
├── AGENTS.md
├── package.json
├── index.js
├── lib/
│   ├── helper.js
│   └── utils.js
├── setup/
│   └── setup.sh
└── output/
```

### Multi-Script Library

```
Your Complex Tool/
├── README.md
├── AGENTS.md
├── script1.py
├── script2.py
├── script3.py
├── requirements.txt
├── examples/
│   ├── Example 1.md
│   └── Example 2.md
├── docs/
│   └── API Reference.md
└── output/
```

## Setup Helper Scripts

If your library benefits from automated setup, include a `setup/` directory:

```
setup/
├── README.md              # Explains when/how to use setup scripts
├── setup.sh              # Automated installation
└── check_status.sh       # Dependency verification
```

See `setup/README.md` template for guidance on when to include setup scripts.

## Best Practices

### Documentation
1. **Keep README.md brief** - Link to AGENTS.md for details
2. **Make AGENTS.md complete** - AI should be able to install and use without human help
3. **Use examples** - Show real, working commands
4. **Test instructions** - Verify all commands work as documented

### File Organization
1. **Keep root clean** - Only essential files in root directory
2. **Use subdirectories** - Organize by function when you have 5+ files
3. **Create output directories at runtime** - Don't commit generated files

### Naming
1. **README.md and AGENTS.md** - Always ALL CAPS
2. **Documentation** - Title Case with spaces
3. **Code** - Follow language conventions
4. **Be consistent** - Use same naming pattern throughout

### Dependencies
1. **Document everything** - Include system-level dependencies
2. **Provide verification** - Show how to check if installed
3. **Provide installation** - Show how to install missing components
4. **Handle errors** - Document common issues and solutions

## Anti-Patterns (Avoid These)

❌ **Long README.md files** - Keep brief, move details to AGENTS.md  
❌ **Installation logs** - Don't maintain manual logs, verify programmatically  
❌ **Cluttered root directory** - Use subdirectories for organization  
❌ **Inconsistent naming** - Pick a convention and stick to it  
❌ **Missing verification** - Always provide commands to check dependencies  
❌ **Duplicate information** - Don't repeat content between README and AGENTS  
❌ **Vague instructions** - Use specific, testable commands

## Migration from Old Structure

If you have an old-style shared library with `Installed Components.md`:

1. **Move installation instructions** from Installed Components.md into AGENTS.md "Dependencies & Installation" section
2. **Simplify README.md** to just overview and quick start
3. **Delete Installed Components.md** - No longer needed
4. **Remove installation logs** - Verify dependencies programmatically instead

**Result:** Two-file system (README.md + AGENTS.md) instead of three.
