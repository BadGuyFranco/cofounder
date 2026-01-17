# Transcriber Setup

This is an advanced tool that requires Python and optionally HuggingFace access.

**Windows users:** 
- All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.
- If your path has spaces (e.g., `OneDrive/Desktop/My Folder`), use Git Bash format: `/c/Users/name/OneDrive/Desktop/My\ Folder` or wrap in quotes.

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

**HuggingFace credentials (for identifying different speakers):**
```bash
test -f "/memory/connectors/huggingface/.env" && grep -q "HUGGINGFACE_API_TOKEN" "/memory/connectors/huggingface/.env" && echo "Configured" || echo "Not configured"
```

## What's Missing?

Based on the checks above, report only what's missing:

| Dependency | What It Does |
|------------|--------------|
| Python | Runtime for Whisper transcription |
| Transcriber packages | Whisper and audio processing libraries |
| HuggingFace token | Identify different speakers (optional) |

**If everything shows as installed/configured:** Skip to AGENTS.md Usage section.

**If anything is missing:** Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if user confirms.

### Step 1: Visual C++ Build Tools (Windows only)

If the user is on Windows, follow `/cofounder/system/installer/dependencies/visual-cpp.md` FIRST. This is required for PyTorch and torchaudio to install correctly. Requires PC restart before continuing.

### Step 2: Python via Miniforge (if missing)

Follow `/cofounder/system/installer/dependencies/miniforge.md`

### Step 3: Transcriber packages (if missing)

```bash
cd "/cofounder/tools/Transcriber" && pip install -r requirements.txt
```

**Note:** This downloads large packages (PyTorch is ~2GB). On slow connections, pip may appear to hang or timeout. Be patient; if it times out, run the command again and pip will resume from cached downloads.

Setup is complete for basic transcription. Stop here unless the user specifically requests speaker identification.

### Step 4: HuggingFace + FFmpeg (ONLY if user requests speaker identification)

Do NOT install this automatically. Only proceed if the user explicitly wants to identify different speakers.

Tell the user:

"Identifying different speakers requires a free HuggingFace account and FFmpeg installed on your system. It takes about 5 minutes to set up. Want me to walk you through it?"

If user confirms:

**4a. Install FFmpeg (system package, not pip)**

**Mac:**
```bash
brew install ffmpeg
```

**Windows:**
1. Go to https://www.gyan.dev/ffmpeg/builds/
2. Download "ffmpeg-release-essentials.zip"
3. Extract to `C:\ffmpeg`
4. Add `C:\ffmpeg\bin` to your system PATH
5. Restart Git Bash

**Linux:**
```bash
sudo apt install ffmpeg
```

Verify with: `ffmpeg -version`

**4b. Set up HuggingFace account**

1. Create account at https://huggingface.co (free)
2. Go to https://huggingface.co/settings/tokens
3. Create a token with Read permission
4. Accept model licenses:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0

Once they have their token, create credentials:

```bash
mkdir -p "/memory/connectors/huggingface"
echo "HUGGINGFACE_API_TOKEN=hf_your_token_here" > "/memory/connectors/huggingface/.env"
```

## Verify Setup

**Basic transcription:**
```bash
cd "/cofounder/tools/Transcriber" && python transcribe_audio.py --help
```

**With speaker identification (if HuggingFace configured):**
```bash
python transcribe_audio.py test.mp3 --diarize
```
