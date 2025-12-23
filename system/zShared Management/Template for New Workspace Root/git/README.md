# git/ Directory

This directory contains core instructions, resources, and source material for the workspace.

## Purpose

The `/git/` directory typically contains:
- **Instruction files** - Detailed workflows, processes, specialized tools
- **Resource directories** - Reference materials, templates, examples
- **Source documents** - Published or authoritative content
- **zArchive/** - Historical versions and deprecated materials

## Common Patterns

### Instruction Files
Place detailed AI agent instructions here that are referenced from AGENTS.md:
- Process-specific workflows
- Specialized tool instructions
- Domain-specific guides

### Resource Directories
Organize reference materials by topic:
- `/resources/` - General reference materials
- `/templates/` - Reusable templates
- `/examples/` - Example outputs

### Archive Directory
Always include a `zArchive/` subdirectory for:
- Historical versions
- Deprecated instructions
- Old reference materials
- Materials no longer in active use

## Modification Rules

Depending on workspace purpose:

**For content creation workspaces:**
- Usually **read-only** unless updating published material
- Contains source material that derivative work is based on

**For advisory/client workspaces:**
- **Read/write** as needed for adding resources
- Contains growing library of frameworks and guides

**Always:**
- Document modification rules clearly in workspace AGENTS.md
- Move deprecated materials to zArchive/ rather than deleting
- Keep instruction files focused and well-organized

## Getting Started

1. Create instruction files referenced in your AGENTS.md
2. Add resource directories as your workspace needs them
3. Create zArchive/ subdirectory for historical materials
4. Document what belongs in this directory in your AGENTS.md

