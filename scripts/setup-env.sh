#!/bin/bash

# JewGo Environment Setup Script
# This script helps set up the environment configuration

set -e

echo "🚀 JewGo Environment Setup"
echo "=========================="

# Check if .env file already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. .env file unchanged."
        exit 1
    fi
fi

# Copy template to .env
if [ -f "env.template" ]; then
    cp env.template .env
    echo "✅ Created .env file from template"
else
    echo "❌ env.template not found!"
    exit 1
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your actual values"
echo "2. Replace placeholder values with real credentials"
echo "3. Run 'docker-compose -f docker-compose.optimized.yml up -d' to start services"
echo ""
echo "🔧 Important variables to configure:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - DATABASE_URL"
echo "   - GOOGLE_MAPS_API_KEY"
echo "   - JWT_SECRET_KEY"
echo "   - SECRET_KEY"
echo ""
echo "✅ Environment setup complete!"
