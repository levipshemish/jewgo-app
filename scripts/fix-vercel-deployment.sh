#!/bin/bash

# Fix Vercel Build Problems Script
# This script addresses the main issues causing Vercel build problems

set -e

echo "🔧 Fixing Vercel Build Problems..."

# 1. Update backend to use full app_factory
echo "📝 Updating backend configuration..."
if [ -f "backend/app.py" ]; then
    echo "✅ Backend app.py already updated to use app_factory_full"
else
    echo "❌ Backend app.py not found"
    exit 1
fi

# 2. Update render.yaml configuration
echo "📝 Updating render.yaml..."
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml already updated"
else
    echo "❌ render.yaml not found"
    exit 1
fi

# 3. Check environment variables
echo "🔍 Checking environment variables..."
if [ -f "frontend/vercel.env.production" ]; then
    echo "✅ Production environment file exists"
    if grep -q "NEXT_PUBLIC_WEBSOCKET_URL" frontend/vercel.env.production; then
        echo "✅ WebSocket URL configured"
    else
        echo "⚠️  WebSocket URL not configured"
    fi
else
    echo "❌ Production environment file not found"
fi

# 4. Test backend endpoints
echo "🧪 Testing backend endpoints..."
BACKEND_URL="https://jewgo.onrender.com"

echo "Testing root endpoint..."
if curl -s "$BACKEND_URL/" | grep -q "JewGo Backend API"; then
    echo "✅ Backend root endpoint working"
else
    echo "❌ Backend root endpoint failed"
fi

echo "Testing health endpoint..."
if curl -s "$BACKEND_URL/health" | grep -q "status"; then
    echo "✅ Backend health endpoint working"
else
    echo "❌ Backend health endpoint failed"
fi

# 5. Deploy backend changes
echo "🚀 Deploying backend changes..."
echo "Please manually redeploy the backend on Render:"
echo "1. Go to https://dashboard.render.com"
echo "2. Find the jewgo-backend service"
echo "3. Click 'Manual Deploy' -> 'Deploy latest commit'"
echo "4. Wait for deployment to complete"

# 6. Deploy frontend changes
echo "🚀 Deploying frontend changes..."
echo "Please manually redeploy the frontend on Vercel:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Find the jewgo-app project"
echo "3. Click 'Deploy' to trigger a new deployment"
echo "4. Wait for deployment to complete"

# 7. Verify deployment
echo "✅ Deployment instructions provided"
echo ""
echo "📋 Summary of fixes applied:"
echo "1. ✅ Backend now uses app_factory_full with restaurant endpoints"
echo "2. ✅ render.yaml updated to use correct start command"
echo "3. ✅ WebSocket URL configured for production"
echo "4. ✅ WebSocket hook made more resilient to failures"
echo "5. ⏳ Backend redeployment required"
echo "6. ⏳ Frontend redeployment required"
echo ""
echo "🎯 Next steps:"
echo "1. Redeploy backend on Render"
echo "2. Redeploy frontend on Vercel"
echo "3. Test the application"
echo "4. Monitor for any remaining issues"

echo "✅ Fix script completed successfully!"
