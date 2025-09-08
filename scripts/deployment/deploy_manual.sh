#!/bin/bash
# Manual deployment script for JewGo
set -e

echo "🚀 Starting manual deployment..."

# Navigate to project directory
cd /home/ubuntu

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Restart backend with new changes
echo "🔄 Restarting backend service..."
docker-compose restart backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 15

# Test backend health
echo "🧪 Testing backend health..."
if curl -s http://localhost:5000/health | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed!"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
