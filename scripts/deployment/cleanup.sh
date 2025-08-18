#!/bin/bash

# cleanup.sh - JewGo Codebase Cleanup Script
# This script removes build artifacts, cache files, and system files

set -e  # Exit on any error

echo "🧹 Starting JewGo codebase cleanup..."
echo "======================================"

# Function to safely remove directories
safe_remove() {
    local path="$1"
    local description="$2"
    
    if [ -d "$path" ] || [ -f "$path" ]; then
        echo "Removing $description..."
        rm -rf "$path"
        echo "✅ Removed: $path"
    else
        echo "⚠️  Not found: $path"
    fi
}

# Function to safely remove files by pattern
safe_remove_pattern() {
    local pattern="$1"
    local description="$2"
    
    echo "Removing $description..."
    find . -name "$pattern" -not -path "./node_modules/*" -not -path "./backend/venv*/*" -not -path "./.git/*" -delete 2>/dev/null || true
    echo "✅ Removed $description"
}

# Store initial size
INITIAL_SIZE=$(du -sh . | cut -f1)
echo "📊 Initial repository size: $INITIAL_SIZE"

echo ""
echo "🗑️  Removing build artifacts..."

# Remove frontend build artifacts
safe_remove "frontend/.next" "Next.js build cache"
safe_remove "frontend/out" "Next.js static export"
safe_remove "frontend/coverage" "Test coverage reports"
safe_remove "frontend/.swc" "SWC compiler cache"
safe_remove "frontend/tsconfig.tsbuildinfo" "TypeScript build info"

echo ""
echo "🐍 Removing Python cache..."

# Remove Python cache files
safe_remove_pattern "__pycache__" "Python cache directories"
safe_remove_pattern "*.pyc" "Python compiled files"
safe_remove_pattern "*.pyo" "Python optimized files"

echo ""
echo "💻 Removing system files..."

# Remove system files
safe_remove_pattern ".DS_Store" "macOS system files"
safe_remove_pattern "Thumbs.db" "Windows thumbnail files"
safe_remove_pattern "*.log" "Log files (excluding node_modules)"

echo ""
echo "📝 Removing temporary files..."

# Remove temporary and backup files
safe_remove_pattern "*.tmp" "Temporary files"
safe_remove_pattern "*.bak" "Backup files"
safe_remove_pattern "*.swp" "Vim swap files"
safe_remove_pattern "*.swo" "Vim swap files"

echo ""
echo "🧪 Removing test artifacts..."

# Remove test artifacts
safe_remove_pattern "*.test.log" "Test log files"
safe_remove_pattern "coverage-final.json" "Coverage reports"

echo ""
echo "📊 Checking for large files..."

# Find and report large files (>10MB)
echo "Large files (>10MB) found:"
find . -size +10M -not -path "./node_modules/*" -not -path "./backend/venv*/*" -not -path "./.git/*" -exec ls -lh {} \; 2>/dev/null || echo "No large files found"

echo ""
echo "🔍 Checking for duplicate virtual environments..."

# Check for multiple virtual environments
VENV_COUNT=$(find . -name "venv*" -type d -not -path "./node_modules/*" | wc -l)
if [ "$VENV_COUNT" -gt 1 ]; then
    echo "⚠️  Found $VENV_COUNT virtual environments:"
    find . -name "venv*" -type d -not -path "./node_modules/*" -exec du -sh {} \;
    echo "💡 Consider consolidating to a single virtual environment"
else
    echo "✅ Virtual environment count is reasonable"
fi

echo ""
echo "📋 Summary of removed items:"

# Calculate final size
FINAL_SIZE=$(du -sh . | cut -f1)
echo "📊 Final repository size: $FINAL_SIZE"

echo ""
echo "✅ Cleanup complete!"
echo "======================================"

# Optional: Show what can be safely deleted next time
echo ""
echo "💡 Next time, you might also consider:"
echo "   - Reviewing log files in logs/ directory"
echo "   - Consolidating virtual environments"
echo "   - Running 'npm prune' in frontend/ to remove unused packages"
echo "   - Running 'pip autoremove' in backend/ to remove unused packages"

echo ""
echo "🔄 To run this cleanup regularly, add to your crontab:"
echo "   0 2 * * 0 /path/to/your/project/scripts/cleanup.sh >> /path/to/your/project/logs/cleanup.log 2>&1"

exit 0 