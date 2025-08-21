#!/bin/bash

# 🕍 JewGo Docker Setup Script
# AI Model: Claude Sonnet 4
# Agent: Cursor AI Assistant

set -e  # Exit on any error

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
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Function to clean up existing containers
cleanup_existing() {
    print_status "Cleaning up existing containers..."
    
    # Stop and remove existing containers
    if docker-compose -f docker-compose.optimized.yml down &> /dev/null; then
        print_success "Stopped existing containers"
    fi
    
    # Remove any dangling containers
    if docker container prune -f &> /dev/null; then
        print_success "Cleaned up dangling containers"
    fi
}

# Function to build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build and start all services
    docker-compose -f docker-compose.optimized.yml up -d --build
    
    print_success "Services started successfully"
}

# Function to wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f docker-compose.optimized.yml exec -T postgres pg_isready -U jewgo_user -d jewgo &> /dev/null; then
            print_success "PostgreSQL is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "PostgreSQL failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if docker-compose -f docker-compose.optimized.yml exec -T redis redis-cli ping &> /dev/null; then
            print_success "Redis is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Redis failed to start within 30 seconds"
        exit 1
    fi
    
    # Wait for Backend
    print_status "Waiting for Backend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:5001/health &> /dev/null; then
            print_success "Backend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Backend failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for Frontend
    print_status "Waiting for Frontend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001 &> /dev/null; then
            print_success "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Frontend failed to start within 60 seconds"
        exit 1
    fi
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check backend health
    if curl -f http://localhost:5001/health &> /dev/null; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3001 &> /dev/null; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        exit 1
    fi
    
    # Check database connection
    if docker-compose -f docker-compose.optimized.yml exec -T postgres pg_isready -U jewgo_user -d jewgo &> /dev/null; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        exit 1
    fi
    
    # Check Redis connection
    if docker-compose -f docker-compose.optimized.yml exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis health check passed"
    else
        print_error "Redis health check failed"
        exit 1
    fi
}

# Function to display service status
show_status() {
    print_status "Service Status:"
    docker-compose -f docker-compose.optimized.yml ps
    
    echo ""
    print_status "Service URLs:"
    echo -e "${GREEN}Frontend:${NC} http://localhost:3001"
    echo -e "${GREEN}Backend API:${NC} http://localhost:5001"
    echo -e "${GREEN}Backend Health:${NC} http://localhost:5001/health"
    echo -e "${GREEN}Database:${NC} localhost:5433"
    echo -e "${GREEN}Redis:${NC} localhost:6380"
    
    echo ""
    print_status "Useful Commands:"
    echo -e "${YELLOW}View logs:${NC} docker-compose -f docker-compose.optimized.yml logs -f"
    echo -e "${YELLOW}Stop services:${NC} docker-compose -f docker-compose.optimized.yml down"
    echo -e "${YELLOW}Restart services:${NC} docker-compose -f docker-compose.optimized.yml restart"
    echo -e "${YELLOW}Rebuild services:${NC} docker-compose -f docker-compose.optimized.yml up -d --build"
}

# Function to run tests
run_tests() {
    print_status "Running basic tests..."
    
    # Test backend API
    if curl -f http://localhost:5001/health | grep -q "healthy"; then
        print_success "Backend API test passed"
    else
        print_error "Backend API test failed"
        exit 1
    fi
    
    # Test frontend accessibility
    if curl -f http://localhost:3001 | grep -q "html"; then
        print_success "Frontend accessibility test passed"
    else
        print_error "Frontend accessibility test failed"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🕍 JewGo Docker Setup Script${NC}"
    echo "=================================="
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Clean up existing containers
    cleanup_existing
    
    # Start services
    start_services
    
    # Wait for services to be ready
    wait_for_services
    
    # Run health checks
    run_health_checks
    
    # Run basic tests
    run_tests
    
    # Show final status
    show_status
    
    echo ""
    print_success "🎉 JewGo application is now running successfully!"
    print_status "You can access the application at http://localhost:3001"
}

# Handle script arguments
case "${1:-}" in
    "stop")
        print_status "Stopping JewGo services..."
        docker-compose -f docker-compose.optimized.yml down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting JewGo services..."
        docker-compose -f docker-compose.optimized.yml restart
        print_success "Services restarted"
        ;;
    "logs")
        print_status "Showing service logs..."
        docker-compose -f docker-compose.optimized.yml logs -f
        ;;
    "status")
        show_status
        ;;
    "clean")
        print_status "Cleaning up Docker resources..."
        docker-compose -f docker-compose.optimized.yml down
        docker container prune -f
        docker image prune -a -f
        docker volume prune -f
        docker builder prune -a -f
        print_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  - Start JewGo services"
        echo "  stop       - Stop JewGo services"
        echo "  restart    - Restart JewGo services"
        echo "  logs       - Show service logs"
        echo "  status     - Show service status"
        echo "  clean      - Clean up Docker resources"
        echo "  help       - Show this help message"
        ;;
    *)
        main
        ;;
esac
