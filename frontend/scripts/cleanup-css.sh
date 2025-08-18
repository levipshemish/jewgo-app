#!/bin/bash

# CSS Cleanup Script for JewGo Frontend
# This script helps resolve MIME type issues by cleaning up CSS files

echo "🧹 Starting CSS cleanup process..."

# Navigate to frontend directory
cd "$(dirname "$0")/.."

# Clean Next.js build cache
echo "📦 Cleaning Next.js build cache..."
rm -rf .next
rm -rf out

# Clean node_modules (optional, uncomment if needed)
# echo "🗑️ Cleaning node_modules..."
# rm -rf node_modules
# npm install

# Clean any temporary CSS files
echo "🎨 Cleaning temporary CSS files..."
find . -name "*.css.map" -delete
find . -name "*.css.tmp" -delete

# Rebuild the project
echo "🔨 Rebuilding project..."
npm run build

echo "✅ CSS cleanup completed!"
echo "🚀 Ready for deployment with fixed MIME type handling"
