#!/bin/bash
# Fix webhook deployment by updating Docker container configuration
set -e

echo "🔧 Fixing webhook deployment configuration..."

# Check if we're on the server
if [ ! -f "/home/ubuntu/.env" ]; then
    echo "❌ This script must be run on the server at /home/ubuntu"
    exit 1
fi

# Navigate to project directory
cd /home/ubuntu

echo "📋 Current webhook status:"
curl -s http://localhost:5000/webhook/status | jq . || echo "Backend not accessible"

echo "🛑 Stopping current backend container..."
docker-compose down backend || true
docker stop jewgo-backend || true
docker rm jewgo-backend || true

echo "📁 Backing up current configuration..."
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
cp backend/Dockerfile backend/Dockerfile.backup.$(date +%Y%m%d_%H%M%S)

echo "🔄 Updating Docker configuration for webhook support..."

# Update docker-compose.yml to use webhook-enabled configuration
if [ -f "docker-compose.webhook.yml" ]; then
    cp docker-compose.webhook.yml docker-compose.yml
    echo "✅ Updated docker-compose.yml with webhook configuration"
else
    echo "❌ docker-compose.webhook.yml not found"
    exit 1
fi

# Update Dockerfile to use webhook-enabled configuration
if [ -f "backend/Dockerfile.webhook" ]; then
    cp backend/Dockerfile.webhook backend/Dockerfile
    echo "✅ Updated Dockerfile with webhook configuration"
else
    echo "❌ backend/Dockerfile.webhook not found"
    exit 1
fi

echo "🏗️ Building new backend container with webhook support..."
docker-compose build --no-cache backend

echo "🚀 Starting backend with webhook support..."
docker-compose up -d backend

echo "⏳ Waiting for backend to be ready..."
sleep 15

echo "🧪 Testing webhook status..."
if curl -s http://localhost:5000/webhook/status | jq -e '.git_installed == true and .git_repo_exists == true' > /dev/null; then
    echo "✅ Webhook configuration successful!"
    echo "📊 Webhook status:"
    curl -s http://localhost:5000/webhook/status | jq .
else
    echo "❌ Webhook configuration failed!"
    echo "📊 Current status:"
    curl -s http://localhost:5000/webhook/status | jq . || echo "Backend not accessible"
    exit 1
fi

echo "🧪 Testing backend health..."
if curl -s http://localhost:5000/health | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed!"
    exit 1
fi

echo "🎉 Webhook deployment fix completed successfully!"
echo "🔗 Webhook endpoint: https://api.jewgo.app/webhook/deploy"
echo "📊 Status endpoint: https://api.jewgo.app/webhook/status"
