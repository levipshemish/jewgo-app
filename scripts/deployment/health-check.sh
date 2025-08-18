#!/bin/bash

# health-check.sh - JewGo Codebase Health Check
# Quick audit script to check codebase health

set -e

echo "🏥 JewGo Codebase Health Check"
echo "=============================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    local status="$1"
    local message="$2"
    case $status in
        "OK") echo "✅ $message" ;;
        "WARN") echo "⚠️  $message" ;;
        "ERROR") echo "❌ $message" ;;
        *) echo "ℹ️  $message" ;;
    esac
}

echo "🔍 Checking basic structure..."
if [ -d "frontend" ] && [ -d "backend" ]; then
    print_status "OK" "Project structure is correct"
else
    print_status "ERROR" "Missing frontend or backend directories"
    exit 1
fi

echo ""
echo "📦 Checking dependencies..."

# Check frontend dependencies
if [ -f "frontend/package.json" ]; then
    print_status "OK" "Frontend package.json found"
    if [ -d "frontend/node_modules" ]; then
        print_status "OK" "Frontend node_modules present"
    else
        print_status "WARN" "Frontend node_modules missing - run 'npm install'"
    fi
else
    print_status "ERROR" "Frontend package.json not found"
fi

# Check backend dependencies
if [ -f "backend/requirements.txt" ]; then
    print_status "OK" "Backend requirements.txt found"
    if [ -d "backend/venv" ] || [ -d "backend/venv_py311" ]; then
        print_status "OK" "Backend virtual environment present"
    else
        print_status "WARN" "Backend virtual environment missing"
    fi
else
    print_status "ERROR" "Backend requirements.txt not found"
fi

echo ""
echo "🔧 Checking configuration files..."

# Check frontend configs
FRONTEND_CONFIGS=("next.config.js" "tailwind.config.js" "tsconfig.json")
for config in "${FRONTEND_CONFIGS[@]}"; do
    if [ -f "frontend/$config" ]; then
        print_status "OK" "Frontend $config found"
    else
        print_status "WARN" "Frontend $config missing"
    fi
done

# Check backend configs
if [ -f "backend/config/config.py" ]; then
    print_status "OK" "Backend config.py found"
else
    print_status "WARN" "Backend config.py missing"
fi

echo ""
echo "🐍 Checking Python syntax..."

# Check Python files for syntax errors
PYTHON_FILES=("backend/app.py" "backend/database/database_manager_v3.py")
for file in "${PYTHON_FILES[@]}"; do
    if [ -f "$file" ]; then
        if python3 -m py_compile "$file" 2>/dev/null; then
            print_status "OK" "Python syntax: $file"
        else
            print_status "ERROR" "Python syntax error: $file"
        fi
    else
        print_status "WARN" "Python file not found: $file"
    fi
done

echo ""
echo "🔒 Checking security..."

# Check for npm vulnerabilities
if command_exists npm && [ -d "frontend" ]; then
    cd frontend
    if npm audit --audit-level=moderate --json 2>/dev/null | grep -q '"vulnerabilities":{}'; then
        print_status "OK" "No npm vulnerabilities found"
    else
        print_status "WARN" "npm vulnerabilities detected - run 'npm audit fix'"
    fi
    cd ..
else
    print_status "WARN" "npm not available or frontend not found"
fi

echo ""
echo "📊 Checking space usage..."

# Check for large directories
LARGE_DIRS=("frontend/.next" "frontend/node_modules" "backend/venv" "backend/venv_py311")
for dir in "${LARGE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        print_status "INFO" "$dir: $size"
    fi
done

echo ""
echo "🧹 Checking for cleanup opportunities..."

# Check for cache files
CACHE_COUNT=$(find . -name "__pycache__" -type d 2>/dev/null | wc -l)
if [ "$CACHE_COUNT" -gt 0 ]; then
    print_status "WARN" "Found $CACHE_COUNT Python cache directories"
else
    print_status "OK" "No Python cache directories found"
fi

# Check for system files
SYSTEM_COUNT=$(find . -name ".DS_Store" 2>/dev/null | wc -l)
if [ "$SYSTEM_COUNT" -gt 0 ]; then
    print_status "WARN" "Found $SYSTEM_COUNT .DS_Store files"
else
    print_status "OK" "No .DS_Store files found"
fi

echo ""
echo "📋 Summary:"

# Count issues
ERRORS=$(grep -c "❌" <<< "$(tail -n 50 $0)" 2>/dev/null || echo "0")
WARNINGS=$(grep -c "⚠️" <<< "$(tail -n 50 $0)" 2>/dev/null || echo "0")

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    print_status "OK" "Codebase is healthy! 🎉"
elif [ "$ERRORS" -eq 0 ]; then
    print_status "WARN" "Codebase has $WARNINGS warnings but no errors"
else
    print_status "ERROR" "Codebase has $ERRORS errors and $WARNINGS warnings"
fi

echo ""
echo "💡 Recommendations:"
echo "   - Run './scripts/cleanup.sh' to clean up cache files"
echo "   - Fix any warnings above"
echo "   - Consider consolidating virtual environments"
echo "   - Run 'npm run build' in frontend/ to test build process"

echo ""
echo "🏁 Health check complete!"
echo "=============================="

exit 0 