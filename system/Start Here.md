# Start Here

Welcome! This guide sets up your AI content creation workspace. By the end, you'll have:

- A `/memory/` folder with your personal configuration (voice, API keys, custom tools)
- A `/[your name]/` folder for your content projects

## Instructions

Copy and paste the following prompt into Cursor's chat (Cmd+L or Ctrl+L):

---

**COPY THIS PROMPT:**

```
I just downloaded this starter kit. Help me complete my first run setup.

1. **Read the voice setup process** - Load /pro accelerator/tools/Content Author/VoiceSetup.md and follow its instructions to create my voice.md file.

2. **Create my /memory/ folder** - As a SIBLING to /pro accelerator/ (not inside it), create:
   - /memory/Content Author/voice.md (from the voice discovery process)
   - /memory/my tools/AGENTS.md (for routing to any custom tools I create later)
   - /memory/README.md (copy from /pro accelerator/ tools documentation)

3. **Create my content workspace** - Ask me what I'd like to name my personal folder (usually my name or brand), then create it as a SIBLING to /pro accelerator/:
   - /[my name]/ directory
   - /[my name]/content/ for my generated content
   - /[my name]/AGENTS.md with instructions for working on my content

IMPORTANT: /pro accelerator/ is read-only. All new directories (/memory/ and /[my name]/) must be created as siblings, not inside /pro accelerator/.

Start with step 1.
```

---

## What Happens Next

The AI will run the Voice Setup process, which includes:

1. **Writing samples check** - Option to provide 3-5 writing samples (helpful but not required)
2. **Context questions** - Your topics and audience
3. **Voice discovery** - 7 questions about your persona, style, and preferences. Each includes contrasting examples to help you articulate what feels right.
4. **Voice.md creation** - Builds your voice file with 4-6 testable patterns
5. **Test and refine** - Generates sample content to verify the voice is right

Take your time with the discovery questions. Your answers become your "voice definition" that the AI uses whenever you create content.

## After Setup

Once complete, your workspace will look like:

```
[Your Workspace Root]/
├── pro accelerator/   # Shared tools (read-only, receives updates)
├── memory/            # Your personal settings (persists across updates)
│   ├── Content Author/
│   │   └── voice.md
│   └── my tools/
│       └── AGENTS.md  # Routing for your custom tools
└── [your name]/       # Your content workspace
```

**Important:** `/pro accelerator/` is read-only. Do not modify files inside it. Your changes would be lost when you pull updates. All your custom content goes in `/memory/` or your personal workspace.

You're ready to start creating content! See `/pro accelerator/tools/Content Author/AGENTS.md` for how to use the content creation tools.

