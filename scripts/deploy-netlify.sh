#!/bin/bash

# Netlify Deployment Script for JewGo App
# This script handles the complete deployment process for Netlify

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment variables
validate_env_vars() {
    print_status "Validating environment variables..."
    
    local required_vars=(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        "NEXT_PUBLIC_BACKEND_URL"
        "DATABASE_URL"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_success "All required environment variables are set"
}

# Function to check Netlify CLI
check_netlify_cli() {
    if ! command_exists netlify; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    else
        print_success "Netlify CLI is installed"
    fi
}

# Function to build the project
build_project() {
    print_status "Building the project..."
    
    cd frontend
    
    # Clean previous build
    print_status "Cleaning previous build..."
    rm -rf .next
    rm -rf node_modules/.cache
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci --include=dev
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    
    # Build the project
    print_status "Building Next.js application..."
    npm run build
    
    cd ..
    
    print_success "Build completed successfully"
}

# Function to deploy to Netlify
deploy_to_netlify() {
    print_status "Deploying to Netlify..."
    
    cd frontend
    
    # Check if we're in a Netlify environment
    if [[ -n "$NETLIFY" ]]; then
        print_status "Running in Netlify environment - build will be handled by Netlify"
        return 0
    fi
    
    # Deploy using Netlify CLI
    if command_exists netlify; then
        print_status "Deploying using Netlify CLI..."
        
        # Check if site is linked
        if ! netlify status 2>/dev/null; then
            print_warning "Site not linked. Please run: netlify link"
            return 1
        fi
        
        # Deploy
        netlify deploy --prod --dir=.next
        print_success "Deployment completed successfully"
    else
        print_error "Netlify CLI not available"
        return 1
    fi
    
    cd ..
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    cd frontend
    
    # Run type checking
    print_status "Running TypeScript type checking..."
    npm run type-check
    
    # Run linting
    print_status "Running ESLint..."
    npm run lint
    
    # Run tests
    print_status "Running tests..."
    npm run test:ci
    
    cd ..
    
    print_success "All tests passed"
}

# Function to validate build output
validate_build() {
    print_status "Validating build output..."
    
    cd frontend
    
    if [[ ! -d ".next" ]]; then
        print_error "Build output directory .next not found"
        return 1
    fi
    
    if [[ ! -f ".next/static/chunks/pages/_app-*.js" ]]; then
        print_error "Build output appears incomplete"
        return 1
    fi
    
    cd ..
    
    print_success "Build output validation passed"
}

# Function to check for common issues
check_common_issues() {
    print_status "Checking for common deployment issues..."
    
    cd frontend
    
    # Check for multiple lockfiles
    if [[ -f "package-lock.json" && -f "yarn.lock" ]]; then
        print_warning "Multiple lockfiles detected. Consider removing one."
    fi
    
    # Check for large node_modules
    if [[ -d "node_modules" ]]; then
        local size=$(du -sh node_modules | cut -f1)
        print_status "node_modules size: $size"
    fi
    
    # Check for environment files
    if [[ -f ".env.local" ]]; then
        print_warning ".env.local found - make sure sensitive data is not committed"
    fi
    
    cd ..
}

# Main deployment function
main() {
    print_status "Starting Netlify deployment process..."
    
    # Check prerequisites
    check_netlify_cli
    
    # Validate environment
    validate_env_vars
    
    # Check for common issues
    check_common_issues
    
    # Run tests (optional - can be skipped for faster deployment)
    if [[ "$1" != "--skip-tests" ]]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi
    
    # Build the project
    build_project
    
    # Validate build output
    validate_build
    
    # Deploy to Netlify
    deploy_to_netlify
    
    print_success "Netlify deployment process completed!"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --skip-tests    Skip running tests for faster deployment"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Environment Variables Required:"
        echo "  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        echo "  NEXT_PUBLIC_BACKEND_URL"
        echo "  DATABASE_URL"
        echo "  NEXTAUTH_URL"
        echo "  NEXTAUTH_SECRET"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
