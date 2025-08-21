#!/bin/bash
set -e

echo "=== Simple Optimized Docker Build for JewGo ==="

# Enable Docker BuildKit for better performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Clean up old images and containers (optional)
echo "Cleaning up old containers and images..."
docker system prune -f

# Build backend
echo "Building backend..."
cd backend
docker build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --cache-from jewgo-backend:latest \
    --tag jewgo-backend:latest \
    --file Dockerfile.optimized \
    --progress=plain \
    .
cd ..

echo "✅ Backend built successfully"

# Build frontend
echo "Building frontend..."
cd frontend
docker build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --cache-from jewgo-frontend:latest \
    --tag jewgo-frontend:latest \
    --file Dockerfile.optimized \
    --progress=plain \
    .
cd ..

echo "✅ Frontend built successfully"
echo "✅ All services built successfully!"

# Optional: Run the optimized compose file
if [ "$1" = "--run" ]; then
    echo "Starting services with optimized compose..."
    docker-compose -f docker-compose.optimized.yml up -d
    echo "✅ Services started!"
fi

echo "=== Build completed! ==="
