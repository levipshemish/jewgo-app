#!/bin/bash

# Deployment script for Jewgo App
echo "Starting deployment..."

# Navigate to the project directory
cd /home/ubuntu/jewgo-app

# Pull the latest changes from the main branch
echo "Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main

# Restart the backend container to pick up changes
echo "Restarting backend container..."
docker-compose restart backend

# Wait for the backend to start
echo "Waiting for backend to start..."
sleep 15

# Check if the backend is healthy
echo "Checking backend health..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo "✅ Deployment completed successfully"