#!/bin/bash
# Script to test Google OAuth and Magic Link authentication

set -e

API_BASE="https://api.jewgo.app"

echo "=== Authentication Flow Testing ==="
echo "API Base: $API_BASE"
echo "=================================="

# Test Google OAuth start endpoint
echo "[INFO] Testing Google OAuth start endpoint..."
GOOGLE_START_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/v5/auth/google/start" || echo "HTTPSTATUS:000")
GOOGLE_START_HTTP_CODE=$(echo $GOOGLE_START_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$GOOGLE_START_HTTP_CODE" = "501" ]; then
    echo "[SUCCESS] Google OAuth start endpoint returns 501 (not configured) - OAuth service needs environment variables"
elif [ "$GOOGLE_START_HTTP_CODE" = "302" ]; then
    echo "[SUCCESS] Google OAuth start endpoint returns 302 (redirect) - OAuth is configured and working"
elif [ "$GOOGLE_START_HTTP_CODE" = "000" ]; then
    echo "[ERROR] Google OAuth start endpoint is unreachable"
else
    echo "[WARNING] Google OAuth start endpoint returned HTTP $GOOGLE_START_HTTP_CODE"
fi

# Test Google OAuth callback endpoint
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

# Test Magic Link send endpoint
echo "[INFO] Testing Magic Link send endpoint..."
MAGIC_SEND_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    "$API_BASE/api/v5/auth/magic/send" || echo "HTTPSTATUS:000")
MAGIC_SEND_HTTP_CODE=$(echo $MAGIC_SEND_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$MAGIC_SEND_HTTP_CODE" = "200" ]; then
    echo "[SUCCESS] Magic Link send endpoint returns 200 - Magic Link service is working"
elif [ "$MAGIC_SEND_HTTP_CODE" = "500" ]; then
    echo "[WARNING] Magic Link send endpoint returns 500 - may need email configuration"
elif [ "$MAGIC_SEND_HTTP_CODE" = "000" ]; then
    echo "[ERROR] Magic Link send endpoint is unreachable"
else
    echo "[WARNING] Magic Link send endpoint returned HTTP $MAGIC_SEND_HTTP_CODE"
fi

# Test Magic Link consume endpoint (should return 400 for missing parameters)
echo "[INFO] Testing Magic Link consume endpoint..."
MAGIC_CONSUME_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/v5/auth/magic/consume" || echo "HTTPSTATUS:000")
MAGIC_CONSUME_HTTP_CODE=$(echo $MAGIC_CONSUME_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$MAGIC_CONSUME_HTTP_CODE" = "400" ]; then
    echo "[SUCCESS] Magic Link consume endpoint returns 400 (missing parameters) - endpoint is working"
elif [ "$MAGIC_CONSUME_HTTP_CODE" = "000" ]; then
    echo "[ERROR] Magic Link consume endpoint is unreachable"
else
    echo "[WARNING] Magic Link consume endpoint returned HTTP $MAGIC_CONSUME_HTTP_CODE"
fi

echo ""
echo "=== Authentication Test Summary ==="
echo "Google OAuth start: HTTP $GOOGLE_START_HTTP_CODE"
echo "Google OAuth callback: HTTP $GOOGLE_CALLBACK_HTTP_CODE"
echo "Magic Link send: HTTP $MAGIC_SEND_HTTP_CODE"
echo "Magic Link consume: HTTP $MAGIC_CONSUME_HTTP_CODE"
echo "=================================="

# Provide recommendations
echo ""
echo "=== Recommendations ==="
if [ "$GOOGLE_START_HTTP_CODE" = "501" ]; then
    echo "• Run ./scripts/fix-oauth-env.sh to configure Google OAuth"
fi
if [ "$MAGIC_SEND_HTTP_CODE" = "500" ]; then
    echo "• Check email service configuration for Magic Links"
fi
if [ "$GOOGLE_START_HTTP_CODE" = "302" ] && [ "$MAGIC_SEND_HTTP_CODE" = "200" ]; then
    echo "• Both Google OAuth and Magic Links appear to be working correctly!"
fi
echo "======================="
