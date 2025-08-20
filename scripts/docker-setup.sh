#!/bin/bash

# Docker Setup Script for JewGo Frontend
# This script helps set up environment variables and run Docker containers

set -e

echo "🐳 JewGo Frontend Docker Setup"
echo "================================"

# Check if .env file exists
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating .env.local file from template..."
    cp config/environment/frontend.env.example frontend/.env.local
    echo "⚠️  Please edit frontend/.env.local with your actual values"
    echo "   - Supabase credentials"
    echo "   - Google Maps API key"
    echo "   - Database URL"
    echo "   - Admin token"
fi

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build and run development container
run_dev() {
    echo "🔨 Building development container..."
    docker-compose -f docker-compose.frontend.dev.yml build
    
    echo "🚀 Starting development container..."
    docker-compose -f docker-compose.frontend.dev.yml up
}

# Function to build and run production container
run_prod() {
    echo "🔨 Building production container..."
    docker-compose -f docker-compose.frontend.yml build
    
    echo "🚀 Starting production container..."
    docker-compose -f docker-compose.frontend.yml up
}

# Function to stop containers
stop_containers() {
    echo "🛑 Stopping containers..."
    docker-compose -f docker-compose.frontend.dev.yml down
    docker-compose -f docker-compose.frontend.yml down
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
}

# Main script logic
case "${1:-dev}" in
    "dev")
        check_docker
        run_dev
        ;;
    "prod")
        check_docker
        run_prod
        ;;
    "stop")
        stop_containers
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [dev|prod|stop|cleanup|help]"
        echo ""
        echo "Commands:"
        echo "  dev     - Run development container with hot reloading"
        echo "  prod    - Run production container"
        echo "  stop    - Stop all containers"
        echo "  cleanup - Clean up Docker resources"
        echo "  help    - Show this help message"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
