#!/usr/bin/env python3
"""
Apply all track changes in a Word document (batch operation).

REQUIRES EXPLICIT USER CONFIRMATION - shows summary of ALL changes before applying any.

Usage:
    python3 apply_all_changes.py document.docx
    python3 apply_all_changes.py document.docx --filter-author "John Doe"
    python3 apply_all_changes.py document.docx --filter-type insertion
"""

import sys
import argparse
import zipfile
import shutil
from pathlib import Path
from xml.etree import ElementTree as ET
from docx_utils import list_track_changes, NS, get_text_from_element


def apply_all_changes(docx_path, output_path=None, filter_author=None, filter_type=None, confirm=True):
    """
    Apply all track changes in a document.
    
    Args:
        docx_path: Path to input document
        output_path: Path to save output (None = overwrites original)
        filter_author: Only apply changes by this author (optional)
        filter_type: Only apply changes of this type (optional)
        confirm: Require user confirmation (default: True)
    """
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        print(f"❌ Error: File not found: {docx_path}", file=sys.stderr)
        sys.exit(1)
    
    # List all changes
    try:
        all_changes = list_track_changes(docx_path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    if not all_changes:
        print("✓ No track changes found in document.")
        return
    
    # Apply filters
    changes_to_apply = all_changes
    if filter_author:
        changes_to_apply = [c for c in changes_to_apply if c['author'] == filter_author]
    if filter_type:
        changes_to_apply = [c for c in changes_to_apply if c['type'].lower() == filter_type.lower()]
    
    if not changes_to_apply:
        print(f"✓ No changes match the filters.")
        return
    
    # Show summary
    print(f"\n📋 Summary of changes to apply:")
    print(f"   Total changes: {len(changes_to_apply)}")
    if filter_author:
        print(f"   Filtered by author: {filter_author}")
    if filter_type:
        print(f"   Filtered by type: {filter_type}")
    print("\n" + "=" * 80)
    
    for change in changes_to_apply:
        print(f"\nChange ID: {change['id']}")
        print(f"  Type: {change['type']}")
        print(f"  Author: {change['author']}")
        print(f"  Text: {repr(change['text'][:80])}{'...' if len(change['text']) > 80 else ''}")
    
    print("\n" + "=" * 80)
    
    # Require explicit confirmation
    if confirm:
        print(f"\n⚠️  WARNING: This will apply {len(changes_to_apply)} change(s) to the document.")
        response = input("   Type 'APPLY ALL' to confirm: ")
        if response != 'APPLY ALL':
            print("❌ Cancelled - no changes applied.")
            sys.exit(0)
    
    # Determine output path
    if output_path is None:
        final_output = docx_path
    else:
        final_output = Path(output_path)
    
    # Copy document to output location
    if final_output != docx_path:
        shutil.copy2(docx_path, final_output)
    
    # Apply all changes in a single XML pass
    try:
        with zipfile.ZipFile(final_output, 'a') as docx:
            # Read document.xml
            doc_xml = docx.read('word/document.xml')
            root = ET.fromstring(doc_xml)
            
            applied_count = 0
            
            # Build a set of change identifiers for fast lookup
            change_ids = {(c['author'], c['text'], c['element']) for c in changes_to_apply}
            
            # Apply insertions
            for ins in root.findall('.//w:ins', NS):
                author = ins.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                text = get_text_from_element(ins)
                if (author, text, 'ins') in change_ids:
                    parent = ins.getparent()
                    if parent is not None:
                        for child in list(ins):
                            parent.insert(list(parent).index(ins), child)
                        parent.remove(ins)
                        applied_count += 1
            
            # Apply deletions (remove del wrapper)
            for dele in root.findall('.//w:del', NS):
                author = dele.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                text = get_text_from_element(dele)
                if (author, text, 'del') in change_ids:
                    parent = dele.getparent()
                    if parent is not None:
                        parent.remove(dele)
                        applied_count += 1
            
            # Apply formatting changes
            for fmt_change in root.findall('.//w:rPrChange', NS):
                author = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                if (author, '[Formatting change]', 'rPrChange') in change_ids:
                    parent = fmt_change.getparent()
                    if parent is not None:
                        for child in list(fmt_change):
                            if child.tag.endswith('}rPr'):
                                for existing in parent.findall('.//w:rPr', NS):
                                    parent.remove(existing)
                                parent.append(child)
                        parent.remove(fmt_change)
                        applied_count += 1
            
            for fmt_change in root.findall('.//w:pPrChange', NS):
                author = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', '')
                if (author, '[Formatting change]', 'pPrChange') in change_ids:
                    parent = fmt_change.getparent()
                    if parent is not None:
                        for child in list(fmt_change):
                            if child.tag.endswith('}pPr'):
                                for existing in parent.findall('.//w:pPr', NS):
                                    parent.remove(existing)
                                parent.append(child)
                        parent.remove(fmt_change)
                        applied_count += 1
            
            # Write back to document
            doc_xml_new = ET.tostring(root, encoding='unicode')
            doc_xml_new = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + doc_xml_new
            docx.writestr('word/document.xml', doc_xml_new.encode('utf-8'))
        
        print(f"\n✓ Success! Applied {applied_count} change(s) and saved to: {final_output}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Apply all track changes (requires explicit confirmation)'
    )
    parser.add_argument('document', help='Path to Word document (.docx)')
    parser.add_argument('--output', '-o',
                       help='Output file path (default: overwrites original)')
    parser.add_argument('--filter-author',
                       help='Only apply changes by this author')
    parser.add_argument('--filter-type',
                       choices=['Insertion', 'Deletion', 'Formatting (Run)', 'Formatting (Paragraph)'],
                       help='Only apply changes of this type')
    parser.add_argument('--no-confirm', action='store_true',
                       help='Skip confirmation prompt (NOT RECOMMENDED)')
    
    args = parser.parse_args()
    
    apply_all_changes(
        args.document,
        output_path=args.output,
        filter_author=args.filter_author,
        filter_type=args.filter_type,
        confirm=not args.no_confirm
    )


if __name__ == '__main__':
    main()

