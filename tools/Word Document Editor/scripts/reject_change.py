#!/usr/bin/env python3
"""
Reject a specific track change in a Word document.

REQUIRES EXPLICIT USER CONFIRMATION - never rejects changes automatically.

Usage:
    python3 reject_change.py document.docx --change-id 2
    python3 reject_change.py document.docx --change-id 2 --output new_document.docx
"""

import sys
import zipfile
import shutil
import argparse
from xml.etree import ElementTree as ET
from pathlib import Path
from docx_utils import list_track_changes, NS


def reject_change(docx_path, change_id, output_path=None, confirm=True):
    """
    Reject a specific track change.
    
    Args:
        docx_path: Path to input document
        change_id: ID of change to reject (from list_changes)
        output_path: Path to save output (None = overwrite original)
        confirm: Require user confirmation (default: True)
    """
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        print(f"❌ Error: File not found: {docx_path}", file=sys.stderr)
        sys.exit(1)
    
    # First, list changes to find the one we want
    try:
        changes = list_track_changes(docx_path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Find the change by ID
    target_change = None
    for change in changes:
        if change['id'] == change_id:
            target_change = change
            break
    
    if not target_change:
        print(f"❌ Error: Change ID {change_id} not found", file=sys.stderr)
        print(f"   Run 'list_changes.py' to see available change IDs", file=sys.stderr)
        sys.exit(1)
    
    # Show change details
    print(f"\n📋 Change to reject:")
    print(f"   ID: {target_change['id']}")
    print(f"   Type: {target_change['type']}")
    print(f"   Author: {target_change['author']}")
    print(f"   Text: {repr(target_change['text'][:100])}")
    
    # Require explicit confirmation
    if confirm:
        print(f"\n⚠️  WARNING: This will reject the change (remove it from the document).")
        response = input("   Type 'REJECT' to confirm: ")
        if response != 'REJECT':
            print("❌ Cancelled - change not rejected.")
            sys.exit(0)
    
    # Determine output path
    if output_path is None:
        output_path = docx_path
    else:
        output_path = Path(output_path)
    
    try:
        # Copy document to output location
        if output_path != docx_path:
            shutil.copy2(docx_path, output_path)
        
        # Open document
        with zipfile.ZipFile(output_path, 'a') as docx:
            # Read document.xml
            doc_xml = docx.read('word/document.xml')
            root = ET.fromstring(doc_xml)
            
            # Find and reject the change based on type
            rejected = False
            
            if target_change['element'] == 'ins':
                # For insertions, remove the w:ins element entirely (reject = don't insert)
                for ins in root.findall('.//w:ins', NS):
                    author = ins.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                    from docx_utils import get_text_from_element
                    text = get_text_from_element(ins)
                    if author == target_change['author'] and text == target_change['text']:
                        parent = ins.getparent()
                        if parent is not None:
                            parent.remove(ins)
                            rejected = True
                            break
            
            elif target_change['element'] == 'del':
                # For deletions, keep the content (reject = don't delete)
                # Remove w:del wrapper and keep the content
                for dele in root.findall('.//w:del', NS):
                    author = dele.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                    from docx_utils import get_text_from_element
                    text = get_text_from_element(dele)
                    if author == target_change['author'] and text == target_change['text']:
                        parent = dele.getparent()
                        if parent is not None:
                            # Move children to parent before removing del
                            for child in list(dele):
                                parent.insert(list(parent).index(dele), child)
                            parent.remove(dele)
                            rejected = True
                            break
            
            elif target_change['element'] in ['rPrChange', 'pPrChange']:
                # For formatting changes, remove the change wrapper (reject = don't apply formatting)
                element_name = target_change['element']
                for fmt_change in root.findall(f'.//w:{element_name}', NS):
                    author = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                    if author == target_change['author']:
                        parent = fmt_change.getparent()
                        if parent is not None:
                            parent.remove(fmt_change)
                            rejected = True
                            break
            
            if not rejected:
                print(f"⚠️  Warning: Could not locate exact change element in XML", file=sys.stderr)
                print(f"   The change may have already been rejected or document structure differs", file=sys.stderr)
                sys.exit(1)
            
            # Write back to document
            doc_xml_new = ET.tostring(root, encoding='unicode')
            # Word requires specific XML declaration
            doc_xml_new = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + doc_xml_new
            
            # Remove old file and write new one
            docx.writestr('word/document.xml', doc_xml_new.encode('utf-8'))
        
        print(f"\n✓ Success! Change rejected and saved to: {output_path}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Reject a specific track change (requires explicit confirmation)'
    )
    parser.add_argument('document', help='Path to Word document (.docx)')
    parser.add_argument('--change-id', type=int, required=True,
                       help='ID of change to reject (from list_changes.py)')
    parser.add_argument('--output', '-o',
                       help='Output file path (default: overwrites original)')
    parser.add_argument('--no-confirm', action='store_true',
                       help='Skip confirmation prompt (NOT RECOMMENDED)')
    
    args = parser.parse_args()
    
    reject_change(
        args.document,
        args.change_id,
        output_path=args.output,
        confirm=not args.no_confirm
    )


if __name__ == '__main__':
    main()

