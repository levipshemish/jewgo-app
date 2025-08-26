#!/bin/bash

# Apply Admin Migrations to Supabase
# This script applies the admin role system to your Supabase database

set -e

echo "🚀 Applying Admin Migrations to Supabase"
echo "========================================"

# Check if we have the required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing required environment variables"
    echo "   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "💡 You can load them from .env.local:"
    echo "   source frontend/.env.local"
    exit 1
fi

# Extract database URL from Supabase URL
DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
DB_URL="postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@${DB_HOST}.supabase.co:5432/postgres"

echo "📡 Connecting to Supabase database..."
echo "   Host: ${DB_HOST}.supabase.co"

# Apply the admin migrations
echo "🔧 Applying admin migrations..."
psql "$DB_URL" -f scripts/apply-admin-migrations.sql

echo "✅ Admin migrations applied successfully!"
echo ""
echo "🎉 Next steps:"
echo "   1. Verify the setup: npm run admin:verify"
echo "   2. Create a super admin: npm run admin:create-super-admin <email>"
echo "   3. List admin users: npm run admin:list"
echo ""
echo "📚 For more information, see: docs/setup/ADMIN_ROLES_PRODUCTION_SETUP.md"
