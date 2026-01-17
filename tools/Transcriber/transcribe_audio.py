#!/usr/bin/env python3
"""
Voice Recording Transcription Tool (LOCAL EXECUTION)

Transcribe audio files locally using Whisper with optional speaker diarization.
100% local execution after initial model download. No ongoing API costs.

Usage:
    python transcribe_audio.py <path_to_audio_file> [options]

Options:
    --model MODEL      Whisper model size: tiny, base, small, medium, large (default: base)
    --diarize          Enable speaker diarization (requires HuggingFace connector setup)
    --speakers N       Expected number of speakers (optional, improves diarization accuracy)

Examples:
    python transcribe_audio.py recording.m4a                    # Basic transcription
    python transcribe_audio.py meeting.mp3 --diarize            # With speaker labels
    python transcribe_audio.py call.wav --diarize --speakers 2  # Two-person call

Requirements:
    - Python dependencies from requirements.txt
    - For --diarize: HuggingFace connector configured with pyannote model access
"""

import os
import sys
import argparse
import time
from pathlib import Path
from datetime import datetime
import torch
import whisper

# Supported audio formats
SUPPORTED_FORMATS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac']

# Whisper models
WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large']


def get_device():
    """
    Detect the best available device for inference.
    Priority: CUDA (NVIDIA) > CPU
    
    Note: MPS (Apple Silicon) is disabled because Whisper uses sparse tensors
    which are not fully supported on MPS, causing runtime errors.
    """
    if torch.cuda.is_available():
        device = "cuda"
        device_name = torch.cuda.get_device_name(0)
        print(f"Using GPU: {device_name} (CUDA)")
    else:
        device = "cpu"
        if torch.backends.mps.is_available():
            print("Using CPU (MPS available but disabled due to Whisper compatibility)")
        else:
            print("Using CPU")
    return device


def get_hf_token():
    """
    Load HuggingFace token from the connector configuration.
    Returns None if not configured.
    """
    # Try to find the memory directory (relative to cofounder root)
    script_dir = Path(__file__).resolve().parent
    cofounder_root = script_dir.parent.parent  # tools/Transcriber -> tools -> cofounder
    
    # Memory is a sibling directory to cofounder
    memory_path = cofounder_root.parent / "memory" / "connectors" / "huggingface" / ".env"
    
    if not memory_path.exists():
        return None
    
    # Parse .env file
    try:
        with open(memory_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('HUGGINGFACE_API_TOKEN='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    
    return None


def get_audio_duration(audio_file_path):
    """Get audio duration in minutes using whisper's audio loading."""
    try:
        audio = whisper.load_audio(audio_file_path)
        duration_seconds = len(audio) / whisper.audio.SAMPLE_RATE
        return duration_seconds / 60
    except Exception:
        return None


def run_diarization(audio_file_path, hf_token, num_speakers=None):
    """
    Run speaker diarization using pyannote.audio.
    
    Args:
        audio_file_path: Path to the audio file
        hf_token: HuggingFace API token
        num_speakers: Expected number of speakers (optional)
        
    Returns:
        list of dicts: [{"start": float, "end": float, "speaker": str}, ...]
    """
    try:
        from pyannote.audio import Pipeline
    except ImportError:
        print("\nError: pyannote.audio not installed.")
        print("Run: pip install pyannote.audio>=3.1.0")
        sys.exit(1)
    
    print("\nLoading speaker diarization model...")
    print("(First run will download the model - this may take a few minutes)")
    
    try:
        # Load the diarization pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        
        # Move to GPU if available
        device = get_device()
        if device == "cuda":
            pipeline.to(torch.device("cuda"))
        
        print("Running speaker diarization...")
        start_time = time.time()
        
        # Run diarization
        if num_speakers:
            diarization = pipeline(audio_file_path, num_speakers=num_speakers)
        else:
            diarization = pipeline(audio_file_path)
        
        diarize_time = time.time() - start_time
        print(f"Diarization completed in {diarize_time:.1f}s")
        
        # Convert to list of segments
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })
        
        # Count unique speakers
        speakers = set(seg["speaker"] for seg in segments)
        print(f"Identified {len(speakers)} speaker(s)")
        
        return segments
        
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "403" in error_msg:
            print("\nError: HuggingFace authentication failed.")
            print("Make sure you have:")
            print("  1. Configured the HuggingFace connector")
            print("  2. Accepted the pyannote model licenses at:")
            print("     - https://huggingface.co/pyannote/speaker-diarization-3.1")
            print("     - https://huggingface.co/pyannote/segmentation-3.0")
        else:
            print(f"\nError during diarization: {error_msg}")
        sys.exit(1)


def get_speaker_at_time(diarization_segments, start, end):
    """
    Find which speaker was talking during a given time range.
    Uses overlap duration to handle boundary cases.
    
    Args:
        diarization_segments: List of diarization segments
        start: Start time in seconds
        end: End time in seconds
        
    Returns:
        str: Speaker label (e.g., "SPEAKER_00")
    """
    if not diarization_segments:
        return "SPEAKER_00"
    
    # Calculate overlap with each speaker segment
    speaker_overlaps = {}
    
    for seg in diarization_segments:
        # Calculate overlap
        overlap_start = max(start, seg["start"])
        overlap_end = min(end, seg["end"])
        overlap_duration = max(0, overlap_end - overlap_start)
        
        if overlap_duration > 0:
            speaker = seg["speaker"]
            speaker_overlaps[speaker] = speaker_overlaps.get(speaker, 0) + overlap_duration
    
    if not speaker_overlaps:
        # No overlap found; find nearest speaker
        mid_time = (start + end) / 2
        closest_speaker = None
        closest_distance = float('inf')
        
        for seg in diarization_segments:
            seg_mid = (seg["start"] + seg["end"]) / 2
            distance = abs(mid_time - seg_mid)
            if distance < closest_distance:
                closest_distance = distance
                closest_speaker = seg["speaker"]
        
        return closest_speaker or "SPEAKER_00"
    
    # Return speaker with most overlap
    return max(speaker_overlaps, key=speaker_overlaps.get)


def transcribe_audio(audio_file_path, model_size='base'):
    """
    Transcribe audio file using local Whisper model with GPU acceleration.
    
    Args:
        audio_file_path: Path to the audio file
        model_size: Whisper model size (tiny, base, small, medium, large)
        
    Returns:
        dict: Whisper result with segments
    """
    device = get_device()
    use_fp16 = device == "cuda"
    
    if use_fp16:
        print("Using FP16 (half-precision) for faster inference")
    else:
        print("Using FP32 (full precision)")
    
    print(f"\nLoading Whisper model '{model_size}'...")
    print("(First run will download the model - this may take a few minutes)")
    
    start_time = time.time()
    
    try:
        model = whisper.load_model(model_size, device=device)
        
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.1f}s")
        
        duration_min = get_audio_duration(audio_file_path)
        if duration_min:
            print(f"\nAudio duration: {duration_min:.1f} minutes")
            if device != "cpu":
                est_time = duration_min * 0.15
            else:
                est_time = duration_min * 1.0
            print(f"Estimated processing time: {est_time:.1f} minutes")
        
        print(f"\nStarting transcription of: {audio_file_path}")
        print("Processing...\n")
        
        transcribe_start = time.time()
        
        result = model.transcribe(
            audio_file_path,
            verbose=False,
            language='en',
            fp16=use_fp16,
            condition_on_previous_text=True,
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6,
        )
        
        transcribe_time = time.time() - transcribe_start
        total_time = time.time() - start_time
        
        print(f"Transcription completed in {transcribe_time:.1f}s")
        if duration_min:
            speed_ratio = duration_min * 60 / transcribe_time
            print(f"Processing speed: {speed_ratio:.1f}x real-time")
        print(f"Total time (including model load): {total_time:.1f}s")
        
        return result
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        raise


def merge_transcription_with_diarization(whisper_result, diarization_segments):
    """
    Merge Whisper transcription with speaker diarization.
    
    Args:
        whisper_result: Whisper transcription result
        diarization_segments: List of speaker segments from pyannote
        
    Returns:
        list of dicts: [{"speaker": str, "start": float, "end": float, "text": str}, ...]
    """
    merged = []
    
    for segment in whisper_result.get("segments", []):
        speaker = get_speaker_at_time(
            diarization_segments,
            segment["start"],
            segment["end"]
        )
        
        merged.append({
            "speaker": speaker,
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"].strip()
        })
    
    return merged


def format_timestamp(seconds):
    """Format seconds as MM:SS or HH:MM:SS."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"


def format_transcription_plain(text):
    """
    Format plain transcription with line breaks for readability.
    """
    import re
    formatted = re.sub(r'([.!?])\s+(?=[A-Z"\'])', r'\1\n\n', text)
    return formatted


def format_transcription_diarized(merged_segments):
    """
    Format diarized transcription with speaker labels.
    Groups consecutive segments from the same speaker.
    """
    if not merged_segments:
        return ""
    
    # Group consecutive segments by speaker
    grouped = []
    current_group = None
    
    for seg in merged_segments:
        if current_group is None:
            current_group = {
                "speaker": seg["speaker"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"]
            }
        elif seg["speaker"] == current_group["speaker"]:
            # Same speaker, extend the group
            current_group["end"] = seg["end"]
            current_group["text"] += " " + seg["text"]
        else:
            # Different speaker, save current and start new
            grouped.append(current_group)
            current_group = {
                "speaker": seg["speaker"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"]
            }
    
    # Don't forget the last group
    if current_group:
        grouped.append(current_group)
    
    # Format output
    lines = []
    for group in grouped:
        timestamp = format_timestamp(group["start"])
        speaker = group["speaker"]
        text = group["text"]
        lines.append(f"{speaker} [{timestamp}]: {text}")
    
    return "\n\n".join(lines)


def save_outputs(audio_file_path, transcription, diarized_segments=None):
    """
    Save transcription as text file in the same directory as the audio file.
    
    Args:
        audio_file_path: Original audio file path
        transcription: Whisper result or plain text
        diarized_segments: Optional merged diarization segments
    
    Returns:
        Path: transcription_file path
    """
    audio_path = Path(audio_file_path)
    base_name = audio_path.stem
    output_dir = audio_path.parent
    
    # Format content based on whether we have diarization
    if diarized_segments:
        formatted_content = format_transcription_diarized(diarized_segments)
        suffix = "_diarized"
    else:
        # Plain transcription
        if isinstance(transcription, dict):
            text = transcription.get('text', '').strip()
        else:
            text = str(transcription).strip()
        formatted_content = format_transcription_plain(text)
        suffix = "_transcription"
    
    # Save as plain text
    transcription_file = output_dir / f"{base_name}{suffix}.txt"
    with open(transcription_file, 'w', encoding='utf-8') as f:
        f.write(f"TRANSCRIPTION\n\n")
        f.write(f"Audio File: {audio_path.name}\n")
        f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        if diarized_segments:
            speakers = set(seg["speaker"] for seg in diarized_segments)
            f.write(f"Speakers: {len(speakers)}\n")
        f.write(f"\n---\n\n")
        f.write(formatted_content)
    
    print(f"\nTranscription saved to: {transcription_file}")
    
    return transcription_file


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Transcribe audio files locally with optional speaker diarization'
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
    parser.add_argument(
        '--diarize',
        action='store_true',
        help='Enable speaker diarization (requires HuggingFace connector setup)'
    )
    parser.add_argument(
        '--speakers',
        type=int,
        default=None,
        help='Expected number of speakers (optional, improves diarization accuracy)'
    )
    
    args = parser.parse_args()
    audio_file_path = args.audio_file
    model_size = args.model
    enable_diarization = args.diarize
    num_speakers = args.speakers
    
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
    print("100% Local - No API Keys Required - Completely Free")
    if enable_diarization:
        print("Speaker Diarization: ENABLED")
    print(f"{'=' * 80}\n")
    
    diarization_segments = None
    
    # Step 1: Run diarization if requested
    if enable_diarization:
        hf_token = get_hf_token()
        if not hf_token:
            print("Error: HuggingFace connector not configured.")
            print("\nTo enable speaker diarization:")
            print("  1. Set up the HuggingFace connector (see Transcriber AGENTS.md)")
            print("  2. Accept the pyannote model licenses")
            print("\nOr run without --diarize for basic transcription.")
            sys.exit(1)
        
        diarization_segments = run_diarization(audio_file_path, hf_token, num_speakers)
    
    try:
        # Step 2: Transcribe audio
        whisper_result = transcribe_audio(audio_file_path, model_size)
        
        # Step 3: Merge if diarization was used
        if diarization_segments:
            merged = merge_transcription_with_diarization(whisper_result, diarization_segments)
            transcription_file = save_outputs(audio_file_path, whisper_result, merged)
        else:
            transcription_file = save_outputs(audio_file_path, whisper_result)
        
        print(f"\n{'=' * 80}")
        print("TRANSCRIPTION COMPLETED SUCCESSFULLY")
        print(f"{'=' * 80}")
        print(f"\nOutput file:")
        print(f"  {transcription_file}\n")
        print("Next step:")
        print("  Use Cursor/Claude to create a comprehensive summary from the transcription\n")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
