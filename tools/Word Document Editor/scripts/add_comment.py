#!/usr/bin/env python3
"""
Add a new comment to a Word document.

Usage:
    python3 add_comment.py document.docx --text "This is a comment" --author "AIM"
    python3 add_comment.py document.docx --text "Review this" --author "AIM" --position 100
"""

import sys
import zipfile
import shutil
import argparse
from xml.etree import ElementTree as ET
from pathlib import Path
from docx_utils import NS


def add_comment(docx_path, text, author="AIM", initials=None, position=None, output_path=None):
    """
    Add a new comment to a Word document.
    
    Args:
        docx_path: Path to input document
        text: Comment text content
        author: Author name (default: "AIM")
        initials: Author initials (optional)
        position: Character position to attach comment (None = end of document)
        output_path: Path to save output (None = overwrites original)
    """
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        print(f"❌ Error: File not found: {docx_path}", file=sys.stderr)
        sys.exit(1)
    
    # Determine output path
    if output_path is None:
        output_path = docx_path
    else:
        output_path = Path(output_path)
    
    # Set initials from author if not provided
    if initials is None:
        initials = ''.join([word[0].upper() for word in author.split()[:3]])[:3]
    
    try:
        # Copy document to output location
        if output_path != docx_path:
            shutil.copy2(docx_path, output_path)
        
        # Open document
        with zipfile.ZipFile(output_path, 'a') as docx:
            # Read document.xml
            try:
                doc_xml = docx.read('word/document.xml')
            except KeyError:
                print("❌ Error: Invalid Word document structure", file=sys.stderr)
                sys.exit(1)
            
            doc_root = ET.fromstring(doc_xml)
            
            # Read or create comments.xml
            try:
                comments_xml = docx.read('word/comments.xml')
                comments_root = ET.fromstring(comments_xml)
            except KeyError:
                # Create new comments.xml
                comments_root = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}comments')
                comments_root.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}mc:Ignorable', 'w14 w15 w16se w16cid w16 w16cex w16sdtd w16wdg w16w10 w16wps w16wpg w16wpi w16wne w16wps w16wpg w16wpi w16wne')
            
            # Find highest comment ID
            max_id = 0
            for comment in comments_root.findall('.//w:comment', NS):
                comment_id = comment.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id')
                try:
                    max_id = max(max_id, int(comment_id))
                except (ValueError, TypeError):
                    pass
            
            new_comment_id = str(max_id + 1)
            
            # Get current date/time
            from datetime import datetime
            comment_date = datetime.now().isoformat() + 'Z'
            
            # Create comment element
            comment_elem = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}comment')
            comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
            comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', author)
            comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', comment_date)
            if initials:
                comment_elem.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}initials', initials)
            
            # Add comment text
            para = ET.SubElement(comment_elem, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
            para_props = ET.SubElement(para, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
            run = ET.SubElement(para, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
            text_elem = ET.SubElement(run, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
            text_elem.text = text
            
            # Add comment to comments.xml
            comments_root.append(comment_elem)
            
            # Add comment reference to document.xml
            body = doc_root.find('.//w:body', NS)
            if body is not None:
                # Find insertion point (simplified - appends to end)
                paragraphs = body.findall('.//w:p', NS)
                if paragraphs:
                    last_para = paragraphs[-1]
                    # Add comment range start
                    comment_start = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeStart')
                    comment_start.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    last_para.append(comment_start)
                    
                    # Add comment reference
                    comment_ref = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentReference')
                    comment_ref.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    last_para.append(comment_ref)
                    
                    # Add comment range end
                    comment_end = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeEnd')
                    comment_end.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    last_para.append(comment_end)
                else:
                    # Create new paragraph with comment
                    para = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
                    comment_start = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeStart')
                    comment_start.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    para.append(comment_start)
                    
                    comment_ref = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentReference')
                    comment_ref.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    para.append(comment_ref)
                    
                    comment_end = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}commentRangeEnd')
                    comment_end.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id', new_comment_id)
                    para.append(comment_end)
                    body.append(para)
            
            # Write back comments.xml
            comments_xml_new = ET.tostring(comments_root, encoding='unicode')
            comments_xml_new = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + comments_xml_new
            docx.writestr('word/comments.xml', comments_xml_new.encode('utf-8'))
            
            # Write back document.xml
            doc_xml_new = ET.tostring(doc_root, encoding='unicode')
            doc_xml_new = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + doc_xml_new
            docx.writestr('word/document.xml', doc_xml_new.encode('utf-8'))
        
        print(f"\n✓ Success! Comment added and saved to: {output_path}")
        print(f"   Author: {author}")
        print(f"   Text: {repr(text)}")
        print(f"   Comment ID: {new_comment_id}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Add a new comment to a Word document'
    )
    parser.add_argument('document', help='Path to Word document (.docx)')
    parser.add_argument('--text', required=True,
                       help='Comment text content')
    parser.add_argument('--author', default='AIM',
                       help='Author name (default: AIM)')
    parser.add_argument('--initials',
                       help='Author initials (default: derived from author)')
    parser.add_argument('--position', type=int,
                       help='Character position (optional, defaults to end)')
    parser.add_argument('--output', '-o',
                       help='Output file path (default: overwrites original)')
    
    args = parser.parse_args()
    
    add_comment(
        args.document,
        args.text,
        author=args.author,
        initials=args.initials,
        position=args.position,
        output_path=args.output
    )


if __name__ == '__main__':
    main()

