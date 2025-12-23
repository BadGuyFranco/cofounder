#!/usr/bin/env python3
"""
Image Generation Script using X.ai (Grok) API
Uses Grok's image generation model for high-quality image generation
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
    memory_env = script_dir / "../../../memory/Image Generator/.env"
    if memory_env.exists():
        load_dotenv(memory_env)
    else:
        print(f"⚠️  Warning: .env not found at {memory_env.resolve()}")
        print("   Please create /memory/Image Generator/.env with your API keys")
except ImportError:
    pass  # dotenv not installed, will rely on system env vars

# Configuration - Load from environment
XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_IMAGE_MODEL = os.getenv("XAI_IMAGE_MODEL")
XAI_API_URL = "https://api.x.ai/v1/images/generations"


def generate_image_xai(
    prompt: str,
    output_path: str = None,
    output_dir: str = None,
    n: int = 1
) -> str:
    """
    Generate image using X.ai (Grok) API
    
    Args:
        prompt (str): The text description of the image to generate
        output_path (str): Full path to save the generated image (optional)
        output_dir (str): Directory to save the image (default: ./generated_images)
        n (int): Number of images to generate (1-10, default: 1)
    
    Returns:
        str: Path to the saved image, or None if failed
    
    Note:
        X.ai does not support aspect ratio, size, or quality parameters.
        Images are generated at a fixed resolution determined by the model.
    """
    
    if not XAI_API_KEY:
        print("❌ Error: XAI_API_KEY not found!")
        print("Please add XAI_API_KEY to your .env file or set it as an environment variable")
        print("Get your key at: https://console.x.ai")
        return None
    
    if not XAI_IMAGE_MODEL:
        print("❌ Error: XAI_IMAGE_MODEL not found!")
        print("Please add XAI_IMAGE_MODEL to your .env file")
        return None
    
    try:
        print(f"🎨 Generating image with X.ai ({XAI_IMAGE_MODEL})...")
        print(f"📝 Prompt: '{prompt}'")
        
        # Prepare the request
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": XAI_IMAGE_MODEL,
            "prompt": prompt,
            "n": n,
            "response_format": "url"
        }
        
        print("📤 Sending request to X.ai API...")
        
        # Make the API request
        response = requests.post(XAI_API_URL, headers=headers, json=data, timeout=120)
        
        if response.status_code != 200:
            print(f"❌ Error: API returned status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Detail: {error_detail}")
            except:
                print(f"   Response: {response.text}")
            return None
        
        result = response.json()
        
        if not result.get("data") or len(result["data"]) == 0:
            print("❌ Error: No image data in response")
            return None
        
        # Get the image URL from the response
        image_url = result["data"][0].get("url")
        
        if not image_url:
            print("❌ Error: No image URL in response")
            return None
        
        # Check if there's a revised prompt
        revised_prompt = result["data"][0].get("revised_prompt")
        if revised_prompt and revised_prompt != prompt:
            print(f"📝 Revised prompt: '{revised_prompt}'")
        
        print("📥 Downloading image...")
        
        # Download the image
        img_response = requests.get(image_url, timeout=60)
        if img_response.status_code != 200:
            print(f"❌ Error downloading image: HTTP {img_response.status_code}")
            return None
        
        # Load image with PIL
        from PIL import Image
        from io import BytesIO
        
        img = Image.open(BytesIO(img_response.content))
        print(f"🖼️  Image generated ({img.size[0]}x{img.size[1]})")
        
        # Determine output path
        if output_path:
            final_path = Path(output_path)
        else:
            # Generate output path
            if output_dir:
                out_dir = Path(output_dir)
            else:
                out_dir = Path("generated_images")
            
            out_dir.mkdir(parents=True, exist_ok=True)
            
            # Create filename with timestamp and sanitized prompt
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_prompt = safe_prompt.replace(' ', '-')
            final_path = out_dir / f"xai_{timestamp}_{safe_prompt}.png"
        
        # Ensure parent directory exists
        final_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save the image
        if img.mode == 'RGBA':
            img.save(str(final_path), "PNG", optimize=True)
        else:
            img = img.convert('RGB')
            img.save(str(final_path), "PNG", optimize=True)
        
        # Get file size for confirmation
        file_size = final_path.stat().st_size / 1024  # Size in KB
        print(f"✅ Image saved to: {final_path}")
        print(f"📊 File size: {file_size:.2f} KB")
        
        return str(final_path)
        
    except requests.exceptions.Timeout:
        print("❌ Error: Request timed out. Please try again.")
        return None
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Network error. Please check your internet connection.")
        return None
        
    except Exception as e:
        error_type = type(e).__name__
        
        if "401" in str(e) or "Unauthorized" in str(e):
            print("❌ Error: Invalid API key. Please check your XAI_API_KEY.")
        elif "429" in str(e) or "rate" in str(e).lower():
            print("❌ Error: Rate limit exceeded. Please wait a moment and try again.")
        else:
            print(f"❌ Error generating image: {error_type}: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return None


def main():
    """
    Main function for command-line usage
    """
    parser = argparse.ArgumentParser(
        description="Generate images using X.ai (Grok) API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 generate_image_xai.py "a futuristic cityscape at sunset"
  python3 generate_image_xai.py "professional headshot" --output-dir ./my_images
  python3 generate_image_xai.py "product shot" --output product.png

Note: X.ai does not support aspect ratio or size parameters.
      Images are generated at the model's native resolution.

Requires: XAI_API_KEY in .env file or as environment variable
Get your key at: https://console.x.ai
        """
    )
    
    parser.add_argument(
        "prompt",
        help="Text description of the image to generate"
    )
    
    parser.add_argument(
        "--output-dir", "-d",
        default=None,
        help="Directory to save the image (default: ./generated_images)"
    )
    
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output filename (default: auto-generated with timestamp)"
    )
    
    parser.add_argument(
        "--count", "-n",
        type=int,
        default=1,
        choices=range(1, 11),
        metavar="N",
        help="Number of images to generate (1-10, default: 1)"
    )
    
    args = parser.parse_args()
    
    # Determine output path
    output_path = None
    if args.output:
        if args.output_dir:
            output_path = str(Path(args.output_dir) / args.output)
        else:
            output_path = args.output
    
    # Generate the image
    result = generate_image_xai(
        prompt=args.prompt,
        output_path=output_path,
        output_dir=args.output_dir,
        n=args.count
    )
    
    if result:
        print(f"\n🎉 Success! Image saved to: {result}")
    else:
        print("\n❌ Failed to generate image")
        sys.exit(1)


if __name__ == "__main__":
    main()

