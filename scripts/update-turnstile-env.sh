#!/bin/bash

# Update Turnstile Configuration Across All Environment Files
# This script adds the existing Turnstile keys to all .env files

echo "🔄 Updating Turnstile Configuration Across Environment Files"
echo "=========================================================="
echo ""

# Your existing Turnstile keys
SITE_KEY="0x4AAAAAABuBu7lWKado8L_e"
SECRET_KEY="0x4AAAAAABuBu0_6cvhcyJkqf-2isoUC8ts"

# List of environment files to update
ENV_FILES=(".env.production" ".env.staging" ".env.development")

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo "📝 Updating $env_file..."
        
        # Check if Turnstile config already exists
        if grep -q "TURNSTILE_SITE_KEY" "$env_file"; then
            echo "  ⚠️  Turnstile config already exists, updating..."
            sed -i.bak "s/NEXT_PUBLIC_TURNSTILE_SITE_KEY=.*/NEXT_PUBLIC_TURNSTILE_SITE_KEY=$SITE_KEY/" "$env_file"
            sed -i.bak "s/TURNSTILE_SECRET_KEY=.*/TURNSTILE_SECRET_KEY=$SECRET_KEY/" "$env_file"
        else
            echo "  ➕ Adding Turnstile config..."
            echo "" >> "$env_file"
            echo "# Turnstile Configuration (Required for Guest Sign-In)" >> "$env_file"
            echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$SITE_KEY" >> "$env_file"
            echo "TURNSTILE_SECRET_KEY=$SECRET_KEY" >> "$env_file"
        fi
        
        echo "  ✅ $env_file updated"
    else
        echo "  ⚠️  $env_file not found, skipping..."
    fi
done

echo ""
echo "🎯 Next Steps:"
echo "1. Check Cloudflare Turnstile Dashboard for domain settings"
echo "2. Restart your development server"
echo "3. Test guest sign-in at /auth/signin"
echo "4. Test Turnstile widget at /test-turnstile"
echo ""
echo "🔍 Cloudflare Dashboard: https://dash.cloudflare.com/?to=/:account/turnstile"
echo "   Look for site key: $SITE_KEY"
