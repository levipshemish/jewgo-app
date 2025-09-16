#!/bin/bash
# Script to test OAuth endpoints

set -e

API_BASE="https://api.jewgo.app"

echo "=== OAuth Endpoint Testing ==="
echo "API Base: $API_BASE"
echo "==============================="

# Test Google OAuth start endpoint
echo "[INFO] Testing Google OAuth start endpoint..."
GOOGLE_START_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/v5/auth/google/start" || echo "HTTPSTATUS:000")
GOOGLE_START_HTTP_CODE=$(echo $GOOGLE_START_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$GOOGLE_START_HTTP_CODE" = "501" ]; then
    echo "[SUCCESS] Google OAuth start endpoint returns 501 (not configured) - this is expected"
elif [ "$GOOGLE_START_HTTP_CODE" = "302" ]; then
    echo "[SUCCESS] Google OAuth start endpoint returns 302 (redirect) - OAuth is configured"
elif [ "$GOOGLE_START_HTTP_CODE" = "000" ]; then
    echo "[ERROR] Google OAuth start endpoint is unreachable"
else
    echo "[WARNING] Google OAuth start endpoint returned HTTP $GOOGLE_START_HTTP_CODE"
fi

# Apple OAuth disabled for now
echo "[INFO] Apple OAuth is disabled"

# Test OAuth callback endpoints (should return 400 for missing parameters)
echo "[INFO] Testing Google OAuth callback endpoint..."
GOOGLE_CALLBACK_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/v5/auth/google/callback" || echo "HTTPSTATUS:000")
GOOGLE_CALLBACK_HTTP_CODE=$(echo $GOOGLE_CALLBACK_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$GOOGLE_CALLBACK_HTTP_CODE" = "400" ]; then
    echo "[SUCCESS] Google OAuth callback endpoint returns 400 (missing parameters) - endpoint is working"
elif [ "$GOOGLE_CALLBACK_HTTP_CODE" = "000" ]; then
    echo "[ERROR] Google OAuth callback endpoint is unreachable"
else
    echo "[WARNING] Google OAuth callback endpoint returned HTTP $GOOGLE_CALLBACK_HTTP_CODE"
fi

# Apple OAuth callback disabled for now
echo "[INFO] Apple OAuth callback is disabled"

echo ""
echo "=== OAuth Test Summary ==="
echo "Google OAuth start: HTTP $GOOGLE_START_HTTP_CODE"
echo "Apple OAuth: DISABLED"
echo "Google OAuth callback: HTTP $GOOGLE_CALLBACK_HTTP_CODE"
echo "=========================="
