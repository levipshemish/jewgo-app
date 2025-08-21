#!/bin/bash

# Production Testing Script for JewGo App
# This script sets up a production-level Docker environment for manual testing

set -e

echo "🏭 Starting Production Testing Environment for JewGo App"
echo "========================================================"

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

# Function to check environment variables
check_env() {
    print_status "Checking production environment variables..."
    
    if [ ! -f .env ]; then
        print_error ".env file not found"
        exit 1
    fi
    
    # Check for required environment variables
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "DATABASE_URL"
        "UPSTASH_REDIS_REST_URL"
        "UPSTASH_REDIS_REST_TOKEN"
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
        print_error "Missing environment variables: ${missing_vars[*]}"
        print_error "Please add these to your .env file before testing"
        exit 1
    fi
}

# Function to clean up containers
cleanup() {
    print_status "Cleaning up production test containers..."
    docker-compose -f docker-compose.production-test.yml down --remove-orphans 2>/dev/null || true
    print_success "Cleanup completed"
}

# Function to build and start production environment
start_production_test() {
    print_status "Building and starting production environment..."
    echo "This will take a few minutes to build the production image..."
    
    if docker-compose -f docker-compose.production-test.yml up --build -d; then
        print_success "Production environment started successfully"
        
        # Wait for container to be ready
        print_status "Waiting for container to be ready..."
        sleep 20
        
        # Test health endpoint
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Health check passed"
        else
            print_warning "Health check failed - container may still be starting"
        fi
        
        print_success "Production environment is ready for testing!"
        echo ""
        echo "🌐 Access your production test environment at:"
        echo "   http://localhost:3000"
        echo ""
        echo "📋 Test the following pages:"
        echo "   • Home: http://localhost:3000"
        echo "   • Stores: http://localhost:3000/stores"
        echo "   • Mikva: http://localhost:3000/mikva"
        echo "   • Shuls: http://localhost:3000/shuls"
        echo "   • Eatery: http://localhost:3000/eatery"
        echo ""
        echo "🔍 Monitor the container logs with:"
        echo "   docker-compose -f docker-compose.production-test.yml logs -f"
        echo ""
        echo "🛑 Stop the environment when done with:"
        echo "   docker-compose -f docker-compose.production-test.yml down"
        echo ""
        
        return 0
    else
        print_error "Failed to start production environment"
        return 1
    fi
}

# Function to run automated tests
run_automated_tests() {
    print_status "Running automated production tests..."
    
    # Test main pages
    pages=(
        "http://localhost:3000"
        "http://localhost:3000/stores"
        "http://localhost:3000/mikva"
        "http://localhost:3000/shuls"
        "http://localhost:3000/eatery"
    )
    
    failed_pages=()
    for page in "${pages[@]}"; do
        if curl -f "$page" > /dev/null 2>&1; then
            print_success "✓ $page loads"
        else
            print_error "✗ $page failed to load"
            failed_pages+=("$page")
        fi
    done
    
    if [ ${#failed_pages[@]} -eq 0 ]; then
        print_success "All pages loaded successfully"
    else
        print_error "Some pages failed to load: ${failed_pages[*]}"
        return 1
    fi
}

# Function to show testing checklist
show_testing_checklist() {
    echo ""
    echo "📋 PRODUCTION TESTING CHECKLIST"
    echo "================================"
    echo ""
    echo "✅ Automated Tests:"
    echo "   [ ] All pages load without errors"
    echo "   [ ] Health endpoint responds correctly"
    echo "   [ ] Container starts successfully"
    echo ""
    echo "🔍 Manual Tests:"
    echo "   [ ] Home page displays correctly"
    echo "   [ ] Navigation works between pages"
    echo "   [ ] Stores page shows coming soon content"
    echo "   [ ] Mikva page shows coming soon content"
    echo "   [ ] Shuls page shows coming soon content"
    echo "   [ ] Eatery page works as expected"
    echo "   [ ] Responsive design works on mobile"
    echo "   [ ] No console errors in browser"
    echo "   [ ] Performance is acceptable"
    echo ""
    echo "🔧 Technical Tests:"
    echo "   [ ] Environment variables loaded correctly"
    echo "   [ ] Database connections work"
    echo "   [ ] API endpoints respond"
    echo "   [ ] Authentication flows work (if applicable)"
    echo "   [ ] Rate limiting works (if applicable)"
    echo ""
    echo "📊 Performance Tests:"
    echo "   [ ] Page load times are acceptable"
    echo "   [ ] Memory usage is reasonable"
    echo "   [ ] CPU usage is stable"
    echo ""
}

# Main execution
main() {
    echo "Starting production testing at $(date)"
    echo ""
    
    # Check Docker status
    check_docker
    
    # Check environment variables
    check_env
    
    # Clean up any existing containers
    cleanup
    
    # Start production environment
    if start_production_test; then
        print_success "Production environment is ready for manual testing!"
        
        # Run automated tests
        if run_automated_tests; then
            print_success "Automated tests passed"
        else
            print_warning "Some automated tests failed - check manually"
        fi
        
        # Show testing checklist
        show_testing_checklist
        
        echo ""
        echo "🎯 PRODUCTION TESTING READY"
        echo "==========================="
        echo "Your production environment is running and ready for manual testing."
        echo "Complete the checklist above, then give permission to push to git."
        echo ""
        
    else
        print_error "Failed to start production environment"
        cleanup
        exit 1
    fi
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
