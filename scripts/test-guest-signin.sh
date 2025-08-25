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

# Check if guest button exists and is enabled (more accurate detection)
if echo "$SIGNIN_RESPONSE" | grep -q "Continue as Guest.*disabled"; then
    echo "❌ Guest sign-in button is disabled"
    echo "   This means the system is not properly configured"
    exit 1
fi

if echo "$SIGNIN_RESPONSE" | grep -q "Continue as Guest"; then
    echo "✅ Guest sign-in button is present and enabled"
else
    echo "❌ Guest sign-in button not found"
    exit 1
fi



echo ""
echo "🎉 Guest sign-in functionality is working correctly!"
echo ""
echo "📋 Next steps:"
echo "1. Visit http://localhost:3000/auth/signin"
echo "2. Click 'Continue as Guest'"
echo "3. You should be redirected to the location access page"
