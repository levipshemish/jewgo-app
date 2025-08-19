#!/bin/bash

# MCP Pre-Commit Validation Script
# Runs MCP checks before committing code

set -e

echo "🔍 Running MCP pre-commit validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variables to track results
TSC_PASSED=false
ESLINT_PASSED=false
OVERALL_PASSED=true

# Run TypeScript strict check
run_tsc_check() {
    print_status "Running TypeScript strict check..."
    
    # Run TypeScript check directly instead of through MCP
    if cd frontend && npx tsc --noEmit > ../tsc-results.txt 2>&1; then
        print_success "TypeScript check passed"
        TSC_PASSED=true
    else
        print_error "TypeScript check failed"
        echo "Issues found:"
        cat ../tsc-results.txt | grep -E "\.tsx?\(\d+,\d+\):" | head -10
        OVERALL_PASSED=false
    fi
    cd ..
}

# Run ESLint check
run_eslint_check() {
    print_status "Running ESLint check..."
    
    # Run ESLint check directly instead of through MCP
    if cd frontend && npx eslint app/**/*.tsx --format json > ../eslint-results.json 2>/dev/null; then
        print_success "ESLint check passed"
        ESLINT_PASSED=true
    else
        print_error "ESLint check failed"
        echo "Issues found:"
        if [ -f "../eslint-results.json" ]; then
            jq -r '.[] | .messages[] | "  - \(.filePath):\(.line):\(.column) \(.message)"' ../eslint-results.json 2>/dev/null | head -10
        fi
        OVERALL_PASSED=false
    fi
    cd ..
}

# Check for database changes
check_database_changes() {
    print_status "Checking for database changes..."
    
    if git diff --cached --name-only | grep -q "backend/database/"; then
        print_warning "Database changes detected. Consider running schema drift check:"
        echo "  ./scripts/mcp-schema-check.sh"
    fi
}

# Generate summary report
generate_report() {
    echo ""
    echo "=========================================="
    echo "    MCP Pre-Commit Validation Report"
    echo "=========================================="
    echo ""
    
    if [ "$TSC_PASSED" = true ]; then
        echo -e "✅ TypeScript Check: ${GREEN}PASSED${NC}"
    else
        echo -e "❌ TypeScript Check: ${RED}FAILED${NC}"
    fi
    
    if [ "$ESLINT_PASSED" = true ]; then
        echo -e "✅ ESLint Check: ${GREEN}PASSED${NC}"
    else
        echo -e "❌ ESLint Check: ${RED}FAILED${NC}"
    fi
    
    echo ""
    
    if [ "$OVERALL_PASSED" = true ]; then
        print_success "All MCP pre-commit checks passed!"
        echo ""
        echo "You can now commit your changes safely."
    else
        print_error "MCP pre-commit checks failed!"
        echo ""
        echo "Please fix the issues above before committing."
        echo ""
        echo "Quick fixes:"
        echo "1. Run 'pnpm mcp:strict' to see detailed TypeScript issues"
        echo "2. Run 'pnpm mcp:eslint' to auto-fix ESLint issues"
        echo "3. Check the generated results files for more details"
        exit 1
    fi
}

# Cleanup temporary files
cleanup() {
    rm -f tsc-results.txt eslint-results.json
}

# Main execution
main() {
    echo "=========================================="
    echo "    MCP Pre-Commit Validation"
    echo "=========================================="
    echo ""
    
    # Check if MCP servers are available
    if [ ! -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        print_error "MCP servers not found. Please run './scripts/mcp-setup.sh' first."
        exit 1
    fi
    
    # Run checks
    run_tsc_check
    run_eslint_check
    check_database_changes
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
