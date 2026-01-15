#!/usr/bin/env node
/**
 * Local Video Editing Script using FFmpeg
 * Provides video editing capabilities without API calls
 *
 * Note: Requires FFmpeg to be installed on the system
 * Install: conda install -y ffmpeg (Miniforge) or brew install ffmpeg (macOS) or apt install ffmpeg (Linux)
 */

import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, extname, join } from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Trim video to specified time range
 */
function trimVideo(inputPath, outputPath, start, end) {
  return new Promise((resolve, reject) => {
    console.log(`Trimming video: ${start}s to ${end}s`);

    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(end - start)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Resize video to specified dimensions
 */
function resizeVideo(inputPath, outputPath, width, height) {
  return new Promise((resolve, reject) => {
    console.log(`Resizing video to ${width}x${height}`);

    ffmpeg(inputPath)
      .size(`${width}x${height}`)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Change video playback speed
 */
function changeSpeed(inputPath, outputPath, factor) {
  return new Promise((resolve, reject) => {
    if (factor > 1) {
      console.log(`Speeding up video by ${factor}x`);
    } else {
      console.log(`Slowing down video to ${factor}x`);
    }

    // Video speed filter: setpts=PTS/factor (faster) or setpts=PTS*factor (slower)
    const videoFilter = `setpts=${(1 / factor).toFixed(3)}*PTS`;
    // Audio speed filter: atempo supports 0.5-2.0 range
    const audioFilter = factor >= 0.5 && factor <= 2.0 ? `atempo=${factor}` : null;

    let command = ffmpeg(inputPath).videoFilters(videoFilter);

    if (audioFilter) {
      command = command.audioFilters(audioFilter);
    } else {
      // For extreme speed changes, remove audio
      command = command.noAudio();
    }

    command
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Add text overlay to video
 */
function addTextOverlay(inputPath, outputPath, text, position = 'center') {
  return new Promise((resolve, reject) => {
    console.log(`Adding text overlay: '${text}' at ${position}`);

    // Position mapping for drawtext filter
    let xPos, yPos;
    switch (position) {
      case 'top':
        xPos = '(w-text_w)/2';
        yPos = '50';
        break;
      case 'bottom':
        xPos = '(w-text_w)/2';
        yPos = 'h-100';
        break;
      default: // center
        xPos = '(w-text_w)/2';
        yPos = '(h-text_h)/2';
    }

    // Escape special characters in text
    const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

    ffmpeg(inputPath)
      .videoFilters(`drawtext=text='${escapedText}':fontsize=50:fontcolor=white:borderw=2:bordercolor=black:x=${xPos}:y=${yPos}`)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Remove audio from video
 */
function removeAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('Removing audio');

    ffmpeg(inputPath)
      .noAudio()
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Concatenate multiple videos
 */
function concatenateVideos(inputPaths, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Concatenating ${inputPaths.length} videos`);

    const command = ffmpeg();

    // Add all input files
    inputPaths.forEach(path => {
      command.input(path);
    });

    // Use concat filter
    const filterInputs = inputPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
    command
      .complexFilter(`${filterInputs}concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`, ['outv', 'outa'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Extract frames from video
 */
function extractFrames(inputPath, outputDir, fps = 1) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting frames at ${fps} fps`);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .outputOptions([`-vf fps=${fps}`])
      .output(join(outputDir, 'frame_%04d.png'))
      .on('end', () => {
        console.log(`Frames extracted to ${outputDir}`);
        resolve(outputDir);
      })
      .on('error', reject)
      .run();
  });
}

/**
 * Convert video to GIF
 */
function createGif(inputPath, outputPath, fps = 10) {
  return new Promise((resolve, reject) => {
    console.log(`Creating GIF at ${fps} fps`);

    ffmpeg(inputPath)
      .outputOptions([`-vf fps=${fps},scale=480:-1:flags=lanczos`, '-loop 0'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

// CLI
function showHelp() {
  console.log(`
Local Video Editor - Edit videos using FFmpeg (no AI required)

Usage:
  node local-video-edit.js <input> [output] [options]

Examples:
  # Trim video
  node local-video-edit.js input.mp4 output.mp4 --trim 5 15
  
  # Resize video
  node local-video-edit.js input.mp4 output.mp4 --resize 1280 720
  
  # Change speed (2x faster)
  node local-video-edit.js input.mp4 output.mp4 --speed 2.0
  
  # Add text overlay
  node local-video-edit.js input.mp4 output.mp4 --text "Hello World" --text-position center
  
  # Remove audio
  node local-video-edit.js input.mp4 output.mp4 --remove-audio
  
  # Concatenate videos
  node local-video-edit.js video1.mp4 video2.mp4 video3.mp4 --concat output.mp4
  
  # Extract frames
  node local-video-edit.js input.mp4 --extract-frames ./frames/ --fps 1
  
  # Create GIF
  node local-video-edit.js input.mp4 output.gif --gif --fps 10
  
  # Combine operations
  node local-video-edit.js input.mp4 output.mp4 --trim 0 10 --resize 640 360 --speed 1.5

Options:
  --trim <start> <end>          Trim to time range (seconds)
  --resize <width> <height>     Resize to dimensions
  --speed <factor>              Speed multiplier (0.5 = slow, 2.0 = fast)
  --text <text>                 Add text overlay
  --text-position <pos>         Text position: top, center, bottom (default: center)
  --remove-audio                Remove audio track
  --concat <output>             Concatenate multiple inputs to output
  --extract-frames <dir>        Extract frames to directory
  --gif                         Output as GIF
  --fps <number>                Frames per second (for extraction/GIF)
  --help, -h                    Show this help message

Requires: FFmpeg installed on system
  Miniforge: conda install -y ffmpeg
  macOS: brew install ffmpeg
  Linux: apt install ffmpeg
`);
  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

// Parse options
const options = {
  inputs: [],
  output: null,
  trim: null,
  resize: null,
  speed: null,
  text: null,
  textPosition: 'center',
  removeAudio: false,
  concat: null,
  extractFrames: null,
  gif: false,
  fps: 10
};

let i = 0;
while (i < args.length) {
  const arg = args[i];

  if (arg === '--trim' && args[i + 1] && args[i + 2]) {
    options.trim = { start: parseFloat(args[++i]), end: parseFloat(args[++i]) };
  } else if (arg === '--resize' && args[i + 1] && args[i + 2]) {
    options.resize = { width: parseInt(args[++i], 10), height: parseInt(args[++i], 10) };
  } else if (arg === '--speed' && args[i + 1]) {
    options.speed = parseFloat(args[++i]);
  } else if (arg === '--text' && args[i + 1]) {
    options.text = args[++i];
  } else if (arg === '--text-position' && args[i + 1]) {
    options.textPosition = args[++i];
  } else if (arg === '--remove-audio') {
    options.removeAudio = true;
  } else if (arg === '--concat' && args[i + 1]) {
    options.concat = args[++i];
  } else if (arg === '--extract-frames' && args[i + 1]) {
    options.extractFrames = args[++i];
  } else if (arg === '--gif') {
    options.gif = true;
  } else if (arg === '--fps' && args[i + 1]) {
    options.fps = parseInt(args[++i], 10);
  } else if (!arg.startsWith('-')) {
    options.inputs.push(arg);
  }

  i++;
}

// Handle special modes
async function main() {
  try {
    // Concatenation mode
    if (options.concat) {
      await concatenateVideos(options.inputs, options.concat);
      const fileSize = statSync(options.concat).size / 1024;
      console.log(`\nSuccess! Video saved to: ${options.concat}`);
      console.log(`File size: ${fileSize.toFixed(2)} KB`);
      return;
    }

    // Frame extraction mode
    if (options.extractFrames) {
      await extractFrames(options.inputs[0], options.extractFrames, options.fps);
      console.log(`\nSuccess! Frames extracted to: ${options.extractFrames}`);
      return;
    }

    // Require input and output for other operations
    if (options.inputs.length < 1) {
      console.log('Error: Input file required');
      showHelp();
    }

    const inputPath = options.inputs[0];

    // Determine output path
    let outputPath = options.inputs[1];

    // GIF mode
    if (options.gif) {
      if (!outputPath) {
        outputPath = basename(inputPath, extname(inputPath)) + '.gif';
      }
      await createGif(inputPath, outputPath, options.fps);
      const fileSize = statSync(outputPath).size / 1024;
      console.log(`\nSuccess! GIF saved to: ${outputPath}`);
      console.log(`File size: ${fileSize.toFixed(2)} KB`);
      return;
    }

    if (!outputPath) {
      console.log('Error: Output path required');
      showHelp();
    }

    // Check if any operation is specified
    const hasOperation = options.trim || options.resize || options.speed ||
      options.text || options.removeAudio;

    if (!hasOperation) {
      console.log('Error: No operation specified');
      showHelp();
    }

    // Apply operations sequentially using temp files
    let currentInput = inputPath;
    const tempFiles = [];
    const operations = [];

    if (options.trim) operations.push(['trim', options.trim]);
    if (options.resize) operations.push(['resize', options.resize]);
    if (options.speed) operations.push(['speed', options.speed]);
    if (options.text) operations.push(['text', { text: options.text, position: options.textPosition }]);
    if (options.removeAudio) operations.push(['removeAudio', null]);

    for (let j = 0; j < operations.length; j++) {
      const [op, params] = operations[j];
      const isLast = j === operations.length - 1;
      const currentOutput = isLast ? outputPath : `/tmp/video_edit_${Date.now()}_${j}.mp4`;

      if (!isLast) {
        tempFiles.push(currentOutput);
      }

      switch (op) {
        case 'trim':
          await trimVideo(currentInput, currentOutput, params.start, params.end);
          break;
        case 'resize':
          await resizeVideo(currentInput, currentOutput, params.width, params.height);
          break;
        case 'speed':
          await changeSpeed(currentInput, currentOutput, params);
          break;
        case 'text':
          await addTextOverlay(currentInput, currentOutput, params.text, params.position);
          break;
        case 'removeAudio':
          await removeAudio(currentInput, currentOutput);
          break;
      }

      currentInput = currentOutput;
    }

    // Clean up temp files
    for (const tempFile of tempFiles) {
      try {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    const fileSize = statSync(outputPath).size / 1024;
    console.log(`\nSuccess! Video saved to: ${outputPath}`);
    console.log(`File size: ${fileSize.toFixed(2)} KB`);
  } catch (e) {
    console.log(`Error: ${e.message}`);

    if (e.message.includes('ENOENT') || e.message.includes('ffmpeg')) {
      console.log('\nFFmpeg may not be installed. Install with:');
      console.log('  Miniforge: conda install -y ffmpeg');
      console.log('  macOS: brew install ffmpeg');
      console.log('  Linux: apt install ffmpeg');
    }

    process.exit(1);
  }
}

main();

