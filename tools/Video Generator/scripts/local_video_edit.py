#!/usr/bin/env python3
"""
Local Video Editing Script using MoviePy
Provides video editing capabilities without API calls
"""

import os
import sys
import argparse
from pathlib import Path


def trim_video(input_path: str, output_path: str, start: float, end: float) -> str:
    """Trim video to specified time range"""
    from moviepy import VideoFileClip
    
    print(f"✂️  Trimming video: {start}s to {end}s")
    
    clip = VideoFileClip(input_path)
    trimmed = clip.subclipped(start, end)
    trimmed.write_videofile(output_path, codec='libx264', audio_codec='aac')
    clip.close()
    trimmed.close()
    
    return output_path


def resize_video(input_path: str, output_path: str, width: int, height: int) -> str:
    """Resize video to specified dimensions"""
    from moviepy import VideoFileClip
    
    print(f"📐 Resizing video to {width}x{height}")
    
    clip = VideoFileClip(input_path)
    resized = clip.resized(newsize=(width, height))
    resized.write_videofile(output_path, codec='libx264', audio_codec='aac')
    clip.close()
    resized.close()
    
    return output_path


def change_speed(input_path: str, output_path: str, factor: float) -> str:
    """Change video playback speed"""
    from moviepy import VideoFileClip
    
    if factor > 1:
        print(f"⏩ Speeding up video by {factor}x")
    else:
        print(f"⏪ Slowing down video to {factor}x")
    
    clip = VideoFileClip(input_path)
    sped = clip.with_speed_scaled(factor)
    sped.write_videofile(output_path, codec='libx264', audio_codec='aac')
    clip.close()
    sped.close()
    
    return output_path


def add_text_overlay(input_path: str, output_path: str, text: str, position: str = "center") -> str:
    """Add text overlay to video"""
    from moviepy import VideoFileClip, TextClip, CompositeVideoClip
    
    print(f"📝 Adding text overlay: '{text}' at {position}")
    
    clip = VideoFileClip(input_path)
    
    # Create text clip
    txt_clip = TextClip(
        text=text,
        font_size=50,
        color='white',
        font='Arial',
        stroke_color='black',
        stroke_width=2
    )
    
    # Position the text
    if position == "top":
        txt_clip = txt_clip.with_position(("center", 50))
    elif position == "bottom":
        txt_clip = txt_clip.with_position(("center", clip.h - 100))
    else:  # center
        txt_clip = txt_clip.with_position("center")
    
    txt_clip = txt_clip.with_duration(clip.duration)
    
    # Composite
    final = CompositeVideoClip([clip, txt_clip])
    final.write_videofile(output_path, codec='libx264', audio_codec='aac')
    
    clip.close()
    txt_clip.close()
    final.close()
    
    return output_path


def remove_audio(input_path: str, output_path: str) -> str:
    """Remove audio from video"""
    from moviepy import VideoFileClip
    
    print("🔇 Removing audio")
    
    clip = VideoFileClip(input_path)
    silent = clip.without_audio()
    silent.write_videofile(output_path, codec='libx264')
    clip.close()
    silent.close()
    
    return output_path


def concatenate_videos(input_paths: list, output_path: str) -> str:
    """Concatenate multiple videos"""
    from moviepy import VideoFileClip, concatenate_videoclips
    
    print(f"🔗 Concatenating {len(input_paths)} videos")
    
    clips = [VideoFileClip(p) for p in input_paths]
    final = concatenate_videoclips(clips)
    final.write_videofile(output_path, codec='libx264', audio_codec='aac')
    
    for clip in clips:
        clip.close()
    final.close()
    
    return output_path


def extract_frames(input_path: str, output_dir: str, fps: float = 1) -> str:
    """Extract frames from video"""
    from moviepy import VideoFileClip
    
    print(f"🖼️  Extracting frames at {fps} fps")
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    clip = VideoFileClip(input_path)
    
    frame_count = 0
    for t in range(0, int(clip.duration), int(1/fps)):
        frame = clip.get_frame(t)
        from PIL import Image
        img = Image.fromarray(frame)
        img.save(output_dir / f"frame_{frame_count:04d}.png")
        frame_count += 1
    
    clip.close()
    print(f"✅ Extracted {frame_count} frames to {output_dir}")
    
    return str(output_dir)


def create_gif(input_path: str, output_path: str, fps: int = 10) -> str:
    """Convert video to GIF"""
    from moviepy import VideoFileClip
    
    print(f"🎞️  Creating GIF at {fps} fps")
    
    clip = VideoFileClip(input_path)
    clip.write_gif(output_path, fps=fps)
    clip.close()
    
    return output_path


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(
        description="Local video editing using MoviePy",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Trim video
  python3 local_video_edit.py input.mp4 output.mp4 --trim 5 15
  
  # Resize video
  python3 local_video_edit.py input.mp4 output.mp4 --resize 1280 720
  
  # Change speed (2x faster)
  python3 local_video_edit.py input.mp4 output.mp4 --speed 2.0
  
  # Add text overlay
  python3 local_video_edit.py input.mp4 output.mp4 --text "Hello World" --text-position center
  
  # Remove audio
  python3 local_video_edit.py input.mp4 output.mp4 --remove-audio
  
  # Concatenate videos
  python3 local_video_edit.py video1.mp4 video2.mp4 video3.mp4 --concat output.mp4
  
  # Extract frames
  python3 local_video_edit.py input.mp4 --extract-frames ./frames/ --fps 1
  
  # Create GIF
  python3 local_video_edit.py input.mp4 output.gif --gif --fps 10
  
  # Combine operations
  python3 local_video_edit.py input.mp4 output.mp4 --trim 0 10 --resize 640 360 --speed 1.5
        """
    )
    
    parser.add_argument(
        "input",
        nargs='+',
        help="Input video file(s)"
    )
    
    parser.add_argument(
        "output",
        nargs='?',
        default=None,
        help="Output file path"
    )
    
    parser.add_argument(
        "--trim",
        nargs=2,
        type=float,
        metavar=("START", "END"),
        help="Trim to time range (seconds)"
    )
    
    parser.add_argument(
        "--resize",
        nargs=2,
        type=int,
        metavar=("WIDTH", "HEIGHT"),
        help="Resize to dimensions"
    )
    
    parser.add_argument(
        "--speed",
        type=float,
        help="Speed multiplier (0.5 = slow, 2.0 = fast)"
    )
    
    parser.add_argument(
        "--text",
        help="Add text overlay"
    )
    
    parser.add_argument(
        "--text-position",
        choices=["top", "center", "bottom"],
        default="center",
        help="Text position"
    )
    
    parser.add_argument(
        "--remove-audio",
        action="store_true",
        help="Remove audio track"
    )
    
    parser.add_argument(
        "--concat",
        metavar="OUTPUT",
        help="Concatenate multiple inputs to output"
    )
    
    parser.add_argument(
        "--extract-frames",
        metavar="DIR",
        help="Extract frames to directory"
    )
    
    parser.add_argument(
        "--gif",
        action="store_true",
        help="Output as GIF"
    )
    
    parser.add_argument(
        "--fps",
        type=int,
        default=10,
        help="Frames per second (for extraction/GIF)"
    )
    
    args = parser.parse_args()
    
    try:
        # Handle concatenation
        if args.concat:
            result = concatenate_videos(args.input, args.concat)
            print(f"\n🎉 Success! Video saved to: {result}")
            return
        
        # Handle frame extraction
        if args.extract_frames:
            result = extract_frames(args.input[0], args.extract_frames, args.fps)
            print(f"\n🎉 Success! Frames extracted to: {result}")
            return
        
        # For other operations, we need input and output
        input_path = args.input[0]
        
        if not args.output and not args.gif:
            print("❌ Error: Output path required")
            sys.exit(1)
        
        output_path = args.output
        
        # Handle GIF conversion
        if args.gif:
            if not output_path:
                output_path = Path(input_path).stem + ".gif"
            result = create_gif(input_path, output_path, args.fps)
            print(f"\n🎉 Success! GIF saved to: {result}")
            return
        
        # Apply operations in order
        # Use temporary files for chained operations
        current_input = input_path
        temp_files = []
        
        operations = []
        if args.trim:
            operations.append(("trim", args.trim))
        if args.resize:
            operations.append(("resize", args.resize))
        if args.speed:
            operations.append(("speed", args.speed))
        if args.text:
            operations.append(("text", (args.text, args.text_position)))
        if args.remove_audio:
            operations.append(("remove_audio", None))
        
        if not operations:
            print("❌ Error: No operation specified")
            parser.print_help()
            sys.exit(1)
        
        for i, (op, params) in enumerate(operations):
            # Use output path for last operation, temp file otherwise
            if i == len(operations) - 1:
                current_output = output_path
            else:
                import tempfile
                temp_file = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
                current_output = temp_file.name
                temp_files.append(current_output)
            
            if op == "trim":
                trim_video(current_input, current_output, params[0], params[1])
            elif op == "resize":
                resize_video(current_input, current_output, params[0], params[1])
            elif op == "speed":
                change_speed(current_input, current_output, params)
            elif op == "text":
                add_text_overlay(current_input, current_output, params[0], params[1])
            elif op == "remove_audio":
                remove_audio(current_input, current_output)
            
            current_input = current_output
        
        # Clean up temp files
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
        
        file_size = Path(output_path).stat().st_size / 1024
        print(f"\n🎉 Success! Video saved to: {output_path}")
        print(f"📊 File size: {file_size:.2f} KB")
        
    except ImportError as e:
        print(f"❌ Error: MoviePy not installed")
        print(f"   Run: pip3 install moviepy imageio-ffmpeg")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

