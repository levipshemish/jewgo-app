#!/bin/bash
# OAuth Canary Test Script
# Manually test OAuth token exchange from server environment
# Usage: ./scripts/oauth_canary.sh [authorization_code]

set -euo pipefail

# Configuration - these should be set in environment
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-https://api.jewgo.app/api/v5/auth/google/callback}"
GOOGLE_TOKEN_URL="https://oauth2.googleapis.com/token"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if authorization code is provided
if [ $# -eq 0 ]; then
    log_error "Authorization code is required"
    echo "Usage: $0 <authorization_code>"
    echo ""
    echo "To get an authorization code:"
    echo "1. Visit: https://api.jewgo.app/api/v5/auth/google/start"
    echo "2. Complete OAuth flow"
    echo "3. Copy the 'code' parameter from the callback URL"
    exit 1
fi

AUTH_CODE="$1"

# Validate environment variables
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    log_error "GOOGLE_CLIENT_ID environment variable is not set"
    exit 1
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    log_error "GOOGLE_CLIENT_SECRET environment variable is not set"
    exit 1
fi

log_info "Testing OAuth token exchange with Google"
log_info "Client ID: ${GOOGLE_CLIENT_ID:0:20}..."
log_info "Redirect URI: $GOOGLE_REDIRECT_URI"
log_info "Authorization Code: ${AUTH_CODE:0:20}..."

# Generate PKCE verifier and challenge (for testing)
PKCE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
PKCE_CHALLENGE=$(echo -n "$PKCE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/")

log_info "PKCE Verifier: ${PKCE_VERIFIER:0:20}..."
log_info "PKCE Challenge: ${PKCE_CHALLENGE:0:20}..."

# Prepare token exchange request
TOKEN_DATA=$(cat <<EOF
{
    "client_id": "$GOOGLE_CLIENT_ID",
    "client_secret": "$GOOGLE_CLIENT_SECRET",
    "code": "$AUTH_CODE",
    "grant_type": "authorization_code",
    "redirect_uri": "$GOOGLE_REDIRECT_URI",
    "code_verifier": "$PKCE_VERIFIER"
}
EOF
)

log_info "Sending token exchange request to Google..."

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$TOKEN_DATA" \
    "$GOOGLE_TOKEN_URL")

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

log_info "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
    log_info "Token exchange successful!"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Extract access token for profile test
    ACCESS_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.access_token // empty' 2>/dev/null)
    
    if [ -n "$ACCESS_TOKEN" ]; then
        log_info "Testing profile fetch with access token..."
        PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "https://openidconnect.googleapis.com/v1/userinfo")
        
        PROFILE_HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
        PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | head -n -1)
        
        if [ "$PROFILE_HTTP_CODE" -eq 200 ]; then
            log_info "Profile fetch successful!"
            echo "$PROFILE_BODY" | jq '.' 2>/dev/null || echo "$PROFILE_BODY"
        else
            log_warn "Profile fetch failed with status: $PROFILE_HTTP_CODE"
            echo "$PROFILE_BODY"
        fi
    fi
else
    log_error "Token exchange failed!"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Try to extract error details
    ERROR_TYPE=$(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null)
    ERROR_DESC=$(echo "$RESPONSE_BODY" | jq -r '.error_description // empty' 2>/dev/null)
    
    if [ -n "$ERROR_TYPE" ]; then
        log_error "Error: $ERROR_TYPE"
        if [ -n "$ERROR_DESC" ]; then
            log_error "Description: $ERROR_DESC"
        fi
    fi
fi

log_info "OAuth canary test completed"
