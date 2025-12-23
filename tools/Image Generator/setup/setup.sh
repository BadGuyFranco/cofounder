#!/bin/bash
# Image Generator Setup Script

echo "================================================"
echo "IMAGE GENERATOR SETUP"
echo "================================================"
echo ""

# Change to Image Generator directory
cd "$(dirname "$0")/.."

# Check Python
echo "Checking prerequisites..."
if ! command -v python3 > /dev/null 2>&1; then
    echo "✗ Python3 not found"
    echo "  Install with: brew install python3"
    exit 1
fi
echo "✓ Python3 found: $(python3 --version)"

# Check pip
if ! command -v pip3 > /dev/null 2>&1; then
    echo "✗ pip3 not found"
    exit 1
fi
echo "✓ pip3 found"
echo ""

# Install Python packages
echo "Installing Python packages..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ All packages installed successfully"
else
    echo ""
    echo "✗ Package installation failed"
    exit 1
fi
echo ""

# Create output directory
echo "Creating output directory..."
mkdir -p generated_images
echo "✓ generated_images/ created"
echo ""

# Check .env file
echo "Checking configuration..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
else
    echo "⚠ .env file not found"
    echo ""
    echo "Create .env with your API keys:"
    echo "  GEMINI_API_KEY=your_key"
    echo "  GEMINI_MODEL=gemini-2.0-flash-exp"
    echo "  XAI_API_KEY=your_key"
    echo "  REPLICATE_API_TOKEN=your_token"
fi
echo ""

echo "================================================"
echo "SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Add API keys to .env file"
echo "  2. Test: ./setup/check_status.sh"
echo "  3. Generate: python3 scripts/generate_image_gemini.py \"test prompt\""
echo ""
