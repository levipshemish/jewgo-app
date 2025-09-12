#!/bin/bash

# Service Cleanup Script
# Removes all containers and images for a specific service

SERVICE_NAME=${1:-"backend"}

if [ -z "$1" ]; then
    echo "Usage: $0 <service_name>"
    echo "Example: $0 backend"
    echo "Available services: backend, redis, nginx, postgres"
    exit 1
fi

echo "🧹 Cleaning up $SERVICE_NAME service..."

# Stop and remove service container
echo "⏹️  Stopping and removing $SERVICE_NAME container..."
docker compose stop $SERVICE_NAME 2>/dev/null || echo "$SERVICE_NAME not running"
docker compose rm -s -f $SERVICE_NAME 2>/dev/null || echo "No $SERVICE_NAME container to remove"

# Remove any orphaned containers with the service name
echo "🧹 Removing any orphaned $SERVICE_NAME containers..."
docker ps -a --filter "name=jewgo_$SERVICE_NAME" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || echo "No orphaned containers found"

# Remove service image
echo "🗑️  Removing $SERVICE_NAME image..."
docker rmi jewgo-app-$SERVICE_NAME:latest 2>/dev/null || echo "No existing $SERVICE_NAME image to remove"

# Remove any dangling images
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Show current state
echo "📊 Current $SERVICE_NAME containers:"
docker ps --filter "name=jewgo_$SERVICE_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "📊 Current $SERVICE_NAME images:"
docker images | grep jewgo-app-$SERVICE_NAME

echo "✅ $SERVICE_NAME cleanup completed!"
