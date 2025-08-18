#!/bin/bash
# JewGo Production Deployment Script
# This script helps with the production deployment process

set -e  # Exit on any error

echo "🚀 JewGo Production Deployment Script"
echo "======================================"

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

# Function to check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    # Load environment variables from .env file
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        print_status "Loaded environment variables from .env file"
    elif [ -f ".env.local" ]; then
        export $(grep -v '^#' .env.local | xargs)
        print_status "Loaded environment variables from .env.local file"
    else
        print_warning "No .env or .env.local file found"
    fi
    
    required_vars=(
        "DATABASE_URL"
        "GOOGLE_PLACES_API_KEY"
        "NEXT_PUBLIC_BACKEND_URL"
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required environment variables are set"
    else
        print_error "Missing environment variables: ${missing_vars[*]}"
        echo "Please set these variables before proceeding with deployment."
        exit 1
    fi
}

# Function to run pre-deployment tests
run_tests() {
    print_status "Running pre-deployment tests..."
    
    if python scripts/test-cli-operations.py; then
        print_success "All tests passed"
    else
        print_error "Some tests failed. Please fix issues before deployment."
        exit 1
    fi
}

# Function to check database health
check_database() {
    print_status "Checking database health..."
    
    if python scripts/jewgo-cli.py database health; then
        print_success "Database is healthy"
    else
        print_error "Database health check failed"
        exit 1
    fi
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    
    if npm run build; then
        print_success "Frontend build successful"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Function to check git status
check_git_status() {
    print_status "Checking git status..."
    
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes. Consider committing them before deployment."
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    else
        print_success "Git repository is clean"
    fi
}

# Function to show deployment checklist
show_checklist() {
    echo
    echo "📋 Production Deployment Checklist"
    echo "=================================="
    echo
    echo "Before proceeding, ensure you have:"
    echo "✅ Set up Neon database account"
    echo "✅ Set up Render account for backend"
    echo "✅ Set up Vercel account for frontend"
    echo "✅ Set up Cloudinary account for images"
    echo "✅ Set up Cronitor account for monitoring"
    echo "✅ Configured all environment variables"
    echo "✅ Tested all functionality locally"
    echo
    read -p "Are you ready to proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
}

# Function to show deployment steps
show_deployment_steps() {
    echo
    echo "🚀 Deployment Steps"
    echo "==================="
    echo
    echo "1. Backend Deployment (Render):"
    echo "   - Connect GitHub repository to Render"
    echo "   - Configure service settings"
    echo "   - Set environment variables"
    echo "   - Deploy automatically on push"
    echo
    echo "2. Frontend Deployment (Vercel):"
    echo "   - Connect GitHub repository to Vercel"
    echo "   - Configure project settings"
    echo "   - Set environment variables"
    echo "   - Deploy automatically on push"
    echo
    echo "3. Post-Deployment Verification:"
    echo "   - Check health endpoints"
    echo "   - Verify functionality"
    echo "   - Set up monitoring"
    echo
    echo "4. Monitoring Setup:"
    echo "   - Configure Cronitor monitors"
    echo "   - Set up automated maintenance"
    echo "   - Configure alerts"
    echo
}

# Function to show environment variable template
show_env_template() {
    echo
    echo "🔧 Environment Variables Template"
    echo "================================"
    echo
    echo "Backend (Render):"
    echo "DATABASE_URL=postgresql://user:password@host:port/database"
    echo "GOOGLE_PLACES_API_KEY=your_google_places_api_key"
    echo "CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name"
    echo "CLOUDINARY_API_KEY=your_cloudinary_api_key"
    echo "CLOUDINARY_API_SECRET=your_cloudinary_api_secret"
    echo "RENDER_ENV=production"
    echo "FLASK_ENV=production"
    echo
    echo "Frontend (Vercel):"
    echo "NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com"
    echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key"
    echo
}

# Main deployment function
main() {
    case "${1:-}" in
        "check")
            print_status "Running pre-deployment checks..."
            check_env_vars
            run_tests
            check_database
            build_frontend
            check_git_status
            print_success "All pre-deployment checks passed!"
            ;;
        "checklist")
            show_checklist
            ;;
        "steps")
            show_deployment_steps
            ;;
        "env")
            show_env_template
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  check     - Run all pre-deployment checks"
            echo "  checklist - Show deployment checklist"
            echo "  steps     - Show deployment steps"
            echo "  env       - Show environment variables template"
            echo "  help      - Show this help message"
            ;;
        *)
            echo "Usage: $0 [command]"
            echo "Run '$0 help' for more information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
