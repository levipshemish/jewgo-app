#!/bin/bash

# Test Docker Environment Script for JewGo Frontend
# Run this script from the root directory of the project

echo "🐳 Testing Docker Environment for JewGo Frontend"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose file exists
if [ ! -f "docker-compose.frontend.dev.yml" ]; then
    echo "❌ docker-compose.frontend.dev.yml not found"
    exit 1
fi

echo "✅ Docker compose file found"

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.frontend.dev.yml down

# Build and start the Docker container
echo "🔨 Building and starting Docker container..."
docker-compose -f docker-compose.frontend.dev.yml up --build -d

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 15

# Check if container is running
if docker-compose -f docker-compose.frontend.dev.yml ps | grep -q "Up"; then
    echo "✅ Container is running"
else
    echo "❌ Container failed to start"
    echo "📋 Container logs:"
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
echo ""
echo "💡 If you see any errors, check the logs above or run:"
echo "   docker-compose -f docker-compose.frontend.dev.yml logs -f"
