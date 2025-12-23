#!/bin/bash
# Image Generator Status Check Script

echo "================================================"
echo "IMAGE GENERATOR STATUS CHECK"
echo "================================================"
echo ""

# Change to Image Generator directory
cd "$(dirname "$0")/.."

# 1. Check Python
echo "1. Python Installation:"
if command -v python3 > /dev/null 2>&1; then
    echo "   ✓ $(python3 --version)"
else
    echo "   ✗ Python3 not found"
    exit 1
fi
echo ""

# 2. Check Required Packages
echo "2. Required Python Packages:"

check_package() {
    python3 -c "import $1" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✓ $2"
    else
        echo "   ✗ $2 (missing)"
    fi
}

check_package "requests" "requests"
check_package "dotenv" "python-dotenv"
check_package "PIL" "Pillow"
check_package "replicate" "replicate"
check_package "google.genai" "google-genai"
echo ""

# 3. Check Configuration
echo "3. Configuration (.env):"
if [ -f ".env" ]; then
    echo "   ✓ .env file exists"
    
    # Check for API keys (without revealing them)
    if grep -q "GEMINI_API_KEY=." .env 2>/dev/null; then
        echo "   ✓ GEMINI_API_KEY configured"
    else
        echo "   ⚠ GEMINI_API_KEY not set"
    fi
    
    if grep -q "XAI_API_KEY=." .env 2>/dev/null; then
        echo "   ✓ XAI_API_KEY configured"
    else
        echo "   ⚠ XAI_API_KEY not set"
    fi
    
    if grep -q "REPLICATE_API_TOKEN=." .env 2>/dev/null; then
        echo "   ✓ REPLICATE_API_TOKEN configured"
    else
        echo "   ⚠ REPLICATE_API_TOKEN not set"
    fi
else
    echo "   ✗ .env file missing"
fi
echo ""

# 4. Check Scripts
echo "4. Generation Scripts:"
for script in scripts/generate_image_gemini.py scripts/generate_image_xai.py scripts/generate_image_replicate.py scripts/local_image_edit.py scripts/remove_background.py; do
    if [ -f "$script" ]; then
        echo "   ✓ $script"
    else
        echo "   ✗ $script (missing)"
    fi
done
echo ""

# 5. Check Process Documentation
echo "5. Process Documentation:"
for doc in "processes/Nano Banana.md" "processes/X.ai.md" "processes/Replicate.md" "processes/Local Editing.md"; do
    if [ -f "$doc" ]; then
        echo "   ✓ $doc"
    else
        echo "   ✗ $doc (missing)"
    fi
done
echo ""

# 6. Check Output Directory
echo "6. Output Directory:"
if [ -d "generated_images" ]; then
    COUNT=$(ls -1 generated_images/*.png 2>/dev/null | wc -l | tr -d ' ')
    echo "   ✓ generated_images/ exists ($COUNT images)"
else
    echo "   ⚠ generated_images/ not found (will be created on first run)"
fi
echo ""

echo "================================================"
echo "STATUS CHECK COMPLETE"
echo "================================================"
echo ""
echo "To test image generation:"
echo "  python3 scripts/generate_image_gemini.py \"a sunset over mountains\""
echo ""
