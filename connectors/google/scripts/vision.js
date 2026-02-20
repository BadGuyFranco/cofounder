#!/usr/bin/env node
/**
 * Google Cloud Vision API Operations
 * Face detection, landmark detection, label detection, text detection, and more.
 * 
 * Usage:
 *   node vision.js faces ./photo.jpg
 *   node vision.js labels ./photo.jpg
 *   node vision.js text ./photo.jpg
 *   node vision.js objects ./photo.jpg
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

// Local modules
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  loadConfig,
  isApiEnabled
} from './utils.js';
import { getAuthClient } from './auth.js';

/**
 * Get Vision API client
 */
async function getVisionClient(account) {
  const auth = await getAuthClient(account);
  return google.vision({ version: 'v1', auth });
}

/**
 * Read image and convert to base64
 */
function readImageAsBase64(imagePath) {
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  
  const imageBuffer = readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Detect faces in an image
 * Returns detailed face landmarks including eye positions
 */
async function detectFaces(imagePath, options = {}) {
  const { account } = loadConfig(options.account);
  
  if (!isApiEnabled(account, 'vision')) {
    throw new Error(
      `Cloud Vision API not enabled for ${account}.\n` +
      'Enable it in Google Cloud Console: APIs & Services > Library > Cloud Vision API'
    );
  }
  
  const vision = await getVisionClient(account);
  const imageContent = readImageAsBase64(imagePath);
  
  const request = {
    image: { content: imageContent },
    features: [{ type: 'FACE_DETECTION', maxResults: options.maxResults || 10 }]
  };
  
  const result = await vision.images.annotate({
    requestBody: { requests: [request] }
  });
  
  const response = result.data.responses[0];
  
  if (response.error) {
    throw new Error(`Vision API error: ${response.error.message}`);
  }
  
  const faces = response.faceAnnotations || [];
  
  // Transform to a more usable format
  return faces.map((face, index) => {
    const landmarks = {};
    
    // Extract key landmarks
    for (const landmark of face.landmarks || []) {
      landmarks[landmark.type] = {
        x: landmark.position.x,
        y: landmark.position.y,
        z: landmark.position.z
      };
    }
    
    // Calculate useful derived values
    const leftEye = landmarks.LEFT_EYE;
    const rightEye = landmarks.RIGHT_EYE;
    let interEyeDistance = null;
    let eyeMidpoint = null;
    
    if (leftEye && rightEye) {
      interEyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) +
        Math.pow(rightEye.y - leftEye.y, 2)
      );
      eyeMidpoint = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
      };
    }
    
    return {
      index,
      confidence: face.detectionConfidence,
      boundingBox: {
        vertices: face.boundingPoly?.vertices || []
      },
      landmarks: {
        leftEye,
        rightEye,
        leftEyebrowUpperMidpoint: landmarks.LEFT_EYEBROW_UPPER_MIDPOINT,
        rightEyebrowUpperMidpoint: landmarks.RIGHT_EYEBROW_UPPER_MIDPOINT,
        noseTip: landmarks.NOSE_TIP,
        noseBottom: landmarks.NOSE_BOTTOM_CENTER,
        upperLip: landmarks.UPPER_LIP,
        lowerLip: landmarks.LOWER_LIP,
        mouthLeft: landmarks.MOUTH_LEFT,
        mouthRight: landmarks.MOUTH_RIGHT,
        mouthCenter: landmarks.MOUTH_CENTER,
        chinGnathion: landmarks.CHIN_GNATHION,
        foreheadGlabella: landmarks.FOREHEAD_GLABELLA
      },
      derived: {
        interEyeDistance,
        eyeMidpoint
      },
      angles: {
        roll: face.rollAngle,
        pan: face.panAngle,
        tilt: face.tiltAngle
      },
      expressions: {
        joy: face.joyLikelihood,
        sorrow: face.sorrowLikelihood,
        anger: face.angerLikelihood,
        surprise: face.surpriseLikelihood
      }
    };
  });
}

/**
 * Detect labels (objects, concepts) in an image
 */
async function detectLabels(imagePath, options = {}) {
  const { account } = loadConfig(options.account);
  
  if (!isApiEnabled(account, 'vision')) {
    throw new Error(`Cloud Vision API not enabled for ${account}.`);
  }
  
  const vision = await getVisionClient(account);
  const imageContent = readImageAsBase64(imagePath);
  
  const request = {
    image: { content: imageContent },
    features: [{ type: 'LABEL_DETECTION', maxResults: options.maxResults || 20 }]
  };
  
  const result = await vision.images.annotate({
    requestBody: { requests: [request] }
  });
  
  const response = result.data.responses[0];
  
  if (response.error) {
    throw new Error(`Vision API error: ${response.error.message}`);
  }
  
  return (response.labelAnnotations || []).map(label => ({
    description: label.description,
    score: label.score,
    topicality: label.topicality
  }));
}

/**
 * Detect text (OCR) in an image
 */
async function detectText(imagePath, options = {}) {
  const { account } = loadConfig(options.account);
  
  if (!isApiEnabled(account, 'vision')) {
    throw new Error(`Cloud Vision API not enabled for ${account}.`);
  }
  
  const vision = await getVisionClient(account);
  const imageContent = readImageAsBase64(imagePath);
  
  const featureType = options.document ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
  
  const request = {
    image: { content: imageContent },
    features: [{ type: featureType }]
  };
  
  const result = await vision.images.annotate({
    requestBody: { requests: [request] }
  });
  
  const response = result.data.responses[0];
  
  if (response.error) {
    throw new Error(`Vision API error: ${response.error.message}`);
  }
  
  // Full text
  const fullText = response.fullTextAnnotation?.text || 
                   response.textAnnotations?.[0]?.description || '';
  
  // Individual text blocks
  const blocks = (response.textAnnotations || []).slice(1).map(annotation => ({
    text: annotation.description,
    boundingBox: annotation.boundingPoly?.vertices || []
  }));
  
  return {
    fullText,
    blocks
  };
}

/**
 * Detect objects in an image
 */
async function detectObjects(imagePath, options = {}) {
  const { account } = loadConfig(options.account);
  
  if (!isApiEnabled(account, 'vision')) {
    throw new Error(`Cloud Vision API not enabled for ${account}.`);
  }
  
  const vision = await getVisionClient(account);
  const imageContent = readImageAsBase64(imagePath);
  
  const request = {
    image: { content: imageContent },
    features: [{ type: 'OBJECT_LOCALIZATION', maxResults: options.maxResults || 20 }]
  };
  
  const result = await vision.images.annotate({
    requestBody: { requests: [request] }
  });
  
  const response = result.data.responses[0];
  
  if (response.error) {
    throw new Error(`Vision API error: ${response.error.message}`);
  }
  
  return (response.localizedObjectAnnotations || []).map(obj => ({
    name: obj.name,
    score: obj.score,
    boundingBox: {
      normalizedVertices: obj.boundingPoly?.normalizedVertices || []
    }
  }));
}

/**
 * Format faces output for display
 */
function formatFaces(faces, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(faces, null, 2));
    return;
  }
  
  if (faces.length === 0) {
    console.log('No faces detected.');
    return;
  }
  
  console.log(`\nDetected ${faces.length} face(s):\n`);
  
  for (const face of faces) {
    console.log(`Face ${face.index + 1}:`);
    console.log(`  Confidence: ${(face.confidence * 100).toFixed(1)}%`);
    
    if (face.landmarks.leftEye && face.landmarks.rightEye) {
      console.log(`  Left Eye: (${face.landmarks.leftEye.x.toFixed(1)}, ${face.landmarks.leftEye.y.toFixed(1)})`);
      console.log(`  Right Eye: (${face.landmarks.rightEye.x.toFixed(1)}, ${face.landmarks.rightEye.y.toFixed(1)})`);
    }
    
    if (face.derived.interEyeDistance) {
      console.log(`  Inter-eye Distance: ${face.derived.interEyeDistance.toFixed(1)}px`);
    }
    
    if (face.derived.eyeMidpoint) {
      console.log(`  Eye Midpoint: (${face.derived.eyeMidpoint.x.toFixed(1)}, ${face.derived.eyeMidpoint.y.toFixed(1)})`);
    }
    
    console.log(`  Angles: roll=${face.angles.roll?.toFixed(1)}°, pan=${face.angles.pan?.toFixed(1)}°, tilt=${face.angles.tilt?.toFixed(1)}°`);
    
    const expressions = Object.entries(face.expressions)
      .filter(([, v]) => v && v !== 'VERY_UNLIKELY' && v !== 'UNLIKELY')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    if (expressions) {
      console.log(`  Expressions: ${expressions}`);
    }
    
    console.log('');
  }
}

/**
 * Format labels output for display
 */
function formatLabels(labels, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(labels, null, 2));
    return;
  }
  
  if (labels.length === 0) {
    console.log('No labels detected.');
    return;
  }
  
  console.log(`\nDetected ${labels.length} label(s):\n`);
  
  for (const label of labels) {
    const score = (label.score * 100).toFixed(0);
    console.log(`  ${label.description} (${score}%)`);
  }
  console.log('');
}

/**
 * Format text output for display
 */
function formatText(result, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  if (!result.fullText) {
    console.log('No text detected.');
    return;
  }
  
  console.log('\nDetected text:\n');
  console.log(result.fullText);
  console.log('');
}

/**
 * Format objects output for display
 */
function formatObjects(objects, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(objects, null, 2));
    return;
  }
  
  if (objects.length === 0) {
    console.log('No objects detected.');
    return;
  }
  
  console.log(`\nDetected ${objects.length} object(s):\n`);
  
  for (const obj of objects) {
    const score = (obj.score * 100).toFixed(0);
    console.log(`  ${obj.name} (${score}%)`);
  }
  console.log('');
}

// =============================================================================
// CLI
// =============================================================================

const HELP_TEXT = `
Google Cloud Vision API Operations

Commands:
  faces IMAGE_PATH         Detect faces and landmarks
  labels IMAGE_PATH        Detect labels (objects, concepts)
  text IMAGE_PATH          Detect text (OCR)
  objects IMAGE_PATH       Detect and localize objects
  help                     Show this help

Options:
  --account EMAIL          Google account to use
  --json                   Output as JSON
  --max-results N          Max results to return (default varies by command)
  --document               For text: use document detection (better for dense text)

Examples:
  node vision.js faces ./headshot.jpg
  node vision.js faces ./photo.jpg --json
  node vision.js labels ./scene.jpg --max-results 10
  node vision.js text ./document.png --document
  node vision.js objects ./room.jpg

Face Detection Output:
  Returns face landmarks including:
  - Eye positions (LEFT_EYE, RIGHT_EYE)
  - Nose, mouth, eyebrow positions
  - Inter-eye distance and eye midpoint
  - Face angles (roll, pan, tilt)
  - Expression likelihoods

Notes:
  Requires Cloud Vision API enabled in Google Cloud Console.
  Uses OAuth credentials (same as Drive, Gmail, etc.).
`;

async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));
  
  if (!command || command === 'help' || flags.help || flags.h) {
    showHelp(HELP_TEXT);
    return;
  }
  
  const options = {
    account: flags.account,
    json: flags.json,
    maxResults: flags['max-results'] ? parseInt(flags['max-results']) : undefined,
    document: flags.document
  };
  
  try {
    switch (command) {
      case 'faces': {
        const imagePath = args[0];
        if (!imagePath) {
          throw new Error('Image path required. Usage: node vision.js faces IMAGE_PATH');
        }
        const faces = await detectFaces(imagePath, options);
        formatFaces(faces, options);
        break;
      }
      
      case 'labels': {
        const imagePath = args[0];
        if (!imagePath) {
          throw new Error('Image path required. Usage: node vision.js labels IMAGE_PATH');
        }
        const labels = await detectLabels(imagePath, options);
        formatLabels(labels, options);
        break;
      }
      
      case 'text': {
        const imagePath = args[0];
        if (!imagePath) {
          throw new Error('Image path required. Usage: node vision.js text IMAGE_PATH');
        }
        const result = await detectText(imagePath, options);
        formatText(result, options);
        break;
      }
      
      case 'objects': {
        const imagePath = args[0];
        if (!imagePath) {
          throw new Error('Image path required. Usage: node vision.js objects IMAGE_PATH');
        }
        const objects = await detectObjects(imagePath, options);
        formatObjects(objects, options);
        break;
      }
      
      default:
        throw new Error(`Unknown command: ${command}. Run 'node vision.js help' for usage.`);
    }
  } catch (error) {
    outputError(error);
  }
}

// Export functions for programmatic use
export {
  detectFaces,
  detectLabels,
  detectText,
  detectObjects
};

main();
