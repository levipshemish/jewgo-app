#!/bin/bash

# Fix Deployment Issues Script
# This script addresses the critical deployment failures identified in the logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Server configuration
SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found at: $SSH_KEY"
    exit 1
fi

# Set proper permissions for SSH key
chmod 600 "$SSH_KEY"

print_status "🔧 Starting deployment issues resolution..."

# Function to execute commands on server
execute_on_server() {
    local cmd="$1"
    local description="$2"
    
    print_status "$description"
    if ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "$cmd" 2>&1; then
        print_success "$description completed"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Step 1: Check current server status
print_status "📋 Checking current server status..."
execute_on_server "
    echo '=== Docker Containers ==='
    docker ps -a --filter 'name=jewgo'
    echo
    echo '=== Docker Images ==='
    docker images | grep -E '(jewgo|REPOSITORY)'
    echo
    echo '=== Nginx Status ==='
    sudo systemctl status nginx --no-pager -l || echo 'Nginx service check failed'
    echo
    echo '=== Port Usage ==='
    sudo netstat -tlnp | grep -E ':(80|443|5000)' || echo 'No processes found on ports 80, 443, 5000'
" "Checking server status"

# Step 2: Stop conflicting services and containers
print_status "🛑 Stopping conflicting services..."
execute_on_server "
    # Stop backend containers
    docker stop jewgo_backend 2>/dev/null || echo 'Backend container not running'
    docker rm jewgo_backend 2>/dev/null || echo 'Backend container not found'
    
    # Stop Nginx if running
    sudo systemctl stop nginx 2>/dev/null || echo 'Nginx not running via systemctl'
    sudo pkill nginx 2>/dev/null || echo 'No nginx processes found'
    
    # Check what's using ports 80 and 443
    echo 'Checking port usage after stopping services:'
    sudo netstat -tlnp | grep -E ':(80|443)' || echo 'Ports 80 and 443 are now free'
" "Stopping conflicting services"

# Step 3: Clean up Docker resources
print_status "🧹 Cleaning up Docker resources..."
execute_on_server "
    # Remove old backend images
    docker images | grep 'jewgo-app-backend' | awk '{print \$3}' | xargs -r docker rmi -f || echo 'No old backend images to remove'
    
    # Clean up dangling images and build cache
    docker image prune -f
    docker builder prune -f
    
    echo 'Docker cleanup completed'
" "Cleaning up Docker resources"

# Step 4: Test Docker build locally on server
print_status "🔨 Testing Docker build with fixed Dockerfile..."
execute_on_server "
    cd $SERVER_PATH/backend
    
    # Verify the fixed Dockerfile exists
    if [ -f Dockerfile.optimized ]; then
        echo 'Found Dockerfile.optimized, testing build...'
        
        # Test build (don't use cache to ensure fresh build)
        docker build --no-cache -f Dockerfile.optimized -t jewgo-app-backend-test . || {
            echo 'Docker build failed, checking requirements...'
            echo 'Contents of requirements-optimized.txt:'
            head -20 requirements-optimized.txt || echo 'requirements-optimized.txt not found'
            exit 1
        }
        
        echo 'Docker build test successful'
        
        # Tag as the main image
        docker tag jewgo-app-backend-test jewgo-app-backend:latest
        
        echo 'Image tagged successfully'
    else
        echo 'Dockerfile.optimized not found, using standard Dockerfile'
        docker build --no-cache -t jewgo-app-backend . || exit 1
    fi
" "Testing Docker build"

# Step 5: Start backend container
print_status "🚀 Starting backend container..."
execute_on_server "
    cd $SERVER_PATH
    
    # Verify image exists
    if ! docker image inspect jewgo-app-backend:latest >/dev/null 2>&1; then
        echo 'Backend image not found after build'
        exit 1
    fi
    
    # Create network if it doesn't exist
    docker network create jewgo-app_default 2>/dev/null || echo 'Network already exists'
    
    # Start backend container
    docker run -d \
      --name jewgo_backend \
      --network jewgo-app_default \
      --network-alias backend \
      -p 5000:5000 \
      --env-file .env \
      -e PGHOST=129.80.190.110 \
      -e PGPORT=5432 \
      -e PGDATABASE=jewgo_db \
      -e PGUSER=app_user \
      -e PGPASSWORD=Jewgo123 \
      -e DATABASE_URL=postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db \
      -e REDIS_URL=redis://jewgo_redis:6379/0 \
      -e REDIS_HOST=jewgo_redis \
      -e REDIS_PORT=6379 \
      -e REDIS_DB=0 \
      -e REDIS_PASSWORD= \
      -e DB_POOL_SIZE=10 \
      -e DB_MAX_OVERFLOW=20 \
      -e DB_POOL_TIMEOUT=60 \
      -e DB_POOL_RECYCLE=300 \
      -w /app \
      jewgo-app-backend \
      gunicorn --config config/gunicorn.conf.py wsgi:application
    
    # Wait for container to start
    sleep 10
    
    # Check container status
    if docker inspect -f '{{.State.Running}}' jewgo_backend 2>/dev/null | grep -q true; then
        echo 'Backend container is running'
        docker logs --tail 20 jewgo_backend
    else
        echo 'Backend container failed to start'
        docker logs jewgo_backend
        exit 1
    fi
" "Starting backend container"

# Step 6: Test backend health
print_status "🏥 Testing backend health..."
execute_on_server "
    # Wait a bit more for the backend to fully initialize
    sleep 15
    
    # Test health endpoint directly
    if curl -f -s http://localhost:5000/healthz > /dev/null; then
        echo 'Backend health check passed'
        curl -s http://localhost:5000/healthz | head -5
    else
        echo 'Backend health check failed'
        echo 'Container logs:'
        docker logs --tail 30 jewgo_backend
        exit 1
    fi
" "Testing backend health"

# Step 7: Fix and restart Nginx
print_status "🌐 Configuring and starting Nginx..."
execute_on_server "
    # Check Nginx configuration
    if sudo nginx -t; then
        echo 'Nginx configuration is valid'
    else
        echo 'Nginx configuration has errors'
        sudo nginx -t
        exit 1
    fi
    
    # Start Nginx
    if sudo systemctl start nginx; then
        echo 'Nginx started successfully'
        sudo systemctl status nginx --no-pager -l
    else
        echo 'Failed to start Nginx, checking for conflicts'
        sudo netstat -tlnp | grep -E ':(80|443)'
        
        # Try to identify what's using the ports
        echo 'Processes using port 80:'
        sudo lsof -i :80 || echo 'No processes found on port 80'
        echo 'Processes using port 443:'
        sudo lsof -i :443 || echo 'No processes found on port 443'
        
        exit 1
    fi
" "Configuring and starting Nginx"

# Step 8: Test full stack
print_status "🧪 Testing full stack connectivity..."
execute_on_server "
    # Test direct backend
    echo 'Testing direct backend connection:'
    curl -f -s http://localhost:5000/healthz || echo 'Direct backend test failed'
    
    # Test through Nginx (if available)
    if curl -f -s https://api.jewgo.app/healthz > /dev/null 2>&1; then
        echo 'HTTPS health check passed'
    else
        echo 'HTTPS health check failed, trying HTTP'
        if curl -f -s http://api.jewgo.app/healthz > /dev/null 2>&1; then
            echo 'HTTP health check passed'
        else
            echo 'Both HTTP and HTTPS health checks failed'
            echo 'This might be a DNS or SSL issue'
        fi
    fi
" "Testing full stack connectivity"

# Step 9: Final status check
print_status "📊 Final deployment status..."
execute_on_server "
    echo '=== Final Status ==='
    echo 'Docker containers:'
    docker ps --filter 'name=jewgo'
    echo
    echo 'Nginx status:'
    sudo systemctl is-active nginx || echo 'Nginx not active'
    echo
    echo 'Port usage:'
    sudo netstat -tlnp | grep -E ':(80|443|5000)' || echo 'No services on monitored ports'
    echo
    echo 'Backend logs (last 10 lines):'
    docker logs --tail 10 jewgo_backend 2>/dev/null || echo 'No backend logs available'
" "Final status check"

print_success "🎉 Deployment issues resolution completed!"
print_status ""
print_status "Next steps:"
print_status "1. Test the API endpoints: curl https://api.jewgo.app/healthz"
print_status "2. Check backend logs: docker logs -f jewgo_backend"
print_status "3. Monitor Nginx logs: sudo tail -f /var/log/nginx/access.log"
print_status "4. If issues persist, run the main deployment script: ./scripts/deploy-to-server.sh"
