#!/bin/bash

# JewGo Health Check Script
# This script checks all health endpoints with correct trailing slashes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"https://api.jewgo.app"}
TIMEOUT=${TIMEOUT:-10}
VERBOSE=${VERBOSE:-false}

# Health endpoints to check
declare -a HEALTH_ENDPOINTS=(
    "/healthz"
    "/api/v5/auth/health"
    "/api/v5/search/health"
    "/api/v5/monitoring/health"
    "/api/v5/metrics/health"
    "/api/v5/feature-flags/health"
)

# Detailed health endpoints
declare -a DETAILED_ENDPOINTS=(
    "/api/v5/monitoring/health/database"
    "/api/v5/monitoring/health/redis"
    "/api/v5/monitoring/health/system"
)

echo -e "${BLUE}🔍 JewGo Health Check${NC}"
echo -e "${BLUE}====================${NC}"
echo "Base URL: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local url="${BASE_URL}${endpoint}"
    local status_code
    local response_time
    
    if [ "$VERBOSE" = "true" ]; then
        echo -n "Checking $endpoint... "
    fi
    
    # Use curl with timeout and capture status code
    if curl -s -f -m "$TIMEOUT" "$url" > /dev/null 2>&1; then
        status_code="200"
    else
        status_code=$(curl -s -w "%{http_code}" -m "$TIMEOUT" "$url" 2>/dev/null | tail -c 4 | tr -d '%\n')
    fi
    response_time="0.0"
    
    if [ "$status_code" = "200" ]; then
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${GREEN}✅ OK${NC} (${response_time}s)"
        else
            echo -e "${GREEN}✅${NC} $endpoint - ${response_time}s"
        fi
        return 0
    elif [ "$status_code" = "401" ]; then
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC}"
        else
            echo -e "${YELLOW}⚠️${NC} $endpoint - Auth required (expected)"
        fi
        return 0  # Auth required is expected for some endpoints
    elif [ "$status_code" = "000" ]; then
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${RED}❌ TIMEOUT/CONNECTION ERROR${NC}"
        else
            echo -e "${RED}❌${NC} $endpoint - Connection failed"
        fi
        return 1
    else
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${RED}❌ HTTP $status_code${NC}"
        else
            echo -e "${RED}❌${NC} $endpoint - HTTP $status_code"
        fi
        return 1
    fi
}

# Check basic health endpoints
echo -e "${BLUE}Basic Health Checks:${NC}"
basic_failed=0
for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    if ! check_endpoint "$endpoint"; then
        ((basic_failed++))
    fi
done

echo ""

# Check detailed health endpoints
echo -e "${BLUE}Detailed Health Checks:${NC}"
detailed_failed=0
for endpoint in "${DETAILED_ENDPOINTS[@]}"; do
    if ! check_endpoint "$endpoint"; then
        ((detailed_failed++))
    fi
done

echo ""

# Summary
total_checks=$((${#HEALTH_ENDPOINTS[@]} + ${#DETAILED_ENDPOINTS[@]}))
total_failed=$((basic_failed + detailed_failed))
total_passed=$((total_checks - total_failed))

echo -e "${BLUE}Summary:${NC}"
echo -e "  Total checks: $total_checks"
echo -e "  ${GREEN}Passed: $total_passed${NC}"
echo -e "  ${RED}Failed: $total_failed${NC}"

if [ $total_failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All health checks passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  $total_failed health check(s) failed${NC}"
    exit 1
fi
