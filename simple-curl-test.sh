#!/bin/bash

echo "🎯 Simple Curl Registration Test"
echo "================================"
echo ""

# Wait for rate limits if needed
echo "⏱️  Waiting 60 seconds for rate limits to reset..."
sleep 60

echo "🔗 Testing backend health..."
curl -s https://api.jewgo.app/health
echo ""
echo ""

echo "📋 Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -X GET https://api.jewgo.app/api/v5/auth/csrf \
  -H "User-Agent: JewGo-Curl-Test/1.0" \
  -c /tmp/csrf_cookies.txt)

echo "CSRF Response: $CSRF_RESPONSE"
echo ""

# Extract CSRF token
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.data.csrf_token' 2>/dev/null)

if [ "$CSRF_TOKEN" != "null" ] && [ "$CSRF_TOKEN" != "" ]; then
    echo "✅ CSRF token obtained: ${CSRF_TOKEN:0:20}..."
    echo ""
    
    echo "👤 Testing user registration..."
    
    REGISTER_RESPONSE=$(curl -s -X POST https://api.jewgo.app/api/v5/auth/register \
      -H "Content-Type: application/json" \
      -H "User-Agent: JewGo-Curl-Test/1.0" \
      -H "X-CSRF-Token: $CSRF_TOKEN" \
      -b /tmp/csrf_cookies.txt \
      -d '{
        "email": "curltest@jewgo.app",
        "password": "CurlTest123!",
        "name": "Curl Test User",
        "terms_accepted": true
      }')
    
    echo "Registration Response:"
    echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
    echo ""
    
    # Check if registration was successful
    SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success' 2>/dev/null)
    
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ Registration successful!"
        
        USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)
        echo "User ID: $USER_ID"
        echo ""
        echo "👑 SQL to make this user an admin:"
        echo "INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)"
        echo "VALUES ('$USER_ID', 'super_admin', 100, NOW(), 'system', TRUE)"
        echo "ON CONFLICT (user_id, role) DO UPDATE SET is_active = TRUE;"
        echo ""
        
        # Test authentication
        echo "🔐 Testing authentication..."
        sleep 2
        
        AUTH_RESPONSE=$(curl -s -X POST https://api.jewgo.app/api/v5/auth/login \
          -H "Content-Type: application/json" \
          -H "User-Agent: JewGo-Curl-Test/1.0" \
          -H "X-CSRF-Token: $CSRF_TOKEN" \
          -b /tmp/csrf_cookies.txt \
          -d '{
            "email": "curltest@jewgo.app",
            "password": "CurlTest123!"
          }')
        
        echo "Authentication Response:"
        echo "$AUTH_RESPONSE" | jq . 2>/dev/null || echo "$AUTH_RESPONSE"
        
        AUTH_SUCCESS=$(echo "$AUTH_RESPONSE" | jq -r '.success' 2>/dev/null)
        
        if [ "$AUTH_SUCCESS" = "true" ]; then
            echo ""
            echo "✅ Authentication successful!"
            echo "🎉 Registration API is working 100%!"
        else
            echo ""
            echo "❌ Authentication failed"
        fi
        
    else
        echo "❌ Registration failed"
        ERROR=$(echo "$REGISTER_RESPONSE" | jq -r '.error' 2>/dev/null)
        echo "Error: $ERROR"
    fi
    
else
    echo "❌ Failed to get CSRF token"
    echo "Response: $CSRF_RESPONSE"
fi

# Cleanup
rm -f /tmp/csrf_cookies.txt

echo ""
echo "🏁 Test complete!"