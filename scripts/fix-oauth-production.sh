#!/bin/bash

# Fix OAuth Configuration for Production
# This script sets the required environment variables for OAuth to work

echo "🔧 Fixing OAuth Configuration for Production..."

# Check if we're in the right directory
if [[ ! -f "backend/app.py" ]]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Set OAuth environment variables
cat >> .env << 'EOF'

# OAuth Configuration (Added by fix-oauth-production.sh)
FRONTEND_URL=https://jewgo.app
GOOGLE_REDIRECT_URI=https://api.jewgo.app/api/v5/auth/google/callback

# Generate OAuth state signing key if not set
OAUTH_STATE_SIGNING_KEY=$(openssl rand -hex 32)

EOF

echo "✅ OAuth environment variables added to .env"

echo ""
echo "📋 Next Steps to Complete OAuth Fix:"
echo ""
echo "1. 🔑 Set Google OAuth Credentials:"
echo "   Add these to your .env file:"
echo "   GOOGLE_CLIENT_ID=your_google_client_id"
echo "   GOOGLE_CLIENT_SECRET=your_google_client_secret"
echo ""
echo "2. 🌐 Configure Google Cloud Console:"
echo "   Go to: https://console.cloud.google.com/"
echo "   → APIs & Services → Credentials → Your OAuth 2.0 Client"
echo "   → Add this redirect URI: https://api.jewgo.app/api/v5/auth/google/callback"
echo ""
echo "3. 🚀 Deploy to Server:"
echo "   git add .env && git commit -m 'fix: add OAuth environment variables'"
echo "   git push origin main"
echo ""
echo "4. 🔄 Restart Backend Service:"
echo "   The backend needs to restart to load new environment variables"
echo ""

echo "🔍 Current OAuth Configuration Status:"
echo "FRONTEND_URL: $(grep '^FRONTEND_URL=' .env | cut -d= -f2 || echo 'NOT_SET')"
echo "GOOGLE_REDIRECT_URI: $(grep '^GOOGLE_REDIRECT_URI=' .env | cut -d= -f2 || echo 'NOT_SET')"
echo "OAUTH_STATE_SIGNING_KEY: $(grep '^OAUTH_STATE_SIGNING_KEY=' .env | cut -d= -f2 | cut -c1-10 || echo 'NOT_SET')..."
echo "GOOGLE_CLIENT_ID: $(grep '^GOOGLE_CLIENT_ID=' .env | cut -d= -f2 | cut -c1-20 || echo 'NOT_SET')..."
echo "GOOGLE_CLIENT_SECRET: $(grep '^GOOGLE_CLIENT_SECRET=' .env | cut -d= -f2 | cut -c1-10 || echo 'NOT_SET')..."
