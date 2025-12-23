#!/usr/bin/env python3
"""
[Script Name] - [One-line description]

[More detailed description of what this script does, when to use it, 
and any important notes about its behavior.]

Usage:
    python example_script.py <required_arg> [optional_arg]

Examples:
    python example_script.py "input.txt"
    python example_script.py "data.csv" --output "results/"
    python example_script.py "file.json" --format json --verbose

Arguments:
    required_arg    Description of required argument
    optional_arg    Description of optional argument (default: value)

Options:
    --output DIR    Output directory (default: ./output/)
    --format FMT    Output format: json|csv|txt (default: txt)
    --verbose       Enable verbose output
    --help          Show this help message

Dependencies:
    - python-dotenv: For loading environment variables from /memory/
    - [package2]: [what it's used for]

Configuration:
    Environment variables are loaded from /memory/[Library Name]/.env
    See /memory/README.md for the memory directory structure.

Author: [Your name or organization]
Created: YYYY-MM-DD
Last Modified: YYYY-MM-DD
"""

import sys
import os
from pathlib import Path

# ============================================================================
# ENVIRONMENT CONFIGURATION - Load from /memory/
# ============================================================================

# Load environment variables from /memory/ directory
# This pattern ensures configuration persists across /pro accelerator/ updates
try:
    from dotenv import load_dotenv
    # Navigate from script location to memory directory
    # Path: /pro accelerator/[Library Name]/scripts/ -> /memory/[Library Name]/
    script_dir = Path(__file__).parent
    memory_env = script_dir / "../../../memory/[Library Name]/.env"
    if memory_env.exists():
        load_dotenv(memory_env)
    else:
        print(f"⚠️  Warning: .env not found at {memory_env.resolve()}")
        print("   Please create /memory/[Library Name]/.env with your configuration")
        print("   See /memory/README.md for setup instructions")
except ImportError:
    pass  # dotenv not installed, will rely on system env vars

# Configuration - Load from environment (NEVER use hardcoded defaults for API keys/models)
API_KEY = os.getenv("API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME")

# Add any other imports here
# import json
# import argparse
# import logging


# ============================================================================
# CONFIGURATION
# ============================================================================

# Default values for non-sensitive configuration
DEFAULT_OUTPUT_DIR = "./output"
DEFAULT_FORMAT = "txt"
VERBOSE = False


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_config():
    """
    Validate required configuration is present.
    
    Returns:
        bool: True if valid
        
    Raises:
        SystemExit: If required configuration is missing
    """
    if not API_KEY:
        print("❌ Error: API_KEY not found!")
        print("   Please add API_KEY to /memory/[Library Name]/.env")
        sys.exit(1)
    
    if not MODEL_NAME:
        print("❌ Error: MODEL_NAME not found!")
        print("   Please add MODEL_NAME to /memory/[Library Name]/.env")
        sys.exit(1)
    
    return True


def validate_input(input_path):
    """
    Validate input file exists and is readable.
    
    Args:
        input_path (str): Path to input file
        
    Returns:
        bool: True if valid, False otherwise
        
    Raises:
        FileNotFoundError: If file doesn't exist
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    if not os.access(input_path, os.R_OK):
        raise PermissionError(f"Cannot read file: {input_path}")
    
    return True


def ensure_output_directory(output_dir):
    """
    Create output directory if it doesn't exist.
    
    Args:
        output_dir (str): Path to output directory
        
    Returns:
        Path: Path object for output directory
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    if VERBOSE:
        print(f"Output directory: {output_path.absolute()}")
    
    return output_path


def process_data(input_data):
    """
    Main processing logic.
    
    Args:
        input_data: The data to process
        
    Returns:
        Processed data
        
    Raises:
        ValueError: If input_data is invalid
    """
    # Your processing logic here
    processed = input_data
    
    return processed


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main(input_file, output_dir=DEFAULT_OUTPUT_DIR, output_format=DEFAULT_FORMAT):
    """
    Main execution function.
    
    Args:
        input_file (str): Path to input file
        output_dir (str): Path to output directory
        output_format (str): Output format (json|csv|txt)
        
    Returns:
        int: Exit code (0 for success, 1 for error)
    """
    try:
        # Validate configuration first
        validate_config()
        
        # Validate inputs
        validate_input(input_file)
        output_path = ensure_output_directory(output_dir)
        
        if VERBOSE:
            print(f"Processing: {input_file}")
            print(f"Format: {output_format}")
            print(f"Using model: {MODEL_NAME}")
        
        # Read input file
        with open(input_file, 'r') as f:
            input_data = f.read()
        
        # Process data
        result = process_data(input_data)
        
        # Write output
        output_file = output_path / f"result.{output_format}"
        with open(output_file, 'w') as f:
            f.write(str(result))
        
        print(f"✅ Success! Output saved to: {output_file}")
        return 0
        
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return 1
    except PermissionError as e:
        print(f"❌ Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        if VERBOSE:
            import traceback
            traceback.print_exc()
        return 1


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def show_help():
    """Display help message."""
    print(__doc__)
    sys.exit(0)


if __name__ == "__main__":
    # Parse command line arguments
    # (This is a simple example - consider using argparse for complex CLIs)
    
    if len(sys.argv) < 2 or "--help" in sys.argv or "-h" in sys.argv:
        show_help()
    
    # Required argument
    input_file = sys.argv[1]
    
    # Optional arguments with defaults
    output_dir = DEFAULT_OUTPUT_DIR
    output_format = DEFAULT_FORMAT
    
    # Parse optional flags
    for i, arg in enumerate(sys.argv):
        if arg == "--output" and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
        elif arg == "--format" and i + 1 < len(sys.argv):
            output_format = sys.argv[i + 1]
        elif arg == "--verbose" or arg == "-v":
            VERBOSE = True
    
    # Run main function
    exit_code = main(input_file, output_dir, output_format)
    sys.exit(exit_code)


# ============================================================================
# TEMPLATE INSTRUCTIONS (DELETE THIS SECTION WHEN DONE)
# ============================================================================
"""
This is a template showing best practices for script documentation.

When creating your own scripts:

1. ✅ Load .env from /memory/[Library Name]/.env (see top of file)
2. ✅ Validate required config exists before proceeding
3. ✅ NEVER hardcode API keys or model names
4. ✅ Include docstring at top with usage examples
5. ✅ Document all functions with docstrings
6. ✅ Use type hints where appropriate
7. ✅ Add helpful comments for complex logic
8. ✅ Include error handling with helpful messages
9. ✅ Use emoji for success/error output (✅ ❌ ⚠️)
10. ✅ Support --help flag
11. ✅ Return proper exit codes (0=success, 1=error)
12. ✅ Make output directories if they don't exist
13. ✅ Validate inputs before processing

**Path calculation for /memory/:**
- Scripts typically live at: /pro accelerator/[Library Name]/scripts/
- Memory lives at: /memory/[Library Name]/
- Relative path: ../../../memory/[Library Name]/.env
  - ../ = up to /pro accelerator/[Library Name]/
  - ../ = up to /pro accelerator/
  - ../ = up to workspace root
  - memory/[Library Name]/.env = down to memory file

**Delete:**
- This "TEMPLATE INSTRUCTIONS" section
- Any example functions you don't need
- Comments that are just examples
- Replace [Library Name] with your actual library name

**Keep:**
- Environment loading section at top
- Config validation function
- Docstring at top (update with your info)
- Error handling structure
- Help message functionality
- Clear function organization
"""
