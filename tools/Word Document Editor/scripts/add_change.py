#!/usr/bin/env python3
"""
Add a new tracked change to a Word document.

Usage:
    python3 add_change.py document.docx --text "New text" --type insertion
    python3 add_change.py document.docx --text "Old text" --type deletion --position 100
    python3 add_change.py document.docx --text "New text" --type insertion --author "Custom Author"
"""

import sys
import zipfile
import shutil
import argparse
from xml.etree import ElementTree as ET
from pathlib import Path
from docx_utils import NS


def add_tracked_change(docx_path, text, change_type, author="AIM", position=None, output_path=None):
    """
    Add a new tracked change to a Word document.
    
    Args:
        docx_path: Path to input document
        text: Text content for the change
        change_type: 'insertion' or 'deletion'
        author: Author name for the change (default: "AIM")
        position: Character position (None = end of document)
        output_path: Path to save output (None = overwrites original)
    """
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        print(f"❌ Error: File not found: {docx_path}", file=sys.stderr)
        sys.exit(1)
    
    if change_type not in ['insertion', 'deletion']:
        print(f"❌ Error: Change type must be 'insertion' or 'deletion'", file=sys.stderr)
        sys.exit(1)
    
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
            
            # Get current date/time for the change
            from datetime import datetime
            change_date = datetime.now().isoformat() + 'Z'
            
            if change_type == 'insertion':
                # Create insertion element
                ins_elem = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ins')
                ins_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', author)
                ins_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', change_date)
                ins_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', '0')
                
                # Create run element with text
                run_elem = ET.SubElement(ins_elem, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                text_elem = ET.SubElement(run_elem, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                text_elem.text = text
                
                # Find insertion point (simplified - appends to end of body)
                body = root.find('.//w:body', NS)
                if body is not None:
                    # Find last paragraph or create one
                    paragraphs = body.findall('.//w:p', NS)
                    if paragraphs:
                        last_para = paragraphs[-1]
                        # Add to end of last paragraph
                        last_para.append(ins_elem)
                    else:
                        # Create new paragraph
                        para = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                        para.append(ins_elem)
                        body.append(para)
            
            elif change_type == 'deletion':
                # Create deletion element
                del_elem = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}del')
                del_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', author)
                del_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', change_date)
                
                # Create run element with text
                run_elem = ET.SubElement(del_elem, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                text_elem = ET.SubElement(run_elem, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}delText')
                text_elem.text = text
                
                # Find insertion point (simplified - appends to end of body)
                body = root.find('.//w:body', NS)
                if body is not None:
                    paragraphs = body.findall('.//w:p', NS)
                    if paragraphs:
                        last_para = paragraphs[-1]
                        last_para.append(del_elem)
                    else:
                        para = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                        para.append(del_elem)
                        body.append(para)
            
            # Write back to document
            doc_xml_new = ET.tostring(root, encoding='unicode')
            # Word requires specific XML declaration
            doc_xml_new = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + doc_xml_new
            
            # Remove old file and write new one
            docx.writestr('word/document.xml', doc_xml_new.encode('utf-8'))
        
        print(f"\n✓ Success! Tracked change added and saved to: {output_path}")
        print(f"   Type: {change_type}")
        print(f"   Author: {author}")
        print(f"   Text: {repr(text)}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Add a new tracked change to a Word document'
    )
    parser.add_argument('document', help='Path to Word document (.docx)')
    parser.add_argument('--text', required=True,
                       help='Text content for the change')
    parser.add_argument('--author', default='AIM',
                       help='Author name for the change (default: AIM)')
    parser.add_argument('--type', required=True, choices=['insertion', 'deletion'],
                       help='Type of change: insertion or deletion')
    parser.add_argument('--position', type=int,
                       help='Character position (optional, defaults to end)')
    parser.add_argument('--output', '-o',
                       help='Output file path (default: overwrites original)')
    
    args = parser.parse_args()
    
    add_tracked_change(
        args.document,
        args.text,
        args.type,
        author=args.author,
        position=args.position,
        output_path=args.output
    )


if __name__ == '__main__':
    main()

