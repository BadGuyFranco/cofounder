#!/usr/bin/env python3
"""
List all track changes in a Word document.

Usage:
    python3 list_changes.py document.docx
"""

import sys
from pathlib import Path
from docx_utils import list_track_changes


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 list_changes.py document.docx", file=sys.stderr)
        sys.exit(1)
    
    docx_path = sys.argv[1]
    
    try:
        changes = list_track_changes(docx_path)
        
        # Print results
        if not changes:
            print("✓ No track changes found in document.")
            return
        
        print(f"\nFound {len(changes)} track change(s):\n")
        print("=" * 80)
        
        for change in changes:
            print(f"\nChange ID: {change['id']}")
            print(f"Type: {change['type']}")
            print(f"Author: {change['author']}")
            if change['date']:
                print(f"Date: {change['date']}")
            print(f"Text: {repr(change['text'][:100])}{'...' if len(change['text']) > 100 else ''}")
            print(f"Status: {change['status']}")
            print("-" * 80)
    
    except FileNotFoundError as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)




if __name__ == '__main__':
    main()

