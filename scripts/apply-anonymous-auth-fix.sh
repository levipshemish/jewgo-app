#!/bin/bash

# Script to apply anonymous auth fix migration
# This fixes the 500 error from /auth/v1/signup during anonymous signup

set -e

echo "🔧 Applying Anonymous Auth Fix Migration"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20250101000002_fix_anonymous_auth_trigger.sql" ]; then
    echo "❌ Error: Migration file not found. Please run this script from the project root."
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📋 Checking Supabase project status..."
supabase status

echo "🚀 Applying migration..."
supabase db push

echo "✅ Migration applied successfully!"
echo ""
echo "🔍 Next steps:"
echo "1. Test anonymous sign-in in your app"
echo "2. Check Supabase logs for any remaining errors"
echo "3. Verify that anonymous users can access the app"
echo ""
echo "📝 What this fix does:"
echo "- Adds anonymous-safe handle_new_user trigger"
echo "- Creates minimal profiles for anonymous users"
echo "- Prevents 500 errors during anonymous signup"
echo "- Maintains existing functionality for regular users"
