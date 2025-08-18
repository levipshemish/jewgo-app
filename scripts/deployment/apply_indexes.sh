#!/bin/bash

# JewGo Database Index Application Script
# This script applies performance indexes to the JewGo database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run          Show what would be applied without making changes"
    echo "  --backup           Create database backup before applying indexes"
    echo "  --verify           Verify indexes after application"
    echo "  --database-url     Specify database URL (or set DATABASE_URL env var)"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --dry-run                    # Preview changes"
    echo "  $0 --backup --verify            # Apply with backup and verification"
    echo "  $0 --database-url 'postgresql://user:pass@host:port/db'"
    echo ""
}

# Parse command line arguments
DRY_RUN=false
BACKUP=false
VERIFY=false
DATABASE_URL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup)
            BACKUP=true
            shift
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --database-url)
            DATABASE_URL="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_status $RED "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [ ! -f "backend/database/performance_indexes.sql" ]; then
    print_status $RED "❌ Error: performance_indexes.sql not found"
    print_status $YELLOW "Make sure you're running this script from the project root directory"
    exit 1
fi

# Check if Python script exists
if [ ! -f "scripts/apply_database_indexes.py" ]; then
    print_status $RED "❌ Error: apply_database_indexes.py not found"
    exit 1
fi

# Check if psycopg2 is installed
if ! python3 -c "import psycopg2" 2>/dev/null; then
    print_status $YELLOW "⚠️  psycopg2 not found. Installing..."
    pip3 install psycopg2-binary
fi

print_status $BLUE "🚀 JewGo Database Index Application"
print_status $BLUE "======================================"

# Build command arguments
CMD_ARGS=""

if [ "$DRY_RUN" = true ]; then
    CMD_ARGS="$CMD_ARGS --dry-run"
    print_status $YELLOW "🔍 DRY RUN MODE - No changes will be made"
fi

if [ "$BACKUP" = true ]; then
    CMD_ARGS="$CMD_ARGS --backup"
    print_status $BLUE "📦 Backup will be created before applying indexes"
fi

if [ "$VERIFY" = true ]; then
    CMD_ARGS="$CMD_ARGS --verify"
    print_status $BLUE "✅ Index verification will be performed"
fi

if [ -n "$DATABASE_URL" ]; then
    CMD_ARGS="$CMD_ARGS --database-url '$DATABASE_URL'"
fi

# Run the Python script
print_status $GREEN "🔧 Running database index application..."
python3 scripts/apply_database_indexes.py $CMD_ARGS

if [ $? -eq 0 ]; then
    print_status $GREEN "✅ Database index application completed successfully!"
    
    if [ "$DRY_RUN" = false ]; then
        echo ""
        print_status $BLUE "📋 Next Steps:"
        print_status $BLUE "  1. Monitor database performance"
        print_status $BLUE "  2. Check query execution times"
        print_status $BLUE "  3. Verify index usage in pg_stat_user_indexes"
        echo ""
        print_status $GREEN "🎉 Your database is now optimized for better performance!"
    fi
else
    print_status $RED "❌ Database index application failed"
    exit 1
fi
