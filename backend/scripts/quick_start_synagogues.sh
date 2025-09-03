#!/bin/bash

# Quick Start Script for Synagogue Migration
# This script sets up the synagogue system quickly

set -e  # Exit on any error

echo "🕍 Starting Synagogue Migration Quick Start..."
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "scripts/run_synagogue_migration.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./scripts/quick_start_synagogues.sh"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "   Please set it to your PostgreSQL connection string"
    echo "   export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Check if CSV file exists
if [ ! -f "data/florida_shuls_full_20250807_171818.csv" ]; then
    echo "❌ Error: CSV data file not found"
    echo "   Expected: data/florida_shuls_full_20250807_171818.csv"
    exit 1
fi

echo "✅ CSV data file found"

# Install psycopg2 if not available
echo "🔧 Checking dependencies..."
if ! python3 -c "import psycopg2" &> /dev/null; then
    echo "📦 Installing psycopg2..."
    pip3 install psycopg2-binary
else
    echo "✅ psycopg2 is already installed"
fi

# Run the migration
echo "🚀 Running synagogue migration..."
python3 scripts/run_synagogue_migration.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Synagogue migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to frontend directory: cd ../frontend"
    echo "2. Update Prisma client: npx prisma generate"
    echo "3. Test the API: curl 'http://localhost:3000/api/synagogues?limit=5'"
    echo "4. Visit the shuls page to see real data"
    echo ""
    echo "📚 For detailed information, see: docs/migration/SYNAGOGUE_MIGRATION_GUIDE.md"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo "📚 For troubleshooting, see: docs/migration/SYNAGOGUE_MIGRATION_GUIDE.md"
    exit 1
fi
