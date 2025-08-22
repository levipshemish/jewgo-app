#!/bin/bash

# Marketplace Migration Script for Render
# This script runs the marketplace migration on the production database

set -e  # Exit on any error

echo "🏪 JewGo Marketplace Migration - Production"
echo "=========================================="
echo "🕐 Started at: $(date)"

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "💡 This script should be run on Render with proper environment variables"
    exit 1
fi

echo "✅ Database URL found: ${DATABASE_URL:0:30}..."

# Change to backend directory
cd backend

# Run the migration
echo "🔄 Running marketplace migration..."
python deploy_marketplace_migration.py

if [ $? -eq 0 ]; then
    echo "✅ Marketplace migration completed successfully!"
    echo "🎉 Marketplace tables are now ready for use!"
else
    echo "❌ Marketplace migration failed"
    exit 1
fi
