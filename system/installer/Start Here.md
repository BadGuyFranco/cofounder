# Start Here

Your environment is ready. Time to create your voice profile.

## Before You Begin: Read the License

**STOP.** Before proceeding, read `/cofounder/LICENSE`.

CoFounder uses AI tools that operate with **minimal safety guardrails**. This means:

1. **AI can take actions on your system.** It can create, modify, and delete files. It can run commands.

2. **AI outputs require verification.** AI systems generate content that may be inaccurate or fabricated. Never blindly trust AI outputs.

3. **You must review every action.** This app shows you what the AI intends to do. Read carefully.

4. **You are responsible for the results.** First Strategy LLC provides these tools "as is" with no warranty.

If you accept these terms, continue. If not, stop here.

## Voice Discovery

Your writing voice makes CoFounder's output sound like you, not generic AI.

Load and follow the complete voice discovery process:

`/cofounder/tools/Content Author/VoiceSetup.md`

This will:
- Ask for 3-5 writing samples
- Analyze your patterns
- Create your personal voice at `/memory/voice.md`

Take your time. This is the most important part of setup.

## After Voice Setup

### Open Your Workspace

1. Quit this app
2. Open `/workspaces/[your name].code-workspace` (double-click in Finder/Explorer)
3. This loads all your folders together

### Verify Everything Works

In your new workspace:
1. Ask for a short paragraph on any topic
2. Confirm the output sounds like you
3. If it doesn't, review your voice.md and add more samples

### What's Available

See the Tool Routing table in `/cofounder/.cursor/rules/Always Apply.mdc` for available tools.

Connectors for external platforms (Google, LinkedIn, etc.) are in `/cofounder/connectors/`.

Ask "what can you help me with?" anytime.

## Getting Updates

Run the same install command you used initially (your API key is saved in `~/.cofounder/config.json`).

After updating, check `/cofounder/system/migrations/` for any required changes.
