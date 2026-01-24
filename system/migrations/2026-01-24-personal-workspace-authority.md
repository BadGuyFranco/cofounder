# Migration: Workspace Authority Declaration

**Version:** 2026-01-24  
**Breaking:** No  
**Affects:** All users

## What Changed

1. **Personal Workspace Template** updated to declare `.cursor/rules/Always Apply.mdc` as authority and remove duplicated routing
2. **Memory AGENTS.md** added as new template for `/memory/` root
3. **Voice.md location** moved from `/memory/tools/Content Author/voice.md` to `/memory/voice.md`

## Why

The old personal workspace template violated single source of truth by duplicating tool routing instructions. This caused conflicting or outdated routing when Always Apply.mdc was updated.

Adding AGENTS.md to `/memory/` ensures every root folder follows the same pattern.

Moving voice.md to the root folder level enables optional voice profiles for specific brands or clients. Personal voice at `/memory/voice.md` remains the default; root folders only need their own voice.md for specialized use cases.

## Migration Steps

### Step 1: Add /memory/AGENTS.md

If `/memory/AGENTS.md` does not exist, create it from `/cofounder/system/templates/Memory Templates/memory-root-AGENTS.md`.

### Step 2: Identify Personal Workspace

Check loaded workspace rules for AGENTS.md files that are NOT in `/cofounder/` or `/memory/`. These are personal workspaces.

If no personal workspace AGENTS.md is loaded, skip to Step 5.

### Step 3: Check and Update Personal Workspace

Read the personal workspace AGENTS.md and check for these old template sections:

**Section A - "Writing Content" (REMOVE if present)**
```
## Writing Content

For any writing task:

1. Load `/cofounder/tools/Content Author/AGENTS.md`
2. Apply my voice from `/memory/tools/Content Author/voice.md`
3. Save output to `/[name]/content/`
```

**Section B - "Available Tools" (REMOVE if present)**
```
## Available Tools

See `/cofounder/AGENTS.md` for the full tool list. Common tools:

- **Content Author** - Writing (always load for written content)
- **Image Generator** - Creating images
- **Visualizer** - Creating diagrams
```

**Section C - "Rules" (REMOVE if present)**
```
## Rules

- All content saves to `/content/` unless specified otherwise
- Always use Content Author for writing
- Always apply my voice settings
```

**Apply these changes:**

1. **Remove** any sections matching A, B, or C above (exact or close matches)
2. **Add Authority section** after the first heading if not present:

```markdown
## Authority

`.cursor/rules/Always Apply.mdc` is the single source of truth for tool routing, operational rules, and formatting standards. This file must never duplicate or contradict it unless explicitly instructed by the user.
```

3. **Preserve** all other content the user has added

### Step 4: Move Voice File

Check if `/memory/tools/Content Author/voice.md` exists.

**If it exists:**

1. Move the file:
   ```bash
   mv "/memory/tools/Content Author/voice.md" "/memory/voice.md"
   ```

2. Inform the user:
   > "Moved your voice.md to `/memory/voice.md`. This is now your personal voice, used as the default when a root folder doesn't have its own voice.md."

**If it doesn't exist:** Skip this step. User will create voice.md via VoiceSetup.md when needed.

**Writing Samples:** Leave `/memory/tools/Content Author/Writing Samples/` in place. These are reference material for voice setup, not runtime files.

### Step 5: Update Version

```bash
echo "2026-01-24" > /memory/system/version.txt
```

## Verification

After migration:
- `/memory/AGENTS.md` exists
- Personal workspace AGENTS.md (if present) has an "Authority" section near the top
- Personal workspace AGENTS.md does NOT have "Available Tools", "Writing Content", or "Rules" sections from the old template
- All user-customized content is retained
- If voice.md existed at `/memory/tools/Content Author/voice.md`, it now exists at `/memory/voice.md`
- No voice.md exists at the old location (`/memory/tools/Content Author/voice.md`)

## Reference

For the current template structure, see `/cofounder/system/templates/Personal Workspace Template/AGENTS.md`.
