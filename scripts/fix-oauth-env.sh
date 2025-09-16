#!/bin/bash
# Script to fix OAuth environment variables on the server

set -e

SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"

echo "=== OAuth Environment Variables Fix ==="
echo "Server: $SERVER_HOST"
echo "Path: $SERVER_PATH"
echo "================================="

# Generate a secure OAuth state signing key (64 characters)
OAUTH_STATE_SIGNING_KEY=$(openssl rand -hex 32)

echo "[INFO] Generated OAuth state signing key"

# Create environment variables to add
ENV_VARS="
# OAuth Configuration (added by fix-oauth-env.sh)
OAUTH_STATE_SIGNING_KEY=$OAUTH_STATE_SIGNING_KEY
FRONTEND_URL=https://jewgo.app
GOOGLE_CLIENT_SECRET=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

# Magic Link Configuration
MAGIC_LINK_SIGNING_KEY=CCD2BB4C23D529F9AF7E47AAFEB13ABC
MAGIC_LINK_TTL_MIN=20
MAGIC_LINK_BASE_URL=https://jewgo.app/auth/magic
"

echo "[INFO] Adding OAuth environment variables to server..."

# SSH into server and add environment variables
ssh $SERVER_USER@$SERVER_HOST << EOF
cd $SERVER_PATH

# Check if .env file exists
if [ -f .env ]; then
    echo "[INFO] Found existing .env file"
    
    # Remove any existing OAuth and Magic Link configuration lines
    grep -v "^OAUTH_STATE_SIGNING_KEY=" .env > .env.tmp || true
    grep -v "^FRONTEND_URL=" .env.tmp > .env.tmp2 || true
    grep -v "^GOOGLE_CLIENT_SECRET=" .env.tmp2 > .env.tmp3 || true
    grep -v "^MAGIC_LINK_SIGNING_KEY=" .env.tmp3 > .env.tmp4 || true
    grep -v "^MAGIC_LINK_TTL_MIN=" .env.tmp4 > .env.tmp5 || true
    grep -v "^MAGIC_LINK_BASE_URL=" .env.tmp5 > .env.tmp6 || true
    
    # Add new OAuth and Magic Link configuration
    echo "$ENV_VARS" >> .env.tmp6
    
    # Replace original file
    mv .env.tmp6 .env
    rm -f .env.tmp .env.tmp2 .env.tmp3 .env.tmp4 .env.tmp5
    
    echo "[SUCCESS] OAuth environment variables added to .env"
else
    echo "[INFO] No .env file found, creating new one"
    echo "$ENV_VARS" > .env
    echo "[SUCCESS] Created new .env file with OAuth configuration"
fi

# Show the added OAuth and Magic Link variables (without sensitive values)
echo "[INFO] OAuth and Magic Link environment variables configured:"
grep -E "^(OAUTH_STATE_SIGNING_KEY|FRONTEND_URL|GOOGLE_CLIENT_SECRET|MAGIC_LINK_SIGNING_KEY|MAGIC_LINK_TTL_MIN|MAGIC_LINK_BASE_URL)=" .env | sed 's/=.*/=***/' || echo "No OAuth/Magic Link variables found"

EOF

echo "[SUCCESS] OAuth environment variables fix completed"
echo "[INFO] You may need to restart the backend service for changes to take effect"
