#!/bin/bash

# 🚀 JewGo Cloud Deployment Script
# This script automates deployment to Neon, Supabase, Vercel, and Render

set -e  # Exit on any error

echo "🚀 JewGo Cloud Deployment Script"
echo "=================================="

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

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    required_vars=("DATABASE_URL" "REDIS_URL" "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Environment variable $var is not set"
            echo "Please set the required environment variables before running this script."
            exit 1
        else
            print_success "$var is set"
        fi
    done
}

# Run database migration
run_migration() {
    print_status "Running database migration on Neon..."
    
    cd backend
    
    if python scripts/run_cloud_migration.py; then
        print_success "Database migration completed successfully"
    else
        print_error "Database migration failed"
        exit 1
    fi
    
    cd ..
}

# Deploy backend to Render
deploy_backend() {
    print_status "Deploying backend to Render..."
    
    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        print_error "render.yaml not found"
        exit 1
    fi
    
    # Commit changes
    git add .
    git commit -m "Deploy backend with cloud configuration" || {
        print_warning "No changes to commit"
    }
    
    # Push to GitHub (Render will auto-deploy)
    git push origin main
    
    print_success "Backend deployment initiated on Render"
    print_status "Check Render dashboard for deployment status"
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    cd frontend
    
    # Check if vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_error "vercel.json not found"
        exit 1
    fi
    
    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        vercel --prod --yes
        print_success "Frontend deployed to Vercel"
    else
        print_warning "Vercel CLI not found. Please deploy manually:"
        echo "cd frontend && vercel --prod"
    fi
    
    cd ..
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Wait a bit for services to be ready
    sleep 10
    
    # Test backend health
    if [ -n "$RENDER_BACKEND_URL" ]; then
        print_status "Testing backend health..."
        if curl -f "$RENDER_BACKEND_URL/api/health" > /dev/null 2>&1; then
            print_success "Backend health check passed"
        else
            print_warning "Backend health check failed"
        fi
    fi
    
    # Test frontend
    if [ -n "$VERCEL_FRONTEND_URL" ]; then
        print_status "Testing frontend..."
        if curl -f "$VERCEL_FRONTEND_URL" > /dev/null 2>&1; then
            print_success "Frontend is accessible"
        else
            print_warning "Frontend check failed"
        fi
    fi
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    echo
    
    # Check environment variables
    check_env_vars
    echo
    
    # Run database migration
    run_migration
    echo
    
    # Deploy backend
    deploy_backend
    echo
    
    # Deploy frontend
    deploy_frontend
    echo
    
    # Test deployment
    test_deployment
    echo
    
    print_success "Deployment process completed!"
    echo
    echo "🎉 Your JewGo app is now deployed to the cloud!"
    echo
    echo "Next steps:"
    echo "1. Monitor deployment status in Render and Vercel dashboards"
    echo "2. Test your application endpoints"
    echo "3. Set up monitoring and alerts"
    echo "4. Configure custom domains if needed"
}

# Check if script is run with arguments
if [ "$1" = "migrate" ]; then
    check_env_vars
    run_migration
elif [ "$1" = "backend" ]; then
    check_env_vars
    deploy_backend
elif [ "$1" = "frontend" ]; then
    check_env_vars
    deploy_frontend
elif [ "$1" = "test" ]; then
    test_deployment
elif [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  migrate   - Run database migration only"
    echo "  backend   - Deploy backend to Render only"
    echo "  frontend  - Deploy frontend to Vercel only"
    echo "  test      - Test deployment endpoints"
    echo "  help      - Show this help message"
    echo
    echo "If no command is provided, runs the full deployment process."
    exit 0
else
    # Run full deployment
    main
fi
