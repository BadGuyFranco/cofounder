#!/usr/bin/env python3
"""
Local Image Editor
------------------
A utility script for performing local, non-AI image manipulations using Python's PIL (Pillow) library.
This avoids the cost, latency, and complexity of AI services for simple tasks like:
- Grayscale conversion
- Brightness/Contrast/Sharpness adjustment
- Resizing & Cropping
- Format conversion (PNG, JPG, WEBP)
- Blur & Rotation

Usage:
    python3 local_image_edit.py input.png output.png --grayscale --brightness 0.8 --contrast 0.8 --resize 1440 810
"""

import argparse
import sys
import os
from PIL import Image, ImageEnhance, ImageFilter

def setup_parser():
    parser = argparse.ArgumentParser(description="Perform local image edits (grayscale, resize, adjustments) without AI.")
    
    parser.add_argument("input_path", help="Path to the input image")
    parser.add_argument("output_path", nargs="?", help="Path to save the result (defaults to input_path if not provided)")
    
    # Color & Filters
    parser.add_argument("--grayscale", "-g", action="store_true", help="Convert image to grayscale (monochrome)")
    parser.add_argument("--blur", type=float, help="Apply Gaussian Blur radius (e.g., 2.0)")
    
    # Geometry
    parser.add_argument("--resize", nargs=2, type=int, metavar=('WIDTH', 'HEIGHT'), help="Resize image to specific dimensions (e.g., 1440 810)")
    parser.add_argument("--crop", nargs=2, type=int, metavar=('WIDTH', 'HEIGHT'), help="Center crop to specific dimensions")
    parser.add_argument("--rotate", type=int, choices=[90, 180, 270], help="Rotate image clockwise (90, 180, 270)")
    
    # Enhancements (1.0 = original)
    parser.add_argument("--brightness", type=float, default=1.0, help="Adjust brightness factor (0.0 to 2.0, default: 1.0)")
    parser.add_argument("--contrast", type=float, default=1.0, help="Adjust contrast factor (0.0 to 2.0, default: 1.0)")
    parser.add_argument("--sharpness", type=float, default=1.0, help="Adjust sharpness factor (0.0 to 2.0, default: 1.0)")
    
    # Format
    parser.add_argument("--format", type=str, choices=['png', 'jpg', 'jpeg', 'webp'], help="Force output format conversion")

    return parser

def process_image(args):
    # Validate input
    if not os.path.exists(args.input_path):
        print(f"❌ Error: Input file not found: {args.input_path}")
        sys.exit(1)
        
    output_path = args.output_path if args.output_path else args.input_path
    
    try:
        print(f"📂 Opening: {args.input_path}")
        img = Image.open(args.input_path)
        
        # 1. Format Conversion Logic (if changing format, update extension)
        save_format = None
        if args.format:
            save_format = args.format.upper()
            if save_format == 'JPG': save_format = 'JPEG'
            
            # If converting to JPEG, remove alpha channel (transparency)
            if save_format == 'JPEG' and img.mode in ('RGBA', 'LA'):
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3]) # 3 is the alpha channel
                img = background
                
            # Update output extension if user didn't explicitly provide one
            base, _ = os.path.splitext(output_path)
            if args.output_path == args.input_path: # Only change extension if overwriting or implicit output
                 output_path = f"{base}.{args.format.lower()}"

        # 2. Rotation
        if args.rotate:
            print(f"🔄 Rotating {args.rotate}°...")
            img = img.rotate(-args.rotate, expand=True) # Negative for clockwise

        # 3. Cropping (Center Crop)
        if args.crop:
            target_w, target_h = args.crop
            img_w, img_h = img.size
            left = (img_w - target_w) / 2
            top = (img_h - target_h) / 2
            right = (img_w + target_w) / 2
            bottom = (img_h + target_h) / 2
            print(f"✂️ Center cropping to {target_w}x{target_h}...")
            img = img.crop((left, top, right, bottom))

        # 4. Resize
        if args.resize:
            target_w, target_h = args.resize
            current_w, current_h = img.size
            if (current_w, current_h) != (target_w, target_h):
                print(f"📐 Resizing from {current_w}x{current_h} to {target_w}x{target_h}...")
                img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
            else:
                print("📐 Dimensions already match target. Skipping resize.")

        # 5. Grayscale
        if args.grayscale:
            print("🎨 Converting to grayscale...")
            img = img.convert('L')
            
        # 6. Blur
        if args.blur:
            print(f"🌫️ Applying blur (radius: {args.blur})...")
            img = img.filter(ImageFilter.GaussianBlur(args.blur))

        # 7. Enhancements
        if args.brightness != 1.0:
            print(f"☀️ Adjusting brightness: {args.brightness}x")
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(args.brightness)
            
        if args.contrast != 1.0:
            print(f"🌓 Adjusting contrast: {args.contrast}x")
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(args.contrast)
            
        if args.sharpness != 1.0:
            print(f"🔪 Adjusting sharpness: {args.sharpness}x")
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(args.sharpness)

        # Save result
        print(f"💾 Saving to: {output_path}")
        img.save(output_path, format=save_format, optimize=True)
        print("✅ Done!")
        
    except Exception as e:
        print(f"❌ Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = setup_parser()
    args = parser.parse_args()
    process_image(args)

