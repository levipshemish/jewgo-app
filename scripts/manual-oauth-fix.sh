#!/bin/bash
# Manual OAuth environment fix script
# This script can be run on the server to add missing OAuth variables

echo "=== Manual OAuth Environment Fix ==="
echo "===================================="

# Generate OAuth state signing key
OAUTH_STATE_SIGNING_KEY=$(openssl rand -hex 32)
echo "[INFO] Generated OAuth state signing key: ${OAUTH_STATE_SIGNING_KEY:0:16}..."

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
    cat >> .env.tmp6 << EOF

# OAuth Configuration (added manually)
OAUTH_STATE_SIGNING_KEY=$OAUTH_STATE_SIGNING_KEY
FRONTEND_URL=https://jewgo.app
GOOGLE_CLIENT_SECRET=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

# Magic Link Configuration
MAGIC_LINK_SIGNING_KEY=CCD2BB4C23D529F9AF7E47AAFEB13ABC
MAGIC_LINK_TTL_MIN=20
MAGIC_LINK_BASE_URL=https://jewgo.app/auth/magic
EOF
    
    # Replace original file
    mv .env.tmp6 .env
    rm -f .env.tmp .env.tmp2 .env.tmp3 .env.tmp4 .env.tmp5
    
    echo "[SUCCESS] OAuth environment variables added to .env"
else
    echo "[ERROR] No .env file found!"
    exit 1
fi

# Show the added OAuth and Magic Link variables (without sensitive values)
echo "[INFO] OAuth and Magic Link environment variables configured:"
grep -E "^(OAUTH_STATE_SIGNING_KEY|FRONTEND_URL|GOOGLE_CLIENT_SECRET|MAGIC_LINK_SIGNING_KEY|MAGIC_LINK_TTL_MIN|MAGIC_LINK_BASE_URL)=" .env | sed 's/=.*/=***/' || echo "No OAuth/Magic Link variables found"

echo ""
echo "[SUCCESS] OAuth environment variables update completed"
echo "[INFO] Restarting backend service..."

# Restart the backend service
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose restart backend
    echo "[SUCCESS] Backend service restarted with docker-compose"
else
    docker restart jewgo_backend
    echo "[SUCCESS] Backend service restarted with docker"
fi

echo ""
echo "[INFO] Waiting for backend to start..."
sleep 10

echo "[INFO] Testing OAuth endpoints..."
# Test Google OAuth start endpoint
GOOGLE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "https://api.jewgo.app/api/v5/auth/google/start")
if [ "$GOOGLE_RESPONSE" = "302" ]; then
    echo "[SUCCESS] Google OAuth is now working (HTTP $GOOGLE_RESPONSE)"
elif [ "$GOOGLE_RESPONSE" = "501" ]; then
    echo "[WARNING] Google OAuth still returns 501 (not configured)"
else
    echo "[INFO] Google OAuth returned HTTP $GOOGLE_RESPONSE"
fi

# Test Magic Link send endpoint
MAGIC_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com"}' "https://api.jewgo.app/api/v5/auth/magic/send")
if [ "$MAGIC_RESPONSE" = "200" ]; then
    echo "[SUCCESS] Magic Link is now working (HTTP $MAGIC_RESPONSE)"
elif [ "$MAGIC_RESPONSE" = "403" ]; then
    echo "[WARNING] Magic Link still returns 403 (forbidden)"
else
    echo "[INFO] Magic Link returned HTTP $MAGIC_RESPONSE"
fi

echo ""
echo "=== OAuth Fix Complete ==="
