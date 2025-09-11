#!/bin/bash

# Server Deployment Script for Jewgo App
# This script deploys the backend to the server with the remote database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Server configuration
SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"

print_status "Starting server deployment..."

# Check if we can connect to the server
print_status "Testing server connection..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connection successful'" 2>/dev/null; then
    print_error "Cannot connect to server. Please check your SSH configuration."
    exit 1
fi

print_success "Server connection established"

# Create environment file on server
print_status "Creating production environment file on server..."
ssh $SERVER_USER@$SERVER_HOST "cat > $SERVER_PATH/.env << 'EOF'
# Production Environment Configuration for Server Deployment

# --- Database Configuration ---
POSTGRES_DB=app_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=Jewgo123
DATABASE_URL=postgresql://app_user:Jewgo123@129.80.190.110:5432/app_db

# --- Redis Configuration ---
REDIS_PASSWORD=
REDIS_URL=redis://redis:6379

# --- Application Configuration ---
NODE_ENV=production
FLASK_ENV=production
SECRET_KEY=prod-secret-key-change-in-production-2025
JWT_SECRET_KEY=prod-jwt-secret-key-change-in-production-2025

# --- CORS Configuration ---
CORS_ORIGINS=https://jewgo.app,https://www.jewgo.app,https://api.jewgo.app,http://localhost:3000,http://127.0.0.1:3000

# --- Google Maps API ---
GOOGLE_MAPS_API_KEY=\${GOOGLE_MAPS_API_KEY}
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=\${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=\${NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}

# --- Email Configuration ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=\${SMTP_USER}
SMTP_PASSWORD=\${SMTP_PASSWORD}
FROM_EMAIL=\${FROM_EMAIL}

# --- GitHub Webhook Configuration ---
GITHUB_WEBHOOK_SECRET=dsljkgsadfhkahbdskdhbasksdbhf89346945hbvnklxv09bq47u9043yFDGGGHWYSGQBW

# --- Monitoring and Error Tracking ---
SENTRY_DSN=https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288

# --- AWS S3 Backup Configuration ---
AWS_REGION=us-east-1
S3_BACKUP_BUCKET=jewgo-backups1

# --- Development/Testing ---
DEBUG=false
TESTING=false

# --- V5 API Configuration ---
CURSOR_HMAC_SECRET_V5=prod-cursor-hmac-secret-change-in-production-2025
EOF"

print_success "Environment file created on server"

# Deploy using the existing deployment script
print_status "Running deployment script on server..."
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && chmod +x scripts/deployment/deploy.sh && ./scripts/deployment/deploy.sh"

print_success "Deployment completed on server"

# Test the deployment
print_status "Testing server deployment..."

# Wait a moment for services to start
sleep 10

# Test basic health endpoint
print_status "Testing backend health endpoint..."
if curl -f http://$SERVER_HOST:5000/healthz > /dev/null 2>&1; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check failed - checking logs..."
    ssh $SERVER_USER@$SERVER_HOST "docker logs --tail 20 jewgo_backend"
fi

# Test V5 API endpoints
print_status "Testing V5 API endpoints..."

# Test Entity API health
if curl -f http://$SERVER_HOST:5000/api/v5/health > /dev/null 2>&1; then
    print_success "Entity API health endpoint working"
else
    print_warning "Entity API health endpoint failed"
fi

# Test Webhook API health
if curl -f http://$SERVER_HOST:5000/api/v5/webhooks/health > /dev/null 2>&1; then
    print_success "Webhook API health endpoint working"
else
    print_warning "Webhook API health endpoint failed"
fi

# Test Auth API health
if curl -f http://$SERVER_HOST:5000/api/v5/auth/health > /dev/null 2>&1; then
    print_success "Auth API health endpoint working"
else
    print_warning "Auth API health endpoint failed"
fi

# Test Search API health
if curl -f http://$SERVER_HOST:5000/api/v5/search/health > /dev/null 2>&1; then
    print_success "Search API health endpoint working"
else
    print_warning "Search API health endpoint failed"
fi

print_success "Server deployment and testing completed!"
print_status "Backend is running at: http://$SERVER_HOST:5000"
print_status "Health check: curl http://$SERVER_HOST:5000/healthz"
print_status "V5 API health: curl http://$SERVER_HOST:5000/api/v5/health"
