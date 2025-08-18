#!/bin/bash

# MCP Schema Drift Check Script
# Checks for database schema drift

set -e

echo "🗄️ Running MCP schema drift check..."

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

# Configuration
DATABASE_URL="${DATABASE_URL:-}"
METADATA_MODULE="backend.database.models"

# Check if schema-drift-mcp is available
check_schema_drift_mcp() {
    if ! command -v schema-drift-mcp &> /dev/null; then
        print_error "schema-drift-mcp not found. Please install it first:"
        echo "  pipx install -e tools/schema-drift-mcp"
        exit 1
    fi
}

# Check database URL
check_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        echo ""
        echo "Please set the DATABASE_URL environment variable:"
        echo "  export DATABASE_URL='postgresql+psycopg://user:pass@host:5432/db'"
        echo ""
        echo "Or run this script with the DATABASE_URL:"
        echo "  DATABASE_URL='your-db-url' ./scripts/mcp-schema-check.sh"
        exit 1
    fi
    
    print_success "Database URL is configured"
}

# Run schema drift check
run_schema_drift_check() {
    print_status "Running schema drift check..."
    
    SCHEMA_PARAMS=$(cat << EOF
{
  "db_url": "$DATABASE_URL",
  "metadata_module": "$METADATA_MODULE"
}
EOF
)
    
    if echo "{\"type\":\"tool\",\"name\":\"schema_diff\",\"params\":$SCHEMA_PARAMS}" | schema-drift-mcp > schema-drift-results.json 2>/dev/null; then
        if jq -e '.error == null' schema-drift-results.json > /dev/null 2>&1; then
            print_success "Schema drift check completed successfully"
            
            # Check if there are any differences
            if jq -e '.differences | length > 0' schema-drift-results.json > /dev/null 2>&1; then
                DIFF_COUNT=$(jq -r '.differences | length' schema-drift-results.json)
                print_warning "Found $DIFF_COUNT schema differences"
                
                echo ""
                echo "Schema differences:"
                jq -r '.differences[] | "  - \(.table): \(.type) - \(.description)"' schema-drift-results.json
                
                echo ""
                echo "Recommendations:"
                echo "1. Review the differences above"
                echo "2. Create a migration if needed"
                echo "3. Test the migration in staging first"
                echo "4. Apply the migration to production"
                
                exit 1
            else
                print_success "No schema drift detected"
                echo ""
                echo "✅ Database schema is in sync with models"
            fi
        else
            ERROR_MSG=$(jq -r '.error // "Unknown error"' schema-drift-results.json 2>/dev/null)
            print_error "Schema drift check failed: $ERROR_MSG"
            exit 1
        fi
    else
        print_error "Schema drift check failed to run"
        exit 1
    fi
}

# Generate detailed report
generate_report() {
    echo ""
    echo "=========================================="
    echo "    Schema Drift Check Report"
    echo "=========================================="
    echo ""
    
    if [ -f "schema-drift-results.json" ]; then
        echo "Database: $(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')"
        echo "Metadata Module: $METADATA_MODULE"
        echo ""
        
        # Show summary
        if jq -e '.differences | length > 0' schema-drift-results.json > /dev/null 2>&1; then
            DIFF_COUNT=$(jq -r '.differences | length' schema-drift-results.json)
            echo "Status: ❌ Schema drift detected ($DIFF_COUNT differences)"
        else
            echo "Status: ✅ No schema drift detected"
        fi
        
        # Show detailed differences if any
        if jq -e '.differences | length > 0' schema-drift-results.json > /dev/null 2>&1; then
            echo ""
            echo "Detailed differences:"
            jq -r '.differences[] | "  Table: \(.table)\n  Type: \(.type)\n  Description: \(.description)\n"' schema-drift-results.json
        fi
    fi
}

# Cleanup
cleanup() {
    rm -f schema-drift-results.json
}

# Main execution
main() {
    echo "=========================================="
    echo "    MCP Schema Drift Check"
    echo "=========================================="
    echo ""
    
    check_schema_drift_mcp
    check_database_url
    run_schema_drift_check
    generate_report
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
