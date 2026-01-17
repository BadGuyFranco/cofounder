# Transcriber Setup

This is an advanced tool that requires Python and optionally HuggingFace access.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check What's Installed

Run these checks:

**Python:**
```bash
python --version 2>/dev/null || python3 --version 2>/dev/null || (test -d ~/miniforge3 && echo "Miniforge installed but not initialized - run: ~/miniforge3/condabin/conda init bash") || echo "Not installed"
```

**Transcriber packages:**
```bash
cd "/cofounder/tools/Transcriber" && python -c "import whisper; print('Whisper installed')" 2>/dev/null || echo "Not installed"
```

**HuggingFace credentials (for speaker diarization):**
```bash
test -f "/memory/connectors/huggingface/.env" && grep -q "HUGGINGFACE_API_TOKEN" "/memory/connectors/huggingface/.env" && echo "Configured" || echo "Not configured"
```

## What's Missing?

Based on the checks above, report only what's missing:

| Dependency | What It Does |
|------------|--------------|
| Python | Runtime for Whisper transcription |
| Transcriber packages | Whisper and audio processing libraries |
| HuggingFace token | Speaker diarization (optional) |

**If everything shows as installed/configured:** Skip to AGENTS.md Usage section.

**If anything is missing:** Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if user confirms.

### Step 1: Python via Miniforge (if missing)

Follow `/cofounder/system/installer/dependencies/miniforge.md`

### Step 2: Transcriber packages (if missing)

```bash
cd "/cofounder/tools/Transcriber" && pip install -r requirements.txt
```

### Step 3: HuggingFace token (optional, for speaker diarization)

1. Create account at https://huggingface.co (free)
2. Go to https://huggingface.co/settings/tokens
3. Create a token with Read permission
4. Accept model licenses:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0

Create credentials:

```bash
mkdir -p "/memory/connectors/huggingface"
echo "HUGGINGFACE_API_TOKEN=hf_your_token_here" > "/memory/connectors/huggingface/.env"
```

## Verify Setup

**Basic transcription:**
```bash
cd "/cofounder/tools/Transcriber" && python transcribe_audio.py --help
```

**With diarization (if HuggingFace configured):**
```bash
python transcribe_audio.py test.mp3 --diarize
```
