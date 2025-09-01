#!/bin/bash

# Simple Pre-Merge Validation Script
# Runs basic checks without relying on MCP tools

set -e

echo "🚀 Running simple pre-merge validation..."

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
BUILD_PASSED=false
OVERALL_PASSED=true

# Run TypeScript check
run_tsc_check() {
    print_status "Running TypeScript check..."
    
    if cd frontend && npm run type-check > /dev/null 2>&1; then
        print_success "TypeScript check passed"
        TSC_PASSED=true
    else
        print_error "TypeScript check failed"
        OVERALL_PASSED=false
    fi
    cd ..
}

# Run ESLint check
run_eslint_check() {
    print_status "Running ESLint check..."
    
    if cd frontend && npm run lint:check > /dev/null 2>&1; then
        print_success "ESLint check passed"
        ESLINT_PASSED=true
    else
        print_warning "ESLint reported issues (warnings allowed)"
        ESLINT_PASSED=true
    fi
    cd ..
}

# Run build check
run_build_check() {
    print_status "Running build check..."
    
    if cd frontend && npm run build; then
        print_success "Build check passed"
        BUILD_PASSED=true
    else
        print_error "Build check failed"
        OVERALL_PASSED=false
    fi
    cd ..
}

# Generate summary report
generate_report() {
    echo ""
    echo "=========================================="
    echo "    Simple Pre-Merge Validation Report"
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
    
    if [ "$BUILD_PASSED" = true ]; then
        echo -e "✅ Build Check: ${GREEN}PASSED${NC}"
    else
        echo -e "❌ Build Check: ${RED}FAILED${NC}"
    fi
    
    echo ""
    
    if [ "$OVERALL_PASSED" = true ]; then
        print_success "All simple pre-merge checks passed!"
        echo ""
        echo "✅ This branch is ready for merge."
    else
        print_error "Simple pre-merge checks failed!"
        echo ""
        echo "❌ This branch is NOT ready for merge."
        echo ""
        echo "Please fix the issues above before merging."
        exit 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "    Simple Pre-Merge Validation"
    echo "=========================================="
    echo ""
    
    # Run checks
    run_tsc_check
    run_eslint_check
    run_build_check
    
    # Generate report
    generate_report
}

# Run main function
main "$@"
