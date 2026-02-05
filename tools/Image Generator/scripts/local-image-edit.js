#!/usr/bin/env node
/**
 * Local Image Editor
 *
 * A utility script for performing local, non-AI image manipulations using sharp library.
 * This avoids the cost, latency, and complexity of AI services for simple tasks like:
 * - Grayscale conversion
 * - Brightness/Contrast/Sharpness adjustment
 * - Resizing & Cropping
 * - Format conversion (PNG, JPG, WEBP)
 * - Blur & Rotation
 *
 * Usage:
 *     node local-image-edit.js input.png output.png --grayscale --brightness 0.8 --contrast 0.8 --resize 1440 810
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const sharp = (await import('sharp')).default;

// Built-in Node.js modules
import { existsSync, statSync } from 'fs';
import { basename, dirname, extname } from 'path';

// Parse CLI arguments
function parseArgs(args) {
  const result = {
    inputPath: null,
    outputPath: null,
    grayscale: false,
    blur: null,
    resize: null,
    crop: null,
    rotate: null,
    brightness: 1.0,
    contrast: 1.0,
    sharpness: 1.0,
    format: null
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
    } else if (arg === '--grayscale' || arg === '-g') {
      result.grayscale = true;
    } else if (arg === '--blur' && args[i + 1]) {
      result.blur = parseFloat(args[++i]);
    } else if (arg === '--resize' && args[i + 1] && args[i + 2]) {
      result.resize = { width: parseInt(args[++i], 10), height: parseInt(args[++i], 10) };
    } else if (arg === '--crop' && args[i + 1] && args[i + 2]) {
      result.crop = { width: parseInt(args[++i], 10), height: parseInt(args[++i], 10) };
    } else if (arg === '--rotate' && args[i + 1]) {
      const rotation = parseInt(args[++i], 10);
      if ([90, 180, 270].includes(rotation)) {
        result.rotate = rotation;
      }
    } else if (arg === '--brightness' && args[i + 1]) {
      result.brightness = parseFloat(args[++i]);
    } else if (arg === '--contrast' && args[i + 1]) {
      result.contrast = parseFloat(args[++i]);
    } else if (arg === '--sharpness' && args[i + 1]) {
      result.sharpness = parseFloat(args[++i]);
    } else if (arg === '--format' && args[i + 1]) {
      result.format = args[++i].toLowerCase();
    } else if (!arg.startsWith('-')) {
      if (!result.inputPath) {
        result.inputPath = arg;
      } else if (!result.outputPath) {
        result.outputPath = arg;
      }
    }

    i++;
  }

  return result;
}

function showHelp() {
  console.log(`
Local Image Editor - Perform local image edits without AI

Usage:
  node local-image-edit.js input_path [output_path] [options]

Arguments:
  input_path              Path to the input image
  output_path             Path to save the result (defaults to input_path if not provided)

Options:
  --grayscale, -g         Convert image to grayscale (monochrome)
  --blur <radius>         Apply Gaussian Blur radius (e.g., 2.0)
  --resize <W> <H>        Resize image to specific dimensions (e.g., 1440 810)
  --crop <W> <H>          Center crop to specific dimensions
  --rotate <degrees>      Rotate image clockwise (90, 180, 270)
  --brightness <factor>   Adjust brightness factor (0.0 to 2.0, default: 1.0)
  --contrast <factor>     Adjust contrast factor (0.0 to 2.0, default: 1.0)
  --sharpness <factor>    Adjust sharpness factor (0.0 to 2.0, default: 1.0)
  --format <type>         Force output format conversion (png, jpg, jpeg, webp)
  --help, -h              Show this help message

Examples:
  node local-image-edit.js input.png output.png --grayscale
  node local-image-edit.js photo.jpg --resize 800 600
  node local-image-edit.js image.png result.jpg --format jpg --brightness 1.2
`);
  process.exit(0);
}

async function processImage(options) {
  const { inputPath, outputPath: outPath, grayscale, blur, resize, crop, rotate, brightness, contrast, sharpness, format } = options;

  // Validate input
  if (!inputPath) {
    console.log('Error: Input file path is required');
    showHelp();
  }

  if (!existsSync(inputPath)) {
    console.log(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let outputPath = outPath || inputPath;

  try {
    console.log(`Opening: ${inputPath}`);
    let image = sharp(inputPath);
    const metadata = await image.metadata();

    // Handle format conversion and update output extension
    let outputFormat = format;
    if (outputFormat) {
      if (outputFormat === 'jpg') outputFormat = 'jpeg';

      // Update output extension if we're overwriting or implicit output
      if (!outPath || outPath === inputPath) {
        const base = basename(inputPath, extname(inputPath));
        const dir = dirname(inputPath);
        outputPath = `${dir}/${base}.${format}`;
      }
    }

    // 1. Rotation
    if (rotate) {
      console.log(`Rotating ${rotate} degrees...`);
      image = image.rotate(rotate);
    }

    // 2. Cropping (Center Crop)
    if (crop) {
      console.log(`Center cropping to ${crop.width}x${crop.height}...`);
      const left = Math.floor((metadata.width - crop.width) / 2);
      const top = Math.floor((metadata.height - crop.height) / 2);
      image = image.extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: Math.min(crop.width, metadata.width),
        height: Math.min(crop.height, metadata.height)
      });
    }

    // 3. Resize
    if (resize) {
      const currentWidth = crop ? crop.width : metadata.width;
      const currentHeight = crop ? crop.height : metadata.height;

      if (currentWidth !== resize.width || currentHeight !== resize.height) {
        console.log(`Resizing from ${currentWidth}x${currentHeight} to ${resize.width}x${resize.height}...`);
        image = image.resize(resize.width, resize.height, { fit: 'fill' });
      } else {
        console.log('Dimensions already match target. Skipping resize.');
      }
    }

    // 4. Grayscale (true grayscale color space, not just desaturated RGB)
    if (grayscale) {
      console.log('Converting to grayscale...');
      image = image.grayscale().toColorspace('b-w');
    }

    // 5. Blur
    if (blur && blur > 0) {
      console.log(`Applying blur (radius: ${blur})...`);
      image = image.blur(blur);
    }

    // 6. Enhancements - use modulate for brightness/contrast
    if (brightness !== 1.0 || contrast !== 1.0) {
      // Sharp doesn't have direct contrast, but we can use modulate for brightness
      // and linear for contrast-like effects
      if (brightness !== 1.0) {
        console.log(`Adjusting brightness: ${brightness}x`);
        image = image.modulate({ brightness });
      }
      if (contrast !== 1.0) {
        console.log(`Adjusting contrast: ${contrast}x`);
        // Linear transformation: output = (input - 128) * contrast + 128
        const a = contrast;
        const b = 128 * (1 - contrast);
        image = image.linear(a, b);
      }
    }

    // 7. Sharpness
    if (sharpness !== 1.0) {
      console.log(`Adjusting sharpness: ${sharpness}x`);
      if (sharpness > 1.0) {
        // Increase sharpness
        image = image.sharpen({ sigma: sharpness - 1 });
      } else {
        // Decrease sharpness (slight blur)
        image = image.blur(1 - sharpness);
      }
    }

    // Set output format
    if (outputFormat === 'jpeg') {
      image = image.jpeg({ quality: 90 });
    } else if (outputFormat === 'webp') {
      image = image.webp({ quality: 90 });
    } else {
      image = image.png({ compressionLevel: 9 });
    }

    // Save result
    console.log(`Saving to: ${outputPath}`);
    await image.toFile(outputPath);

    const fileSize = statSync(outputPath).size / 1024;
    console.log(`Done! File size: ${fileSize.toFixed(2)} KB`);
  } catch (e) {
    console.log(`Error processing image: ${e.message}`);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  showHelp();
}

const options = parseArgs(args);
await processImage(options);

