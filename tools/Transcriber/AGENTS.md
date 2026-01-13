# Transcriber

**100% Local Execution. No API Keys Required. Completely Free.**

Transcribe voice recordings and phone calls locally using OpenAI Whisper with GPU acceleration. Optionally identify different speakers using pyannote speaker diarization.

## Objective

Convert audio to text and, when requested, produce summaries that capture every key point, nuanced detail, and emotional context. Summaries should be comprehensive enough that someone who didn't hear the recording understands exactly what happened.

## Features

| Feature | Description | Requirements |
|---------|-------------|--------------|
| **Basic Transcription** | Convert audio to text | None (works out of box) |
| **Speaker Diarization** | Label who said what (SPEAKER_00, SPEAKER_01, etc.) | HuggingFace connector |
| **Comprehensive Summary** | Organized analysis with action items | None (AI generates from transcript) |

## Pre-Transcription Workflow

**Before running the transcription script, ask the user these two questions:**

> **Question 1: Speaker separation?**
> 
> "Is there more than one person speaking in this recording? If so, would you like me to separate and label different speakers (SPEAKER_00, SPEAKER_01, etc.)?
> 
> Note: Speaker separation takes roughly twice as long to process and requires one-time HuggingFace setup. If you just need the words, skip it."
>
> **Question 2: Output format?**
>
> "What output do you need?
> 1. **Raw transcript only** - Just the text file
> 2. **Comprehensive summary** - Organized summary with key points and analysis
> 3. **Both** - Transcript file plus summary"

**Then run the transcription.** After the script completes, proceed based on their choices.

## Quick Start

**Basic transcription (no setup required):**
```bash
python transcribe_audio.py recording.m4a
```

**With specific model:**
```bash
python transcribe_audio.py recording.m4a --model medium
```

**With speaker diarization (requires HuggingFace setup):**
```bash
python transcribe_audio.py meeting.mp3 --diarize
```

**With known speaker count (improves accuracy):**
```bash
python transcribe_audio.py call.wav --diarize --speakers 2
```

## Speaker Diarization Setup

Speaker diarization identifies different voices and labels them (SPEAKER_00, SPEAKER_01, etc.). This requires a one-time setup:

### Step 1: Set Up HuggingFace Connector

Follow the HuggingFace connector setup at `/cofounder/connectors/huggingface/SETUP.md`:

1. Create a free HuggingFace account at https://huggingface.co
2. Generate an access token with Read permission
3. Store the token in the connector configuration

### Step 2: Accept Model Licenses

Visit these pages and click "Agree and access repository":

1. https://huggingface.co/pyannote/speaker-diarization-3.1
2. https://huggingface.co/pyannote/segmentation-3.0

Both are free; they just require you to acknowledge the terms.

### Step 3: Install Dependencies

```bash
cd "/cofounder/tools/Transcriber"
pip install -r requirements.txt
```

### Step 4: Verify

```bash
python transcribe_audio.py test.mp3 --diarize
```

First run will download the diarization model (~300MB).

## Output Modes

### Mode 1: Raw Transcript Only

Run the script, deliver the transcript file. Done.

**Basic output:**
```
TRANSCRIPTION

Audio File: meeting.mp3
Date: 2025-01-12 10:30:00

---

Good morning, thanks for joining.

Happy to be here. Let's talk about the roadmap.
```

**Diarized output:**
```
TRANSCRIPTION

Audio File: meeting.mp3
Date: 2025-01-12 10:30:00
Speakers: 2

---

SPEAKER_00 [0:00]: Good morning, thanks for joining.

SPEAKER_01 [0:03]: Happy to be here. Let's talk about the roadmap.

SPEAKER_00 [0:08]: Sure. First item is the API integration.
```

### Mode 2: Comprehensive Summary

After transcription, read the transcript and produce a summary following the Comprehensive Summary Format below. Analysis is included by default at the top.

### Mode 3: Both

Deliver the transcript file location, then produce the summary with analysis.

## Comprehensive Summary Format

The summary must capture everything important. Missing a key point or nuanced detail is a failure.

**Analysis comes first.** It's the highest-value section; readers should see it immediately.

```markdown
# [Recording Title/Topic]

**Date:** YYYY-MM-DD
**Duration:** [X minutes]
**Participants:** [Names/roles if identifiable, or SPEAKER_00, SPEAKER_01, etc.]

## Analysis

### Critical Points
[What I consider the most important takeaways and why. What would be costly to miss or forget.]

### Emotional and Motivational Dynamics
[Tone shifts, tension, enthusiasm, hesitation, frustration, agreement patterns. What the emotional subtext reveals about positions and relationships.]

### Fact-Checking and Research

#### Verified
- [Claim]: [Verification source and result]

#### Looked Up
- "[Someone said they needed to look this up]": [What I found]

#### Unverified
- [Claim that couldn't be verified]: [Why, and what would be needed to verify]

### References Mentioned
[Any videos, articles, books, quotes, or sources mentioned in the recording, with links or citations where possible]

## Summary

### Overview
[2-3 sentence summary of what this recording is about and the main outcome]

### Key Points

#### [Topic/Theme 1]
- [Specific point with context]
- [Specific point with context]

#### [Topic/Theme 2]
- [Specific point with context]
- [Specific point with context]

[Continue for all major topics discussed]

### Decisions Made
- [Decision]: [Context and rationale if stated]

### Action Items
| Who | What | When |
|-----|------|------|
| [Name/Speaker] | [Action] | [Deadline if mentioned] |

### Open Questions
- [Question raised but not resolved]

### Notable Quotes
> "[Exact quote]" - [Speaker]

[Include quotes that capture important positions, commitments, or insights]
```

## Fact-Checking Guidelines

**Actively look up:**
- Statements where someone says "I need to look that up" or "I'm not sure about..."
- Statistics, dates, or numbers that could be verified
- Quotes attributed to specific people
- References to articles, videos, books, or studies
- Claims that seem central to decisions being made

**Use web search** to verify or find information. Include what you found in the Analysis section.

**Be honest about uncertainty.** If you can't verify something, say so. Don't make up confirmations.

## Model Selection

| Model  | Size   | RAM   | GPU Speed  | Accuracy |
|--------|--------|-------|------------|----------|
| tiny   | ~75MB  | ~1GB  | ~30x RT    | Good     |
| base   | ~140MB | ~1GB  | ~20x RT    | Better   | (Default)
| small  | ~460MB | ~2GB  | ~10x RT    | Great    |
| medium | ~1.5GB | ~5GB  | ~5x RT     | Excellent|
| large  | ~3GB   | ~10GB | ~2x RT     | Best     |

*RT = Real-Time (e.g., 10x RT means 10 min audio in 1 min)*

**Recommendation:** Use `medium` for important recordings where accuracy matters.

## Supported Audio Formats

MP3, MP4, MPEG, MPGA, M4A, WAV, WebM, OGG, FLAC

## Why Python (Not Node.js)

This tool uses Python instead of the standard Node.js stack because:

| | Node.js (@xenova/transformers) | Python (openai-whisper) |
|---|---|---|
| GPU Support | None (CPU only) | CUDA + MPS (Apple Silicon) |
| 60-min audio | ~60+ minutes | ~10 minutes |
| Speed | 1x real-time | 6-10x real-time |

The Node.js Whisper implementation cannot access GPU acceleration, making it 5-10x slower.

**This exception is documented in** `.cursor/rules/Always Apply.mdc` under "Approved Python Exceptions."

## Troubleshooting

### Setup

**Requirements:** Python 3.8+, 2-3GB disk space, 4GB+ RAM

```bash
pip install -r requirements.txt
```

Models download automatically on first use:
- Whisper models: `~/.cache/whisper/`
- Diarization models: `~/.cache/huggingface/`

### Common Issues

**"Using CPU" when you have a GPU:**
- Mac: Ensure macOS 12.3+ and PyTorch 2.0+
- NVIDIA: Install CUDA toolkit

**"Slow performance":** Use smaller model, ensure GPU is being used

**"Out of memory":** Use smaller model, close other apps

**"HuggingFace connector not configured":**
- Follow setup at `/cofounder/connectors/huggingface/SETUP.md`
- Or run without `--diarize` for basic transcription

**"401/403 from HuggingFace":**
- Token may be invalid; regenerate at https://huggingface.co/settings/tokens
- Model licenses not accepted; visit the model pages and click "Agree"

**"Speaker labels seem wrong":**
- Try specifying `--speakers N` if you know the count
- Diarization works best with distinct voices and clear audio
- Overlapping speech can confuse the model

## Cost

**$0.00 - Completely Free!**

No API costs, no subscriptions, unlimited usage, complete privacy.
