#!/bin/bash

# Generate Production Secrets for JewGo App
# This script generates the required secrets for Vercel deployment

echo "🔐 Generating Production Secrets for JewGo App"
echo "================================================"

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
echo "# Redis Configuration (use your existing Redis URL)"
echo "vercel secrets add redis-url \"redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768\""
echo ""

echo ""
echo "# Google Services (use your existing keys)"
echo "vercel secrets add google-maps-api-key \"AIzaSyCl7ryK-cp9EtGoYMJ960P1jZO-nnTCCqM\""
echo "vercel secrets add google-maps-map-id \"5060e374c6d88aacf8fea324\""
echo "vercel secrets add ga-measurement-id \"G-CGMV8EBX9C\""
echo ""
echo "# Admin Configuration"
echo "vercel secrets add admin-email \"admin@jewgo.com\""
echo ""
echo "🚀 After adding these secrets, redeploy:"
echo "vercel --prod"
echo ""
echo "✅ This will fix the 503 Service Unavailable errors on /api/auth/anonymous"
