#!/bin/bash

# Authentication System Monitoring Script
# This script monitors the authentication system for issues

set -e

API_URL="https://api.jewgo.app"
LOG_FILE="auth-monitor-$(date +%Y%m%d-%H%M%S).log"

echo "🔍 Authentication System Monitor" | tee -a "$LOG_FILE"
echo "=================================" | tee -a "$LOG_FILE"
echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
echo "API URL: $API_URL" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local description="$4"
    
    echo -n "Testing $name... " | tee -a "$LOG_FILE"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ PASS ($response)" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ FAIL (expected $expected_status, got $response)" | tee -a "$LOG_FILE"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json)" | tee -a "$LOG_FILE"
        fi
        return 1
    fi
}

# Function to test CORS
test_cors() {
    local origin="$1"
    local expected_origin="$2"
    
    echo -n "Testing CORS for $origin... " | tee -a "$LOG_FILE"
    
    response=$(curl -s -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type, X-CSRF-Token" \
        "$API_URL/api/v5/auth/login")
    
    cors_origin=$(curl -s -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type, X-CSRF-Token" \
        "$API_URL/api/v5/auth/login" \
        -I | grep -i "access-control-allow-origin" | cut -d' ' -f2- | tr -d '\r')
    
    if [ "$cors_origin" = "$expected_origin" ]; then
        echo "✅ PASS (Origin: $cors_origin)" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ FAIL (expected $expected_origin, got $cors_origin)" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Function to test rate limiting
test_rate_limiting() {
    echo "Testing rate limiting..." | tee -a "$LOG_FILE"
    
    local rate_limited=false
    for i in {1..10}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/v5/auth/profile")
        if [ "$response" = "429" ]; then
            rate_limited=true
            echo "⚠️  Rate limited on request $i (HTTP 429)" | tee -a "$LOG_FILE"
            break
        fi
        sleep 0.1
    done
    
    if [ "$rate_limited" = false ]; then
        echo "✅ Rate limiting is reasonable (no 429 responses)" | tee -a "$LOG_FILE"
        return 0
    else
        echo "❌ Rate limiting too strict" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Run tests
echo "🧪 Running Authentication Tests" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"

# Test 1: Auth Health
test_endpoint "Auth Health" "$API_URL/api/v5/auth/health" "200" "Authentication service health check"

# Test 2: CSRF Token
test_endpoint "CSRF Token" "$API_URL/api/v5/auth/csrf" "200" "CSRF token generation"

# Test 3: Profile (should return 401 without auth)
test_endpoint "Profile (unauthorized)" "$API_URL/api/v5/auth/profile" "401" "Profile endpoint without authentication"

# Test 4: CORS for main domain
test_cors "https://jewgo.app" "https://jewgo.app"

# Test 5: CORS for app subdomain
test_cors "https://app.jewgo.app" "https://app.jewgo.app"

# Test 6: Rate Limiting
test_rate_limiting

echo "" | tee -a "$LOG_FILE"
echo "📊 Test Summary" | tee -a "$LOG_FILE"
echo "===============" | tee -a "$LOG_FILE"

# Count results
total_tests=6
passed_tests=0

# Check each test result (simplified)
if curl -s "$API_URL/api/v5/auth/health" | grep -q "healthy"; then
    ((passed_tests++))
fi

if curl -s "$API_URL/api/v5/auth/csrf" | grep -q "csrf_token"; then
    ((passed_tests++))
fi

if [ "$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/v5/auth/profile")" = "401" ]; then
    ((passed_tests++))
fi

# CORS tests (simplified)
cors_origin=$(curl -s -X OPTIONS -H "Origin: https://jewgo.app" "$API_URL/api/v5/auth/login" -I | grep -i "access-control-allow-origin" | cut -d' ' -f2- | tr -d '\r')
if [ "$cors_origin" = "https://jewgo.app" ]; then
    ((passed_tests++))
fi

# Rate limiting test (simplified)
rate_limited=false
for i in {1..5}; do
    if [ "$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/v5/auth/profile")" = "429" ]; then
        rate_limited=true
        break
    fi
done
if [ "$rate_limited" = false ]; then
    ((passed_tests++))
fi

echo "Tests Passed: $passed_tests/$total_tests" | tee -a "$LOG_FILE"
echo "Success Rate: $((passed_tests * 100 / total_tests))%" | tee -a "$LOG_FILE"

if [ $passed_tests -eq $total_tests ]; then
    echo "🎉 All tests passed! Authentication system is healthy." | tee -a "$LOG_FILE"
    exit 0
else
    echo "⚠️  Some tests failed. Check the log for details." | tee -a "$LOG_FILE"
    exit 1
fi
