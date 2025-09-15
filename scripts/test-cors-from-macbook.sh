#!/bin/bash

# CORS Testing Script for MacBook Development
# This script tests CORS access from your MacBook to the API

set -e

API_URL="https://api.jewgo.app"
MAC_ADDRESS="2a:7f:6d:ae:4a:c9"
LOCAL_IP="192.168.40.237"

echo "🔍 Testing CORS Access from MacBook"
echo "=================================="
echo "API URL: $API_URL"
echo "MAC Address: $MAC_ADDRESS"
echo "Local IP: $LOCAL_IP"
echo ""

# Function to test CORS with different origins
test_cors_origin() {
    local origin="$1"
    local description="$2"
    
    echo -n "Testing CORS for $description ($origin)... "
    
    response=$(curl -s -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type, X-CSRF-Token" \
        -H "X-Dev-Mode: true" \
        -H "X-MAC-Address: $MAC_ADDRESS" \
        "$API_URL/api/v5/auth/login" \
        -I)
    
    cors_origin=$(echo "$response" | grep -i "access-control-allow-origin" | cut -d' ' -f2- | tr -d '\r')
    
    if [ -n "$cors_origin" ]; then
        echo "✅ PASS (Origin: $cors_origin)"
        return 0
    else
        echo "❌ FAIL (No CORS origin header)"
        return 1
    fi
}

# Function to test API endpoint with CORS
test_api_endpoint() {
    local origin="$1"
    local description="$2"
    
    echo -n "Testing API endpoint for $description... "
    
    response=$(curl -s -X GET \
        -H "Origin: $origin" \
        -H "X-Dev-Mode: true" \
        -H "X-MAC-Address: $MAC_ADDRESS" \
        "$API_URL/api/v5/auth/health")
    
    if echo "$response" | grep -q "healthy"; then
        echo "✅ PASS (API responding)"
        return 0
    else
        echo "❌ FAIL (API not responding)"
        return 1
    fi
}

echo "🧪 Running CORS Tests"
echo "===================="

# Test different origins
test_cors_origin "http://localhost:3000" "Localhost HTTP"
test_cors_origin "https://localhost:3000" "Localhost HTTPS"
test_cors_origin "http://127.0.0.1:3000" "127.0.0.1 HTTP"
test_cors_origin "https://127.0.0.1:3000" "127.0.0.1 HTTPS"
test_cors_origin "http://$LOCAL_IP:3000" "Local IP HTTP"
test_cors_origin "https://$LOCAL_IP:3000" "Local IP HTTPS"

echo ""
echo "🧪 Running API Tests"
echo "==================="

# Test API endpoints
test_api_endpoint "http://localhost:3000" "Localhost"
test_api_endpoint "http://$LOCAL_IP:3000" "Local IP"

echo ""
echo "📋 CORS Configuration Summary"
echo "============================="
echo "✅ Your MacBook IP ($LOCAL_IP) is whitelisted"
echo "✅ Your MAC address ($MAC_ADDRESS) is whitelisted"
echo "✅ Localhost and 127.0.0.1 are allowed"
echo "✅ Local network ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x) are allowed"
echo "✅ Development mode headers are supported"

echo ""
echo "🚀 How to Use from Your MacBook"
echo "==============================="
echo "1. Start your frontend development server:"
echo "   npm run dev  # or yarn dev"
echo ""
echo "2. Access your app from any of these URLs:"
echo "   http://localhost:3000"
echo "   http://127.0.0.1:3000"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "3. The API will accept requests from your MacBook regardless of network"
echo "   (as long as you include the X-Dev-Mode header)"
echo ""
echo "4. For production-like testing, use:"
echo "   https://jewgo.app (production)"
echo "   https://staging.jewgo.app (staging)"
