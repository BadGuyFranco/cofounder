#!/usr/bin/env node
/**
 * Google Slides operations: create, read, add slides, export.
 * 
 * Usage:
 *   node slides.js create --title "My Presentation" --account user@example.com
 *   node slides.js read --id PRES_ID --account user@example.com
 *   node slides.js add-slide --id PRES_ID --layout TITLE_AND_BODY --title "Slide Title" --body "Content" --account user@example.com
 *   node slides.js export --id PRES_ID --format pptx --output ./presentation.pptx --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';

// Local modules
import { getAuthClient } from './auth.js';
import { getFolderId, moveFile, exportFile, EXPORT_TYPES } from './drive.js';
import {
  parseCliArgs,
  hasHelpFlag,
  output,
  outputError,
  requireFlag
} from '../../../../system/shared/cli-utils.js';

/**
 * Get Slides API instance
 */
async function getSlidesApi(email) {
  const auth = await getAuthClient(email);
  return google.slides({ version: 'v1', auth });
}

/**
 * Predefined layout types
 */
const LAYOUTS = {
  BLANK: 'BLANK',
  TITLE: 'TITLE',
  TITLE_AND_BODY: 'TITLE_AND_BODY',
  TITLE_AND_TWO_COLUMNS: 'TITLE_AND_TWO_COLUMNS',
  TITLE_ONLY: 'TITLE_ONLY',
  SECTION_HEADER: 'SECTION_HEADER',
  SECTION_TITLE_AND_DESCRIPTION: 'SECTION_TITLE_AND_DESCRIPTION',
  ONE_COLUMN_TEXT: 'ONE_COLUMN_TEXT',
  MAIN_POINT: 'MAIN_POINT',
  BIG_NUMBER: 'BIG_NUMBER'
};

/**
 * Create a new Google Slides presentation
 */
export async function createPresentation(email, title, options = {}) {
  const slides = await getSlidesApi(email);
  
  // Create the presentation
  const presentation = await slides.presentations.create({
    requestBody: { title }
  });
  
  const presId = presentation.data.presentationId;
  
  // Move to folder if specified
  if (options.folder) {
    const folderId = await getFolderId(email, options.folder);
    await moveFile(email, presId, folderId);
  }
  
  return {
    id: presId,
    title: presentation.data.title,
    url: `https://docs.google.com/presentation/d/${presId}/edit`,
    slideCount: presentation.data.slides?.length || 1
  };
}

/**
 * Read presentation metadata and content
 */
export async function readPresentation(email, presId) {
  const slides = await getSlidesApi(email);
  
  const presentation = await slides.presentations.get({
    presentationId: presId
  });
  
  // Extract slide summaries
  const slideSummaries = (presentation.data.slides || []).map((slide, index) => {
    let title = '';
    let body = '';
    
    // Find title and body elements
    for (const element of slide.pageElements || []) {
      if (element.shape?.placeholder?.type === 'TITLE') {
        title = extractText(element.shape);
      } else if (element.shape?.placeholder?.type === 'BODY') {
        body = extractText(element.shape);
      }
    }
    
    return {
      index: index + 1,
      objectId: slide.objectId,
      title: title.trim(),
      bodyPreview: body.trim().substring(0, 100)
    };
  });
  
  return {
    id: presId,
    title: presentation.data.title,
    url: `https://docs.google.com/presentation/d/${presId}/edit`,
    slideCount: slideSummaries.length,
    slides: slideSummaries
  };
}

/**
 * Extract text from a shape element
 */
function extractText(shape) {
  let text = '';
  const textElements = shape.text?.textElements || [];
  for (const elem of textElements) {
    if (elem.textRun) {
      text += elem.textRun.content;
    }
  }
  return text;
}

/**
 * Add a new slide to a presentation
 */
export async function addSlide(email, presId, options = {}) {
  const slides = await getSlidesApi(email);
  
  const layout = options.layout || 'TITLE_AND_BODY';
  const slideId = `slide_${Date.now()}`;
  
  // Step 1: Create the slide
  await slides.presentations.batchUpdate({
    presentationId: presId,
    requestBody: {
      requests: [{
        createSlide: {
          objectId: slideId,
          slideLayoutReference: {
            predefinedLayout: layout
          }
        }
      }]
    }
  });
  
  // Step 2: If we have content, get the slide to find placeholder IDs
  if (options.title || options.body) {
    const presentation = await slides.presentations.get({
      presentationId: presId
    });
    
    // Find our newly created slide
    const slide = presentation.data.slides.find(s => s.objectId === slideId);
    if (slide) {
      const textRequests = [];
      
      for (const element of slide.pageElements || []) {
        const placeholder = element.shape?.placeholder;
        if (placeholder) {
          if (placeholder.type === 'TITLE' || placeholder.type === 'CENTERED_TITLE') {
            if (options.title) {
              textRequests.push({
                insertText: {
                  objectId: element.objectId,
                  text: options.title,
                  insertionIndex: 0
                }
              });
            }
          } else if (placeholder.type === 'BODY' || placeholder.type === 'SUBTITLE') {
            if (options.body) {
              textRequests.push({
                insertText: {
                  objectId: element.objectId,
                  text: options.body,
                  insertionIndex: 0
                }
              });
            }
          }
        }
      }
      
      // Step 3: Insert text into placeholders
      if (textRequests.length > 0) {
        await slides.presentations.batchUpdate({
          presentationId: presId,
          requestBody: { requests: textRequests }
        });
      }
    }
  }
  
  return {
    id: presId,
    slideId,
    added: true
  };
}

/**
 * Add speaker notes to a slide
 */
export async function addSpeakerNotes(email, presId, slideObjectId, notes) {
  const slides = await getSlidesApi(email);
  
  // Get the presentation to find the speaker notes shape ID
  const presentation = await slides.presentations.get({
    presentationId: presId
  });
  
  // Find the slide
  const slide = presentation.data.slides.find(s => s.objectId === slideObjectId);
  if (!slide) {
    throw new Error(`Slide not found: ${slideObjectId}`);
  }
  
  // Get the speaker notes object ID from the slide's notes properties
  const notesPage = slide.slideProperties?.notesPage;
  if (!notesPage) {
    throw new Error('Slide does not have a notes page');
  }
  
  // Find the body shape in the notes page
  let notesShapeId = null;
  for (const element of notesPage.pageElements || []) {
    if (element.shape?.placeholder?.type === 'BODY') {
      notesShapeId = element.objectId;
      break;
    }
  }
  
  if (!notesShapeId) {
    throw new Error('Could not find speaker notes shape');
  }
  
  // Insert the notes text
  await slides.presentations.batchUpdate({
    presentationId: presId,
    requestBody: {
      requests: [{
        insertText: {
          objectId: notesShapeId,
          text: notes,
          insertionIndex: 0
        }
      }]
    }
  });
  
  return {
    id: presId,
    slideId: slideObjectId,
    notesAdded: true
  };
}

/**
 * Delete a slide from a presentation
 */
export async function deleteSlide(email, presId, slideObjectId) {
  const slides = await getSlidesApi(email);
  
  await slides.presentations.batchUpdate({
    presentationId: presId,
    requestBody: {
      requests: [{
        deleteObject: {
          objectId: slideObjectId
        }
      }]
    }
  });
  
  return {
    id: presId,
    deleted: slideObjectId
  };
}

/**
 * Export Google Slides to local file
 */
export async function exportPresentation(email, presId, format, outputPath) {
  const mimeType = EXPORT_TYPES[format.toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unknown format: ${format}. Available: pptx, odp, pdf`);
  }
  
  return exportFile(email, presId, mimeType, outputPath);
}

// CLI
function showHelp() {
  console.log(`
Google Slides operations: create, read, add slides, export.

Usage:
  node slides.js <command> [options]

Commands:
  create       Create a new Google Slides presentation
  read         Read presentation metadata and slides
  add-slide    Add a new slide to a presentation
  add-notes    Add speaker notes to a slide
  delete-slide Delete a slide from a presentation
  export       Export a presentation to local file

Options:
  --account EMAIL    Google account email (required)
  --id PRES_ID       Presentation ID (required for read/add-slide/add-notes/delete-slide/export)
  --title TITLE      Presentation or slide title
  --folder PATH      Folder path like "Shared drives/Work" (optional for create)
  --layout LAYOUT    Slide layout (for add-slide)
  --body TEXT        Slide body content (for add-slide)
  --slide-id ID      Slide object ID (for delete-slide, add-notes)
  --notes TEXT       Speaker notes content (for add-notes)
  --format FORMAT    Export format: pptx, odp, pdf
  --output PATH      Output file path (required for export)
  --json             Output result as JSON
  --help, -h         Show this help message

Layouts:
  BLANK, TITLE, TITLE_AND_BODY, TITLE_AND_TWO_COLUMNS, TITLE_ONLY,
  SECTION_HEADER, SECTION_TITLE_AND_DESCRIPTION, ONE_COLUMN_TEXT,
  MAIN_POINT, BIG_NUMBER

Examples:
  node slides.js create --title "Q4 Review" --account user@example.com
  node slides.js create --title "Report" --folder "Shared drives/Work" --account user@example.com
  node slides.js read --id abc123 --account user@example.com
  node slides.js add-slide --id abc123 --layout TITLE_AND_BODY --title "Agenda" --body "Topics for today" --account user@example.com
  node slides.js delete-slide --id abc123 --slide-id g123 --account user@example.com
  node slides.js export --id abc123 --format pptx --output ./presentation.pptx --account user@example.com
`);
  process.exit(0);
}

// Parse CLI arguments
const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length === 0 || hasHelpFlag(flags)) {
  showHelp();
}

const command = positional[0];
const account = flags.account;
const id = flags.id;
const title = flags.title;
const folder = flags.folder;
const layout = flags.layout;
const body = flags.body;
const slideId = flags['slide-id'];
const notes = flags.notes;
const format = flags.format;
const outputPath = flags.output;
const jsonOutput = Boolean(flags.json);

try {
  requireFlag(flags, 'account');
  let result;
  
  switch (command) {
    case 'create':
      requireFlag(flags, 'title', 'create');
      result = await createPresentation(account, title, { folder });
      break;
      
    case 'read':
      requireFlag(flags, 'id', 'read');
      result = await readPresentation(account, id);
      break;
      
    case 'add-slide':
      requireFlag(flags, 'id', 'add-slide');
      result = await addSlide(account, id, { layout, title, body });
      break;
      
    case 'add-notes':
      requireFlag(flags, 'id', 'add-notes');
      requireFlag(flags, 'slide-id', 'add-notes');
      requireFlag(flags, 'notes', 'add-notes');
      result = await addSpeakerNotes(account, id, slideId, notes);
      break;
      
    case 'delete-slide':
      requireFlag(flags, 'id', 'delete-slide');
      requireFlag(flags, 'slide-id', 'delete-slide');
      result = await deleteSlide(account, id, slideId);
      break;
      
    case 'export':
      requireFlag(flags, 'id', 'export');
      requireFlag(flags, 'format', 'export');
      requireFlag(flags, 'output', 'export');
      result = await exportPresentation(account, id, format, outputPath);
      result = { exported: result };
      break;
      
    default:
      outputError(`Unknown command: ${command}`);
      showHelp();
  }
  
  output(result, {
    json: jsonOutput,
    formatter: (dataResult) => {
      if (dataResult.url) {
        console.log(`\nPresentation: ${dataResult.title || dataResult.id}`);
        console.log(`URL: ${dataResult.url}`);
        if (dataResult.slides) {
          console.log(`\nSlides (${dataResult.slideCount}):`);
          dataResult.slides.forEach((s) => {
            console.log(`  ${s.index}. ${s.title || '(untitled)'}`);
          });
        }
        return;
      }
      if (dataResult.exported) {
        console.log(`\nExported to: ${dataResult.exported}`);
        return;
      }
      if (dataResult.added) {
        console.log(`\nSlide added: ${dataResult.slideId}`);
        return;
      }
      if (dataResult.notesAdded) {
        console.log(`\nSpeaker notes added to slide: ${dataResult.slideId}`);
        return;
      }
      if (dataResult.deleted) {
        console.log(`\nSlide deleted: ${dataResult.deleted}`);
      }
    }
  });
} catch (error) {
  outputError(error);
}

