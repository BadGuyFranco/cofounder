#!/usr/bin/env python3
"""
Create a new Word document from scratch.

Usage:
    python3 create_document.py output.docx
    python3 create_document.py output.docx --text "Initial content"
    python3 create_document.py output.docx --title "Document Title"
"""

import sys
import zipfile
import argparse
from xml.etree import ElementTree as ET
from pathlib import Path
from datetime import datetime


# Word XML namespaces
NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
}


def create_word_document(output_path, initial_text="", title=None):
    """
    Create a new Word document from scratch.
    
    Args:
        output_path: Path where the new document will be saved
        initial_text: Initial text content (optional)
        title: Document title (optional)
    """
    output_path = Path(output_path)
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create minimal Word document structure
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
        # [Content_Types].xml
        content_types = ET.Element('Types', xmlns='http://schemas.openxmlformats.org/package/2006/content-types')
        
        default1 = ET.SubElement(content_types, 'Default')
        default1.set('Extension', 'rels')
        default1.set('ContentType', 'application/vnd.openxmlformats-package.relationships+xml')
        
        default2 = ET.SubElement(content_types, 'Default')
        default2.set('Extension', 'xml')
        default2.set('ContentType', 'application/xml')
        
        override1 = ET.SubElement(content_types, 'Override')
        override1.set('PartName', '/word/document.xml')
        override1.set('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')
        
        override2 = ET.SubElement(content_types, 'Override')
        override2.set('PartName', '/docProps/core.xml')
        override2.set('ContentType', 'application/vnd.openxmlformats-package.core-properties+xml')
        
        override3 = ET.SubElement(content_types, 'Override')
        override3.set('PartName', '/word/styles.xml')
        override3.set('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml')
        
        content_types_xml = ET.tostring(content_types, encoding='unicode')
        content_types_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + content_types_xml
        docx.writestr('[Content_Types].xml', content_types_xml.encode('utf-8'))
        
        # _rels/.rels
        rels_root = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        
        rel1 = ET.SubElement(rels_root, 'Relationship')
        rel1.set('Id', 'rId1')
        rel1.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument')
        rel1.set('Target', 'word/document.xml')
        
        rel2 = ET.SubElement(rels_root, 'Relationship')
        rel2.set('Id', 'rId2')
        rel2.set('Type', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties')
        rel2.set('Target', 'docProps/core.xml')
        
        rels_xml = ET.tostring(rels_root, encoding='unicode')
        rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + rels_xml
        docx.writestr('_rels/.rels', rels_xml.encode('utf-8'))
        
        # word/document.xml
        document = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document')
        document.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}mc:Ignorable', 'w14 w15 w16se w16cid w16 w16cex w16sdtd w16wdg w16w10 w16wps w16wpg w16wpi w16wne w16wps w16wpg w16wpi w16wne')
        
        body = ET.SubElement(document, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}body')
        
        if initial_text:
            para = ET.SubElement(body, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
            run = ET.SubElement(para, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
            text_elem = ET.SubElement(run, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
            text_elem.text = initial_text
        
        document_xml = ET.tostring(document, encoding='unicode')
        document_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + document_xml
        docx.writestr('word/document.xml', document_xml.encode('utf-8'))
        
        # word/_rels/document.xml.rels
        doc_rels_root = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        
        rel_styles = ET.SubElement(doc_rels_root, 'Relationship')
        rel_styles.set('Id', 'rId1')
        rel_styles.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles')
        rel_styles.set('Target', 'styles.xml')
        
        doc_rels_xml = ET.tostring(doc_rels_root, encoding='unicode')
        doc_rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + doc_rels_xml
        docx.writestr('word/_rels/document.xml.rels', doc_rels_xml.encode('utf-8'))
        
        # word/styles.xml
        styles = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styles')
        
        # Normal style
        style_normal = ET.SubElement(styles, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}style')
        style_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}type', 'paragraph')
        style_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId', 'Normal')
        
        name_normal = ET.SubElement(style_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}name')
        name_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'Normal')
        
        ppr_normal = ET.SubElement(style_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
        spacing_normal = ET.SubElement(ppr_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}spacing')
        spacing_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}after', '0')
        spacing_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}line', '240')
        spacing_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}lineRule', 'auto')
        
        rpr_normal = ET.SubElement(style_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
        rfonts_normal = ET.SubElement(rpr_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rFonts')
        rfonts_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ascii', 'Calibri')
        rfonts_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}hAnsi', 'Calibri')
        sz_normal = ET.SubElement(rpr_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sz')
        sz_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '22')
        sz_cs_normal = ET.SubElement(rpr_normal, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}szCs')
        sz_cs_normal.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '22')
        
        styles_xml = ET.tostring(styles, encoding='unicode')
        styles_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + styles_xml
        docx.writestr('word/styles.xml', styles_xml.encode('utf-8'))
        
        # docProps/core.xml
        core_props = ET.Element('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}coreProperties')
        core_props.set('{http://www.w3.org/2001/XMLSchema-instance}schemaLocation', 
                      'http://schemas.openxmlformats.org/package/2006/metadata/core-properties http://schemas.openxmlformats.org/package/2006/metadata/core-properties/core-properties.xsd')
        
        if title:
            title_elem = ET.SubElement(core_props, '{http://purl.org/dc/elements/1.1/}title')
            title_elem.text = title
        
        creator = ET.SubElement(core_props, '{http://purl.org/dc/elements/1.1/}creator')
        creator.text = 'Word Document Editor'
        
        created = ET.SubElement(core_props, '{http://purl.org/dc/terms/}created')
        created.set('{http://www.w3.org/2001/XMLSchema-instance}type', 'dcterms:W3CDTF')
        created.text = datetime.now().isoformat() + 'Z'
        
        modified = ET.SubElement(core_props, '{http://purl.org/dc/terms/}modified')
        modified.set('{http://www.w3.org/2001/XMLSchema-instance}type', 'dcterms:W3CDTF')
        modified.text = datetime.now().isoformat() + 'Z'
        
        core_xml = ET.tostring(core_props, encoding='unicode')
        core_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + core_xml
        docx.writestr('docProps/core.xml', core_xml.encode('utf-8'))
        
        # docProps/app.xml (optional but helpful)
        app = ET.Element('{http://schemas.openxmlformats.org/officeDocument/2006/extended-properties}Properties')
        app.set('{http://www.w3.org/2001/XMLSchema-instance}schemaLocation',
               'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties http://schemas.openxmlformats.org/officeDocument/2006/extended-properties/extended-properties.xsd')
        
        app_version = ET.SubElement(app, '{http://schemas.openxmlformats.org/officeDocument/2006/extended-properties}AppVersion')
        app_version.text = '16.0000'
        
        app_xml = ET.tostring(app, encoding='unicode')
        app_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + app_xml
        docx.writestr('docProps/app.xml', app_xml.encode('utf-8'))


def main():
    parser = argparse.ArgumentParser(
        description='Create a new Word document from scratch'
    )
    parser.add_argument('output', help='Output file path (.docx)')
    parser.add_argument('--text', default='',
                       help='Initial text content')
    parser.add_argument('--title',
                       help='Document title')
    
    args = parser.parse_args()
    
    output_path = Path(args.output)
    if not output_path.suffix.lower() == '.docx':
        print("⚠️  Warning: Output file should have .docx extension", file=sys.stderr)
    
    try:
        create_word_document(
            args.output,
            initial_text=args.text,
            title=args.title
        )
        print(f"\n✓ Success! New document created: {args.output}")
        if args.text:
            print(f"   Initial text: {repr(args.text[:50])}{'...' if len(args.text) > 50 else ''}")
        if args.title:
            print(f"   Title: {args.title}")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()







