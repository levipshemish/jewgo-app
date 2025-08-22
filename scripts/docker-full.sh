#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_header() {
    echo -e "${PURPLE}[JEWGO DOCKER]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! docker-compose --version > /dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
}

# Function to build all services
build() {
    print_header "Building all Docker services..."
    cd "$PROJECT_ROOT"
    check_docker
    check_docker_compose
    
    print_status "Building backend..."
    docker-compose -f docker-compose.optimized.yml build backend
    
    print_status "Building frontend..."
    docker-compose -f docker-compose.optimized.yml build frontend
    
    print_success "All services built successfully"
}

# Function to start all services
start() {
    print_header "Starting all JewGo services..."
    cd "$PROJECT_ROOT"
    check_docker
    check_docker_compose
    
    # Stop any existing containers
    docker-compose -f docker-compose.optimized.yml down
    
    # Start all services
    docker-compose -f docker-compose.optimized.yml up -d
    
    print_success "All services started successfully"
    print_status "Services available at:"
    print_status "  - Frontend: http://localhost:3001"
    print_status "  - Backend:  http://localhost:5001"
    print_status "  - Database: localhost:5432"
    print_status "  - Redis:    localhost:6379"
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_health
}

# Function to stop all services
stop() {
    print_header "Stopping all JewGo services..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml down
    print_success "All services stopped"
}

# Function to restart all services
restart() {
    print_header "Restarting all JewGo services..."
    stop
    start
}

# Function to show logs
logs() {
    print_header "Showing service logs..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml logs -f
}

# Function to show logs for specific service
logs_service() {
    local service=$1
    print_header "Showing logs for $service..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml logs -f "$service"
}

# Function to show status
status() {
    print_header "Checking service status..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml ps
    
    echo ""
    print_status "Service URLs:"
    print_status "  - Frontend: http://localhost:3001"
    print_status "  - Backend:  http://localhost:5001"
    print_status "  - Database: localhost:5432"
    print_status "  - Redis:    localhost:6379"
}

# Function to check health of services
check_health() {
    print_status "Checking service health..."
    
    # Check backend health
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check frontend
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend health check failed"
    fi
    
    # Check database
    if docker-compose -f docker-compose.optimized.yml exec -T postgres pg_isready -U jewgo_user > /dev/null 2>&1; then
        print_success "Database is ready"
    else
        print_warning "Database health check failed"
    fi
}

# Function to open shell in specific service
shell() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service: backend, frontend, postgres, or redis"
        exit 1
    fi
    
    print_header "Opening shell in $service..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml exec "$service" /bin/bash
}

# Function to run database migrations
migrate() {
    print_header "Running database migrations..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml exec backend python -m alembic upgrade head
    print_success "Migrations completed"
}

# Function to seed database
seed() {
    print_header "Seeding database..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.optimized.yml exec backend python scripts/add_mock_marketplace_data.py
    print_success "Database seeded"
}

# Function to run tests
test() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service: backend or frontend"
        exit 1
    fi
    
    print_header "Running tests for $service..."
    cd "$PROJECT_ROOT"
    
    if [ "$service" = "backend" ]; then
        docker-compose -f docker-compose.optimized.yml exec backend python -m pytest
    elif [ "$service" = "frontend" ]; then
        docker-compose -f docker-compose.optimized.yml exec frontend pnpm test
    fi
}

# Function to clean up everything
cleanup() {
    print_header "Cleaning up all Docker resources..."
    cd "$PROJECT_ROOT"
    
    # Stop and remove containers
    docker-compose -f docker-compose.optimized.yml down -v --remove-orphans
    
    # Remove images
    docker rmi $(docker images -q jewgo-app-backend) 2>/dev/null || true
    docker rmi $(docker images -q jewgo-app-frontend) 2>/dev/null || true
    
    # Clean up volumes
    docker volume prune -f
    
    # Clean up networks
    docker network prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Usage: $0 {build|start|stop|restart|logs|status|shell|migrate|seed|test|cleanup|help}"
    echo ""
    echo "Commands:"
    echo "  build                    - Build all Docker containers"
    echo "  start                    - Start all services"
    echo "  stop                     - Stop all services"
    echo "  restart                  - Restart all services"
    echo "  logs                     - Show all service logs"
    echo "  logs <service>           - Show logs for specific service"
    echo "  status                   - Show service status"
    echo "  shell <service>          - Open shell in specific service"
    echo "  migrate                  - Run database migrations"
    echo "  seed                     - Seed database with sample data"
    echo "  test <service>           - Run tests for backend or frontend"
    echo "  cleanup                  - Clean up all Docker resources"
    echo "  help                     - Show this help message"
    echo ""
    echo "Services:"
    echo "  - frontend (Next.js on port 3000)"
    echo "  - backend (Flask on port 5000)"
    echo "  - postgres (Database on port 5432)"
    echo "  - redis (Cache on port 6379)"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start all services"
    echo "  $0 logs frontend         # Show frontend logs"
    echo "  $0 shell backend         # Open shell in backend"
    echo "  $0 test backend          # Run backend tests"
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
        if [ -n "$2" ]; then
            logs_service "$2"
        else
            logs
        fi
        ;;
    status)
        status
        ;;
    shell)
        shell "$2"
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    test)
        test "$2"
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
