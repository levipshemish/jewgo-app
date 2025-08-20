#!/bin/bash

# Docker Setup Script for JewGo App
# This script ensures Docker environment matches Vercel's production environment

set -e

echo "🐳 Setting up Docker environment to match Vercel..."

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

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Validate required environment variables
print_status "Validating environment variables..."

# Check frontend environment variables
if [ -f "frontend/.env.local" ]; then
    source frontend/.env.local
    required_frontend_vars=(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        "NEXT_PUBLIC_BACKEND_URL"
    )
    
    for var in "${required_frontend_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_warning "Frontend environment variable $var is not set"
        else
            print_status "✓ $var is set"
        fi
    done
else
    print_warning "frontend/.env.local not found - will be created from example"
fi

# Check backend environment variables
if [ -f "backend/.env" ]; then
    source backend/.env
    required_backend_vars=(
        "DATABASE_URL"
        "GOOGLE_MAPS_API_KEY"
        "SECRET_KEY"
    )
    
    for var in "${required_backend_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_warning "Backend environment variable $var is not set"
        else
            print_status "✓ $var is set"
        fi
    done
else
    print_warning "backend/.env not found - will be created from example"
fi

# Create environment files if they don't exist
print_status "Creating environment files if needed..."

if [ ! -f "frontend/.env.local" ]; then
    if [ -f "frontend/env.example" ]; then
        cp frontend/env.example frontend/.env.local
        print_status "Created frontend/.env.local from example"
        print_warning "Please edit frontend/.env.local with your actual values"
    else
        print_error "frontend/env.example not found. Please create frontend/.env.local manually."
        exit 1
    fi
fi

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        print_status "Created backend/.env from example"
        print_warning "Please edit backend/.env with your actual values"
    else
        print_error "backend/env.example not found. Please create backend/.env manually."
        exit 1
    fi
fi

# Build and start services
print_status "Building Docker images..."

# Build backend
print_status "Building backend image..."
docker-compose -f docker-compose.simple.yml build backend

# Build frontend
print_status "Building frontend image..."
docker-compose -f docker-compose.simple.yml build frontend

# Start services
print_status "Starting services..."
docker-compose -f docker-compose.simple.yml up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Wait for backend
print_status "Waiting for backend to be ready..."
timeout=60
counter=0
while ! curl -f http://localhost:5000/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Backend failed to start within $timeout seconds"
        docker-compose -f docker-compose.simple.yml logs backend
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo " ✓"

# Wait for frontend
print_status "Waiting for frontend to be ready..."
timeout=60
counter=0
while ! curl -f http://localhost:3000 > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Frontend failed to start within $timeout seconds"
        docker-compose -f docker-compose.simple.yml logs frontend
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo " ✓"

# Check service status
print_status "Checking service status..."
docker-compose -f docker-compose.simple.yml ps

print_status "🎉 Docker environment is ready!"
echo ""
echo "Services available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Database: localhost:5432"
echo "  Redis:    localhost:6379"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f docker-compose.simple.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.simple.yml down"
echo "  Restart:       docker-compose -f docker-compose.simple.yml restart"
echo ""

# Run health checks
print_status "Running health checks..."

# Backend health check
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_status "✓ Backend health check passed"
else
    print_error "✗ Backend health check failed"
fi

# Frontend health check
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✓ Frontend health check passed"
else
    print_error "✗ Frontend health check failed"
fi

print_status "Docker setup complete! 🚀"
