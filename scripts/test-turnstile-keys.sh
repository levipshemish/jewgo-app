#!/bin/bash

# Test Turnstile with Cloudflare Test Keys
echo "🧪 Testing Turnstile with Cloudflare Test Keys"
echo "=============================================="
echo ""

# Backup current keys
echo "📋 Backing up current Turnstile keys..."
cp frontend/.env.local frontend/.env.local.backup

# Update with test keys
echo "🔄 Updating with Cloudflare test keys..."
sed -i '' '/NEXT_PUBLIC_TURNSTILE_SITE_KEY/d' frontend/.env.local
echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA" >> frontend/.env.local

echo "✅ Updated with test site key: 1x00000000000000000000AA"
echo ""
echo "📋 Next steps:"
echo "1. Restart the development server"
echo "2. Test guest sign-in at http://localhost:3000/auth/signin"
echo "3. The Turnstile widget should work without domain restrictions"
echo ""
echo "🔧 To restore original keys:"
echo "   cp frontend/.env.local.backup frontend/.env.local"
echo ""
echo "💡 Note: Test keys work on any domain but are for development only"
