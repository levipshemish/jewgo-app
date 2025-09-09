#!/bin/bash

# Apply PostGIS indexes for optimal performance
# This script applies the required indexes for spatial queries and text search

set -e

echo "🚀 Applying PostGIS indexes for optimal performance..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client tools"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INDEXES_FILE="$PROJECT_ROOT/backend/database/postgis_indexes.sql"

# Check if the indexes file exists
if [ ! -f "$INDEXES_FILE" ]; then
    echo "❌ Indexes file not found: $INDEXES_FILE"
    exit 1
fi

echo "📁 Using indexes file: $INDEXES_FILE"
echo "🔗 Connecting to database..."

# Apply the indexes
if psql "$DATABASE_URL" -f "$INDEXES_FILE"; then
    echo "✅ PostGIS indexes applied successfully!"
    echo ""
    echo "📊 Indexes created:"
    echo "  - GIST spatial indexes for geometry columns"
    echo "  - GIN trigram indexes for text search"
    echo "  - Composite indexes for common query patterns"
    echo "  - Partial indexes for approved entities"
    echo ""
    echo "🚀 Your spatial queries should now be significantly faster!"
else
    echo "❌ Failed to apply PostGIS indexes"
    echo "Please check your database connection and permissions"
    exit 1
fi
