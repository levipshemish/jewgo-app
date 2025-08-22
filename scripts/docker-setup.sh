#!/bin/bash

# Docker Setup Script for JewGo App
# This script ensures Docker environment matches Vercel's production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check command line arguments
SETUP_TYPE=${1:-"full"}

if [ "$SETUP_TYPE" = "frontend-only" ]; then
    echo "🐳 Setting up Docker frontend to work with Render backend..."
    COMPOSE_FILE="docker-compose.frontend-only.yml"
    SERVICES="frontend"
elif [ "$SETUP_TYPE" = "full" ]; then
    echo "🐳 Setting up complete Docker environment..."
    COMPOSE_FILE="docker-compose.simple.yml"
    SERVICES="frontend postgres redis"
else
    echo "Usage: $0 [full|frontend-only]"
    echo ""
    echo "Options:"
    echo "  full          - Setup complete environment (frontend + backend + database)"
    echo "  frontend-only - Setup frontend only (connects to Render backend)"
    exit 1
fi

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

# Create .env files if they don't exist
print_status "Checking environment files..."

if [ ! -f "frontend/.env.local" ]; then
    print_warning "frontend/.env.local not found. Creating from example..."
    if [ -f "frontend/env.example" ]; then
        cp frontend/env.example frontend/.env.local
        print_status "Created frontend/.env.local from example"
    else
        print_error "frontend/env.example not found. Please create frontend/.env.local manually."
        exit 1
    fi
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

# Build and start services
print_status "Building Docker images..."

# Build frontend
print_status "Building frontend image..."
docker-compose -f $COMPOSE_FILE build frontend

# Start services
print_status "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Wait for frontend
print_status "Waiting for frontend to be ready..."
timeout=60
counter=0
while ! curl -f http://localhost:3001 > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Frontend failed to start within $timeout seconds"
        docker-compose -f $COMPOSE_FILE logs frontend
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo " ✓"

# Check service status
print_status "Checking service status..."
docker-compose -f $COMPOSE_FILE ps

if [ "$SETUP_TYPE" = "frontend-only" ]; then
    print_status "🎉 Docker frontend is ready!"
    echo ""
    echo "Services available at:"
    echo "  Frontend: http://localhost:3001"
    echo "  Backend:  https://jewgo-app-oyoh.onrender.com (Render)"
    echo ""
    echo "Useful commands:"
    echo "  View logs:     docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart:       docker-compose -f $COMPOSE_FILE restart"
    echo ""
else
    print_status "🎉 Docker environment is ready!"
    echo ""
    echo "Services available at:"
    echo "  Frontend: http://localhost:3001"
    echo "  Backend:  http://localhost:5001"
    echo "  Database: localhost:5433"
    echo "  Redis:    localhost:6379"
    echo ""
    echo "Useful commands:"
    echo "  View logs:     docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart:       docker-compose -f $COMPOSE_FILE restart"
    echo ""
fi

# Run health checks
print_status "Running health checks..."

# Frontend health check
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    print_status "✓ Frontend health check passed"
else
    print_error "✗ Frontend health check failed"
fi

if [ "$SETUP_TYPE" = "full" ]; then
    # Backend health check
    if curl -f http://localhost:5001/health > /dev/null 2>&1; then
        print_status "✓ Backend health check passed"
    else
        print_error "✗ Backend health check failed"
    fi
fi

print_status "Docker setup complete! 🚀"

if [ "$SETUP_TYPE" = "frontend-only" ]; then
    echo ""
    echo "✅ Frontend is now running and connected to your Render backend!"
    echo "🌐 Open http://localhost:3001 in your browser"
    echo ""
    echo "Note: This setup uses your existing Render backend at:"
    echo "     https://jewgo-app-oyoh.onrender.com"
else
    echo ""
    echo "Note: Ports were changed to avoid conflicts:"
    echo "  - Frontend: 3000 → 3001"
    echo "  - Backend:  5000 → 5001"
    echo "  - Database: 5432 → 5433"
    echo ""
    echo "If you need the original ports, stop local services first:"
    echo "  brew services stop postgresql@14"
    echo "  brew services stop postgresql@17"
fi
