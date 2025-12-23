#!/usr/bin/env python3
"""
[Script Name] - [One-line description]

Usage:
    python3 example_script.py "input" [--option value]

Examples:
    python3 example_script.py "hello world"
    python3 example_script.py "data.txt" --output "./results/"
    python3 example_script.py "input" --verbose

Arguments:
    input           Required input (file path, text, etc.)

Options:
    --output DIR    Output directory (default: ./output/)
    --verbose       Enable verbose output
    --help          Show this help message

Configuration:
    Environment variables loaded from /memory/[Tool Name]/.env
    See /memory/README.md for setup.
"""

import sys
import os
from pathlib import Path

# ============================================================================
# ENVIRONMENT CONFIGURATION - Load from /memory/
# ============================================================================

try:
    from dotenv import load_dotenv
    # Navigate from script location to memory directory
    # Path: /pro accelerator/tools/[Tool Name]/scripts/ -> /memory/[Tool Name]/
    script_dir = Path(__file__).parent
    memory_env = script_dir / "../../../../memory/[Tool Name]/.env"
    if memory_env.exists():
        load_dotenv(memory_env)
    else:
        print(f"Warning: .env not found at {memory_env.resolve()}")
        print("   Create /memory/[Tool Name]/.env with your configuration")
        print("   See /memory/README.md for setup instructions")
except ImportError:
    pass  # dotenv not installed, rely on system env vars

# Configuration - Load from environment (NEVER hardcode API keys/models)
API_KEY = os.getenv("API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME")

# ============================================================================
# CONFIGURATION
# ============================================================================

DEFAULT_OUTPUT_DIR = "./output"
VERBOSE = False

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_config():
    """Validate required configuration is present."""
    if not API_KEY:
        print("Error: API_KEY not found!")
        print("   Add API_KEY to /memory/[Tool Name]/.env")
        sys.exit(1)
    
    if not MODEL_NAME:
        print("Error: MODEL_NAME not found!")
        print("   Add MODEL_NAME to /memory/[Tool Name]/.env")
        sys.exit(1)
    
    return True


def ensure_output_directory(output_dir):
    """Create output directory if it doesn't exist."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    return output_path


def process_input(input_data):
    """
    Main processing logic.
    
    Args:
        input_data: The data to process
        
    Returns:
        Processed result
    """
    # Your processing logic here
    result = f"Processed: {input_data}"
    return result


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main(input_arg, output_dir=DEFAULT_OUTPUT_DIR):
    """
    Main execution function.
    
    Args:
        input_arg: Input to process
        output_dir: Output directory path
        
    Returns:
        int: Exit code (0 for success, 1 for error)
    """
    try:
        validate_config()
        output_path = ensure_output_directory(output_dir)
        
        if VERBOSE:
            print(f"Processing: {input_arg}")
            print(f"Using model: {MODEL_NAME}")
        
        result = process_input(input_arg)
        
        # Write output
        output_file = output_path / "result.txt"
        with open(output_file, 'w') as f:
            f.write(str(result))
        
        print(f"Success! Output saved to: {output_file}")
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        if VERBOSE:
            import traceback
            traceback.print_exc()
        return 1


# ============================================================================
# CLI
# ============================================================================

def show_help():
    """Display help message."""
    print(__doc__)
    sys.exit(0)


if __name__ == "__main__":
    if len(sys.argv) < 2 or "--help" in sys.argv or "-h" in sys.argv:
        show_help()
    
    input_arg = sys.argv[1]
    output_dir = DEFAULT_OUTPUT_DIR
    
    for i, arg in enumerate(sys.argv):
        if arg == "--output" and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
        elif arg == "--verbose" or arg == "-v":
            VERBOSE = True
    
    exit_code = main(input_arg, output_dir)
    sys.exit(exit_code)


# ============================================================================
# TEMPLATE INSTRUCTIONS (DELETE THIS SECTION)
# ============================================================================
"""
When creating your own scripts:

1. Update the path to /memory/ in the environment loading section
2. Replace [Tool Name] with your actual tool name
3. Update validate_config() with your required env vars
4. Implement process_input() with your actual logic
5. Update CLI argument parsing as needed
6. Delete this instructions section

Path calculation for /memory/:
- Scripts at: /pro accelerator/tools/[Tool Name]/scripts/
- Memory at: /memory/[Tool Name]/
- Relative: ../../../../memory/[Tool Name]/.env
"""

