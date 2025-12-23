# Templates

Starting points for creating new tools and workspaces in Pro Accelerator.

## Available Templates

| Template | Use When |
|----------|----------|
| **Behavior Tool Template** | Creating instruction-based tools (methodology, workflows, content rules) |
| **Script Tool Template** | Creating tools with Python/Node scripts, APIs, and dependencies |
| **Workspace Root Template** | Creating new workspace directories that use Pro Accelerator |

## Choosing a Template

**Behavior Tool** (like Content Author, Problem Solver, Prompt Author)
- Tool defines HOW to act or think
- No scripts or external dependencies
- Output is guided by methodology
- Examples: writing systems, frameworks, decision processes

**Script Tool** (like Image Generator, Video Generator, Browser Control)
- Tool EXECUTES code to produce output
- Has Python/Node scripts with dependencies
- May route to multiple services/processes
- Examples: API integrations, file processing, automation

**Workspace Root** (standalone project directories)
- Creates a new workspace that uses Pro Accelerator tools
- Includes standard directory structure (clients, marketing, scripts)
- References `/pro accelerator/` for tool access

## Creating a New Tool

1. Copy the appropriate template to `/pro accelerator/tools/[Your Tool Name]/`
2. Follow the instructions in each template file
3. Delete template instruction sections when done
4. **Add to cursor rules routing:** Update `.cursor/rules/Always Apply.mdc` tool routing table and specify load behavior (automatic vs explicit)

## Creating a New Workspace

1. Copy `Workspace Root Template/` to your desired location
2. Follow `_TEMPLATE_INSTRUCTIONS.md` for setup
3. Create a `.code-workspace` file that includes `/pro accelerator/`
4. Delete `_TEMPLATE_INSTRUCTIONS.md` when done

## Documentation Standards

Every tool must have:

| File | Purpose | Audience |
|------|---------|----------|
| **README.md** | Brief overview (~30-50 lines) | Humans |
| **AGENTS.md** | Complete instructions | AI agents |

**README.md** assumes everything is installed. Quick reference only.

**AGENTS.md** includes everything: verification, installation, usage, troubleshooting.

## Key Principles

**Single Source of Truth**
- Each piece of information exists in exactly one place
- Workspace AGENTS.md references tools, doesn't duplicate their instructions
- Configuration lives in `/memory/`, not in tool code

**XML Boundaries**
- Separate user content from instructions using XML tags
- Prevents confusion between data and commands
- See individual templates for tag conventions

**Memory Directory**
- User configuration goes in `/memory/[Tool Name]/`
- Persists across Pro Accelerator updates
- Scripts load from `/memory/` using relative paths

