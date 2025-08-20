#!/bin/bash

# Netlify Deployment Script for JewGo App
# This script helps set up and deploy the app to Netlify

set -e

echo "🚀 Starting Netlify deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    print_error "Netlify CLI is not installed. Please install it first:"
    echo "npm install -g netlify-cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "netlify.toml" ]; then
    print_error "netlify.toml not found. Please run this script from the project root."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    print_error "frontend directory not found."
    exit 1
fi

print_status "Checking environment variables..."

# Check for required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
    "NEXT_PUBLIC_BACKEND_URL"
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_warning "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_status "Please set these variables in your Netlify dashboard or use netlify env:set"
fi

# Build the frontend
print_status "Building frontend..."
cd frontend

# Install dependencies
print_status "Installing dependencies..."
npm install

# Validate environment
print_status "Validating environment..."
npm run validate-env

# Build the app
print_status "Building the app..."
npm run build

cd ..

print_status "Build completed successfully!"

# Check if Netlify is already linked
if [ -f ".netlify/state.json" ]; then
    print_status "Netlify project is already linked."
else
    print_warning "Netlify project not linked. Please run:"
    echo "netlify link"
fi

print_status "Deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Netlify dashboard"
echo "2. Run: netlify deploy --prod"
echo "3. Or connect your GitHub repository for automatic deployments"
echo ""
echo "For environment variables, you can use:"
echo "netlify env:set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY your_key_here"
echo "netlify env:set DATABASE_URL your_database_url_here"
echo "netlify env:set NEXTAUTH_SECRET your_secret_here"
