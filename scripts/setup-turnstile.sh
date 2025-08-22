#!/bin/bash

# Turnstile Setup Script for JewGo App
# This script helps you configure Turnstile for guest sign-in

echo "🔐 Turnstile Setup for JewGo Guest Sign-In"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📋 Steps to set up Turnstile:"
echo ""
echo "1. Go to Cloudflare Turnstile Dashboard:"
echo "   https://dash.cloudflare.com/?to=/:account/turnstile"
echo ""
echo "2. Create a new site key with these settings:"
echo "   - Type: Managed"
echo "   - Domains: Add your domains (jewgo.app, localhost for dev)"
echo "   - Widget Mode: Invisible"
echo ""
echo "3. Copy the Site Key and Secret Key"
echo ""

# Prompt for site key
read -p "Enter your Turnstile Site Key: " SITE_KEY

if [ -z "$SITE_KEY" ]; then
    echo "❌ Site key is required"
    exit 1
fi

# Prompt for secret key
read -p "Enter your Turnstile Secret Key: " SECRET_KEY

if [ -z "$SECRET_KEY" ]; then
    echo "❌ Secret key is required"
    exit 1
fi

echo ""
echo "🔧 Adding Turnstile configuration to .env file..."

# Check if Turnstile config already exists
if grep -q "TURNSTILE_SITE_KEY" .env; then
    echo "⚠️  Turnstile configuration already exists in .env"
    echo "Updating existing values..."
    
    # Update existing values
    sed -i.bak "s/NEXT_PUBLIC_TURNSTILE_SITE_KEY=.*/NEXT_PUBLIC_TURNSTILE_SITE_KEY=$SITE_KEY/" .env
    sed -i.bak "s/TURNSTILE_SECRET_KEY=.*/TURNSTILE_SECRET_KEY=$SECRET_KEY/" .env
else
    echo "Adding new Turnstile configuration..."
    
    # Add to end of .env file
    echo "" >> .env
    echo "# Turnstile Configuration (Required for Guest Sign-In)" >> .env
    echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$SITE_KEY" >> .env
    echo "TURNSTILE_SECRET_KEY=$SECRET_KEY" >> .env
    echo "NEXT_PUBLIC_FEATURE_FLAGS={\"ANONYMOUS_AUTH\":true}" >> .env
fi

echo ""
echo "✅ Turnstile configuration added successfully!"
echo ""
echo "🔄 Next steps:"
echo "1. Restart your development server"
echo "2. Test guest sign-in at /auth/signin"
echo "3. Check the browser console for any errors"
echo ""
echo "🔍 To test Turnstile:"
echo "   Visit: http://localhost:3000/test-turnstile"
echo ""
echo "📚 Documentation:"
echo "   - Turnstile Docs: https://developers.cloudflare.com/turnstile/"
echo "   - JewGo CAPTCHA Guide: frontend/docs/CAPTCHA_INTEGRATION.md"
