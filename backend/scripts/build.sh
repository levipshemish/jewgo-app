#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting JewGo build process..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Playwright browsers with dependencies
echo "🌐 Installing Playwright browsers..."
playwright install chromium --with-deps

# Verify Playwright installation
echo "✅ Verifying Playwright installation..."
python -c "from playwright.async_api import async_playwright; print('Playwright installed successfully')"

echo "🎉 Build completed successfully!"
