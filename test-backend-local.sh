#!/bin/bash

# Test Backend Locally Script
# This script builds and runs the backend container locally with your database configuration

echo "🚀 Starting JewGo Backend Local Test"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || true

# Build the backend container
echo "🔨 Building backend container..."
docker-compose -f docker-compose.local.yml build backend

if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend container"
    exit 1
fi

# Start the backend container
echo "🚀 Starting backend container..."
docker-compose -f docker-compose.local.yml up backend

echo "✅ Backend container started successfully!"
echo "🌐 Backend should be available at: http://localhost:5000"
echo "🏥 Health check endpoint: http://localhost:5000/healthz"
echo ""
echo "Press Ctrl+C to stop the container"
