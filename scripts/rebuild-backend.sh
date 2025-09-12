#!/bin/bash

# Backend Rebuild Script
# Ensures only one backend container and image exists

echo "🔄 Rebuilding backend with single container and image..."

# Stop and remove backend container completely
echo "⏹️  Stopping and removing backend container..."
docker compose stop backend 2>/dev/null || echo "Backend not running"
docker compose rm -s -f backend 2>/dev/null || echo "No backend container to remove"

# Remove any orphaned backend containers
echo "🧹 Removing any orphaned backend containers..."
docker ps -a --filter "name=jewgo_backend" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || echo "No orphaned containers found"

# Remove the current backend image
echo "🗑️  Removing current backend image..."
docker rmi jewgo-app-backend:latest 2>/dev/null || echo "No existing image to remove"

# Remove any dangling images
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Build fresh backend image
echo "🔨 Building fresh backend image..."
docker compose build --no-cache backend

# Start the backend
echo "🚀 Starting backend..."
docker compose up -d backend

# Wait for container to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Show current state
echo "📊 Current backend containers:"
docker ps --filter "name=jewgo_backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "📊 Current backend images:"
docker images | grep jewgo-app-backend

echo "✅ Backend rebuild completed!"
