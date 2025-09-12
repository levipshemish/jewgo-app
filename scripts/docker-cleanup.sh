#!/bin/bash

# Docker Cleanup Script
# Ensures only one build and one image at a time

echo "🧹 Starting Docker cleanup..."

# Stop all containers
echo "📦 Stopping all containers..."
docker compose down

# Remove all unused images (including dangling ones)
echo "🗑️  Removing unused images..."
docker image prune -a -f

# Clean up build cache
echo "🧽 Cleaning build cache..."
docker builder prune -a -f

# Remove unused volumes (optional - be careful with this)
echo "💾 Removing unused volumes..."
docker volume prune -f

# Remove unused networks
echo "🌐 Removing unused networks..."
docker network prune -f

# Show current state
echo "📊 Current Docker state:"
docker system df

echo "✅ Docker cleanup completed!"
echo "📋 Current images:"
docker images

echo ""
echo "🚀 To rebuild with only one image:"
echo "   docker compose build --no-cache"
echo "   docker compose up -d"
