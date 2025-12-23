#!/usr/bin/env python3
"""
Background Removal Tool using Replicate API
Uses the 'cjwbw/rembg' model to remove backgrounds from images
"""

import os
import sys
import requests
import warnings
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

# Suppress urllib3 SSL warnings
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
REMBG_MODEL = os.getenv("REPLICATE_REMBG_MODEL")

def remove_background(input_path, output_path=None):
    """
    Remove background from an image using Replicate's rembg model
    
    Args:
        input_path (str): Path to local input image
        output_path (str): Path to save the result (optional)
        
    Returns:
        str: Path to the saved image, or None if failed
    """
    
    if not REPLICATE_API_TOKEN:
        print("❌ Error: REPLICATE_API_TOKEN not configured")
        return None
    
    if not REMBG_MODEL:
        print("❌ Error: REPLICATE_REMBG_MODEL not configured")
        print("Please add REPLICATE_REMBG_MODEL to your .env file")
        return None
        
    if not os.path.exists(input_path):
        print(f"❌ Error: Input file not found: {input_path}")
        return None

    try:
        import replicate
        
        print(f"🎨 Removing background from: {input_path}")
        print(f"🤖 Using model: {REMBG_MODEL.split(':')[0]}")
        
        # Initialize client
        client = replicate.Client(api_token=REPLICATE_API_TOKEN)
        
        # Run the model
        print("📤 Sending image to Replicate API...")
        with open(input_path, "rb") as file:
            output = client.run(
                REMBG_MODEL,
                input={
                    "image": file,
                    "model": "u2net_human_seg", # Testing the human-segmentation specific model
                    "return_mask": False,
                    "alpha_matting": True,
                    "alpha_matting_foreground_threshold": 250, # Stricter foreground (was 240)
                    "alpha_matting_background_threshold": 20,  # Stricter background (was 10)
                    "alpha_matting_erode_size": 20 # More aggressive erosion (was 10)
                }
            )
            
        if not output:
            print("❌ Error: No output from model")
            return None
            
        # The output is a URL string
        image_url = output
        
        print("📥 Downloading result...")
        response = requests.get(image_url)
        if response.status_code != 200:
            print(f"❌ Error downloading result: HTTP {response.status_code}")
            return None
            
        # Generate output path if not provided
        if not output_path:
            p = Path(input_path)
            output_path = p.parent / f"{p.stem}_nobg.png"
            
        # Save raw result first (it's a PNG with transparency)
        with open(output_path, "wb") as f:
            f.write(response.content)
            
        print(f"✅ Background removed! Saved to: {output_path}")
        return str(output_path)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def process_headshot(input_path, output_path=None):
    """
    Full pipeline: Remove background -> Resize to 100px wide (maintain aspect)
    """
    # 1. Remove background
    temp_output = remove_background(input_path, output_path)
    
    if not temp_output:
        return False
        
    # 2. Resize to 1000px wide using PIL (local processing)
    try:
        print("🔧 Resizing to 1000px width...")
        img = Image.open(temp_output)
        
        # Calculate height to maintain aspect ratio
        target_width = 1000
        aspect_ratio = img.height / img.width
        target_height = int(target_width * aspect_ratio)
        
        # Resize
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Save back
        img.save(temp_output, "PNG", optimize=True)
        print(f"✅ Resized to {target_width}x{target_height}")
        print(f"🎉 Final processed headshot ready: {temp_output}")
        return True
        
    except Exception as e:
        print(f"❌ Error resizing image: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 remove_background.py input_image.jpg [output_path.png]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    process_headshot(input_file, output_file)

