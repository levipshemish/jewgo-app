#!/bin/bash

# Test Docker Environment Script
# This script helps test the Docker environment and verify the module system fixes

echo "🐳 Testing Docker Environment for JewGo Frontend"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose file exists (it's in the parent directory)
if [ ! -f "../../docker-compose.frontend.dev.yml" ]; then
    echo "❌ docker-compose.frontend.dev.yml not found in parent directory"
    exit 1
fi

echo "✅ Docker compose file found"

# Build and start the Docker container (from parent directory)
echo "🔨 Building and starting Docker container..."
cd ../..
docker-compose -f docker-compose.frontend.dev.yml up --build -d

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker-compose -f docker-compose.frontend.dev.yml ps | grep -q "Up"; then
    echo "✅ Container is running"
else
    echo "❌ Container failed to start"
    docker-compose -f docker-compose.frontend.dev.yml logs
    exit 1
fi

# Test the health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Health endpoint is responding"
else
    echo "⚠️  Health endpoint not responding (this might be normal in development)"
fi

# Test the test-unified-card page
echo "🧪 Testing test-unified-card page..."
if curl -f http://localhost:3000/test-unified-card > /dev/null 2>&1; then
    echo "✅ test-unified-card page is accessible"
else
    echo "❌ test-unified-card page is not accessible"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.frontend.dev.yml logs --tail=20
fi

echo ""
echo "🎯 Test Results Summary:"
echo "========================"
echo "• Docker container: ✅ Running"
echo "• Health endpoint: $(curl -f http://localhost:3000/api/health > /dev/null 2>&1 && echo "✅" || echo "⚠️")"
echo "• Test page: $(curl -f http://localhost:3000/test-unified-card > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo ""
echo "🌐 Access your application at: http://localhost:3000"
echo "🧪 Test the unified card page at: http://localhost:3000/test-unified-card"
echo ""
echo "📋 To view logs: docker-compose -f docker-compose.frontend.dev.yml logs -f"
echo "🛑 To stop: docker-compose -f docker-compose.frontend.dev.yml down"
