#!/usr/bin/env python3
"""
Video Generation Script using Google Veo API
Uses Google's Veo model for high-quality video generation
"""

import os
import sys
import argparse
import time
import warnings
from datetime import datetime
from pathlib import Path

# Suppress common warnings
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL 1.1.1+")

# Load environment variables from /memory/ directory
try:
    from dotenv import load_dotenv
    # Navigate from script location to memory directory
    script_dir = Path(__file__).parent
    memory_env = script_dir / "../../../memory/Video Generator/.env"
    if memory_env.exists():
        load_dotenv(memory_env)
    else:
        print(f"⚠️  Warning: .env not found at {memory_env.resolve()}")
        print("   Please create /memory/Video Generator/.env with your API keys")
except ImportError:
    pass  # dotenv not installed, will rely on system env vars

# Configuration - Load from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_VIDEO_MODEL = os.getenv("GEMINI_VIDEO_MODEL")

# Supported aspect ratios
SUPPORTED_ASPECT_RATIOS = ["16:9", "9:16", "1:1"]


def generate_video_google(
    prompt: str,
    output_path: str = None,
    output_dir: str = None,
    aspect_ratio: str = "16:9",
    image_path: str = None,
    video_path: str = None,
    num_extensions: int = 0,
    loop: bool = False
) -> str:
    """
    Generate video using Google Veo API
    
    Args:
        prompt (str): The text description of the video to generate
        output_path (str): Full path to save the generated video (optional)
        output_dir (str): Directory to save the video (default: ./generated_videos)
        aspect_ratio (str): Aspect ratio (16:9, 9:16, 1:1)
        image_path (str): Path to input image for image-to-video (optional)
        video_path (str): Path to input video for video extension (optional)
        num_extensions (int): Number of 7-second extensions to add (0-20, default: 0)
        loop (bool): Create seamless loop by using image as first and last frame (default: False)
    
    Returns:
        str: Path to the saved video, or None if failed
    """
    
    if not GEMINI_API_KEY:
        print("❌ Error: GEMINI_API_KEY not found!")
        print("Please add GEMINI_API_KEY to your .env file or set it as an environment variable")
        print("Get your key at: https://aistudio.google.com/apikey")
        return None
    
    if not GEMINI_VIDEO_MODEL:
        print("❌ Error: GEMINI_VIDEO_MODEL not found!")
        print("Please add GEMINI_VIDEO_MODEL to your .env file or set it as an environment variable")
        return None
    
    # Validate aspect ratio
    if aspect_ratio not in SUPPORTED_ASPECT_RATIOS:
        print(f"⚠️  Warning: Unsupported aspect ratio '{aspect_ratio}'. Using '16:9' instead.")
        print(f"   Supported ratios: {', '.join(SUPPORTED_ASPECT_RATIOS)}")
        aspect_ratio = "16:9"
    
    # Validate extension count
    if num_extensions < 0 or num_extensions > 20:
        print(f"⚠️  Warning: num_extensions must be between 0 and 20. Using 0.")
        num_extensions = 0
    
    # Validate extension compatibility
    if num_extensions > 0:
        if aspect_ratio not in ["16:9", "9:16"]:
            print(f"⚠️  Warning: Video extensions require 16:9 or 9:16 aspect ratio. Setting to 16:9.")
            aspect_ratio = "16:9"
        if image_path and video_path:
            print("❌ Error: Cannot specify both image_path and video_path")
            return None
    
    # Validate loop compatibility
    if loop:
        if not image_path:
            print("❌ Error: Looping requires an input image (--image)")
            return None
        if video_path:
            print("❌ Error: Looping is not compatible with video extension input")
            return None
    
    try:
        print(f"🎬 Generating video with Google Veo ({GEMINI_VIDEO_MODEL})...")
        print(f"📝 Prompt: '{prompt}'")
        print(f"📐 Aspect ratio: {aspect_ratio}")
        
        if image_path:
            print(f"🖼️  Input image: {image_path}")
        
        if video_path:
            print(f"🎥 Input video for extension: {video_path}")
        
        if loop:
            print(f"🔁 Looping enabled: Using image as first and last frame for seamless loop")
        
        if num_extensions > 0:
            total_duration = 8 + (num_extensions * 7)
            print(f"🔄 Will generate {num_extensions} extensions (total ~{total_duration}s)")
        
        # Import Google Generative AI library
        from google import genai
        from google.genai import types
        
        # Initialize the Gemini client
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        print("📤 Sending request to Veo API...")
        print("⏳ Video generation may take 1-3 minutes...")
        
        # Prepare image if provided
        input_image = None
        if image_path:
            image_file = Path(image_path)
            if not image_file.exists():
                print(f"❌ Error: Image not found: {image_path}")
                return None
            
            # Determine MIME type
            suffix = image_file.suffix.lower()
            mime_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            mime_type = mime_types.get(suffix, 'image/jpeg')
            
            # Read image data
            with open(image_file, 'rb') as f:
                image_data = f.read()
            
            # Create Image object for Veo
            input_image = types.Image(image_bytes=image_data, mime_type=mime_type)
        
        # Prepare video if provided (for extension)
        input_video = None
        if video_path:
            video_file = Path(video_path)
            if not video_file.exists():
                print(f"❌ Error: Video not found: {video_path}")
                return None
            
            # Determine MIME type
            suffix = video_file.suffix.lower()
            mime_types = {
                '.mp4': 'video/mp4',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                '.webm': 'video/webm'
            }
            mime_type = mime_types.get(suffix, 'video/mp4')
            
            # Read video data
            with open(video_file, 'rb') as f:
                video_data = f.read()
            
            # Create Video object for Veo
            input_video = types.Video(video_bytes=video_data, mime_type=mime_type)
        
        # Configure video generation
        config_params = {
            "aspect_ratio": aspect_ratio,
        }
        
        # Add last_frame for looping if requested
        if loop and input_image:
            config_params["last_frame"] = input_image
            print("   🔁 Configured for seamless looping")
        
        config = types.GenerateVideosConfig(**config_params)
        
        # Generate the video using generate_videos API
        if input_video:
            # Video extension mode
            operation = client.models.generate_videos(
                model=GEMINI_VIDEO_MODEL,
                prompt=prompt,
                video=input_video,
                config=config,
            )
        elif input_image:
            # Image-to-video mode
            operation = client.models.generate_videos(
                model=GEMINI_VIDEO_MODEL,
                prompt=prompt,
                image=input_image,
                config=config,
            )
        else:
            # Text-to-video mode
            operation = client.models.generate_videos(
                model=GEMINI_VIDEO_MODEL,
                prompt=prompt,
                config=config,
            )
        
        # Poll for completion
        print("⏳ Waiting for video generation to complete...")
        poll_count = 0
        max_polls = 40  # ~10 minutes max wait
        while not operation.done:
            poll_count += 1
            if poll_count > max_polls:
                print("❌ Error: Video generation timed out")
                return None
            print(f"   Still processing... ({poll_count * 15}s elapsed)")
            time.sleep(15)
            operation = client.operations.get(operation)
        
        # Check for result
        if not operation.response or not operation.result:
            print("❌ Error: No video in response")
            if hasattr(operation, 'error') and operation.error:
                print(f"   Error: {operation.error}")
            return None
        
        # Get the generated video
        generated_videos = operation.result.generated_videos
        if not generated_videos or len(generated_videos) == 0:
            print("❌ Error: No generated videos in result")
            return None
        
        video = generated_videos[0].video
        
        # Download the video using the client's file API
        print("📥 Downloading generated video...")
        
        # Try to get video data via the API
        video_data = None
        
        # Method 1: Check if video has direct bytes
        if hasattr(video, 'video_bytes') and video.video_bytes:
            video_data = video.video_bytes
        # Method 2: Download using file API with the file name
        elif hasattr(video, 'uri') and video.uri:
            try:
                # Extract file name from URI
                file_name = video.uri.split('/')[-1] if '/' in video.uri else video.uri
                # Use files.download to get authenticated content
                file_response = client.files.download(name=file_name)
                if hasattr(file_response, 'read'):
                    video_data = file_response.read()
                elif isinstance(file_response, bytes):
                    video_data = file_response
            except Exception as download_err:
                print(f"   File API download failed: {download_err}")
                # Method 3: Try authenticated request with API key
                import requests
                video_url = video.uri
                if '?' in video_url:
                    video_url += f"&key={GEMINI_API_KEY}"
                else:
                    video_url += f"?key={GEMINI_API_KEY}"
                video_response = requests.get(video_url, timeout=120)
                if video_response.status_code == 200:
                    video_data = video_response.content
                else:
                    print(f"❌ Error downloading video: HTTP {video_response.status_code}")
                    return None
        
        if not video_data:
            print("❌ Error: Could not download video data")
            return None
            
        print(f"🎬 Video downloaded ({len(video_data) / 1024:.1f} KB)")
        
        # Handle video extensions if requested
        current_video = video
        all_video_data = [video_data]
        
        if num_extensions > 0:
            print(f"\n🔄 Starting {num_extensions} extensions...")
            
            for ext_num in range(1, num_extensions + 1):
                print(f"\n📤 Extension {ext_num}/{num_extensions}...")
                print(f"   Using continuation prompt: '{prompt}'")
                
                # Use the current video as input for the next extension
                extension_operation = client.models.generate_videos(
                    model=GEMINI_VIDEO_MODEL,
                    prompt=prompt,
                    video=current_video,
                    config=config,
                )
                
                # Poll for completion
                print(f"   ⏳ Waiting for extension {ext_num} to complete...")
                poll_count = 0
                while not extension_operation.done:
                    poll_count += 1
                    if poll_count > max_polls:
                        print(f"   ❌ Error: Extension {ext_num} timed out")
                        break
                    print(f"      Still processing... ({poll_count * 15}s elapsed)")
                    time.sleep(15)
                    extension_operation = client.operations.get(extension_operation)
                
                # Check for result
                if not extension_operation.response or not extension_operation.result:
                    print(f"   ⚠️  Extension {ext_num} failed, stopping extensions")
                    break
                
                # Get the extended video
                ext_generated_videos = extension_operation.result.generated_videos
                if not ext_generated_videos or len(ext_generated_videos) == 0:
                    print(f"   ⚠️  Extension {ext_num} produced no video, stopping extensions")
                    break
                
                ext_video = ext_generated_videos[0].video
                
                # Download extension video data
                ext_video_data = None
                if hasattr(ext_video, 'video_bytes') and ext_video.video_bytes:
                    ext_video_data = ext_video.video_bytes
                elif hasattr(ext_video, 'uri') and ext_video.uri:
                    try:
                        file_name = ext_video.uri.split('/')[-1] if '/' in ext_video.uri else ext_video.uri
                        file_response = client.files.download(name=file_name)
                        if hasattr(file_response, 'read'):
                            ext_video_data = file_response.read()
                        elif isinstance(file_response, bytes):
                            ext_video_data = file_response
                    except Exception as download_err:
                        import requests
                        video_url = ext_video.uri
                        if '?' in video_url:
                            video_url += f"&key={GEMINI_API_KEY}"
                        else:
                            video_url += f"?key={GEMINI_API_KEY}"
                        video_response = requests.get(video_url, timeout=120)
                        if video_response.status_code == 200:
                            ext_video_data = video_response.content
                
                if not ext_video_data:
                    print(f"   ⚠️  Could not download extension {ext_num}, stopping extensions")
                    break
                
                print(f"   ✅ Extension {ext_num} completed ({len(ext_video_data) / 1024:.1f} KB)")
                all_video_data.append(ext_video_data)
                current_video = ext_video
            
            # Concatenate all video segments using moviepy
            if len(all_video_data) > 1:
                print(f"\n🔗 Concatenating {len(all_video_data)} video segments...")
                try:
                    from moviepy.editor import VideoFileClip, concatenate_videoclips
                    import tempfile
                    
                    # Save each segment to a temp file and load as VideoFileClip
                    temp_clips = []
                    temp_files = []
                    
                    for i, segment_data in enumerate(all_video_data):
                        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                        temp_file.write(segment_data)
                        temp_file.close()
                        temp_files.append(temp_file.name)
                        
                        clip = VideoFileClip(temp_file.name)
                        temp_clips.append(clip)
                    
                    # Concatenate all clips
                    final_clip = concatenate_videoclips(temp_clips, method="compose")
                    
                    # Save to a temp file
                    concat_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                    concat_temp.close()
                    final_clip.write_videofile(concat_temp.name, codec='libx264', audio_codec='aac', verbose=False, logger=None)
                    
                    # Read the concatenated video
                    with open(concat_temp.name, 'rb') as f:
                        video_data = f.read()
                    
                    # Clean up
                    for clip in temp_clips:
                        clip.close()
                    for temp_file in temp_files:
                        os.unlink(temp_file)
                    os.unlink(concat_temp.name)
                    
                    print(f"   ✅ Concatenation complete ({len(video_data) / 1024:.1f} KB)")
                    
                except Exception as concat_err:
                    print(f"   ⚠️  Concatenation failed: {concat_err}")
                    print(f"   Using only the initial video segment")
                    video_data = all_video_data[0]
        
        # Determine output path
        if output_path:
            final_path = Path(output_path)
        else:
            # Generate output path
            if output_dir:
                out_dir = Path(output_dir)
            else:
                out_dir = Path("generated_videos")
            
            out_dir.mkdir(parents=True, exist_ok=True)
            
            # Create filename with timestamp and sanitized prompt
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_prompt = safe_prompt.replace(' ', '-')
            final_path = out_dir / f"veo_{timestamp}_{safe_prompt}.mp4"
        
        # Ensure parent directory exists
        final_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save the video
        with open(final_path, 'wb') as f:
            f.write(video_data)
        
        # Get file size for confirmation
        file_size = final_path.stat().st_size / 1024  # Size in KB
        print(f"✅ Video saved to: {final_path}")
        print(f"📊 File size: {file_size:.2f} KB")
        
        return str(final_path)
        
    except ImportError as e:
        print(f"❌ Error: Missing required library")
        print(f"   Run: pip3 install google-genai")
        return None
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        
        if "AuthenticationError" in error_type or "401" in error_msg or "API key" in error_msg.lower():
            print("❌ Error: Invalid API key. Please check your GEMINI_API_KEY.")
        elif "404" in error_msg or "not found" in error_msg.lower():
            print("❌ Error: Veo model not available. Check Google AI Studio for model access.")
            print(f"   Model requested: {GEMINI_VIDEO_MODEL}")
        elif "rate_limit" in error_msg.lower() or "429" in error_msg:
            print("❌ Error: Rate limit exceeded. Please wait a moment and try again.")
        elif "ConnectionError" in error_type or "network" in error_msg.lower():
            print("❌ Error: Network error. Please check your internet connection.")
        else:
            print(f"❌ Error generating video: {error_type}: {error_msg}")
            import traceback
            traceback.print_exc()
        
        return None


def main():
    """
    Main function for command-line usage
    """
    parser = argparse.ArgumentParser(
        description="Generate videos using Google Veo API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Text-to-video
  python3 generate_video_google.py "a sunset over the ocean with gentle waves"
  python3 generate_video_google.py "person walking through forest" --aspect-ratio 9:16
  
  # Image-to-video (animate an image)
  python3 generate_video_google.py "camera slowly zooms in" --image photo.jpg
  
  # Image-to-video with extensions (create longer video)
  python3 generate_video_google.py "subtle movements" --image photo.jpg --extensions 2
  
  # Image-to-video with seamless looping
  python3 generate_video_google.py "gentle breathing" --image portrait.jpg --loop
  
  # Video extension (extend an existing Veo-generated video)
  python3 generate_video_google.py "continue the action" --video initial.mp4 --extensions 1
  
  # Custom output
  python3 generate_video_google.py "cityscape timelapse" --output-dir ./my_videos --output city.mp4

Requires: GEMINI_API_KEY in .env file or as environment variable
Get your key at: https://aistudio.google.com/apikey

Video Extensions:
  - Initial video: ~8 seconds
  - Each extension: ~7 seconds
  - Maximum extensions: 20 (total ~148 seconds)
  - Extensions require 16:9 or 9:16 aspect ratio at 720p
  - Input video must be Veo-generated for extensions
        """
    )
    
    parser.add_argument(
        "prompt",
        help="Text description of the video to generate"
    )
    
    parser.add_argument(
        "--image", "-i",
        default=None,
        help="Input image for image-to-video generation"
    )
    
    parser.add_argument(
        "--video", "-v",
        default=None,
        help="Input video for video extension"
    )
    
    parser.add_argument(
        "--extensions", "-e",
        type=int,
        default=0,
        help="Number of 7-second extensions to add (0-20, each adds ~7s)"
    )
    
    parser.add_argument(
        "--loop", "-l",
        action="store_true",
        help="Create seamless loop by using input image as first and last frame"
    )
    
    parser.add_argument(
        "--aspect-ratio", "-a",
        default="16:9",
        choices=SUPPORTED_ASPECT_RATIOS,
        help="Aspect ratio for the video (default: 16:9)"
    )
    
    parser.add_argument(
        "--output-dir", "-d",
        default=None,
        help="Directory to save the video (default: ./generated_videos)"
    )
    
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output filename (default: auto-generated with timestamp)"
    )
    
    args = parser.parse_args()
    
    # Determine output path
    output_path = None
    if args.output:
        if args.output_dir:
            output_path = str(Path(args.output_dir) / args.output)
        else:
            output_path = args.output
    
    # Generate the video
    result = generate_video_google(
        prompt=args.prompt,
        output_path=output_path,
        output_dir=args.output_dir,
        aspect_ratio=args.aspect_ratio,
        image_path=args.image,
        video_path=args.video,
        num_extensions=args.extensions,
        loop=args.loop
    )
    
    if result:
        print(f"\n🎉 Success! Video saved to: {result}")
    else:
        print("\n❌ Failed to generate video")
        sys.exit(1)


if __name__ == "__main__":
    main()
