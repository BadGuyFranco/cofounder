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

## Step 0: Install Package Manager (Miniforge)

First, check if conda is already installed:
```bash
conda --version 2>/dev/null && echo "Conda is ready!" || echo "Conda not found - will install"
```

If conda is NOT installed, install Miniforge based on my operating system:

**Mac:**
```bash
echo "Downloading Miniforge..." && curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-$(uname -m).sh -o /tmp/miniforge.sh 2>/dev/null && echo "Installing Miniforge (this takes about 30 seconds)..." && bash /tmp/miniforge.sh -b -p $HOME/miniforge3 > /dev/null 2>&1 && $HOME/miniforge3/bin/conda init zsh > /dev/null 2>&1 && $HOME/miniforge3/bin/conda init bash > /dev/null 2>&1 && echo "Miniforge installed successfully!"
```

**Windows (PowerShell):**
```powershell
Write-Host "Downloading Miniforge..." -ForegroundColor Cyan; Invoke-WebRequest -Uri https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe -OutFile $env:TEMP\miniforge.exe 2>$null; Write-Host "Installing Miniforge (this takes about 60 seconds)..." -ForegroundColor Cyan; Start-Process $env:TEMP\miniforge.exe -ArgumentList '/S','/D=%USERPROFILE%\miniforge3' -Wait -WindowStyle Hidden; Write-Host "Miniforge installed successfully!" -ForegroundColor Green
```

After installation, I may need to restart my terminal or open a new one for conda to be available.

Verify conda is working:
```bash
conda --version 2>/dev/null && echo "Conda is ready!" || echo "Please restart your terminal and try again"
```

## Step 1: Install Required Tools

Once conda is available, install Node.js (required for CoFounder sync):
```bash
echo "Installing Node.js..." && conda install -y -q nodejs > /dev/null 2>&1 && echo "Node.js installed!" || echo "Installation failed - check conda is working"
```

Verify Node.js is working:
```bash
node --version 2>/dev/null && echo "Node.js is ready!" || echo "Node.js not found"
```

## Step 2: Create Folder Structure

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

## Step 3: Initialize Memory Structure

Inside /memory/, create these directories and files:
- `/memory/tools/Content Author/` (for voice settings)
- `/memory/tools/Content Author/Writing Samples/` (for my writing samples)
- `/memory/connectors/` (for connector credentials)
- `/memory/tools/Image Generator/` (for image service API keys)
- `/memory/tools/Video Generator/` (for video service API keys)
- `/memory/my connectors/AGENTS.md` - use template from `/cofounder/system/templates/Memory Templates/my-connectors-AGENTS.md`
- `/memory/my tools/AGENTS.md` - use template from `/cofounder/system/templates/Memory Templates/my-tools-AGENTS.md`
- `/memory/plans/` (for execution plans)
- `/memory/README.md` - use template from `/cofounder/system/templates/Memory Templates/README.md`
- `/memory/system/version.txt` - copy from `/cofounder/system/version.txt` (tracks which migrations have been applied)

For maintainers with write access to /cofounder/: Also create `/memory/.maintainer` (empty file). This signals you can modify the shared library.

## Step 4: Initialize Personal Workspace

Inside /[my name]/, create:
- `/[my name]/content/` (where my generated content goes)
- `/[my name]/AGENTS.md` - use template from `/cofounder/system/templates/Personal Workspace Template/AGENTS.md`, replacing [Your Name] with my name

## Step 5: Create Workspace File

In /workspaces/, create a file named `[my name].code-workspace` with this structure:

{
  "folders": [
    { "path": "../cofounder" },
    { "path": "../memory" },
    { "path": "../workspaces" },
    { "path": "../[my name]" }
  ]
}

Replace [my name] with my actual name. The order matters: cofounder, memory, workspaces, then personal folder.

## Step 6: Voice Discovery

Load /cofounder/tools/Content Author/VoiceSetup.md and follow its complete instructions to create my voice profile.

Take it one step at a time. Explain WHY each step matters before asking me to do it.

## Step 7: Open Your Workspace

After Voice Discovery is complete:
1. Tell me to close this Cursor window
2. Tell me to open /workspaces/[my name].code-workspace (double-click in Finder/Explorer)
3. This loads all my folders together as one workspace

## Step 8: Verify Setup

Once I've reopened in my workspace:
1. Ask me to request a short paragraph on any topic
2. Confirm Content Author loads my voice.md and produces output matching my voice
3. If it fails, troubleshoot before ending setup

## Step 9: What's Next

Show me:
- The Tool Routing table from .cursor/rules/Always Apply.mdc (what tools are available)
- That connectors are in /cofounder/connectors/ if I want to connect external platforms
- That I can ask "what can you help me with?" anytime to see options
```

---

## What Each Folder Is For

| Folder | Purpose | Updates? |
|--------|---------|----------|
| `/cofounder/` | Shared tools and templates. Read-only. | Yes, via sync |
| `/memory/` | YOUR personal config: voice, API keys, custom tools | Never overwritten |
| `/workspaces/` | Workspace files that open folder combinations | Never overwritten |
| `/[your name]/` | YOUR content workspace | Never overwritten |

**The separation matters:** When CoFounder gets updates, your personal settings and content stay untouched.

**The order matters:** Your workspace roots should appear as: cofounder, memory, workspaces, [your name]. This keeps tools at the top and your work at the bottom.

## After Setup

Your folder structure will look like:

```
[Parent Folder]/
├── cofounder/
│   ├── tools/
│   │   ├── Content Author/
│   │   ├── Image Generator/
│   │   └── ...
│   ├── connectors/
│   └── system/
├── memory/
│   ├── tools/
│   │   ├── Content Author/
│   │   │   ├── voice.md
│   │   │   └── Writing Samples/
│   │   ├── Image Generator/
│   │   └── Video Generator/
│   ├── connectors/
│   ├── my tools/
│   │   └── AGENTS.md
│   ├── my connectors/
│   │   └── AGENTS.md
│   └── plans/
├── [your name]/
│   ├── AGENTS.md
│   └── content/
└── workspaces/
    └── [your name].code-workspace
```

## Installing Additional Tools

CoFounder tools may require additional software. With Miniforge installed, Cursor can install them automatically:

| Tool | Requirement | Install Command |
|------|-------------|-----------------|
| **Transcriber** | Whisper | `echo "Installing Whisper..." && pip install -q openai-whisper 2>/dev/null && echo "Done!"` |
| **Documentor** | Pandoc | `echo "Installing Pandoc..." && conda install -y -q pandoc > /dev/null 2>&1 && echo "Done!"` |
| **Video Generator** | FFmpeg | `echo "Installing FFmpeg..." && conda install -y -q ffmpeg > /dev/null 2>&1 && echo "Done!"` |

These install on-demand when you first use the tool. Cursor will prompt you if something is missing.

## Troubleshooting

### "conda: command not found"

Miniforge was installed but the terminal doesn't recognize it yet.

**Mac:**
```bash
source ~/miniforge3/bin/activate
```

**Windows:** Close and reopen your terminal, or open "Miniforge Prompt" from Start menu.

### "I can't create folders at the right level"

**Mac:**
1. Open Finder
2. Navigate to the folder containing `cofounder`
3. Right-click > Get Info
4. At the bottom, click the lock icon and enter your password
5. Under "Sharing & Permissions," ensure your user has "Read & Write"

**Alternative:** Create the folders manually in Finder/Explorer, then tell Cursor: "I created the folders manually. Continue from step 3."

### "The file explorer disappeared"

Press `Cmd+E` (Mac) or `Ctrl+E` (Windows) to toggle the explorer panel.

## Getting Updates

CoFounder improves over time. To get updates, paste this in Cursor chat:

```
Run this command in your terminal: npx wiser-cofounder sync
```

After syncing, check `/cofounder/system/migrations/` for any required changes. See `/cofounder/system/migrations/README.md` for details.

Your `/memory/`, personal folder, and `/workspaces/` are unaffected by updates (though migrations may require you to reorganize `/memory/`).
