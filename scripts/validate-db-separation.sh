#!/bin/bash

# Database Separation Validation Script
# Ensures authentication uses Supabase and application data uses PostgreSQL

echo "🔍 Validating Database Separation Configuration..."

# Check Supabase Auth Configuration
echo "📋 Checking Supabase Authentication Configuration..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    if [[ "$NEXT_PUBLIC_SUPABASE_URL" == *".supabase.co"* ]]; then
        echo "✅ NEXT_PUBLIC_SUPABASE_URL correctly points to Supabase"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_URL should point to Supabase, not database"
        exit 1
    fi
else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
    exit 1
fi

# Check PostgreSQL Database Configuration
echo "📋 Checking PostgreSQL Database Configuration..."
if [ -n "$DATABASE_URL" ]; then
    if [[ "$DATABASE_URL" == *"postgresql://"* ]] || [[ "$DATABASE_URL" == *"postgres://"* ]]; then
        echo "✅ DATABASE_URL correctly points to PostgreSQL"
    else
        echo "❌ DATABASE_URL should point to PostgreSQL database"
        exit 1
    fi
else
    echo "❌ DATABASE_URL not set"
    exit 1
fi

# Check for potential conflicts
echo "📋 Checking for Configuration Conflicts..."
if [[ "$DATABASE_URL" == *"supabase.co"* ]]; then
    echo "❌ WARNING: DATABASE_URL contains supabase.co - this should be for auth only"
    echo "   Application data should use a separate PostgreSQL database"
fi

if [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"postgresql://"* ]]; then
    echo "❌ ERROR: NEXT_PUBLIC_SUPABASE_URL is a database connection string"
    echo "   This should be the Supabase project URL for authentication"
    exit 1
fi

echo "✅ Database separation validation passed!"
echo ""
echo "📊 Configuration Summary:"
echo "   🔐 Authentication: Supabase Auth"
echo "   🗄️  Application Data: PostgreSQL Database"
echo "   ✅ Separation: Properly configured"
