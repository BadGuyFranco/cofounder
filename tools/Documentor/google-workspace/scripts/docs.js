#!/usr/bin/env node
/**
 * Google Docs operations: create, read, edit, export.
 * 
 * For collaboration features (markers, suggestions), see collaboration.js
 * 
 * Usage:
 *   node docs.js create --title "My Doc" --account user@example.com
 *   node docs.js create --title "My Doc" --folder "Shared drives/Work" --content content.md --account user@example.com
 *   node docs.js read --id DOC_ID --account user@example.com
 *   node docs.js edit --id DOC_ID --content updates.md --account user@example.com
 *   node docs.js export --id DOC_ID --format pdf --output ./doc.pdf --account user@example.com
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { getAuthClient } from './auth.js';
import { getFolderId, moveFile, exportFile, EXPORT_TYPES, getLocalPath } from './drive.js';

// Re-export collaboration functions for convenience
export { 
  findTextPosition,
  findAndReplace,
  addInlineMarker,
  createNamedRange,
  addAnchoredComment,
  listSuggestions,
  acceptSuggestion,
  suggestEdit,
  updateHeadingStyle,
  MARKER_COLORS
} from './collaboration.js';

/**
 * Parse markdown and convert to Google Docs API requests
 * Returns { plainText, formatRequests } where formatRequests are applied after text insertion
 */
function parseMarkdownToDocRequests(markdown) {
  // Strip HTML comments
  const cleanedMarkdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
  
  const lines = cleanedMarkdown.split('\n');
  const segments = []; // { text, type, level? }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      segments.push({ text: headingMatch[2] + '\n', type: 'heading', level });
      continue;
    }
    
    // Empty lines
    if (line.trim() === '') {
      segments.push({ text: '\n', type: 'normal' });
      continue;
    }
    
    // Normal text (may contain bold/italic)
    segments.push({ text: line + '\n', type: 'normal' });
  }
  
  // Build plain text and track positions for formatting
  let plainText = '';
  const formatRequests = [];
  
  for (const segment of segments) {
    const startIndex = plainText.length + 1; // +1 because doc starts at index 1
    
    if (segment.type === 'heading') {
      // Process inline formatting within the heading
      const { text: processedText, inlineFormats } = processInlineFormatting(segment.text, startIndex);
      plainText += processedText;
      const endIndex = plainText.length + 1;
      
      // Map heading level to Google Docs named style
      const headingStyle = segment.level === 1 ? 'HEADING_1' :
                          segment.level === 2 ? 'HEADING_2' :
                          segment.level === 3 ? 'HEADING_3' :
                          segment.level === 4 ? 'HEADING_4' :
                          segment.level === 5 ? 'HEADING_5' : 'HEADING_6';
      
      formatRequests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: { namedStyleType: headingStyle },
          fields: 'namedStyleType'
        }
      });
      
      // Add any inline formatting
      formatRequests.push(...inlineFormats);
    } else {
      // Process inline formatting (bold, italic)
      const { text: processedText, inlineFormats } = processInlineFormatting(segment.text, startIndex);
      plainText += processedText;
      formatRequests.push(...inlineFormats);
    }
  }
  
  return { plainText, formatRequests };
}

/**
 * Process inline markdown formatting (bold, italic) and return clean text + format requests
 */
function processInlineFormatting(text, baseIndex) {
  const formats = [];
  let cleanText = '';
  
  // First pass: extract bold markers
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before this match
    cleanText += text.slice(lastIndex, match.index);
    
    const boldText = match[1] || match[2];
    const startInClean = cleanText.length;
    cleanText += boldText;
    const endInClean = cleanText.length;
    
    formats.push({
      updateTextStyle: {
        range: {
          startIndex: baseIndex + startInClean,
          endIndex: baseIndex + endInClean
        },
        textStyle: { bold: true },
        fields: 'bold'
      }
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last match
  cleanText += text.slice(lastIndex);
  
  // Second pass: process italic on the clean text (after bold markers removed)
  const italicRegex = /\*(.+?)\*|_(.+?)_/g;
  let finalText = '';
  lastIndex = 0;
  
  while ((match = italicRegex.exec(cleanText)) !== null) {
    finalText += cleanText.slice(lastIndex, match.index);
    
    const italText = match[1] || match[2];
    const startInFinal = finalText.length;
    finalText += italText;
    const endInFinal = finalText.length;
    
    formats.push({
      updateTextStyle: {
        range: {
          startIndex: baseIndex + startInFinal,
          endIndex: baseIndex + endInFinal
        },
        textStyle: { italic: true },
        fields: 'italic'
      }
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  finalText += cleanText.slice(lastIndex);
  
  return { text: finalText, inlineFormats: formats };
}

/**
 * Get Docs API instance
 */
async function getDocsApi(email) {
  const auth = await getAuthClient(email);
  return google.docs({ version: 'v1', auth });
}

/**
 * Get Drive API instance
 */
async function getDriveApi(email) {
  const auth = await getAuthClient(email);
  return google.drive({ version: 'v3', auth });
}

/**
 * Create a new Google Doc
 */
export async function createDoc(email, title, options = {}) {
  const docs = await getDocsApi(email);
  
  // Create the document
  const doc = await docs.documents.create({
    requestBody: { title }
  });
  
  const docId = doc.data.documentId;
  
  // Move to folder if specified
  if (options.folder) {
    const folderId = await getFolderId(email, options.folder);
    await moveFile(email, docId, folderId);
  }
  
  // Add content if specified
  if (options.content) {
    let text;
    if (existsSync(options.content)) {
      text = readFileSync(options.content, 'utf-8');
    } else {
      text = options.content;
    }
    
    // Check if content appears to be markdown (has markdown patterns)
    const isMarkdown = options.content.endsWith('.md') || 
                       /^#{1,6}\s|^\*\*|\*\*$|^\*[^*]|[^*]\*$/m.test(text);
    
    if (isMarkdown) {
      // Parse markdown and apply formatting
      const { plainText, formatRequests } = parseMarkdownToDocRequests(text);
      
      // First insert the plain text
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: plainText
            }
          }]
        }
      });
      
      // Then apply formatting if we have any
      if (formatRequests.length > 0) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: {
            requests: formatRequests
          }
        });
      }
    } else {
      // Plain text, insert as-is
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text
            }
          }]
        }
      });
    }
  }
  
  return {
    id: docId,
    title: doc.data.title,
    url: `https://docs.google.com/document/d/${docId}/edit`
  };
}

/**
 * Read a Google Doc's content
 */
export async function readDoc(email, docId) {
  const docs = await getDocsApi(email);
  
  const doc = await docs.documents.get({
    documentId: docId
  });
  
  // Extract text content
  let text = '';
  const content = doc.data.body?.content || [];
  
  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun) {
          text += elem.textRun.content;
        }
      }
    }
  }
  
  return {
    id: docId,
    title: doc.data.title,
    text,
    url: `https://docs.google.com/document/d/${docId}/edit`
  };
}

/**
 * Update document-wide style settings (margins, page size)
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @param {object} style - Style options
 * @param {number|object} style.margins - Margins in inches. Number for all sides, or { top, bottom, left, right }
 * @param {object} style.pageSize - Page dimensions in inches { width, height }
 * @param {object} style.background - Background color { red, green, blue } (0-1 range)
 */
export async function updateDocumentStyle(email, docId, style = {}) {
  const docs = await getDocsApi(email);
  
  const documentStyle = {};
  const fields = [];
  
  // Handle margins (convert inches to points: 1 inch = 72 points)
  if (style.margins !== undefined) {
    if (typeof style.margins === 'number') {
      // Same margin all sides
      const pts = style.margins * 72;
      documentStyle.marginTop = { magnitude: pts, unit: 'PT' };
      documentStyle.marginBottom = { magnitude: pts, unit: 'PT' };
      documentStyle.marginLeft = { magnitude: pts, unit: 'PT' };
      documentStyle.marginRight = { magnitude: pts, unit: 'PT' };
      fields.push('marginTop', 'marginBottom', 'marginLeft', 'marginRight');
    } else {
      // Individual margins
      if (style.margins.top !== undefined) {
        documentStyle.marginTop = { magnitude: style.margins.top * 72, unit: 'PT' };
        fields.push('marginTop');
      }
      if (style.margins.bottom !== undefined) {
        documentStyle.marginBottom = { magnitude: style.margins.bottom * 72, unit: 'PT' };
        fields.push('marginBottom');
      }
      if (style.margins.left !== undefined) {
        documentStyle.marginLeft = { magnitude: style.margins.left * 72, unit: 'PT' };
        fields.push('marginLeft');
      }
      if (style.margins.right !== undefined) {
        documentStyle.marginRight = { magnitude: style.margins.right * 72, unit: 'PT' };
        fields.push('marginRight');
      }
    }
  }
  
  // Handle page size (convert inches to points)
  if (style.pageSize) {
    documentStyle.pageSize = {
      width: { magnitude: style.pageSize.width * 72, unit: 'PT' },
      height: { magnitude: style.pageSize.height * 72, unit: 'PT' }
    };
    fields.push('pageSize');
  }
  
  // Handle background color
  if (style.background) {
    documentStyle.background = {
      color: { color: { rgbColor: style.background } }
    };
    fields.push('background');
  }
  
  if (fields.length === 0) {
    throw new Error('At least one style property required: margins, pageSize, background');
  }
  
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        updateDocumentStyle: {
          documentStyle,
          fields: fields.join(',')
        }
      }]
    }
  });
  
  return { updated: true, style };
}

/**
 * Get current document style settings
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @returns {object} Current document style (margins and page size in inches)
 */
export async function getDocumentStyle(email, docId) {
  const docs = await getDocsApi(email);
  const doc = await docs.documents.get({ documentId: docId });
  const style = doc.data.documentStyle;
  
  return {
    margins: {
      top: style.marginTop?.magnitude / 72,
      bottom: style.marginBottom?.magnitude / 72,
      left: style.marginLeft?.magnitude / 72,
      right: style.marginRight?.magnitude / 72
    },
    pageSize: {
      width: style.pageSize?.width?.magnitude / 72,
      height: style.pageSize?.height?.magnitude / 72
    },
    background: style.background?.color?.color?.rgbColor || null
  };
}

/**
 * Edit a Google Doc (append or replace content)
 */
export async function editDoc(email, docId, content, options = {}) {
  const docs = await getDocsApi(email);
  
  let text;
  const isFile = existsSync(content);
  if (isFile) {
    text = readFileSync(content, 'utf-8');
  } else {
    text = content;
  }
  
  const requests = [];
  
  if (options.replace) {
    // Get current document to find end index
    const doc = await docs.documents.get({ documentId: docId });
    const endIndex = doc.data.body?.content?.slice(-1)[0]?.endIndex || 1;
    
    // Delete all content except the newline at start
    if (endIndex > 2) {
      requests.push({
        deleteContentRange: {
          range: { startIndex: 1, endIndex: endIndex - 1 }
        }
      });
    }
  }
  
  // Check if content appears to be markdown
  const isMarkdown = (isFile && content.endsWith('.md')) || 
                     /^#{1,6}\s|^\*\*|\*\*$|^\*[^*]|[^*]\*$/m.test(text);
  
  if (isMarkdown) {
    // Parse markdown and apply formatting
    const { plainText, formatRequests } = parseMarkdownToDocRequests(text);
    
    // Insert the plain text
    requests.push({
      insertText: {
        location: { index: 1 },
        text: plainText
      }
    });
    
    // Execute text insertion first
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });
    
    // Then apply formatting if we have any
    if (formatRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: formatRequests
        }
      });
    }
  } else {
    // Plain text, insert as-is
    requests.push({
      insertText: {
        location: { index: 1 },
        text
      }
    });
    
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });
  }
  
  return { id: docId, updated: true };
}

/**
 * Export Google Doc to local file
 * If outputPath is not specified, exports to the same directory as the Google Doc
 * For format conversion (md, epub), export to HTML then use local-generator/scripts/convert.js
 */
export async function exportDoc(email, docId, format, outputPath = null) {
  const formatLower = format.toLowerCase();
  const mimeType = EXPORT_TYPES[formatLower];
  
  if (!mimeType) {
    throw new Error(`Unknown format: ${format}. Available: pdf, docx, txt, html, rtf, odt`);
  }
  
  // Determine output path (defaults to same directory as Google Doc)
  if (!outputPath) {
    const localInfo = await getLocalPath(email, docId);
    outputPath = `${localInfo.directory}/${localInfo.filename}.${formatLower}`;
  }
  
  return exportFile(email, docId, mimeType, outputPath);
}

// CLI - only run when this file is the main entry point
async function runCLI() {
  // Import collaboration functions for CLI
  const { 
    addInlineMarker, 
    addAnchoredComment, 
    listSuggestions, 
    acceptSuggestion 
  } = await import('./collaboration.js');

  function showHelp() {
    console.log(`
Google Docs operations: create, read, edit, export, collaborate.

Usage:
  node docs.js <command> [options]

Commands:
  create       Create a new Google Doc
  read         Read content from a Google Doc
  edit         Edit a Google Doc's content
  export       Export a Google Doc to local file
  style        Get document style (margins, page size)
  style-update Update document style (--margins, --page-size)
  suggestions  List pending suggestions in a Google Doc
  accept       Accept a suggestion (--suggestion-id SUGGESTION_ID)
  comment      Add an anchored comment (--text "text" --comment "comment")
  marker       Add inline marker (--after "text" --type comment|suggestion --message "text")

Options:
  --account EMAIL    Google account email (required)
  --id DOC_ID        Document ID (required for read/edit/export)
  --title TITLE      Document title (required for create)
  --folder PATH      Folder path like "Shared drives/Work/Docs" (optional for create)
  --content FILE     Markdown file or text to add (optional for create/edit)
  --replace          Replace all content instead of appending (for edit)
  --format FORMAT    Export format: pdf, docx, txt, html, rtf, odt
  --output PATH      Output file path (required for export)
  --margins INCHES   Document margins in inches (all sides, or "top,bottom,left,right")
  --page-size WxH    Page size in inches (e.g., "8.5x11" or "6x9")
  --json             Output result as JSON
  --help, -h         Show this help message

Examples:
  node docs.js create --title "Meeting Notes" --account user@example.com
  node docs.js read --id abc123 --account user@example.com
  node docs.js style --id abc123 --account user@example.com
  node docs.js style-update --id abc123 --margins 0.5 --page-size 6x9 --account user@example.com
  node docs.js marker --id abc123 --after "Title" --type suggestion --message "Add subtitle" --account user@example.com
`);
    process.exit(0);
  }

  // Parse CLI arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
  }

  const command = args[0];
  let account = null;
  let id = null;
  let title = null;
  let folder = null;
  let content = null;
  let format = null;
  let output = null;
  let replace = false;
  let jsonOutput = false;
  let suggestionId = null;
  let text = null;
  let comment = null;
  let after = null;
  let type = null;
  let message = null;
  let margins = null;
  let pageSize = null;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--account': account = args[++i]; break;
      case '--id': id = args[++i]; break;
      case '--title': title = args[++i]; break;
      case '--folder': folder = args[++i]; break;
      case '--content': content = args[++i]; break;
      case '--format': format = args[++i]; break;
      case '--output': output = args[++i]; break;
      case '--suggestion-id': suggestionId = args[++i]; break;
      case '--text': text = args[++i]; break;
      case '--comment': comment = args[++i]; break;
      case '--after': after = args[++i]; break;
      case '--type': type = args[++i]; break;
      case '--message': message = args[++i]; break;
      case '--margins': margins = args[++i]; break;
      case '--page-size': pageSize = args[++i]; break;
      case '--replace': replace = true; break;
      case '--json': jsonOutput = true; break;
    }
  }

  if (!account) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  try {
    let result;
    
    switch (command) {
      case 'create':
        if (!title) {
          console.error('Error: --title is required for create');
          process.exit(1);
        }
        result = await createDoc(account, title, { folder, content });
        break;
        
      case 'read':
        if (!id) {
          console.error('Error: --id is required for read');
          process.exit(1);
        }
        result = await readDoc(account, id);
        break;
        
      case 'edit':
        if (!id || !content) {
          console.error('Error: --id and --content are required for edit');
          process.exit(1);
        }
        result = await editDoc(account, id, content, { replace });
        break;
        
      case 'export':
        if (!id || !format) {
          console.error('Error: --id and --format are required for export');
          console.error('If --output is omitted, exports to the same directory as the Google Doc');
          process.exit(1);
        }
        result = await exportDoc(account, id, format, output);
        result = { exported: result };
        break;
      
      case 'style':
        if (!id) {
          console.error('Error: --id is required for style');
          process.exit(1);
        }
        const currentStyle = await getDocumentStyle(account, id);
        if (jsonOutput) {
          console.log(JSON.stringify(currentStyle, null, 2));
        } else {
          console.log('\nDocument Style:');
          console.log(`  Margins (inches): top=${currentStyle.margins.top}, bottom=${currentStyle.margins.bottom}, left=${currentStyle.margins.left}, right=${currentStyle.margins.right}`);
          console.log(`  Page size (inches): ${currentStyle.pageSize.width} x ${currentStyle.pageSize.height}`);
        }
        return;
      
      case 'style-update':
        if (!id) {
          console.error('Error: --id is required for style-update');
          process.exit(1);
        }
        if (!margins && !pageSize) {
          console.error('Error: at least --margins or --page-size is required');
          process.exit(1);
        }
        const styleUpdate = {};
        if (margins) {
          if (margins.includes(',')) {
            const [top, bottom, left, right] = margins.split(',').map(Number);
            styleUpdate.margins = { top, bottom, left, right };
          } else {
            styleUpdate.margins = Number(margins);
          }
        }
        if (pageSize) {
          const [width, height] = pageSize.toLowerCase().split('x').map(Number);
          styleUpdate.pageSize = { width, height };
        }
        await updateDocumentStyle(account, id, styleUpdate);
        console.log('\nDocument style updated!');
        if (styleUpdate.margins) {
          const m = typeof styleUpdate.margins === 'number' 
            ? `${styleUpdate.margins}" all sides` 
            : `top=${styleUpdate.margins.top}", bottom=${styleUpdate.margins.bottom}", left=${styleUpdate.margins.left}", right=${styleUpdate.margins.right}"`;
          console.log(`  Margins: ${m}`);
        }
        if (styleUpdate.pageSize) {
          console.log(`  Page size: ${styleUpdate.pageSize.width}" x ${styleUpdate.pageSize.height}"`);
        }
        return;
        
      case 'suggestions':
        if (!id) {
          console.error('Error: --id is required for suggestions');
          process.exit(1);
        }
        const suggestions = await listSuggestions(account, id);
        if (jsonOutput) {
          console.log(JSON.stringify(suggestions, null, 2));
        } else if (suggestions.length === 0) {
          console.log('\nNo pending suggestions in this document.');
        } else {
          console.log(`\nPending Suggestions (${suggestions.length}):\n`);
          for (const suggestion of suggestions) {
            console.log('─'.repeat(35));
            console.log(`ID: ${suggestion.id}`);
            if (suggestion.delete) console.log(`Delete: "${suggestion.delete}"`);
            if (suggestion.insert) console.log(`Insert: "${suggestion.insert}"`);
          }
        }
        return;
        
      case 'accept':
        if (!id || !suggestionId) {
          console.error('Error: --id and --suggestion-id are required for accept');
          process.exit(1);
        }
        const acceptResult = await acceptSuggestion(account, id, suggestionId);
        console.log(`\nSuggestion accepted: ${acceptResult.change}`);
        return;
      
      case 'comment':
        if (!id || !text || !comment) {
          console.error('Error: --id, --text, and --comment are required for comment');
          process.exit(1);
        }
        const commentResult = await addAnchoredComment(account, id, text, comment);
        console.log(`\nAnchored comment added!`);
        console.log(`Comment ID: ${commentResult.commentId}`);
        console.log(`Named Range: ${commentResult.rangeName}`);
        return;
      
      case 'marker':
        if (!id || !after || !type || !message) {
          console.error('Error: --id, --after, --type, and --message are required');
          process.exit(1);
        }
        if (type !== 'comment' && type !== 'suggestion') {
          console.error('Error: --type must be "comment" or "suggestion"');
          process.exit(1);
        }
        const markerResult = await addInlineMarker(account, id, after, type, message);
        const colorName = type === 'comment' ? 'blue' : 'dark gold';
        console.log(`\nInline ${type} marker added (${colorName})!`);
        console.log(`Inserted after: "${after}"`);
        console.log(`Marker: ${markerResult.fullMarker}`);
        return;
        
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
    }
    
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.text !== undefined) {
        console.log(`\nDocument: ${result.title || result.id}`);
        console.log(`URL: ${result.url}`);
        console.log(`\n${'─'.repeat(50)}\n`);
        console.log(result.text);
      } else if (result.url) {
        console.log(`\nDocument: ${result.title || result.id}`);
        console.log(`URL: ${result.url}`);
      } else if (result.exported) {
        console.log(`\nExported to: ${result.exported}`);
      } else if (result.updated) {
        console.log(`\nDocument updated: ${result.id}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Only run CLI if this is the main entry point
const __filename = fileURLToPath(import.meta.url);
const isMainModule = __filename === process.argv[1];
if (isMainModule) {
  runCLI();
}
