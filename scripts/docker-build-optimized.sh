#!/bin/bash
set -e

echo "=== Optimized Docker Build for JewGo ==="

# Enable Docker BuildKit for better performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Set build arguments for better caching
export BUILDKIT_INLINE_CACHE=1

# Function to build with optimizations
build_service() {
    local service=$1
    local context=$2
    local dockerfile=$3
    
    echo "Building $service..."
    
    # Use BuildKit with optimizations
    docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --cache-from $service:latest \
        --tag $service:latest \
        --file $dockerfile \
        --progress=plain \
        $context
    
    echo "✅ $service built successfully"
}

# Clean up old images and containers (optional)
echo "Cleaning up old containers and images..."
docker system prune -f

# Build services sequentially to avoid race conditions
echo "Building backend..."
if build_service "jewgo-backend" "./backend" "Dockerfile.optimized"; then
    echo "✅ Backend built successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi

echo "Building frontend..."
if build_service "jewgo-frontend" "./frontend" "Dockerfile.optimized"; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ All services built successfully!"

# Optional: Run the optimized compose file
if [ "$1" = "--run" ]; then
    echo "Starting services with optimized compose..."
    docker-compose -f docker-compose.optimized.yml up -d
    echo "✅ Services started!"
fi

echo "=== Build completed! ==="
