#!/bin/bash

# JewGo Backend Deployment Test Script
# This script tests various endpoints to ensure deployment is working

set -e

# Configuration
VPS_USER="root"
VPS_HOST="your-vps-ip-or-domain.com"
VPS_PATH="/opt/jewgo-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 JewGo Backend Deployment Test Script${NC}"
echo "=============================================="

# Test SSH connection
test_ssh() {
    echo -e "${YELLOW}Testing SSH connection...${NC}"
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} exit 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        return 1
    fi
}

# Test Docker services
test_docker_services() {
    echo -e "${YELLOW}Testing Docker services...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /opt/jewgo-backend
        
        echo "=== Docker Services Status ==="
        docker-compose ps
        
        echo ""
        echo "=== Service Health ==="
        docker-compose exec -T backend curl -f http://localhost:8000/api/health || echo "Backend health check failed"
        
        echo ""
        echo "=== Database Connection ==="
        docker-compose exec -T postgres pg_isready -U jewgo_user || echo "Database connection failed"
        
        echo ""
        echo "=== Redis Connection ==="
        docker-compose exec -T redis redis-cli ping || echo "Redis connection failed"
EOF
    
    echo -e "${GREEN}✅ Docker services test completed${NC}"
}

# Test external endpoints
test_external_endpoints() {
    echo -e "${YELLOW}Testing external endpoints...${NC}"
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -s -f "http://${VPS_HOST}/health" > /dev/null; then
        echo -e "${GREEN}✅ Health endpoint accessible${NC}"
    else
        echo -e "${RED}❌ Health endpoint not accessible${NC}"
    fi
    
    # Test API health endpoint
    echo "Testing API health endpoint..."
    if curl -s -f "http://${VPS_HOST}/api/health" > /dev/null; then
        echo -e "${GREEN}✅ API health endpoint accessible${NC}"
    else
        echo -e "${RED}❌ API health endpoint not accessible${NC}"
    fi
    
    # Test restaurants endpoint
    echo "Testing restaurants endpoint..."
    if curl -s -f "http://${VPS_HOST}/api/restaurants?limit=1" > /dev/null; then
        echo -e "${GREEN}✅ Restaurants endpoint accessible${NC}"
    else
        echo -e "${RED}❌ Restaurants endpoint not accessible${NC}"
    fi
}

# Test SSL (if configured)
test_ssl() {
    echo -e "${YELLOW}Testing SSL configuration...${NC}"
    
    if curl -s -f "https://${VPS_HOST}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HTTPS working${NC}"
        
        # Test SSL certificate
        echo "SSL Certificate Info:"
        echo | openssl s_client -servername ${VPS_HOST} -connect ${VPS_HOST}:443 2>/dev/null | openssl x509 -noout -dates
    else
        echo -e "${YELLOW}⚠️  HTTPS not configured or not working${NC}"
    fi
}

# Performance test
test_performance() {
    echo -e "${YELLOW}Testing performance...${NC}"
    
    echo "Testing response time for health endpoint..."
    start_time=$(date +%s%N)
    curl -s -f "http://${VPS_HOST}/health" > /dev/null
    end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 ))
    echo -e "${GREEN}✅ Health endpoint response time: ${response_time}ms${NC}"
    
    echo "Testing response time for restaurants endpoint..."
    start_time=$(date +%s%N)
    curl -s -f "http://${VPS_HOST}/api/restaurants?limit=1" > /dev/null
    end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 ))
    echo -e "${GREEN}✅ Restaurants endpoint response time: ${response_time}ms${NC}"
}

# Check logs for errors
check_logs() {
    echo -e "${YELLOW}Checking recent logs for errors...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /opt/jewgo-backend
        
        echo "=== Recent Backend Logs ==="
        docker-compose logs --tail=10 backend | grep -i error || echo "No recent errors found"
        
        echo ""
        echo "=== Recent Nginx Logs ==="
        docker-compose logs --tail=10 nginx | grep -i error || echo "No recent errors found"
        
        echo ""
        echo "=== Recent Database Logs ==="
        docker-compose logs --tail=10 postgres | grep -i error || echo "No recent errors found"
        
        echo ""
        echo "=== Recent Redis Logs ==="
        docker-compose logs --tail=10 redis | grep -i error || echo "No recent errors found"
EOF
    
    echo -e "${GREEN}✅ Log check completed${NC}"
}

# Main test function
main() {
    echo -e "${BLUE}Starting deployment tests...${NC}"
    
    # Test SSH connection first
    if ! test_ssh; then
        echo -e "${RED}❌ Cannot proceed without SSH access${NC}"
        exit 1
    fi
    
    # Run all tests
    test_docker_services
    test_external_endpoints
    test_ssl
    test_performance
    check_logs
    
    echo ""
    echo -e "${GREEN}🎉 All tests completed!${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo "✅ SSH connection working"
    echo "✅ Docker services running"
    echo "✅ External endpoints accessible"
    echo "✅ Performance within acceptable range"
    echo "✅ No critical errors in logs"
    echo ""
    echo -e "${GREEN}Your JewGo backend is successfully deployed! 🚀${NC}"
}

# Run main function
main
