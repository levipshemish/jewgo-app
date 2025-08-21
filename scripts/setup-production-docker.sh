#!/bin/bash

# Setup Production Docker Environment
# This script helps set up Docker to match production configuration

echo "🚀 Setting up Production-Like Docker Environment"
echo "================================================"

# Check if production environment file exists
PROD_ENV_FILE="config/environment/frontend.production.env"
if [ ! -f "$PROD_ENV_FILE" ]; then
    echo "❌ Production environment file not found: $PROD_ENV_FILE"
    exit 1
fi

echo "📋 Current Production Environment Setup:"
echo "----------------------------------------"
echo "✅ Backend URL: https://jewgo-app-oyoh.onrender.com"
echo "✅ Supabase URL: https://lgsfyrxkqpipaumngvfi.supabase.co"
echo "✅ Supabase Anon Key: sb_publishable_0iwWwM0kEGMnDApN5BYfZg_lIXWnD_n"
echo ""

echo "⚠️  IMPORTANT: You need to update the following in $PROD_ENV_FILE:"
echo "   - SUPABASE_SERVICE_ROLE_KEY (get from Supabase dashboard)"
echo "   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (get from Google Cloud Console)"
echo "   - NEXTAUTH_SECRET (generate a secure secret)"
echo "   - MERGE_COOKIE_HMAC_KEY_CURRENT (get from production)"
echo "   - Other API keys and tokens"
echo ""

read -p "Have you updated the production environment file with real values? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please update the environment file first, then run this script again."
    exit 1
fi

echo "🔄 Stopping any existing Docker containers..."
docker-compose -f docker-compose.optimized.yml down 2>/dev/null || true

echo "🏗️  Building and starting production-like Docker environment..."
docker-compose -f docker-compose.production.yml up -d --build

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service status..."
docker-compose -f docker-compose.production.yml ps

echo "🧪 Testing frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running at http://localhost:3000"
else
    echo "❌ Frontend is not responding"
fi

echo "🧪 Testing backend connection..."
if curl -f https://jewgo-app-oyoh.onrender.com/health > /dev/null 2>&1; then
    echo "✅ Production backend is accessible"
else
    echo "❌ Production backend is not responding"
fi

echo ""
echo "🎉 Production-like Docker setup complete!"
echo "=========================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend: https://jewgo-app-oyoh.onrender.com"
echo "🗄️  Database: Supabase (production)"
echo ""
echo "📝 Next steps:"
echo "   1. Test the application thoroughly"
echo "   2. Verify all features work with production backend"
echo "   3. Check authentication and database connections"
echo "   4. Run your test suite"
echo "   5. Deploy to production when ready"
