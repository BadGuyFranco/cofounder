#!/usr/bin/env python3
"""
List all comments in a Word document.

Usage:
    python3 list_comments.py document.docx
"""

import sys
from pathlib import Path
from docx_utils import list_comments


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 list_comments.py document.docx", file=sys.stderr)
        sys.exit(1)
    
    docx_path = sys.argv[1]
    
    try:
        comments = list_comments(docx_path)
        
        # Print results
        if not comments:
            print("✓ No comments found in document.")
            return
        
        print(f"\nFound {len(comments)} comment(s):\n")
        print("=" * 80)
        
        for comment in comments:
            print(f"\nComment ID: {comment['id']}")
            print(f"Author: {comment['author']}")
            if comment['initials']:
                print(f"Initials: {comment['initials']}")
            if comment['date']:
                print(f"Date: {comment['date']}")
            print(f"Comment: {repr(comment['text'][:200])}{'...' if len(comment['text']) > 200 else ''}")
            if comment['commented_text']:
                print(f"On text: {repr(comment['commented_text'])}")
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

