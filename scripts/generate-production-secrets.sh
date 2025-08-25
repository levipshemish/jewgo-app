#!/bin/bash

# Generate Production Secrets for JewGo App
# This script generates the required secrets for Vercel deployment

echo "🔐 Generating Production Secrets for JewGo App"
echo "================================================"
echo ""
echo "⚠️  SECURITY NOTICE: This script generates secure tokens and provides templates"
echo "   Replace all placeholder values with your actual credentials"
echo ""

# Generate HMAC keys (32 bytes each)
echo "Generating HMAC keys..."
HMAC_CURRENT=$(openssl rand -hex 32)
HMAC_PREVIOUS=$(openssl rand -hex 32)

# Generate cleanup cron secret
echo "Generating cleanup cron secret..."
CLEANUP_SECRET=$(openssl rand -hex 32)

echo ""
echo "📋 Vercel Secrets to Add:"
echo "=========================="
echo ""
echo "# HMAC Keys for Cookie Signing"
echo "vercel secrets add merge-cookie-hmac-key-current \"$HMAC_CURRENT\""
echo "vercel secrets add merge-cookie-hmac-key-previous \"$HMAC_PREVIOUS\""
echo ""
echo "# Cleanup Cron Secret"
echo "vercel secrets add cleanup-cron-secret \"$CLEANUP_SECRET\""
echo ""
echo "# Redis Configuration (replace with your actual Redis URL)"
echo "vercel secrets add redis-url \"\${REDIS_URL}\""
echo ""
echo "# Google Services (replace with your actual keys)"
echo "vercel secrets add google-maps-api-key \"\${GOOGLE_MAPS_API_KEY}\""
echo "vercel secrets add google-maps-map-id \"5060e374c6d88aacf8fea324\""
echo "vercel secrets add ga-measurement-id \"\${GA_MEASUREMENT_ID}\""
echo ""
echo "# Admin Configuration"
echo "vercel secrets add admin-email \"\${ADMIN_EMAIL}\""
echo ""
echo "🔒 CRITICAL SECURITY WARNINGS:"
echo "=============================="
echo "⚠️  NEVER commit the following to version control:"
echo "   - Real API keys"
echo "   - Database passwords"
echo "   - OAuth secrets"
echo "   - Admin tokens"
echo "   - SMTP credentials"
echo "   - Redis passwords"
echo ""
echo "✅ SAFE to commit:"
echo "   - Template files with placeholders"
echo "   - Public URLs and endpoints"
echo "   - Non-sensitive configuration"
echo ""
echo "📝 Instructions:"
echo "1. Replace all \${PLACEHOLDER} values with your actual credentials"
echo "2. Use Vercel's environment variable system in project settings"
echo "3. Never commit real credentials to version control"
echo "4. After adding secrets, redeploy: vercel --prod"
echo ""
echo "🚀 After adding these secrets, redeploy:"
echo "vercel --prod"
echo ""
echo "✅ This will fix the 503 Service Unavailable errors on /api/auth/anonymous"
