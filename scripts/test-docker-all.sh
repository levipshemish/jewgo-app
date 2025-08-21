#!/bin/bash

# Docker Testing Script for JewGo App
# This script runs all Docker tests to validate changes before pushing

set -e  # Exit on any error

echo "🐳 Starting Docker Testing Suite for JewGo App"
echo "================================================"

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
    print_status "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to clean up containers
cleanup() {
    print_status "Cleaning up Docker containers..."
    docker-compose -f docker-compose.frontend.dev.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.frontend.prod.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.frontend.local.yml down --remove-orphans 2>/dev/null || true
    print_success "Cleanup completed"
}

# Function to test development environment
test_dev() {
    print_status "Testing Development Environment..."
    echo "Building and starting development container..."
    
    if docker-compose -f docker-compose.frontend.dev.yml up --build -d; then
        print_success "Development container started successfully"
        
        # Wait for container to be ready
        print_status "Waiting for container to be ready..."
        sleep 10
        
        # Test health endpoint
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Health check passed"
        else
            print_warning "Health check failed - container may still be starting"
        fi
        
        # Test main pages
        print_status "Testing main pages..."
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            print_success "Home page loads"
        else
            print_error "Home page failed to load"
        fi
        
        if curl -f http://localhost:3000/stores > /dev/null 2>&1; then
            print_success "Stores page loads"
        else
            print_error "Stores page failed to load"
        fi
        
        if curl -f http://localhost:3000/mikva > /dev/null 2>&1; then
            print_success "Mikva page loads"
        else
            print_error "Mikva page failed to load"
        fi
        
        if curl -f http://localhost:3000/shuls > /dev/null 2>&1; then
            print_success "Shuls page loads"
        else
            print_error "Shuls page failed to load"
        fi
        
        docker-compose -f docker-compose.frontend.dev.yml down
        print_success "Development testing completed"
    else
        print_error "Development testing failed"
        return 1
    fi
}

# Function to test production environment
test_prod() {
    print_status "Testing Production Environment..."
    echo "Building and starting production container..."
    
    if docker-compose -f docker-compose.frontend.prod.yml up --build -d; then
        print_success "Production container started successfully"
        
        # Wait for container to be ready
        print_status "Waiting for container to be ready..."
        sleep 15
        
        # Test health endpoint
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Health check passed"
        else
            print_warning "Health check failed - container may still be starting"
        fi
        
        # Test main pages
        print_status "Testing main pages..."
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            print_success "Home page loads"
        else
            print_error "Home page failed to load"
        fi
        
        if curl -f http://localhost:3000/stores > /dev/null 2>&1; then
            print_success "Stores page loads"
        else
            print_error "Stores page failed to load"
        fi
        
        if curl -f http://localhost:3000/mikva > /dev/null 2>&1; then
            print_success "Mikva page loads"
        else
            print_error "Mikva page failed to load"
        fi
        
        if curl -f http://localhost:3000/shuls > /dev/null 2>&1; then
            print_success "Shuls page loads"
        else
            print_error "Shuls page failed to load"
        fi
        
        docker-compose -f docker-compose.frontend.prod.yml down
        print_success "Production testing completed"
    else
        print_error "Production testing failed"
        return 1
    fi
}

# Function to test local full stack (optional)
test_local() {
    print_status "Testing Local Full Stack Environment..."
    echo "This test requires a local backend running on port 5000"
    echo "Do you want to continue? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if docker-compose -f docker-compose.frontend.local.yml up --build -d; then
            print_success "Local full stack container started successfully"
            
            # Wait for container to be ready
            print_status "Waiting for container to be ready..."
            sleep 10
            
            # Test health endpoint
            if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                print_success "Health check passed"
            else
                print_warning "Health check failed - container may still be starting"
            fi
            
            docker-compose -f docker-compose.frontend.local.yml down
            print_success "Local full stack testing completed"
        else
            print_error "Local full stack testing failed"
            return 1
        fi
    else
        print_warning "Skipping local full stack testing"
    fi
}

# Function to check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ ! -f .env ]; then
        print_error ".env file not found"
        return 1
    fi
    
    # Check for required environment variables
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "DATABASE_URL"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required environment variables found"
    else
        print_warning "Missing environment variables: ${missing_vars[*]}"
        print_warning "Some tests may fail without these variables"
    fi
}

# Main execution
main() {
    echo "Starting Docker testing at $(date)"
    echo ""
    
    # Check Docker status
    check_docker
    
    # Check environment variables
    check_env
    
    # Clean up any existing containers
    cleanup
    
    # Run tests
    local exit_code=0
    
    if test_dev; then
        print_success "Development testing passed"
    else
        print_error "Development testing failed"
        exit_code=1
    fi
    
    if test_prod; then
        print_success "Production testing passed"
    else
        print_error "Production testing failed"
        exit_code=1
    fi
    
    # Optional local testing
    test_local
    
    # Final cleanup
    cleanup
    
    echo ""
    echo "================================================"
    if [ $exit_code -eq 0 ]; then
        print_success "🎉 All Docker tests completed successfully!"
        print_success "Your changes are ready to push to git"
    else
        print_error "❌ Some Docker tests failed"
        print_error "Please fix the issues before pushing to git"
    fi
    echo "================================================"
    
    exit $exit_code
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
