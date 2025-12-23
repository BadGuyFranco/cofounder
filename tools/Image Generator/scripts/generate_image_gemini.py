#!/usr/bin/env python3
"""
Image Generation Script using Google Gemini API (Nano Banana)
Uses Google's Gemini model for high-quality image generation
"""

import os
import sys
import argparse
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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_MODEL")

# Supported aspect ratios (per Gemini API docs)
SUPPORTED_ASPECT_RATIOS = ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]


def generate_image_gemini(
    prompt: str,
    output_path: str = None,
    output_dir: str = None,
    aspect_ratio: str = "1:1"
) -> str:
    """
    Generate image using Google Gemini API (Nano Banana)
    
    Args:
        prompt (str): The text description of the image to generate
        output_path (str): Full path to save the generated image (optional)
        output_dir (str): Directory to save the image (default: ./generated_images)
        aspect_ratio (str): Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
    
    Returns:
        str: Path to the saved image, or None if failed
    
    Note:
        Images are saved at native resolution from the API. Use local_image_edit.py
        for any post-processing needs.
    """
    
    if not GEMINI_API_KEY:
        print("❌ Error: GEMINI_API_KEY not found!")
        print("Please add GEMINI_API_KEY to your .env file or set it as an environment variable")
        print("Get your key at: https://aistudio.google.com/apikey")
        return None
    
    if not GEMINI_IMAGE_MODEL:
        print("❌ Error: GEMINI_MODEL not found!")
        print("Please add GEMINI_MODEL to your .env file")
        return None
    
    # Validate aspect ratio
    if aspect_ratio not in SUPPORTED_ASPECT_RATIOS:
        print(f"⚠️  Warning: Unsupported aspect ratio '{aspect_ratio}'. Using '1:1' instead.")
        print(f"   Supported ratios: {', '.join(SUPPORTED_ASPECT_RATIOS)}")
        aspect_ratio = "1:1"
    
    try:
        print(f"🎨 Generating image with Google Gemini ({GEMINI_IMAGE_MODEL})...")
        print(f"📝 Prompt: '{prompt}'")
        print(f"📐 Aspect ratio: {aspect_ratio}")
        
        # Import Google Generative AI library
        from google import genai
        from google.genai import types
        from PIL import Image
        from io import BytesIO
        
        # Initialize the Gemini client
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        print("📤 Sending request to Gemini API...")
        
        # Generate the image with aspect ratio
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=['Text', 'Image'],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio
                )
            )
        )
        
        if not response or not response.candidates:
            print("❌ Error: No response from Gemini API")
            return None
        
        # Extract image from response
        image_data = None
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data is not None:
                image_data = part.inline_data.data
                break
        
        if not image_data:
            print("❌ Error: No image data in response")
            # Check if there's text in the response (might indicate an error)
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text') and part.text:
                    print(f"   API Response: {part.text}")
            return None
        
        print("📥 Processing image...")
        
        # Load image with PIL (no post-processing, native quality)
        img = Image.open(BytesIO(image_data))
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
            final_path = out_dir / f"gemini_{timestamp}_{safe_prompt}.png"
        
        # Ensure parent directory exists
        final_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save the image
        # Convert to RGB if necessary (for PNG compatibility)
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
        
    except ImportError as e:
        print(f"❌ Error: Missing required library")
        print(f"   Run: pip3 install google-genai Pillow")
        return None
        
    except Exception as e:
        error_type = type(e).__name__
        
        if "AuthenticationError" in error_type or "401" in str(e) or "API key" in str(e).lower():
            print("❌ Error: Invalid API key. Please check your GEMINI_API_KEY.")
        elif "rate_limit" in str(e).lower() or "429" in str(e):
            print("❌ Error: Rate limit exceeded. Please wait a moment and try again.")
        elif "ConnectionError" in error_type or "network" in str(e).lower():
            print("❌ Error: Network error. Please check your internet connection.")
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
        description="Generate images using Google Gemini API (Nano Banana)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 generate_image_gemini.py "a futuristic cityscape at sunset"
  python3 generate_image_gemini.py "professional headshot" --aspect-ratio 1:1
  python3 generate_image_gemini.py "landscape photo" --aspect-ratio 16:9
  python3 generate_image_gemini.py "product shot" --output-dir ./my_images --output product.png

Requires: GEMINI_API_KEY and GEMINI_MODEL in .env file
Get your key at: https://aistudio.google.com/apikey
        """
    )
    
    parser.add_argument(
        "prompt",
        help="Text description of the image to generate"
    )
    
    parser.add_argument(
        "--aspect-ratio", "-a",
        default="1:1",
        choices=SUPPORTED_ASPECT_RATIOS,
        help="Aspect ratio for the image (default: 1:1)"
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
    
    args = parser.parse_args()
    
    # Determine output path
    output_path = None
    if args.output:
        if args.output_dir:
            output_path = str(Path(args.output_dir) / args.output)
        else:
            output_path = args.output
    
    # Generate the image
    result = generate_image_gemini(
        prompt=args.prompt,
        output_path=output_path,
        output_dir=args.output_dir,
        aspect_ratio=args.aspect_ratio
    )
    
    if result:
        print(f"\n🎉 Success! Image saved to: {result}")
    else:
        print("\n❌ Failed to generate image")
        sys.exit(1)


if __name__ == "__main__":
    main()

