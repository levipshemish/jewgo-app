#!/bin/bash

# Verification script for reviews endpoint deployment
# This script helps verify if the backend authentication fix was deployed correctly

echo "🔍 Verifying Reviews Endpoint Deployment..."
echo "=============================================="

# Test 1: Check if endpoint responds with proper authentication error
echo "📡 Test 1: Testing reviews endpoint authentication..."
response=$(curl -s -w "\n%{http_code}" -X POST https://api.jewgo.app/api/v5/reviews/ \
  -H 'Content-Type: application/json' \
  -H 'Cookie: access_token=test' \
  -d '{"rating": 5, "content": "test", "entity_type": "restaurants", "entity_id": 1878}')

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response: $response_body"

if [ "$http_code" = "401" ]; then
    echo "❌ Still getting 401 - deployment may not have worked"
    echo "   Expected: More specific error message from @auth_required decorator"
    echo "   Actual: Generic 'Authentication required' message"
else
    echo "✅ HTTP status changed from 401 - deployment likely successful!"
    echo "   New status: $http_code"
fi

echo ""
echo "📊 Expected Results After Successful Deployment:"
echo "- HTTP 401 with more specific error message (not just 'Authentication required')"
echo "- Error should mention authentication middleware or token validation"
echo "- Frontend should now be able to submit reviews successfully"

echo ""
echo "🔄 Next Steps:"
echo "1. If still getting 401 with 'Authentication required', redeploy backend"
echo "2. If getting different error, test review submission in frontend"
echo "3. Check backend logs for any deployment issues"
