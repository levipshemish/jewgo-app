# OAuth and Magic Link Setup Guide

## Overview
This guide helps you configure Google OAuth and Magic Link authentication on the server.

## Required Environment Variables

### Google OAuth Configuration
```bash
# OAuth State Signing Key (REQUIRED - must be at least 32 characters)
OAUTH_STATE_SIGNING_KEY=your_64_character_hex_key_here

# Frontend URL for OAuth redirects
FRONTEND_URL=https://jewgo.app

# Google OAuth Credentials
GOOGLE_CLIENT_SECRET=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
```

### Magic Link Configuration
```bash
# Magic Link Signing Key (REQUIRED - must be at least 32 characters)
MAGIC_LINK_SIGNING_KEY=CCD2BB4C23D529F9AF7E47AAFEB13ABC

# Magic Link Settings
MAGIC_LINK_TTL_MIN=20
MAGIC_LINK_BASE_URL=https://jewgo.app/auth/magic
```

## Manual Setup on Server

### Step 1: SSH into the server
```bash
ssh ubuntu@157.151.254.18
cd /home/ubuntu/jewgo-app
```

### Step 2: Generate OAuth State Signing Key
```bash
# Generate a secure 64-character hex key
OAUTH_STATE_SIGNING_KEY=$(openssl rand -hex 32)
echo "Generated OAUTH_STATE_SIGNING_KEY: $OAUTH_STATE_SIGNING_KEY"
```

### Step 3: Add Environment Variables
```bash
# Check if .env file exists
if [ -f .env ]; then
    echo "Found existing .env file"
    
    # Remove any existing OAuth configuration lines
    grep -v "^OAUTH_STATE_SIGNING_KEY=" .env > .env.tmp || true
    grep -v "^FRONTEND_URL=" .env.tmp > .env.tmp2 || true
    grep -v "^GOOGLE_CLIENT_SECRET=" .env.tmp2 > .env.tmp3 || true
    grep -v "^MAGIC_LINK_SIGNING_KEY=" .env.tmp3 > .env.tmp4 || true
    grep -v "^MAGIC_LINK_TTL_MIN=" .env.tmp4 > .env.tmp5 || true
    grep -v "^MAGIC_LINK_BASE_URL=" .env.tmp5 > .env.tmp6 || true
    
    # Add new configuration
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
    
    echo "OAuth environment variables added to .env"
else
    echo "No .env file found, creating new one"
    cat > .env << EOF
# OAuth Configuration
OAUTH_STATE_SIGNING_KEY=$OAUTH_STATE_SIGNING_KEY
FRONTEND_URL=https://jewgo.app
GOOGLE_CLIENT_SECRET=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

# Magic Link Configuration
MAGIC_LINK_SIGNING_KEY=CCD2BB4C23D529F9AF7E47AAFEB13ABC
MAGIC_LINK_TTL_MIN=20
MAGIC_LINK_BASE_URL=https://jewgo.app/auth/magic
EOF
    echo "Created new .env file with OAuth configuration"
fi
```

### Step 4: Verify Configuration
```bash
# Show the added variables (without sensitive values)
echo "OAuth and Magic Link environment variables configured:"
grep -E "^(OAUTH_STATE_SIGNING_KEY|FRONTEND_URL|GOOGLE_CLIENT_SECRET|MAGIC_LINK_SIGNING_KEY|MAGIC_LINK_TTL_MIN|MAGIC_LINK_BASE_URL)=" .env | sed 's/=.*/=***/' || echo "No OAuth/Magic Link variables found"
```

### Step 5: Restart Backend Service
```bash
# Restart the backend service to load new environment variables
docker-compose restart backend
# OR if using systemd:
# sudo systemctl restart jewgo-backend
```

## Testing

### Test OAuth Endpoints
```bash
# Test Google OAuth start endpoint (should return 302 redirect, not 501)
curl -I https://api.jewgo.app/api/v5/auth/google/start

# Test Magic Link send endpoint (should return 200, not 403)
curl -X POST -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}' \
     https://api.jewgo.app/api/v5/auth/magic/send
```

### Expected Results
- **Google OAuth start**: Should return `302` (redirect) instead of `501` (not configured)
- **Magic Link send**: Should return `200` (success) instead of `403` (forbidden)

## Troubleshooting

### Common Issues

1. **OAuth returns 501 (not configured)**
   - Missing `OAUTH_STATE_SIGNING_KEY` or `FRONTEND_URL`
   - OAuth service failed to initialize

2. **Magic Link returns 403 (forbidden)**
   - Missing `MAGIC_LINK_SIGNING_KEY`
   - Magic Link service failed to initialize

3. **Service not restarting**
   - Check Docker logs: `docker-compose logs backend`
   - Verify environment variables are loaded

### Verification Commands
```bash
# Check if environment variables are loaded in the container
docker-compose exec backend env | grep -E "(OAUTH_STATE_SIGNING_KEY|FRONTEND_URL|MAGIC_LINK_SIGNING_KEY)"

# Check backend logs for OAuth/Magic Link initialization
docker-compose logs backend | grep -i "oauth\|magic"
```

## Security Notes

- The `OAUTH_STATE_SIGNING_KEY` must be at least 32 characters for security
- The `MAGIC_LINK_SIGNING_KEY` must be at least 32 characters for security
- These keys should be unique and not shared between environments
- Never commit these keys to version control

## Apple OAuth Status

Apple OAuth is currently **DISABLED** in the application. The Apple OAuth blueprint registration has been commented out in `app_factory_full.py`. To re-enable Apple OAuth, you would need to:

1. Uncomment the Apple OAuth blueprint registration
2. Add Apple OAuth environment variables:
   - `APPLE_CLIENT_ID`
   - `APPLE_CLIENT_SECRET`
   - `APPLE_REDIRECT_URI`
   - `APPLE_PRIVATE_KEY_BASE64`
   - `APPLE_KEY_ID`
   - `APPLE_TEAM_ID`
