#!/bin/bash
set -e

echo "=== Starting JewGo Backend Build Process ==="
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"

# Install dependencies in root directory first (for Render's default process)
if [ -f "requirements.txt" ]; then
    echo "=== Installing Python dependencies in root directory ==="
    pip install -r requirements.txt
fi

# Change to backend directory
echo "=== Changing to backend directory ==="
cd backend
echo "Current directory: $(pwd)"
echo "Contents of current directory:"
ls -la

# Check if requirements.txt exists in backend
if [ -f "requirements.txt" ]; then
    echo "=== Installing Python dependencies in backend directory ==="
    echo "Requirements file contents:"
    cat requirements.txt
    
    # Install Python dependencies
    pip install -r requirements.txt
fi

# Install Playwright browsers if needed
echo "=== Installing Playwright browsers ==="
playwright install chromium --with-deps

# Verify installation
echo "=== Verifying installation ==="
python -c "from playwright.async_api import async_playwright; print('Playwright installed successfully')"

echo "=== Backend build completed successfully! ==="
