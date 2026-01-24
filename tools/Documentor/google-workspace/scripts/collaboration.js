#!/usr/bin/env node
/**
 * Google Docs collaboration features: inline markers, find/replace, suggestions.
 * 
 * This module handles document annotation and collaborative editing:
 * - Inline markers (colored comments/suggestions in document text)
 * - Find and replace with optional highlighting
 * - Suggestion management (list, accept)
 * - Named ranges for comment anchoring
 * 
 * Usage:
 *   import { addInlineMarker, findAndReplace } from './collaboration.js';
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Local modules
import { getAuthClient } from './auth.js';
import { addComment } from './drive.js';

// Color definitions for inline markers and edits
export const MARKER_COLORS = {
  comment: { red: 0.0, green: 0.4, blue: 0.8 },      // Blue
  suggestion: { red: 0.72, green: 0.53, blue: 0.04 }, // Dark gold
  edit: { red: 0.72, green: 0.53, blue: 0.04 }       // Dark gold for edits
};

/**
 * Get Docs API instance
 */
async function getDocsApi(email) {
  const auth = await getAuthClient(email);
  return google.docs({ version: 'v1', auth });
}

/**
 * Find text in a document and return its position (startIndex, endIndex)
 */
export async function findTextPosition(email, docId, searchText) {
  const docs = await getDocsApi(email);
  
  const doc = await docs.documents.get({ documentId: docId });
  const content = doc.data.body?.content || [];
  
  // Build full text and track positions
  let fullText = '';
  const positions = []; // { start, end, text }
  
  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun?.content) {
          const start = elem.startIndex;
          const end = elem.endIndex;
          positions.push({ start, end, text: elem.textRun.content });
          fullText += elem.textRun.content;
        }
      }
    }
  }
  
  // Find the search text in the full document
  const searchIndex = fullText.indexOf(searchText);
  if (searchIndex === -1) {
    return null; // Text not found
  }
  
  // Map back to document indices
  let currentPos = 0;
  let startIndex = null;
  let endIndex = null;
  
  for (const pos of positions) {
    const textLen = pos.text.length;
    const textStart = currentPos;
    const textEnd = currentPos + textLen;
    
    // Check if search text starts in this segment
    if (startIndex === null && searchIndex >= textStart && searchIndex < textEnd) {
      const offset = searchIndex - textStart;
      startIndex = pos.start + offset;
    }
    
    // Check if search text ends in this segment
    const searchEnd = searchIndex + searchText.length;
    if (endIndex === null && searchEnd > textStart && searchEnd <= textEnd) {
      const offset = searchEnd - textStart;
      endIndex = pos.start + offset;
    }
    
    currentPos = textEnd;
    
    if (startIndex !== null && endIndex !== null) break;
  }
  
  return startIndex !== null && endIndex !== null 
    ? { startIndex, endIndex } 
    : null;
}

/**
 * Find and replace text with optional color formatting
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @param {string} findText - Text to find
 * @param {string} replaceText - Text to replace with (empty string to delete)
 * @param {boolean} highlight - Whether to highlight replacement in dark gold
 */
export async function findAndReplace(email, docId, findText, replaceText, highlight = false) {
  const docs = await getDocsApi(email);
  
  // Step 1: Find the text position
  const position = await findTextPosition(email, docId, findText);
  if (!position) {
    throw new Error(`Text not found in document: "${findText}"`);
  }
  
  // Step 2: Delete the old text and optionally insert new text
  const requests = [
    {
      deleteContentRange: {
        range: {
          startIndex: position.startIndex,
          endIndex: position.endIndex
        }
      }
    }
  ];
  
  // Only add insert request if there's text to insert
  if (replaceText && replaceText.length > 0) {
    requests.push({
      insertText: {
        location: { index: position.startIndex },
        text: replaceText
      }
    });
  }
  
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  
  // Step 3: Apply color formatting if highlight is true and there's replacement text
  if (highlight && replaceText && replaceText.length > 0) {
    const color = MARKER_COLORS.edit;
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          updateTextStyle: {
            range: {
              startIndex: position.startIndex,
              endIndex: position.startIndex + replaceText.length
            },
            textStyle: {
              foregroundColor: {
                color: { rgbColor: color }
              }
            },
            fields: 'foregroundColor'
          }
        }]
      }
    });
  }
  
  return {
    found: findText,
    replaced: replaceText,
    position: position.startIndex,
    highlighted: highlight
  };
}

/**
 * Add an inline marker (comment or suggestion) after specific text
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @param {string} afterText - Text to insert marker after
 * @param {string} markerType - 'comment' or 'suggestion'
 * @param {string} markerText - The comment/suggestion content
 */
export async function addInlineMarker(email, docId, afterText, markerType, markerText) {
  const docs = await getDocsApi(email);
  
  // Step 1: Find the position of afterText
  const position = await findTextPosition(email, docId, afterText);
  if (!position) {
    throw new Error(`Text not found in document: "${afterText}"`);
  }
  
  // Step 2: Create the marker text
  const prefix = markerType === 'comment' ? 'comment' : 'suggestion';
  const fullMarker = ` [${prefix}: ${markerText}]`;
  const insertIndex = position.endIndex;
  
  // Step 3: Insert the marker text
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: insertIndex },
          text: fullMarker
        }
      }]
    }
  });
  
  // Step 4: Apply color formatting to the inserted marker
  const color = MARKER_COLORS[markerType] || MARKER_COLORS.comment;
  
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        updateTextStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + fullMarker.length
          },
          textStyle: {
            foregroundColor: {
              color: { rgbColor: color }
            },
            bold: true
          },
          fields: 'foregroundColor,bold'
        }
      }]
    }
  });
  
  return {
    markerType,
    markerText,
    insertedAt: insertIndex,
    fullMarker
  };
}

/**
 * Create a named range in a document
 */
export async function createNamedRange(email, docId, name, startIndex, endIndex) {
  const docs = await getDocsApi(email);
  
  const response = await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        createNamedRange: {
          name,
          range: {
            startIndex,
            endIndex
          }
        }
      }]
    }
  });
  
  // Extract the named range ID from the response
  const namedRangeId = response.data.replies?.[0]?.createNamedRange?.namedRangeId;
  return namedRangeId;
}

/**
 * Add an anchored comment using the named range workaround
 * Creates a named range at the target text, then adds a comment with a link to it
 */
export async function addAnchoredComment(email, docId, searchText, commentText) {
  // Step 1: Find the text position
  const position = await findTextPosition(email, docId, searchText);
  if (!position) {
    throw new Error(`Text not found in document: "${searchText}"`);
  }
  
  // Step 2: Create a named range
  const rangeName = `comment_anchor_${Date.now()}`;
  const rangeId = await createNamedRange(email, docId, rangeName, position.startIndex, position.endIndex);
  
  if (!rangeId) {
    throw new Error('Failed to create named range');
  }
  
  // Step 3: Create the comment with a link to the named range
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  const anchorLink = `${docUrl}#heading=h.${rangeName}`;
  
  // Create comment with link
  const fullComment = `${commentText}\n\n📍 Jump to text: ${anchorLink}`;
  const comment = await addComment(email, docId, fullComment, searchText);
  
  return {
    commentId: comment.id,
    namedRangeId: rangeId,
    rangeName,
    position
  };
}

/**
 * List suggestions in a Google Doc
 */
export async function listSuggestions(email, docId) {
  const docs = await getDocsApi(email);
  
  const doc = await docs.documents.get({
    documentId: docId,
    suggestionsViewMode: 'SUGGESTIONS_INLINE'
  });
  
  const suggestions = new Map(); // suggestionId -> { insertions: [], deletions: [] }
  const content = doc.data.body?.content || [];
  
  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun) {
          // Check for suggested insertions
          if (elem.textRun.suggestedInsertionIds?.length > 0) {
            for (const suggestionId of elem.textRun.suggestedInsertionIds) {
              if (!suggestions.has(suggestionId)) {
                suggestions.set(suggestionId, { insertions: [], deletions: [] });
              }
              suggestions.get(suggestionId).insertions.push(elem.textRun.content);
            }
          }
          // Check for suggested deletions
          if (elem.textRun.suggestedDeletionIds?.length > 0) {
            for (const suggestionId of elem.textRun.suggestedDeletionIds) {
              if (!suggestions.has(suggestionId)) {
                suggestions.set(suggestionId, { insertions: [], deletions: [] });
              }
              suggestions.get(suggestionId).deletions.push(elem.textRun.content);
            }
          }
        }
      }
    }
  }
  
  // Convert to array
  const result = [];
  for (const [id, changes] of suggestions) {
    result.push({
      id,
      delete: changes.deletions.join(''),
      insert: changes.insertions.join('')
    });
  }
  
  return result;
}

/**
 * Accept a suggestion in a Google Doc
 * This removes the deleted text and clears suggestion markers from inserted text
 */
export async function acceptSuggestion(email, docId, suggestionId) {
  const docs = await getDocsApi(email);
  
  // Get document with suggestions inline to find the suggestion details
  const doc = await docs.documents.get({
    documentId: docId,
    suggestionsViewMode: 'SUGGESTIONS_INLINE'
  });
  
  // Find the suggestion's position and content
  let suggestionInfo = {
    deleteText: '',
    insertText: '',
    deleteStart: null,
    deleteEnd: null,
    insertStart: null,
    insertEnd: null
  };
  
  const content = doc.data.body?.content || [];
  
  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun) {
          const isInsertion = elem.textRun.suggestedInsertionIds?.includes(suggestionId);
          const isDeletion = elem.textRun.suggestedDeletionIds?.includes(suggestionId);
          
          if (isDeletion) {
            suggestionInfo.deleteText += elem.textRun.content;
            suggestionInfo.deleteStart = suggestionInfo.deleteStart ?? elem.startIndex;
            suggestionInfo.deleteEnd = elem.endIndex;
          }
          if (isInsertion) {
            suggestionInfo.insertText += elem.textRun.content;
            suggestionInfo.insertStart = suggestionInfo.insertStart ?? elem.startIndex;
            suggestionInfo.insertEnd = elem.endIndex;
          }
        }
      }
    }
  }
  
  if (!suggestionInfo.deleteText && !suggestionInfo.insertText) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }
  
  // Strategy: Delete both the suggested deletion AND insertion text, then re-insert the insertion text
  // This clears all suggestion markers
  const requests = [];
  
  // Determine the full range to delete (both deletion and insertion spans)
  let rangeStart = Math.min(
    suggestionInfo.deleteStart ?? Infinity,
    suggestionInfo.insertStart ?? Infinity
  );
  let rangeEnd = Math.max(
    suggestionInfo.deleteEnd ?? 0,
    suggestionInfo.insertEnd ?? 0
  );
  
  if (rangeStart !== Infinity && rangeEnd !== 0) {
    // Delete the entire suggestion range
    requests.push({
      deleteContentRange: {
        range: { startIndex: rangeStart, endIndex: rangeEnd }
      }
    });
    
    // Re-insert the accepted text (the insertion text, now without suggestion markers)
    if (suggestionInfo.insertText) {
      requests.push({
        insertText: {
          location: { index: rangeStart },
          text: suggestionInfo.insertText
        }
      });
    }
  }
  
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });
  }
  
  return { 
    id: suggestionId, 
    accepted: true,
    change: `"${suggestionInfo.deleteText}" → "${suggestionInfo.insertText}"`
  };
}

/**
 * Update text style for all paragraphs matching a named style type (e.g., HEADING_2)
 * Note: This updates existing headings only. New headings will use default style until updated.
 * @param {string} email - Google account email
 * @param {string} docId - Document ID
 * @param {string} namedStyleType - Style type: HEADING_1, HEADING_2, HEADING_3, etc.
 * @param {object} style - Style options: { fontFamily, fontWeight, fontSize, color }
 */
export async function updateHeadingStyle(email, docId, namedStyleType, style = {}) {
  const docs = await getDocsApi(email);
  
  // Get the document to find paragraphs with the named style
  const doc = await docs.documents.get({ documentId: docId });
  
  // Find all ranges with the specified named style
  const ranges = [];
  for (const element of doc.data.body?.content || []) {
    if (element.paragraph?.paragraphStyle?.namedStyleType === namedStyleType) {
      ranges.push({
        startIndex: element.startIndex,
        endIndex: element.endIndex
      });
    }
  }
  
  if (ranges.length === 0) {
    return { updated: 0, namedStyleType };
  }
  
  // Build text style object from options
  const textStyle = {};
  const fields = [];
  
  if (style.fontFamily) {
    textStyle.weightedFontFamily = {
      fontFamily: style.fontFamily,
      weight: style.fontWeight || 400
    };
    fields.push('weightedFontFamily');
  }
  
  if (style.fontSize) {
    textStyle.fontSize = {
      magnitude: style.fontSize,
      unit: 'PT'
    };
    fields.push('fontSize');
  }
  
  if (style.color) {
    textStyle.foregroundColor = {
      color: { rgbColor: style.color }
    };
    fields.push('foregroundColor');
  }
  
  if (style.bold !== undefined) {
    textStyle.bold = style.bold;
    fields.push('bold');
  }
  
  if (fields.length === 0) {
    throw new Error('At least one style property required: fontFamily, fontSize, color, bold');
  }
  
  // Update each heading
  const requests = ranges.map(range => ({
    updateTextStyle: {
      range: {
        startIndex: range.startIndex,
        endIndex: range.endIndex - 1 // Exclude trailing newline
      },
      textStyle,
      fields: fields.join(',')
    }
  }));
  
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  
  return { updated: ranges.length, namedStyleType, style };
}

/**
 * Make a suggested edit in a Google Doc (Note: API limitation - creates direct edit, not suggestion)
 * Finds text and suggests replacing it with new text
 */
export async function suggestEdit(email, docId, findText, replaceText) {
  const docs = await getDocsApi(email);
  
  // First, read the document to find the text location
  const doc = await docs.documents.get({ documentId: docId });
  
  // Find the text in the document
  let foundIndex = null;
  const content = doc.data.body?.content || [];
  
  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun?.content?.includes(findText)) {
          // Found it - calculate the exact position
          const textContent = elem.textRun.content;
          const offsetInElement = textContent.indexOf(findText);
          foundIndex = elem.startIndex + offsetInElement;
          break;
        }
      }
    }
    if (foundIndex !== null) break;
  }
  
  if (foundIndex === null) {
    throw new Error(`Text not found: "${findText}"`);
  }
  
  // Make the suggestion using replaceAllText with suggestion mode
  const response = await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: {
              text: findText,
              matchCase: true
            },
            replaceText: replaceText
          }
        }
      ],
      writeControl: {
        targetRevisionId: doc.data.revisionId
      }
    }
  });
  
  return {
    found: findText,
    suggested: replaceText,
    success: true
  };
}

