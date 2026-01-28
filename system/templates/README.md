# Templates

Scaffolding for creating new tools and workspaces in CoFounder.

**For rules and standards, see `tools/DEVELOPMENT.md`** (cursor rule `.cursor/rules/Development.mdc` auto-loads when working in tools).

## Available Templates

| Template | Use When |
|----------|----------|
| **Behavior Tool** | Instructions/methodology only (no scripts) |
| **Script Tool** | Node/Python scripts with dependencies |
| **Composite Tool** | Parent that routes to multiple sub-tools |
| **Workspace Root** | Complex workspace (clients, marketing, etc.) |
| **Personal Workspace** | Simple content workspace from setup |
| **Memory Templates/** | Files for `/memory/` directory during setup |

## Choosing a Template

**Behavior Tool** (Content Author, Problem Solver, Play Author)
- Defines HOW to act or think
- No scripts or external dependencies
- Output guided by methodology

**Script Tool** (Image Generator, Browser Control)
- EXECUTES code to produce output
- Has Node/Python scripts with dependencies
- May have multiple processes/services

**Composite Tool** (Documentor)
- Routes to multiple backends/sub-tools
- Each sub-tool is self-contained
- User only sets up sub-tools they need

**Workspace Root** (CRO, FirstStrategy.ai)
- Complex workspace with clients, marketing, internal docs
- References `/cofounder/` for tool access

**Personal Workspace** (from Continue Install setup)
- Simple content creation workspace
- Just `/content/` directory
- Created during first-run setup

**Memory Templates** (for `/memory/` setup)
- `my-connectors-AGENTS.md` - Custom connector routing
- `my-tools-AGENTS.md` - Custom tool routing
- `README.md` - Memory directory description

## Creating a New Tool

1. Copy the appropriate template to `/cofounder/tools/[Your Tool Name]/`
2. Replace all `[placeholders]` with your content
3. Delete template comment markers
4. Add to routing table in `.cursor/rules/Always Apply.mdc`

## Creating a New Workspace

1. Copy `Workspace Root Template/` to your location
2. Follow `_TEMPLATE_INSTRUCTIONS.md` for setup
3. Create a `.code-workspace` file that includes `/cofounder/`
4. Delete `_TEMPLATE_INSTRUCTIONS.md` when done
