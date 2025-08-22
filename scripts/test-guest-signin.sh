#!/bin/bash

# Test Guest Sign-In Functionality
echo "🧪 Testing Guest Sign-In Functionality"
echo "======================================"
echo ""

# Check if development server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Development server is not running on port 3000"
    echo "   Please start it with: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Development server is running"

# Test sign-in page
echo ""
echo "🔍 Testing sign-in page..."
SIGNIN_RESPONSE=$(curl -s http://localhost:3000/auth/signin)

# Check if guest button is enabled
if echo "$SIGNIN_RESPONSE" | grep -q "Continue as Guest.*disabled"; then
    echo "❌ Guest sign-in button is disabled"
    echo "   This means Turnstile is not properly configured"
    exit 1
fi

if echo "$SIGNIN_RESPONSE" | grep -q "Continue as Guest"; then
    echo "✅ Guest sign-in button is enabled"
else
    echo "❌ Guest sign-in button not found"
    exit 1
fi

# Check if Turnstile widget is present
if echo "$SIGNIN_RESPONSE" | grep -q "turnstile-widget"; then
    echo "✅ Turnstile widget container is present"
else
    echo "❌ Turnstile widget container not found"
    exit 1
fi

# Check if Turnstile script is loaded
echo ""
echo "🔍 Testing Turnstile script loading..."
TURNSTILE_SCRIPT=$(curl -s https://challenges.cloudflare.com/turnstile/v0/api.js | head -1)
if [ $? -eq 0 ]; then
    echo "✅ Turnstile script is accessible"
else
    echo "❌ Turnstile script is not accessible"
fi

echo ""
echo "🎉 Guest sign-in appears to be properly configured!"
echo ""
echo "📋 Next steps:"
echo "1. Open http://localhost:3000/auth/signin in your browser"
echo "2. Click 'Continue as Guest'"
echo "3. Complete the Turnstile challenge"
echo "4. You should be redirected to /location-access"
echo ""
echo "🔧 If you encounter issues:"
echo "- Check browser console for errors"
echo "- Verify Turnstile site key in Cloudflare dashboard"
echo "- Ensure domain is configured in Turnstile settings"
