#!/usr/bin/env python3
"""
Video Generation Script using Replicate API
Uses Google Veo 3 model for high-quality video generation
"""

import os
import sys
import argparse
import requests
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
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
REPLICATE_VIDEO_MODEL = os.getenv("REPLICATE_VIDEO_MODEL")


def generate_video_replicate(
    prompt: str,
    output_path: str = None,
    output_dir: str = None,
    image_path: str = None
) -> str:
    """
    Generate video using Replicate API with Google Veo 3
    
    Args:
        prompt (str): The text description of the video to generate
        output_path (str): Full path to save the generated video (optional)
        output_dir (str): Directory to save the video (default: ./generated_videos)
        image_path (str): Path to input image for image-to-video (optional)
    
    Returns:
        str: Path to the saved video, or None if failed
    """
    
    if not REPLICATE_API_TOKEN:
        print("❌ Error: REPLICATE_API_TOKEN not found!")
        print("Please add REPLICATE_API_TOKEN to your .env file")
        return None
    
    if not REPLICATE_VIDEO_MODEL:
        print("❌ Error: REPLICATE_VIDEO_MODEL not found!")
        print("Please add REPLICATE_VIDEO_MODEL to your .env file")
        return None
    
    try:
        print(f"🎬 Generating video with Replicate ({REPLICATE_VIDEO_MODEL})...")
        print(f"📝 Prompt: '{prompt}'")
        
        if image_path:
            print(f"🖼️  Input image: {image_path}")
        
        # Import replicate
        import replicate
        
        # Initialize Replicate client
        client = replicate.Client(api_token=REPLICATE_API_TOKEN)
        
        print("📤 Sending request to Replicate API...")
        print("⏳ Video generation may take 1-2 minutes...")
        
        # Prepare input parameters
        input_params = {
            "prompt": prompt,
        }
        
        # Add image for image-to-video if provided
        if image_path:
            image_path = Path(image_path)
            if not image_path.exists():
                print(f"❌ Error: Image not found: {image_path}")
                return None
            
            # Read image and convert to base64 or file handle
            with open(image_path, "rb") as f:
                input_params["first_frame_image"] = f
                
                # Run the model with image
                output = client.run(
                    REPLICATE_VIDEO_MODEL,
                    input=input_params
                )
        else:
            # Run text-to-video
            output = client.run(
                REPLICATE_VIDEO_MODEL,
                input=input_params
            )
        
        if not output:
            print("❌ Error: No video data in response")
            return None
        
        # Handle different output formats
        video_url = None
        if isinstance(output, list) and len(output) > 0:
            video_url = output[0]
        elif isinstance(output, str):
            video_url = output
        elif hasattr(output, 'url'):
            video_url = output.url
        elif hasattr(output, '__iter__'):
            try:
                first_item = next(iter(output))
                if hasattr(first_item, 'url'):
                    video_url = first_item.url
                elif isinstance(first_item, str):
                    video_url = first_item
            except (StopIteration, TypeError):
                pass
        
        if not video_url:
            print(f"❌ Error: Could not extract video URL from output (type: {type(output)})")
            return None
        
        print("🎬 Video generated")
        print("📥 Downloading video...")
        
        # Download the video
        video_response = requests.get(video_url, timeout=120)
        if video_response.status_code != 200:
            print(f"❌ Error downloading video: HTTP {video_response.status_code}")
            return None
        
        video_data = video_response.content
        
        if len(video_data) == 0:
            print("❌ Error: Empty video data received")
            return None
        
        print(f"🎬 Video downloaded ({len(video_data) / 1024:.1f} KB)")
        
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
            final_path = out_dir / f"{timestamp}_{safe_prompt}_replicate.mp4"
        
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
        print(f"   Run: pip3 install replicate requests")
        return None
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        
        if "AuthenticationError" in error_type or "401" in error_msg:
            print("❌ Error: Invalid API token. Please check your REPLICATE_API_TOKEN.")
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
        description="Generate videos using Replicate API (Google Veo 3)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Text-to-video
  python3 generate_video_replicate.py "a person walking through a forest"
  
  # Image-to-video (animate an image)
  python3 generate_video_replicate.py "camera slowly zooms in" --image photo.jpg
  
  # Custom output
  python3 generate_video_replicate.py "sunset timelapse" --output-dir ./videos --output sunset.mp4

Requires: REPLICATE_API_TOKEN in .env file
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
    result = generate_video_replicate(
        prompt=args.prompt,
        output_path=output_path,
        output_dir=args.output_dir,
        image_path=args.image
    )
    
    if result:
        print(f"\n🎉 Success! Video saved to: {result}")
    else:
        print("\n❌ Failed to generate video")
        sys.exit(1)


if __name__ == "__main__":
    main()

