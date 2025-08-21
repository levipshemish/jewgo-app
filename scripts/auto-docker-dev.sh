#!/bin/bash
set -e

echo "=== Auto-Docker Development Workflow ==="
echo "This script automatically rebuilds Docker containers when files change"

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build and start development environment
build_dev_environment() {
    print_status "Building development environment..."
    
    # Stop existing containers
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    # Build with no cache for fresh start
    docker-compose -f docker-compose.dev.yml build --no-cache
    
    # Start services
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development environment started!"
    print_status "Frontend available at: http://localhost:3000"
}

# Function to rebuild specific service
rebuild_service() {
    local service=$1
    print_status "Rebuilding $service..."
    
    docker-compose -f docker-compose.dev.yml build --no-cache $service
    docker-compose -f docker-compose.dev.yml up -d $service
    
    print_success "$service rebuilt and restarted!"
}

# Function to watch for file changes and auto-rebuild
watch_and_rebuild() {
    print_status "Starting file watcher for auto-rebuild..."
    print_status "Watching for changes in frontend directory..."
    print_status "Press Ctrl+C to stop watching"
    
    # Use fswatch if available, otherwise use inotifywait
    if command -v fswatch >/dev/null 2>&1; then
        print_status "Using fswatch for file watching"
        fswatch -o ./frontend | while read f; do
            print_warning "File change detected! Rebuilding frontend..."
            rebuild_service frontend-dev
            print_success "Rebuild complete! Changes should be visible at http://localhost:3000"
        done
    elif command -v inotifywait >/dev/null 2>&1; then
        print_status "Using inotifywait for file watching"
        while inotifywait -r -e modify,create,delete,move ./frontend; do
            print_warning "File change detected! Rebuilding frontend..."
            rebuild_service frontend-dev
            print_success "Rebuild complete! Changes should be visible at http://localhost:3000"
        done
    else
        print_warning "No file watcher available. Please install fswatch or inotify-tools for auto-rebuild"
        print_status "You can manually rebuild by running: ./scripts/auto-docker-dev.sh rebuild"
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing logs (Press Ctrl+C to stop)..."
    docker-compose -f docker-compose.dev.yml logs -f
}

# Function to show status
show_status() {
    print_status "Docker containers status:"
    docker-compose -f docker-compose.dev.yml ps
    
    print_status "Container health:"
    docker-compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up development environment..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    docker system prune -f
    print_success "Cleanup complete!"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Build and start development environment"
    echo "  watch     - Start file watcher for auto-rebuild"
    echo "  rebuild   - Rebuild frontend service"
    echo "  logs      - Show container logs"
    echo "  status    - Show container status"
    echo "  stop      - Stop all containers"
    echo "  cleanup   - Stop containers and clean up Docker"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start development environment"
    echo "  $0 watch     # Watch for changes and auto-rebuild"
    echo "  $0 rebuild   # Manually rebuild frontend"
}

# Main script logic
case "${1:-help}" in
    start)
        check_docker
        build_dev_environment
        ;;
    watch)
        check_docker
        watch_and_rebuild
        ;;
    rebuild)
        check_docker
        rebuild_service frontend-dev
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    stop)
        docker-compose -f docker-compose.dev.yml down
        print_success "Containers stopped"
        ;;
    cleanup)
        cleanup
        ;;
    help|*)
        show_help
        ;;
esac
