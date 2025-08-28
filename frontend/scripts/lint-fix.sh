#!/bin/bash

# ESLint Auto-Fix Script
# This script automatically fixes ESLint issues that can be auto-fixed

echo "🔍 Running ESLint auto-fix..."

# Run ESLint with auto-fix
npm run lint -- --fix

# Check if there are any remaining errors
echo "🔍 Checking for remaining ESLint issues..."

# Run ESLint again to check for remaining issues
npm run lint

echo "✅ ESLint auto-fix completed!"
echo "📝 Note: Some issues may require manual fixes"
