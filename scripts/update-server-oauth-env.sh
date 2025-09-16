#!/bin/bash
# Script to update server environment with OAuth variables
# This script can be run manually on the server

set -e

echo "=== OAuth Environment Variables Update ==="
echo "=========================================="

# Generate OAuth state signing key if not provided
OAUTH_STATE_SIGNING_KEY="${OAUTH_STATE_SIGNING_KEY:-$(openssl rand -hex 32)}"

echo "[INFO] OAuth State Signing Key: ${OAUTH_STATE_SIGNING_KEY:0:16}..."

# Create the OAuth environment variables to add
OAUTH_VARS="
# OAuth Configuration (added by update-server-oauth-env.sh)
OAUTH_STATE_SIGNING_KEY=$OAUTH_STATE_SIGNING_KEY
FRONTEND_URL=https://jewgo.app
GOOGLE_CLIENT_SECRET=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

# Magic Link Configuration
MAGIC_LINK_SIGNING_KEY=CCD2BB4C23D529F9AF7E47AAFEB13ABC
MAGIC_LINK_TTL_MIN=20
MAGIC_LINK_BASE_URL=https://jewgo.app/auth/magic
"

echo "[INFO] Adding OAuth environment variables to .env file..."

# Check if .env file exists
if [ -f .env ]; then
    echo "[INFO] Found existing .env file"
    
    # Create backup
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "[INFO] Created backup: .env.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Remove any existing OAuth configuration lines
    grep -v "^OAUTH_STATE_SIGNING_KEY=" .env > .env.tmp || true
    grep -v "^FRONTEND_URL=" .env.tmp > .env.tmp2 || true
    grep -v "^GOOGLE_CLIENT_SECRET=" .env.tmp2 > .env.tmp3 || true
    grep -v "^MAGIC_LINK_SIGNING_KEY=" .env.tmp3 > .env.tmp4 || true
    grep -v "^MAGIC_LINK_TTL_MIN=" .env.tmp4 > .env.tmp5 || true
    grep -v "^MAGIC_LINK_BASE_URL=" .env.tmp5 > .env.tmp6 || true
    
    # Add new OAuth and Magic Link configuration
    echo "$OAUTH_VARS" >> .env.tmp6
    
    # Replace original file
    mv .env.tmp6 .env
    rm -f .env.tmp .env.tmp2 .env.tmp3 .env.tmp4 .env.tmp5
    
    echo "[SUCCESS] OAuth environment variables added to .env"
else
    echo "[INFO] No .env file found, creating new one"
    echo "$OAUTH_VARS" > .env
    echo "[SUCCESS] Created new .env file with OAuth configuration"
fi

# Show the added OAuth and Magic Link variables (without sensitive values)
echo "[INFO] OAuth and Magic Link environment variables configured:"
grep -E "^(OAUTH_STATE_SIGNING_KEY|FRONTEND_URL|GOOGLE_CLIENT_SECRET|MAGIC_LINK_SIGNING_KEY|MAGIC_LINK_TTL_MIN|MAGIC_LINK_BASE_URL)=" .env | sed 's/=.*/=***/' || echo "No OAuth/Magic Link variables found"

echo ""
echo "[SUCCESS] OAuth environment variables update completed"
echo "[INFO] You may need to restart the backend service for changes to take effect"
echo "[INFO] To restart: docker-compose restart backend"
