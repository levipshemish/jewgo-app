#!/bin/bash

# MCP Pre-Merge Validation Script
# Runs comprehensive MCP checks before merging code

set -e

echo "🚀 Running MCP pre-merge validation..."

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
CI_GUARD_PASSED=false
SCHEMA_DRIFT_PASSED=false
OVERALL_PASSED=true

# Configuration
FE_HEALTH_URL="${FE_HEALTH_URL:-https://jewgo-app.vercel.app/health}"
BE_HEALTH_URL="${BE_HEALTH_URL:-https://jewgo.onrender.com/health}"
DATABASE_URL="${DATABASE_URL:-}"

# Run TypeScript strict check
run_tsc_check() {
    print_status "Running TypeScript strict check..."
    
    if echo '{"type":"tool","name":"tsc_check","params":{"cwd":"frontend"}}' | node tools/ts-next-strict-mcp/dist/index.js > tsc-results.json 2>/dev/null; then
        if jq -e '.ok == true' tsc-results.json > /dev/null 2>&1; then
            print_success "TypeScript check passed"
            TSC_PASSED=true
        else
            ISSUES=$(jq -r '.issues | length' tsc-results.json 2>/dev/null || echo "unknown")
            print_error "TypeScript check failed with $ISSUES issues"
            echo "Issues found:"
            jq -r '.issues[] | "  - \(.file):\(.line):\(.col) \(.message)"' tsc-results.json 2>/dev/null || echo "  Unable to parse issues"
            OVERALL_PASSED=false
        fi
    else
        print_error "TypeScript check failed to run"
        OVERALL_PASSED=false
    fi
}

# Run ESLint check
run_eslint_check() {
    print_status "Running ESLint check..."
    
    if echo '{"type":"tool","name":"eslint_check","params":{"cwd":"frontend","pattern":"**/*.{ts,tsx}","fix":false}}' | node tools/ts-next-strict-mcp/dist/index.js > eslint-results.json 2>/dev/null; then
        if jq -e '.ok == true' eslint-results.json > /dev/null 2>&1; then
            print_success "ESLint check passed"
            ESLINT_PASSED=true
        else
            ISSUES=$(jq -r '.issues | length' eslint-results.json 2>/dev/null || echo "unknown")
            print_error "ESLint check failed with $ISSUES issues"
            echo "Issues found:"
            jq -r '.issues[] | "  - \(.file):\(.line):\(.column) \(.message)"' eslint-results.json 2>/dev/null || echo "  Unable to parse issues"
            OVERALL_PASSED=false
        fi
    else
        print_error "ESLint check failed to run"
        OVERALL_PASSED=false
    fi
}

# Run CI Guard check
run_ci_guard_check() {
    print_status "Running CI Guard check..."
    
    CI_GUARD_PARAMS=$(cat << EOF
{
  "cwd": "frontend",
  "feHealthUrl": "$FE_HEALTH_URL",
  "beHealthUrl": "$BE_HEALTH_URL",
  "budgets": {
    "mainKB": 500,
    "initialTotalMB": 2
  }
}
EOF
)
    
    if echo "{\"type\":\"tool\",\"name\":\"premerge_guard\",\"params\":$CI_GUARD_PARAMS}" | node tools/ci-guard-mcp/dist/index.js > ci-guard-results.json 2>/dev/null; then
        if jq -e '.ok == true' ci-guard-results.json > /dev/null 2>&1; then
            print_success "CI Guard check passed"
            CI_GUARD_PASSED=true
            
            # Display performance metrics
            MAIN_KB=$(jq -r '.sizes.mainKB // "N/A"' ci-guard-results.json)
            INITIAL_MB=$(jq -r '.sizes.initialTotalMB // "N/A"' ci-guard-results.json)
            echo "  Performance metrics:"
            echo "    - Main bundle: ${MAIN_KB}KB"
            echo "    - Initial load: ${INITIAL_MB}MB"
        else
            print_error "CI Guard check failed"
            
            # Display detailed failure information
            if jq -e '.buildOk == false' ci-guard-results.json > /dev/null 2>&1; then
                echo "  - Build failed"
            fi
            
            if jq -e '.sizeViolations | length > 0' ci-guard-results.json > /dev/null 2>&1; then
                echo "  - Performance budget violations:"
                jq -r '.sizeViolations[] | "    - \(.metric): \(.actual) > \(.budget)"' ci-guard-results.json 2>/dev/null
            fi
            
            if jq -e '.feHealth.ok == false' ci-guard-results.json > /dev/null 2>&1; then
                echo "  - Frontend health check failed"
            fi
            
            if jq -e '.beHealth.ok == false' ci-guard-results.json > /dev/null 2>&1; then
                echo "  - Backend health check failed"
            fi
            
            OVERALL_PASSED=false
        fi
    else
        print_error "CI Guard check failed to run"
        OVERALL_PASSED=false
    fi
}

# Run Schema Drift check
run_schema_drift_check() {
    print_status "Running Schema Drift check..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not set, skipping schema drift check"
        SCHEMA_DRIFT_PASSED=true
        return
    fi
    
    if command -v schema-drift-mcp &> /dev/null; then
        SCHEMA_PARAMS=$(cat << EOF
{
  "db_url": "$DATABASE_URL",
  "metadata_module": "backend.database.models"
}
EOF
)
        
        if echo "{\"type\":\"tool\",\"name\":\"schema_diff\",\"params\":$SCHEMA_PARAMS}" | schema-drift-mcp > schema-drift-results.json 2>/dev/null; then
            if jq -e '.error == null' schema-drift-results.json > /dev/null 2>&1; then
                print_success "Schema drift check passed"
                SCHEMA_DRIFT_PASSED=true
            else
                ERROR_MSG=$(jq -r '.error // "Unknown error"' schema-drift-results.json 2>/dev/null)
                print_error "Schema drift check failed: $ERROR_MSG"
                OVERALL_PASSED=false
            fi
        else
            print_error "Schema drift check failed to run"
            OVERALL_PASSED=false
        fi
    else
        print_warning "schema-drift-mcp not found, skipping schema drift check"
        SCHEMA_DRIFT_PASSED=true
    fi
}

# Check for database changes
check_database_changes() {
    print_status "Checking for database changes..."
    
    if git diff --name-only | grep -q "backend/database/"; then
        print_warning "Database changes detected in this branch"
        if [ "$SCHEMA_DRIFT_PASSED" = false ]; then
            print_error "Schema drift check failed - database changes may cause issues"
        fi
    fi
}

# Generate summary report
generate_report() {
    echo ""
    echo "=========================================="
    echo "    MCP Pre-Merge Validation Report"
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
    
    if [ "$CI_GUARD_PASSED" = true ]; then
        echo -e "✅ CI Guard Check: ${GREEN}PASSED${NC}"
    else
        echo -e "❌ CI Guard Check: ${RED}FAILED${NC}"
    fi
    
    if [ "$SCHEMA_DRIFT_PASSED" = true ]; then
        echo -e "✅ Schema Drift Check: ${GREEN}PASSED${NC}"
    else
        echo -e "❌ Schema Drift Check: ${RED}FAILED${NC}"
    fi
    
    echo ""
    
    if [ "$OVERALL_PASSED" = true ]; then
        print_success "All MCP pre-merge checks passed!"
        echo ""
        echo "✅ This branch is ready for merge."
    else
        print_error "MCP pre-merge checks failed!"
        echo ""
        echo "❌ This branch is NOT ready for merge."
        echo ""
        echo "Please fix the issues above before merging."
        echo ""
        echo "Quick fixes:"
        echo "1. Run './scripts/mcp-pre-commit.sh' to fix code quality issues"
        echo "2. Check the generated results files for detailed information"
        echo "3. Ensure all health endpoints are accessible"
        echo "4. Verify database schema is up to date"
        exit 1
    fi
}

# Cleanup temporary files
cleanup() {
    rm -f tsc-results.json eslint-results.json ci-guard-results.json schema-drift-results.json
}

# Main execution
main() {
    echo "=========================================="
    echo "    MCP Pre-Merge Validation"
    echo "=========================================="
    echo ""
    
    # Check if MCP servers are available
    if [ ! -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        print_error "MCP servers not found. Please run './scripts/mcp-setup.sh' first."
        exit 1
    fi
    
    if [ ! -f "tools/ci-guard-mcp/dist/index.js" ]; then
        print_error "CI Guard MCP server not found. Please run './scripts/mcp-setup.sh' first."
        exit 1
    fi
    
    # Run checks
    run_tsc_check
    run_eslint_check
    run_ci_guard_check
    run_schema_drift_check
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
