# Local Editing - Image Manipulation

Edit images locally using PIL (no AI, no API calls, instant, free).


## When to Use

**✅ Use Local Editing for:**
- Resizing or cropping images
- Converting formats (PNG → JPG/WEBP)
- Grayscale conversion
- Brightness, contrast, sharpness adjustments
- Blur or rotation

**❌ Do NOT use for:**
- Removing objects or backgrounds → Use Replicate (rembg)
- Changing styles → Use AI generation
- Adding elements → Use AI generation
- Content-aware edits → Use AI generation


## Commands

### Resize

```bash
cd "pro accelerator/tools/Image Generator"
python3 scripts/local_image_edit.py input.png output.png --resize 1440 810
```

### Center Crop

```bash
python3 scripts/local_image_edit.py input.png output.png --crop 1000 1000
```

### Grayscale

```bash
python3 scripts/local_image_edit.py input.png output.png --grayscale
```

### Format Conversion

```bash
# PNG to WEBP (smaller file size)
python3 scripts/local_image_edit.py input.png output.webp --format webp

# PNG to JPEG
python3 scripts/local_image_edit.py input.png output.jpg --format jpg
```

### Rotate

```bash
# Rotate 90° clockwise
python3 scripts/local_image_edit.py input.png output.png --rotate 90
```

### Adjustments

```bash
# Brightness (1.0 = original, >1 = brighter)
python3 scripts/local_image_edit.py input.png output.png --brightness 1.2

# Contrast
python3 scripts/local_image_edit.py input.png output.png --contrast 1.1

# Sharpness
python3 scripts/local_image_edit.py input.png output.png --sharpness 1.5

# Blur
python3 scripts/local_image_edit.py input.png output.png --blur 2.0
```

### Combined Operations

```bash
python3 scripts/local_image_edit.py input.png output.png \
  --resize 1440 810 \
  --grayscale \
  --brightness 1.1 \
  --contrast 1.2
```


## Parameters

| Parameter | Description |
|-----------|-------------|
| `input_path` | Path to input image (required) |
| `output_path` | Path to save result (optional, defaults to overwrite input) |
| `--resize W H` | Resize to width x height |
| `--crop W H` | Center crop to width x height |
| `--grayscale`, `-g` | Convert to grayscale |
| `--rotate` | Rotate clockwise (90, 180, 270) |
| `--brightness` | Brightness factor (0.0 - 2.0) |
| `--contrast` | Contrast factor (0.0 - 2.0) |
| `--sharpness` | Sharpness factor (0.0 - 2.0) |
| `--blur` | Gaussian blur radius |
| `--format` | Force output format (png, jpg, webp) |


## Troubleshooting

**Input file not found:** Verify the file path is correct

**Import error:** Install dependencies from `requirements.txt` in the Image Generator directory.


## Notes

- Operations are applied in order: format → rotate → crop → resize → grayscale → blur → enhancements
- JPEG format removes transparency (alpha channel)
- All operations are lossless except JPEG compression

