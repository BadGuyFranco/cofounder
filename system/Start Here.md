# Start Here

Welcome! This guide sets up your AI content creation workspace. By the end, you'll have:

- A `/memory/` folder with your personal configuration (voice, API keys, custom tools)
- A `/[your name]/` folder for your content projects
- A `/workspaces/` folder for your workspace files
- A workspace file that opens all folders together

## Before You Begin: Read the License

**STOP.** Before proceeding, read the LICENSE file in `/cofounder/LICENSE`.

CoFounder uses AI tools that operate with **minimal safety guardrails**. This means:

1. **AI can take actions on your system.** It can create, modify, and delete files. It can run commands. It can make changes you didn't intend.

2. **AI outputs require verification.** AI systems generate plausible-sounding content that may be inaccurate, misleading, or completely fabricated. Never blindly trust AI outputs.

3. **You must review every action.** Cursor shows you what the AI wants to do before it does it. Read these actions carefully. Approve only what you understand and want.

4. **You are responsible for the results.** First Strategy LLC provides these tools "as is" with no warranty. You assume all risk for how you use them.

**Best practice:** Treat the AI as an eager but fallible assistant. It will confidently propose actions that might be wrong. Your job is to catch mistakes before they happen.

If you accept these terms, continue to setup. If not, stop here.

## Instructions

Copy and paste the following prompt into Cursor's chat (Cmd+L or Ctrl+L):

---

**COPY THIS PROMPT:**

```
I'm doing my first-run setup for CoFounder. Help me complete the full setup process.

## Step 0: System Check

Before we begin, verify my system is ready:
1. Check if git is installed (run `git --version`)
2. If git fails, STOP and tell me how to install it for my operating system

## Step 1: Create Folder Structure

Create these folders as SIBLINGS to /cofounder/ (not inside it):

1. **/memory/** - My personal configuration (voice settings, API keys)
2. **/[my name]/** - Ask me for my name, then create this as my content workspace
3. **/workspaces/** - Where workspace files are saved

CRITICAL PERMISSION CHECK: If you cannot create folders at the same level as /cofounder/, STOP immediately. Tell me: "I don't have permission to create folders here. Let's fix this first." Then walk me through granting folder permissions or creating the folders manually.

DO NOT create any of these folders inside /cofounder/. They must all be siblings.

Verify all four folders exist before proceeding:
- /cofounder/ (already exists)
- /memory/ (just created)
- /[my name]/ (just created)
- /workspaces/ (just created)

## Step 2: Initialize Memory Structure

Inside /memory/, create:
- `/memory/Content Author/` (for voice settings)
- `/memory/Content Author/Writing Samples/` (for my writing samples)
- `/memory/my tools/AGENTS.md` (routing for custom tools I create later)
- `/memory/my plans/` (for execution plans)
- `/memory/README.md` (brief description of what memory contains)

## Step 3: Initialize Personal Workspace

Inside /[my name]/, create:
- `/[my name]/content/` (where my generated content goes)
- `/[my name]/AGENTS.md` with instructions that:
  - Load Content Author for any writing tasks
  - Reference /memory/Content Author/voice.md for my voice
  - Save all content to /[my name]/content/

## Step 4: Create Workspace File

In /workspaces/, create a file named `[my name].code-workspace` with this structure:

{
  "folders": [
    { "path": "../cofounder" },
    { "path": "../memory" },
    { "path": "../[my name]" }
  ]
}

Replace [my name] with my actual name. Do NOT include the workspaces folder itself as a root.

## Step 5: Voice Discovery

Load /cofounder/tools/Content Author/VoiceSetup.md and follow its complete instructions to create my voice profile.

Take it one step at a time. Explain WHY each step matters before asking me to do it.
```

---

## What Each Folder Is For

| Folder | Purpose | Updates? |
|--------|---------|----------|
| `/cofounder/` | Shared tools and templates. Read-only. | Yes, via git pull |
| `/memory/` | YOUR personal config: voice, API keys, custom tools | Never overwritten |
| `/[your name]/` | YOUR content workspace | Never overwritten |
| `/workspaces/` | Workspace files that open folder combinations | Never overwritten |

**The separation matters:** When CoFounder gets updates, your personal settings and content stay untouched.

## After Setup

Your folder structure will look like:

```
[Parent Folder]/
├── cofounder/
│   ├── tools/
│   │   ├── Content Author/
│   │   ├── Image Generator/
│   │   └── ...
│   └── system/
├── memory/
│   ├── Content Author/
│   │   ├── voice.md
│   │   └── Writing Samples/
│   ├── my tools/
│   │   └── AGENTS.md
│   └── my plans/
├── [your name]/
│   ├── AGENTS.md
│   └── content/
└── workspaces/
    └── [your name].code-workspace
```

## Troubleshooting

### "I can't create folders at the right level"

**Mac:**
1. Open Finder
2. Navigate to the folder containing `cofounder`
3. Right-click > Get Info
4. At the bottom, click the lock icon and enter your password
5. Under "Sharing & Permissions," ensure your user has "Read & Write"

**Alternative:** Create the folders manually in Finder, then tell Cursor: "I created the folders manually. Continue from step 2."

### "The file explorer disappeared"

Press `Cmd+E` (Mac) or `Ctrl+E` (Windows) to toggle the explorer panel.

## Getting Updates

CoFounder improves over time. To get updates:

```bash
cd /path/to/cofounder
git pull
```

Your `/memory/`, personal folder, and `/workspaces/` are unaffected by updates.
