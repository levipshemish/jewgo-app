#!/bin/bash

# Test Docker Build Script for JewGo Frontend
# This script helps identify and fix Docker build issues

set -e

echo "🐳 Testing Docker build for JewGo Frontend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Clean up any existing containers
print_status "Cleaning up existing containers..."
docker-compose -f docker-compose.frontend.yml down --remove-orphans 2>/dev/null || true

# Build the Docker image
print_status "Building Docker image..."
docker-compose -f docker-compose.frontend.yml build --no-cache

# Start the container
print_status "Starting container..."
docker-compose -f docker-compose.frontend.yml up -d

# Wait for container to be ready
print_status "Waiting for container to be ready..."
sleep 10

# Check if container is running
if ! docker-compose -f docker-compose.frontend.yml ps | grep -q "Up"; then
    print_error "Container failed to start. Checking logs..."
    docker-compose -f docker-compose.frontend.yml logs
    exit 1
fi

# Test health endpoint
print_status "Testing health endpoint..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Health check passed!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Health check failed after 30 attempts"
        docker-compose -f docker-compose.frontend.yml logs
        exit 1
    fi
    
    print_status "Waiting for health check... (attempt $i/30)"
    sleep 2
done

# Test main page
print_status "Testing main page..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "Main page loads successfully!"
else
    print_warning "Main page test failed, but container is running"
fi

# Check for common errors in logs
print_status "Checking for common errors in logs..."
LOGS=$(docker-compose -f docker-compose.frontend.yml logs)

if echo "$LOGS" | grep -q "RealtimeClient"; then
    print_error "RealtimeClient errors detected in logs"
    echo "$LOGS" | grep -i "realtimeclient"
fi

if echo "$LOGS" | grep -q "GoTrueClient"; then
    print_warning "Multiple GoTrueClient instances detected"
    echo "$LOGS" | grep -i "gotrueclient"
fi

if echo "$LOGS" | grep -q "Error"; then
    print_warning "Other errors detected in logs"
    echo "$LOGS" | grep -i "error" | head -5
fi

print_status "Docker build test completed successfully!"
print_status "Container is running on http://localhost:3000"

# Show container status
docker-compose -f docker-compose.frontend.yml ps

echo ""
print_status "To stop the container, run: docker-compose -f docker-compose.frontend.yml down"
print_status "To view logs, run: docker-compose -f docker-compose.frontend.yml logs -f"
