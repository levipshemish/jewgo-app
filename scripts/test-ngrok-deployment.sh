#!/bin/bash

# Test JewGo Ngrok Deployment
# ===========================
# Script to test the deployment and verify all services are working

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗ $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ $1${NC}"; }

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 Testing JewGo Ngrok Deployment"
echo "=================================="
echo ""

# Check if deployment is running
if ! docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" ps | grep -q "Up"; then
    error "No ngrok deployment found running"
    echo ""
    echo "Please start the deployment first:"
    echo "  ./scripts/quick-ngrok-deploy.sh"
    exit 1
fi

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_output="$3"
    
    info "Running test: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        log "$test_name passed"
        ((TESTS_PASSED++))
        return 0
    else
        error "$test_name failed"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Check if all containers are running
echo "📋 Container Status Tests"
echo "------------------------"

run_test "All containers running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -c 'Up' | grep -q '6'" \
    "6 containers should be running"

run_test "PostgreSQL container running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -q 'postgres.*Up'" \
    "PostgreSQL should be running"

run_test "Redis container running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -q 'redis.*Up'" \
    "Redis should be running"

run_test "Backend container running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -q 'backend.*Up'" \
    "Backend should be running"

run_test "Frontend container running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -q 'frontend.*Up'" \
    "Frontend should be running"

run_test "Ngrok containers running" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml ps | grep -c 'ngrok.*Up' | grep -q '2'" \
    "Both ngrok containers should be running"

echo ""

# Test 2: Health checks
echo "🏥 Health Check Tests"
echo "---------------------"

run_test "Database health check" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml exec -T postgres pg_isready -U jewgo_user -d jewgo" \
    "Database should be healthy"

run_test "Redis health check" \
    "docker-compose -f $PROJECT_ROOT/docker-compose.ngrok.yml exec -T redis redis-cli ping | grep -q 'PONG'" \
    "Redis should respond with PONG"

run_test "Backend health endpoint" \
    "curl -f http://localhost:8081/health" \
    "Backend health endpoint should respond"

run_test "Frontend accessibility" \
    "curl -f http://localhost:3000" \
    "Frontend should be accessible"

echo ""

# Test 3: Network connectivity
echo "🌐 Network Connectivity Tests"
echo "----------------------------"

run_test "Backend API accessible" \
    "curl -f http://localhost:8081/api/v4/restaurants" \
    "Backend API should be accessible"

run_test "Frontend serves content" \
    "curl -s http://localhost:3000 | grep -q 'html'" \
    "Frontend should serve HTML content"

run_test "Database port accessible" \
    "nc -z localhost 5432" \
    "Database port should be accessible"

run_test "Redis port accessible" \
    "nc -z localhost 6379" \
    "Redis port should be accessible"

echo ""

# Test 4: Ngrok tunnels
echo "🔗 Ngrok Tunnel Tests"
echo "--------------------"

# Get ngrok URLs
FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")
BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")

if [[ -n "$FRONTEND_URL" && "$FRONTEND_URL" != "null" ]]; then
    run_test "Frontend ngrok tunnel" \
        "curl -f $FRONTEND_URL" \
        "Frontend ngrok tunnel should be accessible"
else
    warn "Frontend ngrok tunnel not available"
    ((TESTS_FAILED++))
fi

if [[ -n "$BACKEND_URL" && "$BACKEND_URL" != "null" ]]; then
    run_test "Backend ngrok tunnel" \
        "curl -f $BACKEND_URL/health" \
        "Backend ngrok tunnel should be accessible"
else
    warn "Backend ngrok tunnel not available"
    ((TESTS_FAILED++))
fi

run_test "Ngrok frontend dashboard" \
    "curl -f http://localhost:4040" \
    "Ngrok frontend dashboard should be accessible"

run_test "Ngrok backend dashboard" \
    "curl -f http://localhost:4041" \
    "Ngrok backend dashboard should be accessible"

echo ""

# Test 5: Application functionality
echo "⚙️  Application Functionality Tests"
echo "----------------------------------"

run_test "Backend API returns JSON" \
    "curl -s http://localhost:8081/api/v4/restaurants | jq . >/dev/null" \
    "Backend API should return valid JSON"

run_test "Backend has restaurants data" \
    "curl -s http://localhost:8081/api/v4/restaurants | jq '.restaurants | length' | grep -q '[0-9]'" \
    "Backend should have restaurants data"

run_test "Frontend loads without errors" \
    "curl -s http://localhost:3000 | grep -v -i 'error\|exception\|failed'" \
    "Frontend should load without errors"

echo ""

# Summary
echo "📊 Test Summary"
echo "==============="
echo ""
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    log "🎉 All tests passed! Deployment is working correctly."
    echo ""
    echo "✅ Your JewGo deployment is ready for use!"
    echo ""
    if [[ -n "$FRONTEND_URL" && "$FRONTEND_URL" != "null" ]]; then
        echo "📱 Frontend URL: $FRONTEND_URL"
    fi
    if [[ -n "$BACKEND_URL" && "$BACKEND_URL" != "null" ]]; then
        echo "🔧 Backend URL: $BACKEND_URL"
    fi
    echo ""
    echo "🌐 Local URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8081"
    echo ""
else
    error "❌ Some tests failed. Please check the deployment."
    echo ""
    echo "🔍 Troubleshooting tips:"
    echo "   1. Check service logs: docker-compose -f docker-compose.ngrok.yml logs -f"
    echo "   2. Restart services: docker-compose -f docker-compose.ngrok.yml restart"
    echo "   3. Check ngrok status: curl http://localhost:4040/api/tunnels"
    echo ""
fi

echo ""
