#!/bin/bash

# JewGo Sandbox Management Script
# This script provides commands to manage the React Live sandbox for visual testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[SANDBOX]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SANDBOX]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SANDBOX]${NC} $1"
}

print_error() {
    echo -e "${RED}[SANDBOX]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if required files exist
check_requirements() {
    if [ ! -d "frontend/sandbox" ]; then
        print_error "Sandbox directory not found. Please ensure the sandbox is properly set up."
        exit 1
    fi
    
    if [ ! -f "docker-compose.sandbox.yml" ]; then
        print_error "Docker Compose sandbox configuration not found."
        exit 1
    fi
}

# Function to install sandbox dependencies
install_deps() {
    print_status "Installing sandbox dependencies..."
    cd frontend/sandbox
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
    cd ../..
}

# Function to start the sandbox
start() {
    print_status "Starting JewGo Sandbox..."
    check_docker
    check_requirements
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "frontend/sandbox/node_modules" ]; then
        install_deps
    fi
    
    # Start services
    docker-compose -f docker-compose.sandbox.yml up -d
    
    print_success "Sandbox started successfully!"
    print_status "Access the sandbox at: http://localhost:3001"
    print_status "Access Storybook at: http://localhost:6006"
    print_status "Use 'npm run sandbox:logs' to view logs"
}

# Function to stop the sandbox
stop() {
    print_status "Stopping JewGo Sandbox..."
    docker-compose -f docker-compose.sandbox.yml down
    print_success "Sandbox stopped successfully"
}

# Function to restart the sandbox
restart() {
    print_status "Restarting JewGo Sandbox..."
    stop
    start
}

# Function to show logs
logs() {
    print_status "Showing sandbox logs..."
    docker-compose -f docker-compose.sandbox.yml logs -f
}

# Function to rebuild the sandbox
rebuild() {
    print_status "Rebuilding JewGo Sandbox..."
    check_docker
    check_requirements
    
    # Stop existing containers
    docker-compose -f docker-compose.sandbox.yml down
    
    # Rebuild images
    docker-compose -f docker-compose.sandbox.yml build --no-cache
    
    # Start services
    docker-compose -f docker-compose.sandbox.yml up -d
    
    print_success "Sandbox rebuilt and started successfully!"
}

# Function to run tests
test() {
    print_status "Running sandbox tests..."
    check_requirements
    
    cd frontend/sandbox
    npm run test
    cd ../..
}

# Function to run visual tests
visual_test() {
    print_status "Running visual regression tests..."
    check_requirements
    
    cd frontend/sandbox
    npm run visual-test
    cd ../..
}

# Function to clean up
cleanup() {
    print_status "Cleaning up sandbox..."
    
    # Stop containers
    docker-compose -f docker-compose.sandbox.yml down
    
    # Remove volumes
    docker-compose -f docker-compose.sandbox.yml down -v
    
    # Remove images
    docker rmi $(docker images -q jewgo-sandbox) 2>/dev/null || true
    
    # Clean node_modules
    if [ -d "frontend/sandbox/node_modules" ]; then
        rm -rf frontend/sandbox/node_modules
    fi
    
    print_success "Sandbox cleanup completed"
}

# Function to show status
status() {
    print_status "Sandbox Status:"
    
    if docker-compose -f docker-compose.sandbox.yml ps | grep -q "Up"; then
        print_success "Sandbox is running"
        docker-compose -f docker-compose.sandbox.yml ps
    else
        print_warning "Sandbox is not running"
    fi
}

# Function to show help
help() {
    echo "JewGo Sandbox Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the sandbox environment"
    echo "  stop        Stop the sandbox environment"
    echo "  restart     Restart the sandbox environment"
    echo "  logs        Show sandbox logs"
    echo "  rebuild     Rebuild and restart the sandbox"
    echo "  test        Run sandbox tests"
    echo "  visual-test Run visual regression tests"
    echo "  install     Install sandbox dependencies"
    echo "  cleanup     Clean up sandbox (stop, remove containers, images, and node_modules)"
    echo "  status      Show sandbox status"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start the sandbox"
    echo "  $0 logs      # View logs"
    echo "  $0 test      # Run tests"
}

# Main script logic
case "${1:-help}" in
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
    rebuild)
        rebuild
        ;;
    test)
        test
        ;;
    visual-test)
        visual_test
        ;;
    install)
        install_deps
        ;;
    cleanup)
        cleanup
        ;;
    status)
        status
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac
