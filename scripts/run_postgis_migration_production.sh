#!/bin/bash
# PostGIS Migration Script for Production
# This script runs the PostGIS migrations on the production server
# Usage: ./run_postgis_migration_production.sh

set -e  # Exit on any error

echo "🚀 Starting PostGIS Migration for Production Database"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend/scripts/run_postgis_migrations.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

echo "📊 Checking current PostGIS status..."
cd backend
python scripts/run_postgis_migrations.py --check-only

echo ""
echo "⚠️  WARNING: This will modify the production database!"
echo "Make sure you have a backup before proceeding."
echo ""
read -p "Do you want to continue with the PostGIS migration? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled by user"
    exit 0
fi

echo "🔧 Running PostGIS migration..."
python scripts/run_postgis_migrations.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PostGIS migration completed successfully!"
    echo "🔍 Running final verification..."
    python scripts/run_postgis_migrations.py --verify-only
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 PostGIS migration and verification completed successfully!"
        echo "Your database now supports efficient spatial queries with PostGIS."
    else
        echo ""
        echo "⚠️  Migration completed but verification failed. Please check the logs."
        exit 1
    fi
else
    echo ""
    echo "❌ PostGIS migration failed. Please check the logs above."
    exit 1
fi
