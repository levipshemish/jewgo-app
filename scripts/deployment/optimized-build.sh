#!/bin/bash

# Optimized Docker build script with BuildKit
# This script provides faster builds with better caching

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if BuildKit is available
check_buildkit() {
    if ! docker buildx version >/dev/null 2>&1; then
        print_warning "BuildKit not available, falling back to standard build"
        return 1
    fi
    return 0
}

# Build with BuildKit (faster, better caching)
build_with_buildkit() {
    print_status "Building with BuildKit for optimal performance..."
    
    # Enable BuildKit
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    # Create cache directory if it doesn't exist
    mkdir -p /tmp/.buildx-cache
    
           # Build with cache mount using multi-stage Dockerfile
           docker buildx build \
               --platform linux/amd64 \
               --tag jewgo-app-backend:latest \
               --file backend/Dockerfile \
               --load \
               backend/
    
    print_success "Build completed with BuildKit"
}

# Build with standard Docker (fallback)
build_standard() {
    print_status "Building with standard Docker..."
    
    docker build \
        --tag jewgo-app-backend:latest \
        --file backend/Dockerfile \
        backend/
    
    print_success "Build completed with standard Docker"
}

# Main build function
main() {
    print_status "Starting optimized Docker build..."
    
    # Check if we're in the right directory
    if [ ! -f "backend/Dockerfile" ]; then
        print_error "Dockerfile not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if requirements.txt exists
    if [ ! -f "backend/requirements.txt" ]; then
        print_error "requirements.txt not found in backend directory."
        exit 1
    fi
    
    # Create cache directory if it doesn't exist
    mkdir -p /tmp/.buildx-cache
    
    # Try BuildKit first, fallback to standard if not available
    if check_buildkit; then
        build_with_buildkit
    else
        build_standard
    fi
    
    print_success "Docker build completed successfully!"
    print_status "You can now run: docker-compose up -d backend"
}

# Run main function
main "$@"
