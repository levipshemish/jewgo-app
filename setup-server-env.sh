#!/bin/bash

# JewGo Backend Server Environment Setup Script
# This script helps set up the environment on your VPS server

set -e

# Configuration
VPS_USER="ubuntu"
VPS_HOST="141.148.50.111"
VPS_PATH="/srv/jewgo-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 JewGo Backend Server Environment Setup${NC}"
echo "================================================"

# Test SSH connection
test_connection() {
    echo -e "${YELLOW}Testing SSH connection to ${VPS_HOST}...${NC}"
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} exit 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        return 1
    fi
}

# Setup environment file on server
setup_environment() {
    echo -e "${YELLOW}Setting up environment file on server...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /srv/jewgo-backend
        
        # Copy the production environment file
        if [ -f "env.server.production" ]; then
            cp env.server.production .env
            echo "✅ Environment file created from env.server.production"
        else
            echo "❌ env.server.production not found, creating from template"
            cp env.production.template .env
        fi
        
        # Show the current environment file
        echo ""
        echo "=== Current .env file ==="
        cat .env | head -20
        echo "..."
        
        echo ""
        echo "⚠️  IMPORTANT: Please review and update the .env file with your actual values:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_SERVICE_ROLE_KEY" 
        echo "   - SUPABASE_JWT_SECRET"
        echo "   - CORS_ORIGINS"
        echo "   - Any other missing values"
        echo ""
        echo "Edit with: nano .env"
EOF
    
    echo -e "${GREEN}✅ Environment setup completed${NC}"
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting Docker services...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /srv/jewgo-backend
        
        # Pull latest changes
        git pull origin main
        
        # Build and start services
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        
        # Show status
        echo ""
        echo "=== Docker Services Status ==="
        docker-compose ps
        
        echo ""
        echo "=== Service Logs ==="
        docker-compose logs --tail=10 backend
EOF
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Test deployment
test_deployment() {
    echo -e "${YELLOW}Testing deployment...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /srv/jewgo-backend
        
        echo "=== Health Check ==="
        curl -s http://localhost:8000/api/health || echo "Health check failed"
        
        echo ""
        echo "=== Redis Connection Test ==="
        docker-compose exec -T backend python -c "
import redis
try:
    r = redis.Redis(
        host='redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com',
        port=10768,
        db=0,
        username='default',
        password='p4El96DKlpczWdIIkDelvNUC8JBRm83r',
        decode_responses=True
    )
    print('✅ Redis connection successful:', r.ping())
except Exception as e:
    print('❌ Redis connection failed:', str(e))
"
EOF
    
    echo -e "${GREEN}✅ Deployment test completed${NC}"
}

# Main setup flow
main() {
    echo -e "${BLUE}Starting server environment setup...${NC}"
    
    if ! test_connection; then
        echo -e "${RED}❌ Cannot proceed without SSH access${NC}"
        exit 1
    fi
    
    setup_environment
    
    echo ""
    echo -e "${GREEN}🎉 Environment setup completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. SSH to your VPS: ssh ${VPS_USER}@${VPS_HOST}"
    echo "2. Navigate to: cd ${VPS_PATH}"
    echo "3. Edit environment: nano .env"
    echo "4. Start services: docker-compose up -d"
    echo "5. Check status: docker-compose ps"
    echo ""
    echo -e "${BLUE}Would you like to proceed with starting the services now? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        start_services
        test_deployment
    else
        echo -e "${YELLOW}Services not started. You can start them manually later.${NC}"
    fi
}

# Run main function
main
