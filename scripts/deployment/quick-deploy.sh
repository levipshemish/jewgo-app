#!/bin/bash

# Quick deployment script for optimized builds
# This script provides fast deployment with minimal downtime

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if container is healthy
wait_for_health() {
    local container_name=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $container_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null | grep -q "healthy"; then
            print_success "$container_name is healthy!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for $container_name..."
        sleep 2
        ((attempt++))
    done
    
    print_error "$container_name failed to become healthy within timeout"
    return 1
}

# Main deployment function
main() {
    print_status "Starting quick deployment..."
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if backend container exists
    if docker ps -a --format '{{.Names}}' | grep -q "jewgo_backend"; then
        print_status "Backend container exists, performing rolling update..."
        
        # Build new image in background
        print_status "Building new backend image..."
        if [ -f "scripts/deployment/optimized-build.sh" ]; then
            ./scripts/deployment/optimized-build.sh
        else
            docker-compose build backend
        fi
        
        # Stop old container
        print_status "Stopping old backend container..."
        docker-compose stop backend
        
        # Start new container
        print_status "Starting new backend container..."
        docker-compose up -d backend
        
        # Wait for health check
        wait_for_health "jewgo_backend"
        
    else
        print_status "No existing backend container, starting fresh..."
        
        # Start all services
        docker-compose up -d postgres redis
        
        # Wait for dependencies
        wait_for_health "jewgo_postgres"
        wait_for_health "jewgo_redis"
        
        # Build and start backend
        if [ -f "scripts/deployment/optimized-build.sh" ]; then
            ./scripts/deployment/optimized-build.sh
        else
            docker-compose build backend
        fi
        
        docker-compose up -d backend
        wait_for_health "jewgo_backend"
    fi
    
    print_success "Deployment completed successfully!"
    print_status "Backend is running at: http://localhost:5000"
    print_status "Health check: curl http://localhost:5000/healthz"
}

# Run main function
main "$@"
