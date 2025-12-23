# Word Document Editor

Create and edit Word documents with full track changes support using stable XML parsing.


## Approach

This library uses **XML parsing** for maximum stability. Word documents (.docx) are ZIP archives containing XML files. Track changes are stored in the XML structure, which we parse directly rather than using platform-specific automation.

**Why XML parsing:**
- More stable across Word/OS updates
- Cross-platform (Mac and Windows)
- No dependency on Word being installed
- Evergreen approach

**Limitations:**
- Some complex formatting edge cases may not be fully supported
- Requires understanding Word's XML structure


## Dependencies

### Verify Installation

```bash
cd "/pro accelerator/tools/Word Document Editor"
pip3 list | grep -E "(python-docx|lxml|python-dotenv)"
```

Expected output should show:
- `python-docx` (>=1.1.0)
- `lxml` (>=5.0.0)
- `python-dotenv` (>=1.0.0)

### Install Dependencies

```bash
cd "/pro accelerator/tools/Word Document Editor"
pip3 install -r requirements.txt
```


## Core Operations

### Create New Document

**Script:** `scripts/create_document.py`

**Usage:**
```bash
python3 scripts/create_document.py path/to/new_document.docx
python3 scripts/create_document.py path/to/new_document.docx --text "Initial content"
python3 scripts/create_document.py path/to/new_document.docx --title "Document Title" --text "Content"
```

**Options:**
- `output` - Output file path (.docx) (required)
- `--text TEXT` - Initial text content (optional)
- `--title TITLE` - Document title (optional)

Creates a minimal but valid Word document that can be opened in Microsoft Word and edited with all other tools.


### List Track Changes

**Script:** `scripts/list_changes.py`

**Usage:**
```bash
python3 scripts/list_changes.py path/to/document.docx
```

**Output:** Lists all tracked changes with:
- Change ID (for referencing)
- Type (insertion, deletion, formatting, etc.)
- Author
- Date
- Content/text affected
- Current state (accepted/rejected/pending)

**Example output:**
```
Change ID: 1
Type: Insertion
Author: John Doe
Date: 2024-01-15 10:30:00
Text: "new text added here"
Status: Pending

Change ID: 2
Type: Deletion
Author: Jane Smith
Date: 2024-01-15 11:00:00
Text: "old text removed"
Status: Pending
```


### Apply a Track Change

**Script:** `scripts/apply_change.py`

**Usage:**
```bash
python3 scripts/apply_change.py path/to/document.docx --change-id 1
```

**Safety:** This script REQUIRES explicit confirmation. It will:
1. Show the change details
2. Prompt for confirmation
3. Only apply if explicitly approved

**Options:**
- `--change-id N` - ID of change to apply (from list_changes output)
- `--output PATH` - Save to new file (default: overwrites original)

**Never accepts changes automatically** - always requires user confirmation.


### Reject a Track Change

**Script:** `scripts/reject_change.py`

**Usage:**
```bash
python3 scripts/reject_change.py path/to/document.docx --change-id 2
```

**Safety:** Same as apply_change - requires explicit confirmation.

**Options:**
- `--change-id N` - ID of change to reject
- `--output PATH` - Save to new file


### Add a New Tracked Change

**Script:** `scripts/add_change.py`

**Usage:**
```bash
python3 scripts/add_change.py path/to/document.docx --text "New content" --type insertion
```

**Options:**
- `--text TEXT` - Text to insert or delete
- `--author NAME` - Author name for the change (default: "AIM")
- `--type TYPE` - Type: `insertion`, `deletion`, `formatting`
- `--position N` - Character position (optional, defaults to end)
- `--output PATH` - Save to new file

**Note:** Default author is "AIM" for easy identification of AI-generated changes.


## Comments Operations

### List Comments

**Script:** `scripts/list_comments.py`

**Usage:**
```bash
python3 scripts/list_comments.py path/to/document.docx
```

**Output:** Lists all comments with:
- Comment ID
- Author
- Date
- Comment text
- Text being commented on (if available)


### Add a Comment

**Script:** `scripts/add_comment.py`

**Usage:**
```bash
python3 scripts/add_comment.py path/to/document.docx --text "This needs review"
```

**Options:**
- `--text TEXT` - Comment text content (required)
- `--author NAME` - Author name (default: "AIM")
- `--initials INITIALS` - Author initials (default: derived from author)
- `--position N` - Character position (optional, defaults to end)
- `--output PATH` - Save to new file

**Note:** Default author is "AIM" for easy identification of AI-generated comments.


### Apply All Changes (Batch)

**Script:** `scripts/apply_all_changes.py`

**Usage:**
```bash
python3 scripts/apply_all_changes.py path/to/document.docx
```

**Safety:** Shows summary of ALL changes and requires explicit confirmation before applying any.

**Options:**
- `--output PATH` - Save to new file
- `--filter-author NAME` - Only apply changes by specific author
- `--filter-type TYPE` - Only apply specific change types


## Safety Rules

**CRITICAL:** This library NEVER accepts changes without explicit user feedback.

1. **All apply/reject operations** require explicit confirmation prompts
2. **Batch operations** show full summary before any action
3. **Default behavior** is to save to new file unless `--overwrite` is explicitly used
4. **Change IDs** must be explicitly provided - no "apply all" shortcuts


## Troubleshooting

**"Module not found" errors:** Install dependencies from `requirements.txt` (see Dependencies section above).

**"Cannot read document" errors:**
- Ensure file is a valid .docx file
- Check file permissions
- Try opening in Word first to ensure it's not corrupted

**"Change not found" errors:**
- Run `list_changes.py` first to get current change IDs
- Change IDs may change after applying/rejecting other changes

**"Track changes not detected":**
- Ensure track changes is enabled in the Word document
- Some documents may have changes in comments instead of track changes
- Try opening in Word to verify track changes are visible


## Technical Details

**XML Structure:**
- Track changes stored in `word/document.xml` and `word/settings.xml`
- Changes use Word's `w:ins`, `w:del`, `w:moveFrom`, `w:moveTo` elements
- Change metadata in `w:trackChange` attributes
- Comments stored in `word/comments.xml`
- Comment references use `w:commentRangeStart`, `w:commentRangeEnd`, `w:commentReference` elements

**Library Stack:**
- `python-docx` - Base document manipulation
- `lxml` - XML parsing for track changes
- Direct XML manipulation for changes python-docx doesn't support


## Usage Patterns

**Review workflow:**
1. `list_changes.py` - See all changes
2. Review each change
3. `apply_change.py` or `reject_change.py` - Process individually
4. Or use `apply_all_changes.py` for batch (with confirmation)

**AI editing workflow:**
1. `add_change.py` - Add AI edits as tracked changes (defaults to "AIM" author)
2. `add_comment.py` - Add AI comments for review (defaults to "AIM" author)
3. User reviews in Word
4. User applies/rejects as needed

**Never automate acceptance** - always require human review.

**Comments workflow:**
1. `list_comments.py` - See all comments in document
2. `add_comment.py` - Add new comments (defaults to "AIM" author)
3. Comments appear in Word's review pane

