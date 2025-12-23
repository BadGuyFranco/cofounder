#!/usr/bin/env python3
"""
Image Generation Script using Replicate API
Uses your configured image model for high-quality image generation
"""

import os
import sys
import requests
import warnings
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Suppress urllib3 SSL warnings (common on macOS)
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL 1.1.1+")

# Load environment variables from /memory/ directory
script_dir = Path(__file__).parent
memory_env = script_dir / "../../../memory/Image Generator/.env"
if memory_env.exists():
    load_dotenv(memory_env)
else:
    print(f"⚠️  Warning: .env not found at {memory_env.resolve()}")
    print("   Please create /memory/Image Generator/.env with your API keys")

# Configuration - Load from environment
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
REPLICATE_IMAGE_MODEL = os.getenv("REPLICATE_IMAGE_MODEL")

# Check if Replicate API token is configured (only exit if running as main)
if not REPLICATE_API_TOKEN and __name__ == "__main__":
    print("❌ Error: REPLICATE_API_TOKEN not found!")
    print("Please add REPLICATE_API_TOKEN to your .env file")
    sys.exit(1)


def generate_image_replicate(prompt, output_path=None, model=None, width=1024, height=1024):
    """
    Generate image using Replicate API with your configured image model
    
    Your configured model may use aspect_ratio presets (e.g., 1:1, 16:9, 21:9) instead of
    exact dimensions. This function maps requested dimensions to the closest aspect
    ratio, then resizes to exact target dimensions.
    
    Args:
        prompt (str): The text description of the image to generate
        output_path (str): Path to save the generated image
        model (str): Deprecated - uses configured model from .env
        width (int): Target image width in pixels (default: 1024)
        height (int): Target image height in pixels (default: 1024)
    
    Returns:
        str: Path to the saved image at exact target dimensions, or None if failed
    
    Note:
        - Configured model generates at native aspect ratio resolutions
        - Output is automatically resized to exact target dimensions using high-quality resampling
        - Common aspect ratios: 1:1, 16:9, 21:9, 4:3, 3:2, 9:16
    """
    
    if not REPLICATE_API_TOKEN:
        print("❌ Error: REPLICATE_API_TOKEN not configured")
        return None
    
    if not REPLICATE_IMAGE_MODEL:
        print("❌ Error: REPLICATE_IMAGE_MODEL not configured")
        print("Please add REPLICATE_IMAGE_MODEL to your .env file")
        return None
    
    # Use configured model
    selected_model = REPLICATE_IMAGE_MODEL
    
    # Calculate aspect ratio and map to supported ratios
    # Most models use aspect_ratio parameter, not width/height
    requested_ratio = width / height
    
    # Map to closest supported aspect ratio
    aspect_ratio_map = {
        "1:1": (1.0, 1024, 1024),      # Square
        "16:9": (1.778, 1344, 768),    # Widescreen
        "21:9": (2.333, 1536, 640),    # Ultrawide
        "4:3": (1.333, 1152, 896),     # Standard
        "3:2": (1.5, 1216, 832),       # Photo
        "9:16": (0.5625, 768, 1344),   # Portrait
    }
    
    # Find closest aspect ratio
    closest_ratio = min(aspect_ratio_map.items(), 
                       key=lambda x: abs(x[1][0] - requested_ratio))
    aspect_ratio_str, (_, native_width, native_height) = closest_ratio
    
    print(f"📐 Requested: {width}x{height} (ratio: {requested_ratio:.2f})")
    print(f"🎯 Using aspect ratio: {aspect_ratio_str} (native: {native_width}x{native_height})")
    
    # Store target dimensions for post-processing
    target_width, target_height = width, height
    needs_resize = (native_width != width or native_height != height)
    
    try:
        print(f"🎨 Generating image with Replicate {selected_model.split('/')[-1]}...")
        print(f"📝 Prompt: '{prompt}'")
        
        # Import replicate and PIL here to avoid import errors if not installed
        import replicate
        from PIL import Image
        import requests
        from io import BytesIO
        
        # Initialize Replicate client
        client = replicate.Client(api_token=REPLICATE_API_TOKEN)
        
        print("📤 Sending request to Replicate API...")
        
        # Generate image with configured model using aspect_ratio parameter
        output = client.run(
            selected_model,
            input={
                "prompt": prompt,
                "aspect_ratio": aspect_ratio_str,
                "steps": 50,
                "guidance": 3.0,
                "safety_tolerance": 2,
                "output_format": "png",
                "output_quality": 100
            }
        )
        
        if not output:
            print("❌ Error: No image data in response")
            return None
        
        # Handle different output formats
        image_url = None
        if isinstance(output, list) and len(output) > 0:
            image_url = output[0]
        elif isinstance(output, str):
            image_url = output
        elif hasattr(output, 'url'):
            # Handle FileOutput objects (some models return this type)
            image_url = output.url
        elif hasattr(output, '__iter__'):
            # Handle iterable output (some models return iterables)
            try:
                first_item = next(iter(output))
                if hasattr(first_item, 'url'):
                    image_url = first_item.url
                elif isinstance(first_item, str):
                    image_url = first_item
            except (StopIteration, TypeError):
                pass
        
        if not image_url:
            print(f"❌ Error: Could not extract image URL from output (type: {type(output)})")
            return None
        
        print(f"🖼️  Image generated")
        print("📥 Downloading image...")
        
        # Download the image from the URL
        img_response = requests.get(image_url)
        if img_response.status_code != 200:
            print(f"❌ Error downloading image: HTTP {img_response.status_code}")
            return None
        
        # Load image with PIL for potential resizing
        img = Image.open(BytesIO(img_response.content))
        print(f"🖼️  Image downloaded (native size: {img.size})")
        
        # Resize if target dimensions differ from native
        if needs_resize:
            print(f"🔧 Resizing to target dimensions: {target_width}x{target_height}")
            img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            print(f"✅ Resized to: {img.size}")
        
        # Generate output path if not provided
        if not output_path:
            output_path = _generate_output_path(prompt, "png")
        
        # Ensure output directory exists
        from pathlib import Path
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save the (potentially resized) image
        img.save(str(output_path), "PNG", optimize=True)
        
        # Get file size for confirmation
        file_size = output_path.stat().st_size / 1024  # Size in KB
        print(f"✅ Image saved to: {output_path}")
        print(f"📊 File size: {file_size:.2f} KB")
        
        return str(output_path)
        
    except Exception as e:
        # Handle common errors with helpful messages
        error_type = type(e).__name__
        
        if "AuthenticationError" in error_type or "401" in str(e):
            print("❌ Error: Invalid API token. Please check your REPLICATE_API_TOKEN.")
        elif "rate_limit" in str(e).lower() or "429" in str(e):
            print("❌ Error: Rate limit exceeded. Please wait a moment and try again.")
        elif "ConnectionError" in error_type or "network" in str(e).lower():
            print("❌ Error: Network error. Please check your internet connection.")
        else:
            print(f"❌ Error generating image: {error_type}: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return None


def _generate_output_path(prompt, extension="png"):
    """
    Generate a safe output path for the generated content
    
    Args:
        prompt (str): The original prompt to derive filename from
        extension (str): File extension (default: 'png')
    
    Returns:
        Path: Output file path
    """
    # Create generated_images directory if it doesn't exist
    output_dir = Path("generated_images")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create filename with timestamp and sanitized prompt
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_prompt = safe_prompt.replace(' ', '-')
    return output_dir / f"{timestamp}_{safe_prompt}_replicate.{extension}"


def _save_image(image_data, output_path):
    """
    Save image data to file
    
    Args:
        image_data (bytes): Binary image data
        output_path (str or Path): Path to save the image
    """
    output_path = Path(output_path)
    
    # Create parent directories if they don't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write image data to file
    with open(output_path, "wb") as f:
        f.write(image_data)
    
    # Get file size for confirmation
    file_size = output_path.stat().st_size / 1024  # Size in KB
    print(f"✅ Image saved to: {output_path}")
    print(f"📊 File size: {file_size:.2f} KB")


def test_api_connection():
    """
    Test the Replicate API connection
    """
    print("🔍 Testing Replicate API connection...")
    
    if not REPLICATE_API_TOKEN:
        print("❌ No API token found")
        return False
    
    # Test with a simple request
    test_prompt = "a simple test image"
    result = generate_image_replicate(test_prompt, "test_replicate_connection.png")
    
    if result:
        print("✅ Replicate API connection successful!")
        return True
    else:
        print("❌ Replicate API connection failed!")
        return False


def main():
    """
    Main function for command-line usage
    Example usage: python generate_image_replicate.py "your prompt" [output_path] [width] [height]
    """
    
    if len(sys.argv) < 2:
        print("Usage: python generate_image_replicate.py 'your prompt here' [output_path] [width] [height]")
        print("\nExamples:")
        print("  python generate_image_replicate.py 'A futuristic cityscape at dusk, cyberpunk style'")
        print("  python generate_image_replicate.py 'a professional podcast studio with modern design'")
        print("  python generate_image_replicate.py 'entrepreneur working on laptop' custom_image.png")
        print("  python generate_image_replicate.py 'startup office' output.png 1440 810")
        print(f"\nModel: {REPLICATE_IMAGE_MODEL}")
        print("Note: Most models use aspect ratio presets (1:1, 16:9, 21:9, 4:3, 3:2, 9:16)")
        print("      Images are generated at native resolution and resized to target dimensions")
        print("\nUses Replicate API for high-quality image generation")
        print("\nRequires: REPLICATE_API_TOKEN in .env file")
        sys.exit(1)
    
    # Parse command line arguments
    prompt = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 1024
    
    # Generate the image
    result = generate_image_replicate(prompt, output_path, None, width, height)
    
    if result:
        print(f"\n🎉 Success! Image saved to: {result}")
    else:
        print("\n❌ Failed to generate image")
        sys.exit(1)


if __name__ == "__main__":
    main()
