#!/usr/bin/env python3
"""
Apply a transparent overlay image on top of a base image.
"""

import sys
from PIL import Image
from pathlib import Path

def apply_overlay(base_path, overlay_path, output_path=None):
    """
    Apply a transparent overlay on top of a base image.
    
    Args:
        base_path: Path to the base image
        overlay_path: Path to the transparent overlay image (PNG with alpha)
        output_path: Path to save the result (optional, defaults to overwrite base)
    """
    # Open images
    base = Image.open(base_path).convert("RGBA")
    overlay = Image.open(overlay_path).convert("RGBA")
    
    # Resize overlay to match base if different
    if base.size != overlay.size:
        print(f"⚠️  Resizing overlay from {overlay.size} to {base.size}")
        overlay = overlay.resize(base.size, Image.Resampling.LANCZOS)
    
    # Composite overlay on top of base
    result = Image.alpha_composite(base, overlay)
    
    # Convert back to RGB if needed (for JPG)
    if output_path and Path(output_path).suffix.lower() in ['.jpg', '.jpeg']:
        result = result.convert("RGB")
    
    # Save
    if output_path is None:
        output_path = base_path
    
    result.save(output_path)
    print(f"✅ Overlay applied and saved to: {output_path}")
    
    # Show file size
    size_kb = Path(output_path).stat().st_size / 1024
    print(f"📊 File size: {size_kb:.2f} KB")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 apply_overlay.py <base_image> <overlay_image> [output_path]")
        print("\nExample:")
        print('  python3 apply_overlay.py image.png overlay.png result.png')
        sys.exit(1)
    
    base_path = sys.argv[1]
    overlay_path = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    try:
        apply_overlay(base_path, overlay_path, output_path)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

