"""
Shared utilities for Word document track changes operations.
"""

import zipfile
from xml.etree import ElementTree as ET
from datetime import datetime

# Word XML namespaces
NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
}


def parse_date(date_str):
    """Parse Word date string to readable format."""
    if not date_str:
        return None
    try:
        # Word dates are typically ISO format or ticks
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        return date_str
    except:
        return date_str


def get_text_from_element(elem):
    """Extract text content from a Word XML element."""
    text_parts = []
    for t in elem.findall('.//w:t', NS):
        if t.text:
            text_parts.append(t.text)
    return ''.join(text_parts)


def list_track_changes(docx_path):
    """List all track changes in a Word document."""
    from pathlib import Path
    
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        raise FileNotFoundError(f"File not found: {docx_path}")
    
    if not docx_path.suffix.lower() == '.docx':
        raise ValueError("File must be a .docx file")
    
    changes = []
    change_id = 1
    
    with zipfile.ZipFile(docx_path, 'r') as docx:
        # Read document.xml
        try:
            doc_xml = docx.read('word/document.xml')
        except KeyError:
            raise ValueError("Invalid Word document structure")
        
        root = ET.fromstring(doc_xml)
        
        # Find all insertions (w:ins)
        for ins in root.findall('.//w:ins', NS):
            author = ins.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', 'Unknown')
            date = ins.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '')
            text = get_text_from_element(ins)
            
            changes.append({
                'id': change_id,
                'type': 'Insertion',
                'author': author,
                'date': parse_date(date),
                'text': text,
                'status': 'Pending',
                'element': 'ins',
                'xml_element': ins
            })
            change_id += 1
        
        # Find all deletions (w:del)
        for dele in root.findall('.//w:del', NS):
            author = dele.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', 'Unknown')
            date = dele.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '')
            text = get_text_from_element(dele)
            
            changes.append({
                'id': change_id,
                'type': 'Deletion',
                'author': author,
                'date': parse_date(date),
                'text': text,
                'status': 'Pending',
                'element': 'del',
                'xml_element': dele
            })
            change_id += 1
        
        # Find formatting changes (w:rPrChange, w:pPrChange)
        for fmt_change in root.findall('.//w:rPrChange', NS):
            author = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', 'Unknown')
            date = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '')
            
            changes.append({
                'id': change_id,
                'type': 'Formatting (Run)',
                'author': author,
                'date': parse_date(date),
                'text': '[Formatting change]',
                'status': 'Pending',
                'element': 'rPrChange',
                'xml_element': fmt_change
            })
            change_id += 1
        
        for fmt_change in root.findall('.//w:pPrChange', NS):
            author = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', 'Unknown')
            date = fmt_change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '')
            
            changes.append({
                'id': change_id,
                'type': 'Formatting (Paragraph)',
                'author': author,
                'date': parse_date(date),
                'text': '[Formatting change]',
                'status': 'Pending',
                'element': 'pPrChange',
                'xml_element': fmt_change
            })
            change_id += 1
    
    return changes


def list_comments(docx_path):
    """List all comments in a Word document."""
    from pathlib import Path
    
    docx_path = Path(docx_path)
    
    if not docx_path.exists():
        raise FileNotFoundError(f"File not found: {docx_path}")
    
    if not docx_path.suffix.lower() == '.docx':
        raise ValueError("File must be a .docx file")
    
    comments = []
    comment_id = 1
    
    with zipfile.ZipFile(docx_path, 'r') as docx:
        # Check if comments.xml exists
        try:
            comments_xml = docx.read('word/comments.xml')
        except KeyError:
            # No comments file means no comments
            return comments
        
        comments_root = ET.fromstring(comments_xml)
        
        # Read document.xml to get comment ranges
        try:
            doc_xml = docx.read('word/document.xml')
        except KeyError:
            raise ValueError("Invalid Word document structure")
        
        doc_root = ET.fromstring(doc_xml)
        
        # Find all comment elements in comments.xml
        for comment_elem in comments_root.findall('.//w:comment', NS):
            comment_id_attr = comment_elem.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id')
            author = comment_elem.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author', 'Unknown')
            date = comment_elem.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date', '')
            initials = comment_elem.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}initials', '')
            
            # Get comment text
            text = get_text_from_element(comment_elem)
            
            # Try to find the commented text in document
            commented_text = ''
            for comment_ref in doc_root.findall(f'.//w:commentReference[@w:id="{comment_id_attr}"]', NS):
                # Find the paragraph containing this comment reference
                para = comment_ref
                while para is not None and not para.tag.endswith('}p'):
                    para = para.getparent()
                if para is not None:
                    # Get text from paragraph (simplified - gets all text in para)
                    commented_text = get_text_from_element(para)[:100]  # Limit length
            
            comments.append({
                'id': comment_id,
                'comment_id': comment_id_attr,
                'author': author,
                'initials': initials,
                'date': parse_date(date),
                'text': text,
                'commented_text': commented_text,
            })
            comment_id += 1
    
    return comments

