#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if backend is running
check_backend() {
    if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
        print_warning "Backend is not running on port 5000. Make sure your backend is started."
        print_warning "The frontend will try to connect to http://host.docker.internal:5000"
    else
        print_success "Backend is running on port 5000"
    fi
}

# Function to build the frontend container
build() {
    print_status "Building frontend Docker container..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml build
    print_success "Frontend container built successfully"
}

# Function to start the frontend container
start() {
    print_status "Starting frontend Docker container..."
    cd "$PROJECT_ROOT"
    check_docker
    check_backend
    
    # Stop any existing containers
    docker-compose -f docker-compose.frontend.dev.yml down
    
    # Start the container
    docker-compose -f docker-compose.frontend.dev.yml up -d
    
    print_success "Frontend container started successfully"
    print_status "Frontend is available at: http://localhost:3000"
    print_status "Backend URL: http://host.docker.internal:5000"
}

# Function to stop the frontend container
stop() {
    print_status "Stopping frontend Docker container..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml down
    print_success "Frontend container stopped"
}

# Function to restart the frontend container
restart() {
    print_status "Restarting frontend Docker container..."
    stop
    start
}

# Function to show logs
logs() {
    print_status "Showing frontend container logs..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml logs -f
}

# Function to show status
status() {
    print_status "Checking frontend container status..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml ps
}

# Function to open shell in container
shell() {
    print_status "Opening shell in frontend container..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml exec frontend-dev /bin/sh
}

# Function to clean up
cleanup() {
    print_status "Cleaning up frontend Docker resources..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.frontend.dev.yml down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Usage: $0 {build|start|stop|restart|logs|status|shell|cleanup|help}"
    echo ""
    echo "Commands:"
    echo "  build     - Build the frontend Docker container"
    echo "  start     - Start the frontend container (connects to real backend)"
    echo "  stop      - Stop the frontend container"
    echo "  restart   - Restart the frontend container"
    echo "  logs      - Show container logs"
    echo "  status    - Show container status"
    echo "  shell     - Open shell in container"
    echo "  cleanup   - Clean up Docker resources"
    echo "  help      - Show this help message"
    echo ""
    echo "Environment:"
    echo "  - Frontend runs on: http://localhost:3000"
    echo "  - Backend should be on: http://localhost:5000"
    echo "  - Container connects to backend via: http://host.docker.internal:5000"
}

# Main script logic
case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    shell)
        shell
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
