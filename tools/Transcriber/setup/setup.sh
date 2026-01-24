#!/bin/bash
# Setup script for Voice Transcription Tool
# Run this once to set up everything automatically

set -e  # Exit on error

echo "=============================================="
echo "Voice Transcription Tool - Setup"
echo "100% Local - No API Keys Required"
echo "=============================================="
echo ""

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed."
    echo "Please install Python 3.8 or higher and try again."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✓ Found Python $PYTHON_VERSION"
echo ""

# Install Python requirements
echo "Installing Python dependencies..."
echo "This will install:"
echo "  - openai-whisper (speech recognition)"
echo "  - torch (deep learning framework)"
echo "  - torchaudio (audio processing)"
echo ""
pip3 install -r requirements.txt
echo "✓ Python dependencies installed"
echo ""

# Check if Whisper model needs download
echo "Checking Whisper models..."
echo "The first time you run transcription, Whisper will download"
echo "the base model (~140MB). This happens automatically."
echo "✓ Whisper setup complete"
echo ""

# Make the script executable
chmod +x transcribe_audio.py 2>/dev/null || true

echo "=============================================="
echo "✓ Setup Complete!"
echo "=============================================="
echo ""
echo "You can now transcribe audio files with:"
echo "  python3 transcribe_audio.py <path_to_audio>"
echo ""
echo "Example:"
echo "  python3 transcribe_audio.py ~/Downloads/meeting.m4a"
echo ""
echo "For more options:"
echo "  python3 transcribe_audio.py --help"
echo ""
echo "After transcription, use Cursor/Claude to create"
echo "comprehensive summaries from the transcription file."
echo ""
echo "See README.md for complete usage guide."
echo ""
