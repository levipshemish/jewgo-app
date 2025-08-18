#!/bin/bash

# Supabase Environment Setup Script for JewGo
# This script helps set up environment variables for Supabase integration

echo "🔧 JewGo Supabase Environment Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cp ../config/environment/frontend.env.example .env.local
    echo "✅ Created .env.local"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🔑 Required Environment Variables:"
echo "=================================="
echo ""
echo "Please update your .env.local file with the following values:"
echo ""
echo "# Supabase Configuration"
echo "NEXT_PUBLIC_SUPABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0iwWwM0kEGMnDApN5BYfZg_lIXWnD_n"
echo "SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here"
echo ""
echo "# Database URL (replace [YOUR-PASSWORD] with actual password)"
echo "DATABASE_URL=postgresql://postgres:your_actual_password@db.lgsfyrxkqpipaumngvfi.supabase.co:5432/postgres"
echo ""
echo "📋 Next Steps:"
echo "1. Get your service role key from Supabase Dashboard → Settings → API"
echo "2. Get your database password from Supabase Dashboard → Settings → Database"
echo "3. Update .env.local with the actual values"
echo "4. Configure Supabase Auth settings (see docs/setup/SUPABASE_ENV_SETUP.md)"
echo "5. Set up Vercel environment variables"
echo "6. Set up Render environment variables"
echo ""
echo "📖 For detailed instructions, see: docs/setup/SUPABASE_ENV_SETUP.md"
echo ""
echo "✅ Setup script completed!"
