#!/bin/bash

# Script to run database migrations for stores and mikvah tables
# This script should be run on the server to create the new tables

set -e

echo "=== Running Database Migrations ==="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Function to run SQL file
run_sql_file() {
    local sql_file=$1
    local description=$2
    
    echo "Running migration: $description"
    echo "File: $sql_file"
    
    if [ ! -f "$sql_file" ]; then
        echo "Error: SQL file not found: $sql_file"
        exit 1
    fi
    
    # Run the SQL file using psql
    psql "$DATABASE_URL" -f "$sql_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully executed: $description"
    else
        echo "❌ Failed to execute: $description"
        exit 1
    fi
}

# Run the migrations
echo "Creating stores table..."
run_sql_file "backend/database/migrations/create_stores_table.sql" "Create stores table"

echo "Creating mikvah table..."
run_sql_file "backend/database/migrations/create_mikvah_table.sql" "Create mikvah table"

echo "=== All migrations completed successfully! ==="

# Verify tables were created
echo "Verifying tables were created..."
psql "$DATABASE_URL" -c "\dt" | grep -E "(stores|mikvah)"

echo "✅ Database migrations completed successfully!"
