#!/usr/bin/env python3
"""
Voice Recording Transcription Tool (LOCAL EXECUTION)

This script transcribes audio files locally using Whisper - NO API KEYS REQUIRED!
After transcription, use Cursor/Claude to analyze and create comprehensive meeting notes.

Usage:
    python transcribe_audio.py <path_to_audio_file> [--model MODEL_SIZE]

Model Sizes (trade-off between speed and accuracy):
    - tiny     : Fastest, least accurate (~1GB RAM)
    - base     : Fast, good for most use cases (~1GB RAM) [DEFAULT]
    - small    : Balanced (~2GB RAM)
    - medium   : High accuracy (~5GB RAM)
    - large    : Best accuracy (~10GB RAM)

Requirements:
    - Python dependencies from requirements.txt
    - No API keys needed - runs 100% locally!
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime
import whisper

# Supported audio formats (Whisper can handle these)
SUPPORTED_FORMATS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac']

# Available Whisper models
WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large']


def transcribe_audio(audio_file_path, model_size='base'):
    """
    Transcribe audio file using local Whisper model.
    
    Args:
        audio_file_path: Path to the audio file
        model_size: Whisper model size (tiny, base, small, medium, large)
        
    Returns:
        str: Transcribed text
    """
    print(f"\nLoading Whisper model '{model_size}'...")
    print("(First run will download the model - this may take a few minutes)")
    
    try:
        # Load Whisper model
        model = whisper.load_model(model_size)
        
        print(f"Starting transcription of: {audio_file_path}")
        print("This may take a few minutes depending on file length...\n")
        
        # Transcribe with word-level timestamps for better accuracy
        result = model.transcribe(
            audio_file_path,
            verbose=False,
            language='en'  # Can be removed to auto-detect
        )
        
        transcription = result['text'].strip()
        
        print("✓ Transcription completed successfully")
        return transcription
    
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        raise


def save_outputs(audio_file_path, transcription):
    """
    Save transcription as text file in the same directory as the audio file.
    
    Args:
        audio_file_path: Original audio file path
        transcription: Full transcription text
    
    Returns:
        Path: transcription_file path
    """
    # Get the base name without extension
    audio_path = Path(audio_file_path)
    base_name = audio_path.stem
    output_dir = audio_path.parent
    
    # Save full transcription as plain text in the same directory
    transcription_file = output_dir / f"{base_name}_transcription.txt"
    with open(transcription_file, 'w', encoding='utf-8') as f:
        f.write(f"TRANSCRIPTION\n\n")
        f.write(f"Audio File: {audio_path.name}\n")
        f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"---\n\n")
        f.write(transcription)
    
    print(f"✓ Transcription saved to: {transcription_file}")
    
    return transcription_file


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Transcribe and summarize audio files locally (no API keys required)'
    )
    parser.add_argument(
        'audio_file',
        help='Path to the audio file to transcribe'
    )
    parser.add_argument(
        '--model',
        choices=WHISPER_MODELS,
        default='base',
        help='Whisper model size (default: base). Larger = more accurate but slower'
    )
    
    args = parser.parse_args()
    audio_file_path = args.audio_file
    model_size = args.model
    
    # Validate file exists
    if not os.path.exists(audio_file_path):
        print(f"Error: File not found: {audio_file_path}")
        sys.exit(1)
    
    # Validate file format
    file_extension = Path(audio_file_path).suffix.lower()
    if file_extension not in SUPPORTED_FORMATS:
        print(f"Error: Unsupported file format: {file_extension}")
        print(f"Supported formats: {', '.join(SUPPORTED_FORMATS)}")
        sys.exit(1)
    
    print(f"\n{'=' * 80}")
    print("VOICE TRANSCRIPTION TOOL (LOCAL EXECUTION)")
    print("100% Local - No API Keys - No Cloud Services - Completely Free")
    print(f"{'=' * 80}\n")
    
    try:
        # Step 1: Transcribe audio locally
        transcription = transcribe_audio(audio_file_path, model_size)
        
        # Step 2: Save transcription
        transcription_file = save_outputs(audio_file_path, transcription)
        
        print(f"\n{'=' * 80}")
        print("✓ TRANSCRIPTION COMPLETED SUCCESSFULLY")
        print(f"{'=' * 80}")
        print(f"\nOutput file:")
        print(f"  Transcription: {transcription_file}\n")
        print("Next step:")
        print("  Use Cursor/Claude to create a comprehensive summary from the transcription\n")
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
