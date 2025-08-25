#!/bin/bash

echo "🔧 Fixing environment configuration..."

# Remove the symlink and create a proper .env.local file
rm -f .env.local

# Create .env.local with proper configuration
cat > .env.local << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# App Configuration
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENV=development

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCl7ryK-cp9EtGoYMJ960P1jZO-nnTCCqM
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=5060e374c6d88aacf8fea324

# Backend API
NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-CGMV8EBX9C

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=dcpuqbnrm
CLOUDINARY_API_KEY=762259824242794
CLOUDINARY_API_SECRET=KR6KAB_Q307pngT0SZxUQNPQTMw

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=admin@jewgo.com

# reCAPTCHA (Optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LcnmqArAAAAAA9VkFLeg6WPBXYMTAqTRK9Jx3Jg
RECAPTCHA_SECRET_KEY=6LcnmqArAAAAABV9QybjVvnCdbZn3tMjqHG6oDdR

# Cron Jobs (Required in production)
CLEANUP_CRON_SECRET=72882b5a73bbc1388fe1672e2d9fd20077fbc334e8b5ffe50945917ff96c8bf3




# Redis Configuration (for anti-replay protection)
REDIS_URL=redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768
REDIS_HOST=redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com
REDIS_PORT=10768
REDIS_DB=0
REDIS_USERNAME=default
REDIS_PASSWORD=p4El96DKlpczWdIIkdelvNUC8JBRm83r

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc2Z5cnhrcXBpcGF1bW5ndmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODcwMDgsImV4cCI6MjA3MTA2MzAwOH0.ppXAiXHEgEz1zOANin2HnGzznln4HZhVia-F6WX_P2c
NEXT_PUBLIC_SUPABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc2Z5cnhrcXBpcGF1bW5ndmZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ4NzAwOCwiZXhwIjoyMDcxMDYzMDA4fQ.LObTdFHWkRoiSkW-GhAvQPUvOp2AxS4S0XIae8Id0X8

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=BoIzVFtI8CYLAYFpygltlBAsWDNSPxFAP/gvaKhfIww=

# Environment
NODE_ENV=development
EOF

echo "✅ Environment configuration updated"
echo "🔄 Restarting development server..."

# Kill any existing Next.js processes
pkill -f "next dev" || true

# Start the development server
npm run dev 