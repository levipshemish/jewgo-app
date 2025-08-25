#!/bin/bash

echo "🔧 Fixing environment configuration..."
echo ""
echo "⚠️  SECURITY NOTICE: This script creates a template .env.local file"
echo "   Replace all placeholder values with your actual credentials"
echo ""

# Remove the symlink and create a proper .env.local file
rm -f .env.local

# Create .env.local with secure template configuration
cat > .env.local << 'EOF'
# Database Configuration
DATABASE_URL="${DATABASE_URL}"

# App Configuration
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENV=development

# Google Maps API (replace with your actual keys)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=5060e374c6d88aacf8fea324

# Backend API
NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com

# Analytics (replace with your actual GA ID)
NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID}

# Sentry (Optional - replace with your actual DSN)
NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# Cloudinary Configuration (Optional - replace with your actual credentials)
CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=${NEXT_PUBLIC_ADMIN_EMAIL}

# reCAPTCHA (Optional - replace with your actual keys)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
RECAPTCHA_SECRET_KEY=${RECAPTCHA_SECRET_KEY}

# Cron Jobs (Required in production - replace with your actual secret)
CLEANUP_CRON_SECRET=${CLEANUP_CRON_SECRET}

# Redis Configuration (replace with your actual Redis credentials)
REDIS_URL=${REDIS_URL}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_DB=${REDIS_DB}
REDIS_USERNAME=${REDIS_USERNAME}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Supabase Configuration (replace with your actual keys)
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# NextAuth Configuration (replace with your actual secret)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Environment
NODE_ENV=development
EOF

echo "✅ Environment configuration template created"
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
echo "   - Cloudinary credentials"
echo "   - reCAPTCHA keys"
echo ""
echo "✅ SAFE to commit:"
echo "   - Template files with placeholders"
echo "   - Public URLs and endpoints"
echo "   - Non-sensitive configuration"
echo ""
echo "📝 Instructions:"
echo "1. Replace all \${PLACEHOLDER} values with your actual credentials"
echo "2. Set environment variables in your shell or use a .env.local file"
echo "3. Never commit real credentials to version control"
echo ""
echo "🔄 Restarting development server..."

# Kill any existing Next.js processes
pkill -f "next dev" || true

# Start the development server
npm run dev 