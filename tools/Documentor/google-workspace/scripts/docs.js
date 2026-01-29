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

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, extname } from 'path';

// Local modules
import { getAuthClient } from './auth.js';
import { getFolderId, moveFile, exportFile, EXPORT_TYPES, getLocalPath, uploadFile, makeFilePublic } from './drive.js';

// Supported image formats for embedding
const SUPPORTED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

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
 * Returns { plainText, formatRequests, imageReferences } where:
 *   - formatRequests are applied after text insertion
 *   - imageReferences are { alt, path, index } for image placeholders
 */
function parseMarkdownToDocRequests(markdown, options = {}) {
  // Strip HTML comments
  const cleanedMarkdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
  
  const lines = cleanedMarkdown.split('\n');
  const segments = []; // { text, type, level?, imagePath?, imageAlt?, tableData? }
  
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
    
    // Check for standalone image line: ![alt](path)
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imageMatch && options.embedImages) {
      segments.push({ 
        text: '\n', // Placeholder newline for image position
        type: 'image', 
        imageAlt: imageMatch[1],
        imagePath: imageMatch[2]
      });
      continue;
    }
    
    // Check for horizontal rule (---, ***, or ___ with optional spaces)
    if (/^[\s]*[-*_]{3,}[\s]*$/.test(line)) {
      segments.push({ text: '\n', type: 'hr' });
      continue;
    }
    
    // Check for markdown table (line starts and ends with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Collect all table rows
      const tableRows = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        const row = lines[j].trim();
        // Skip separator rows (contain only |, -, :, and spaces)
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          // Parse cells: split by | and trim each cell
          const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
          tableRows.push(cells);
        }
        j++;
      }
      
      if (tableRows.length > 0) {
        // Determine column count from first row
        const cols = tableRows[0].length;
        segments.push({
          text: '\n', // Placeholder for table position
          type: 'table',
          tableData: { rows: tableRows, cols }
        });
        i = j - 1; // Skip processed table lines
        continue;
      }
    }
    
    // Normal text (may contain bold/italic)
    segments.push({ text: line + '\n', type: 'normal' });
  }
  
  // Build plain text and track positions for formatting
  let plainText = '';
  const formatRequests = [];
  const imageReferences = [];
  const tableReferences = [];
  const hrReferences = [];
  
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
    } else if (segment.type === 'image') {
      // Track image position for later insertion
      imageReferences.push({
        alt: segment.imageAlt,
        path: segment.imagePath,
        index: startIndex
      });
      plainText += segment.text;
    } else if (segment.type === 'table') {
      // Track table position for later insertion
      tableReferences.push({
        rows: segment.tableData.rows,
        cols: segment.tableData.cols,
        index: startIndex
      });
      plainText += segment.text;
    } else if (segment.type === 'hr') {
      // Track horizontal rule position for later insertion
      hrReferences.push({ index: startIndex });
      plainText += segment.text;
    } else {
      // Process inline formatting (bold, italic)
      const { text: processedText, inlineFormats } = processInlineFormatting(segment.text, startIndex);
      plainText += processedText;
      formatRequests.push(...inlineFormats);
    }
  }
  
  return { plainText, formatRequests, imageReferences, tableReferences, hrReferences };
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
 * Validate and resolve image paths, rejecting unsupported formats
 * @param {Array} imageReferences - Array of { alt, path, index }
 * @param {string} basePath - Base path for resolving relative paths
 * @returns {Array} - Resolved image references with absolute paths
 */
function validateImagePaths(imageReferences, basePath) {
  const resolved = [];
  
  for (const ref of imageReferences) {
    const ext = extname(ref.path).toLowerCase();
    
    // Reject SVG files
    if (ext === '.svg') {
      throw new Error(
        `SVG not supported for embedding: ${ref.path}\n` +
        `Convert to PNG first using: node "/cofounder/tools/Image Generator/scripts/svg-to-png.js" input.svg output.png`
      );
    }
    
    // Check if format is supported
    if (!SUPPORTED_IMAGE_FORMATS.includes(ext)) {
      throw new Error(`Unsupported image format: ${ref.path}\nSupported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`);
    }
    
    // Resolve relative paths
    let absolutePath = ref.path;
    if (!ref.path.startsWith('/')) {
      absolutePath = resolve(basePath, ref.path);
    }
    
    // Verify file exists
    if (!existsSync(absolutePath)) {
      throw new Error(`Image file not found: ${absolutePath}`);
    }
    
    resolved.push({
      ...ref,
      absolutePath
    });
  }
  
  return resolved;
}

/**
 * Upload images to Drive and insert into document
 * Images are inserted in reverse order to avoid index shifting
 * @param {string} email - Google account
 * @param {string} docId - Document ID
 * @param {Array} imageReferences - Array of { alt, absolutePath, index }
 */
async function embedImages(email, docId, imageReferences) {
  if (imageReferences.length === 0) return;
  
  const docs = await getDocsApi(email);
  
  // Process images in reverse order (highest index first) to avoid shifting
  const sortedRefs = [...imageReferences].sort((a, b) => b.index - a.index);
  
  for (const ref of sortedRefs) {
    // Upload to Drive
    const uploaded = await uploadFile(email, ref.absolutePath);
    
    // Make publicly accessible (required for Docs API to embed)
    await makeFilePublic(email, uploaded.id);
    
    // Build the content URI
    const imageUri = `https://drive.google.com/uc?id=${uploaded.id}`;
    
    // Insert the image at the tracked position
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertInlineImage: {
            location: { index: ref.index },
            uri: imageUri,
            objectSize: {
              // Default to reasonable width, height auto-calculated
              width: { magnitude: 400, unit: 'PT' }
            }
          }
        }]
      }
    });
  }
}

/**
 * Embed images and tables together, processed in reverse index order
 * This ensures that inserting one doesn't shift the index of another
 * 
 * Performance optimization: Images are uploaded to Drive in parallel before
 * sequential insertion into the document.
 * 
 * @param {string} email - Google account
 * @param {string} docId - Document ID
 * @param {Array} imageRefs - Array of { alt, absolutePath, index }
 * @param {Array} tableRefs - Array of { rows, cols, index }
 * @param {Array} hrRefs - Array of { index } for horizontal rules
 */
async function embedMediaAndTables(email, docId, imageRefs, tableRefs, hrRefs = []) {
  const docs = await getDocsApi(email);
  
  // Step 1: Upload ALL images to Drive in parallel (major performance gain)
  const uploadedImages = [];
  if (imageRefs.length > 0) {
    const uploadPromises = imageRefs.map(async (ref) => {
      const uploaded = await uploadFile(email, ref.absolutePath);
      return { ...ref, driveId: uploaded.id };
    });
    const results = await Promise.all(uploadPromises);
    uploadedImages.push(...results);
    
    // Step 2: Make ALL images public in parallel
    await Promise.all(uploadedImages.map(img => makeFilePublic(email, img.driveId)));
  }
  
  // Step 3: Combine uploaded images, tables, and horizontal rules with type markers
  const items = [
    ...uploadedImages.map(ref => ({ 
      ...ref, 
      type: 'image',
      imageUri: `https://drive.google.com/uc?id=${ref.driveId}`
    })),
    ...tableRefs.map(ref => ({ ...ref, type: 'table' })),
    ...hrRefs.map(ref => ({ ...ref, type: 'hr' }))
  ];
  
  // Sort by index descending (highest first) for sequential insertion
  items.sort((a, b) => b.index - a.index);
  
  // Step 4: Insert items sequentially (required due to index shifting)
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Reduced delay (200ms) since we only have 1 API call per image now
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (item.type === 'hr') {
      // Insert horizontal rule
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertSectionBreak: {
              location: { index: item.index },
              sectionType: 'CONTINUOUS'
            }
          }]
        }
      });
      // Google Docs doesn't have a direct horizontal rule API, so we insert a paragraph
      // with a bottom border that acts as a visual divider
      // Actually, let's use the paragraph border approach
      const doc = await docs.documents.get({ documentId: docId });
      // Find the paragraph at this index and add a bottom border
      for (const element of doc.data.body.content) {
        if (element.paragraph && element.startIndex >= item.index && element.startIndex < item.index + 5) {
          await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: {
              requests: [{
                updateParagraphStyle: {
                  range: {
                    startIndex: element.startIndex,
                    endIndex: element.endIndex
                  },
                  paragraphStyle: {
                    borderBottom: {
                      color: { color: { rgbColor: { red: 0.8, green: 0.8, blue: 0.8 } } },
                      width: { magnitude: 1, unit: 'PT' },
                      padding: { magnitude: 6, unit: 'PT' },
                      dashStyle: 'SOLID'
                    }
                  },
                  fields: 'borderBottom'
                }
              }]
            }
          });
          break;
        }
      }
    } else if (item.type === 'image') {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertInlineImage: {
              location: { index: item.index },
              uri: item.imageUri,
              objectSize: { width: { magnitude: 400, unit: 'PT' } }
            }
          }]
        }
      });
    } else if (item.type === 'table') {
      const numRows = item.rows.length;
      const numCols = item.cols;
      
      // Insert table structure
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertTable: {
              location: { index: item.index },
              rows: numRows,
              columns: numCols
            }
          }]
        }
      });
      
      // Get document to find cell indices
      const doc = await docs.documents.get({ documentId: docId });
      
      // Find the table we just inserted
      let table = null;
      for (const element of doc.data.body.content) {
        if (element.table && element.startIndex >= item.index && element.startIndex < item.index + 10) {
          table = element;
          break;
        }
      }
      
      if (!table) continue;
      
      // Build cell text insertion requests (in reverse index order)
      const insertRequests = [];
      for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
        const row = table.table.tableRows[rowIdx];
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const cell = row.tableCells[colIdx];
          const cellText = item.rows[rowIdx][colIdx] || '';
          if (cellText) {
            const cellContent = cell.content[0];
            insertRequests.push({
              insertText: {
                location: { index: cellContent.startIndex },
                text: cellText
              }
            });
          }
        }
      }
      
      // Batch insert all cell text
      if (insertRequests.length > 0) {
        insertRequests.sort((a, b) => b.insertText.location.index - a.insertText.location.index);
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: insertRequests }
        });
      }
    }
  }
}

/**
 * Insert markdown tables into a Google Doc
 * Tables are inserted in reverse order to avoid index shifting
 * @param {string} email - Google account
 * @param {string} docId - Document ID
 * @param {Array} tableReferences - Array of { rows, cols, index }
 */
async function embedTables(email, docId, tableReferences) {
  if (tableReferences.length === 0) return;
  
  const docs = await getDocsApi(email);
  
  // Process tables in reverse order (highest index first) to avoid shifting
  const sortedRefs = [...tableReferences].sort((a, b) => b.index - a.index);
  
  for (let i = 0; i < sortedRefs.length; i++) {
    const ref = sortedRefs[i];
    
    // Add delay between tables to avoid rate limits (except first)
    // 3 second delay keeps us under 300 requests/minute limit with ~4 calls per table
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    const numRows = ref.rows.length;
    const numCols = ref.cols;
    
    // Insert the table structure
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertTable: {
            location: { index: ref.index },
            rows: numRows,
            columns: numCols
          }
        }]
      }
    });
    
    // Get the updated document to find cell indices
    const doc = await docs.documents.get({ documentId: docId });
    
    // Find the table we just inserted (it should be at approximately ref.index)
    let table = null;
    for (const element of doc.data.body.content) {
      if (element.table && element.startIndex >= ref.index && element.startIndex < ref.index + 10) {
        table = element;
        break;
      }
    }
    
    if (!table) continue;
    
    // Build requests to insert text into each cell (in reverse index order to avoid shifting)
    // Also track inline formatting (bold/italic) within cell content
    const insertRequests = [];
    const cellFormattingInfo = []; // Track { insertIndex, formats } for each cell
    
    for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
      const row = table.table.tableRows[rowIdx];
      for (let colIdx = 0; colIdx < numCols; colIdx++) {
        const cell = row.tableCells[colIdx];
        const cellText = ref.rows[rowIdx][colIdx] || '';
        
        if (cellText) {
          const cellContent = cell.content[0];
          const insertIndex = cellContent.startIndex;
          
          // Process inline formatting (bold/italic) within the cell
          const { text: cleanText, inlineFormats } = processInlineFormatting(cellText, 0);
          
          insertRequests.push({
            insertText: {
              location: { index: insertIndex },
              text: cleanText
            }
          });
          
          // Store formatting info for later application (adjusting indices relative to insertIndex)
          if (inlineFormats.length > 0) {
            cellFormattingInfo.push({
              insertIndex,
              cleanTextLength: cleanText.length,
              formats: inlineFormats
            });
          }
        }
      }
    }
    
    // Sort by index descending and batch all inserts into one call
    if (insertRequests.length > 0) {
      insertRequests.sort((a, b) => b.insertText.location.index - a.insertText.location.index);
      
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: insertRequests }
      });
      
      // Re-fetch document to get actual indices after text insertion
      const updatedDoc = await docs.documents.get({ documentId: docId });
      const styleRequests = [];
      
      // Find the table and apply inline formatting to cells
      for (const element of updatedDoc.data.body.content) {
        if (element.table && element.startIndex >= ref.index && element.startIndex < ref.index + 1000) {
          // Process each cell to apply inline formatting
          for (let rowIdx = 0; rowIdx < element.table.tableRows.length; rowIdx++) {
            const row = element.table.tableRows[rowIdx];
            for (let colIdx = 0; colIdx < row.tableCells.length; colIdx++) {
              const cell = row.tableCells[colIdx];
              const cellContent = cell.content[0];
              if (cellContent.paragraph && cellContent.paragraph.elements) {
                for (const elem of cellContent.paragraph.elements) {
                  if (elem.textRun && elem.textRun.content.trim()) {
                    const textContent = elem.textRun.content;
                    const cellStartIndex = elem.startIndex;
                    
                    // Check if this cell had formatting info
                    // Match by looking for cell text that was processed
                    const originalCellText = ref.rows[rowIdx] && ref.rows[rowIdx][colIdx];
                    if (originalCellText) {
                      // Re-process to get formatting positions relative to cell start
                      const { text: cleanText, inlineFormats } = processInlineFormatting(originalCellText, cellStartIndex);
                      
                      for (const fmt of inlineFormats) {
                        styleRequests.push(fmt);
                      }
                    }
                  }
                }
              }
            }
          }
          break;
        }
      }
      
      if (styleRequests.length > 0) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: styleRequests }
        });
      }
    }
  }
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
 * @param {string} email - Google account email
 * @param {string} title - Document title
 * @param {object} options - Options
 * @param {string} options.folder - Folder path to create document in
 * @param {string} options.content - Content (file path or text)
 * @param {boolean} options.embedImages - Whether to embed images from markdown
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
    let contentBasePath = process.cwd();
    const isFile = existsSync(options.content);
    
    if (isFile) {
      text = readFileSync(options.content, 'utf-8');
      contentBasePath = dirname(resolve(options.content));
    } else {
      text = options.content;
    }
    
    // Check if content appears to be markdown (has markdown patterns)
    const isMarkdown = (isFile && options.content.endsWith('.md')) || 
                       /^#{1,6}\s|^\*\*|\*\*$|^\*[^*]|[^*]\*$/m.test(text);
    
    if (isMarkdown) {
      // Parse markdown and apply formatting
      const { plainText, formatRequests, imageReferences, tableReferences, hrReferences } = parseMarkdownToDocRequests(text, { 
        embedImages: options.embedImages 
      });
      
      // Validate and resolve image paths if embedding
      let resolvedImages = [];
      if (options.embedImages && imageReferences.length > 0) {
        resolvedImages = validateImagePaths(imageReferences, contentBasePath);
      }
      
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
      
      // Embed images, tables, and horizontal rules together (must be processed in reverse index order)
      if (resolvedImages.length > 0 || tableReferences.length > 0 || hrReferences.length > 0) {
        await embedMediaAndTables(email, docId, resolvedImages, tableReferences, hrReferences);
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
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @param {string} content - Content (file path or text)
 * @param {object} options - Options
 * @param {boolean} options.replace - Replace all content instead of appending
 * @param {boolean} options.embedImages - Whether to embed images from markdown
 */
export async function editDoc(email, docId, content, options = {}) {
  const docs = await getDocsApi(email);
  
  let text;
  let contentBasePath = process.cwd();
  const isFile = existsSync(content);
  
  if (isFile) {
    text = readFileSync(content, 'utf-8');
    contentBasePath = dirname(resolve(content));
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
    const { plainText, formatRequests, imageReferences, tableReferences, hrReferences } = parseMarkdownToDocRequests(text, {
      embedImages: options.embedImages
    });
    
    // Validate and resolve image paths if embedding
    let resolvedImages = [];
    if (options.embedImages && imageReferences.length > 0) {
      resolvedImages = validateImagePaths(imageReferences, contentBasePath);
    }
    
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
    
    // Embed images, tables, and horizontal rules together (must be processed in reverse index order)
    if (resolvedImages.length > 0 || tableReferences.length > 0 || hrReferences.length > 0) {
      await embedMediaAndTables(email, docId, resolvedImages, tableReferences, hrReferences);
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
  --embed-images     Embed images from markdown (PNG/JPG/GIF only, no SVG)
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
  let embedImages = false;
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
      case '--embed-images': embedImages = true; break;
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
        result = await createDoc(account, title, { folder, content, embedImages });
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
        result = await editDoc(account, id, content, { replace, embedImages });
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
