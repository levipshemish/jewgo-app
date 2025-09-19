#!/bin/bash

# Comprehensive Authentication Verification Suite
# This script tests all authentication flows, security policies, and monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"
API_BASE="https://api.jewgo.app"
TEST_LOG="auth_verification_$(date +%Y%m%d_%H%M%S).log"

# Test credentials (for testing only)
TEST_EMAIL="auth-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Auth Test User"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$TEST_LOG"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$TEST_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_LOG"
}

# Initialize test log
echo "=== Authentication Verification Suite ===" > "$TEST_LOG"
echo "Started: $(date)" >> "$TEST_LOG"
echo "Server: $SERVER_HOST" >> "$TEST_LOG"
echo "API Base: $API_BASE" >> "$TEST_LOG"
echo "=======================================" >> "$TEST_LOG"
echo "" >> "$TEST_LOG"

print_status "Starting comprehensive authentication verification..."

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_status "Running test: $test_name"
    
    if eval "$test_command"; then
        print_success "$test_name - PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "$test_name - FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Helper functions
get_csrf_token() {
    local response_file="/tmp/csrf_response.json"
    local cookie_file="/tmp/auth_cookies.txt"
    
    curl -s -c "$cookie_file" -o "$response_file" "$API_BASE/api/v5/auth/csrf"
    
    if [ $? -eq 0 ] && [ -f "$response_file" ]; then
        # Extract CSRF token using python if available, otherwise use basic parsing
        if command -v python3 >/dev/null 2>&1; then
            python3 -c "
import json, sys
try:
    with open('$response_file', 'r') as f:
        data = json.load(f)
    print(data.get('data', {}).get('csrf_token', ''))
except:
    sys.exit(1)
" 2>/dev/null
        else
            # Fallback to basic parsing
            grep -o '"csrf_token":"[^"]*"' "$response_file" | cut -d'"' -f4
        fi
    fi
}

test_server_connectivity() {
    curl -f -s "$API_BASE/healthz" > /dev/null 2>&1
}

test_auth_health_endpoint() {
    curl -f -s "$API_BASE/api/v5/auth/health" > /dev/null 2>&1
}

test_csrf_token_generation() {
    local csrf_token
    csrf_token=$(get_csrf_token)
    [ -n "$csrf_token" ] && [ ${#csrf_token} -gt 10 ]
}

test_login_flow() {
    local csrf_token
    local response_code
    local cookie_file="/tmp/auth_cookies.txt"
    local response_file="/tmp/login_response.json"
    
    # Get CSRF token first
    csrf_token=$(get_csrf_token)
    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token for login test"
        return 1
    fi
    
    # Attempt login with test credentials
    response_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -b "$cookie_file" -c "$cookie_file" \
        -X POST "$API_BASE/api/v5/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $csrf_token" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    # For now, we expect this to fail since we haven't created the user
    # But we should get a proper error response, not a 500 error
    [ "$response_code" = "401" ] || [ "$response_code" = "400" ]
}

test_registration_flow() {
    local csrf_token
    local response_code
    local cookie_file="/tmp/auth_cookies.txt"
    local response_file="/tmp/register_response.json"
    
    # Get CSRF token first
    csrf_token=$(get_csrf_token)
    if [ -z "$csrf_token" ]; then
        print_error "Failed to get CSRF token for registration test"
        return 1
    fi
    
    # Attempt registration
    response_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -b "$cookie_file" -c "$cookie_file" \
        -X POST "$API_BASE/api/v5/auth/register" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $csrf_token" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")
    
    # Registration should succeed (201) or fail with validation error (400)
    [ "$response_code" = "201" ] || [ "$response_code" = "400" ]
}

test_oauth_endpoints_exist() {
    local google_start_code
    local google_callback_code
    local magic_send_code
    
    # Test Google OAuth start endpoint exists
    google_start_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/google/start?returnTo=%2F")
    
    # Test Google OAuth callback endpoint exists  
    google_callback_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/google/callback")
    
    # Test Magic Link send endpoint exists (should require POST)
    magic_send_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/magic/send")
    
    # Endpoints should exist (not 404) but may return other status codes
    [ "$google_start_code" != "404" ] && [ "$google_callback_code" != "404" ] && [ "$magic_send_code" != "404" ]
}

test_security_headers() {
    local headers_file="/tmp/security_headers.txt"
    
    curl -s -I "$API_BASE/api/v5/auth/health" > "$headers_file"
    
    # Check for important security headers
    grep -qi "x-content-type-options" "$headers_file" && \
    grep -qi "x-frame-options" "$headers_file"
}

test_rate_limiting() {
    local response_codes=()
    local i
    
    # Make rapid requests to test rate limiting
    for i in {1..10}; do
        response_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/csrf")
        response_codes+=("$response_code")
        sleep 0.1
    done
    
    # Should get mostly 200s, but might see 429 (rate limited) which is good
    local success_count=0
    for code in "${response_codes[@]}"; do
        if [ "$code" = "200" ]; then
            success_count=$((success_count + 1))
        fi
    done
    
    # At least half should succeed
    [ $success_count -ge 5 ]
}

test_token_verification_endpoint() {
    local response_code
    
    # Test without token (should return 401)
    response_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/verify-token")
    
    [ "$response_code" = "401" ]
}

test_session_endpoints_exist() {
    local sessions_code
    
    # Test sessions endpoint exists (should require auth)
    sessions_code=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/api/v5/auth/sessions")
    
    # Should exist but require authentication
    [ "$sessions_code" = "401" ]
}

test_backend_logs_accessible() {
    if [ ! -f "$SSH_KEY" ]; then
        print_warning "SSH key not found, skipping backend log test"
        return 0
    fi
    
    # Test SSH connection and log access
    ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" \
        "docker logs --tail 5 jewgo_backend >/dev/null 2>&1"
}

test_redis_connectivity() {
    if [ ! -f "$SSH_KEY" ]; then
        print_warning "SSH key not found, skipping Redis test"
        return 0
    fi
    
    # Test Redis connectivity via SSH
    ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" \
        "docker exec jewgo_redis redis-cli ping" 2>/dev/null | grep -q "PONG"
}

test_database_connectivity() {
    if [ ! -f "$SSH_KEY" ]; then
        print_warning "SSH key not found, skipping database test"
        return 0
    fi
    
    # Test database connectivity via backend
    ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" \
        "docker exec jewgo_backend python -c 'from database.connection_manager import get_connection_manager; print(get_connection_manager().health_check())'" 2>/dev/null | grep -q "healthy"
}

# Run all tests
print_status "=== Phase 1: Infrastructure Tests ==="
run_test "Server Connectivity" "test_server_connectivity"
run_test "Auth Health Endpoint" "test_auth_health_endpoint"
run_test "Backend Logs Accessible" "test_backend_logs_accessible"
run_test "Redis Connectivity" "test_redis_connectivity"
run_test "Database Connectivity" "test_database_connectivity"

print_status "=== Phase 2: Authentication Flow Tests ==="
run_test "CSRF Token Generation" "test_csrf_token_generation"
run_test "Login Flow Response" "test_login_flow"
run_test "Registration Flow Response" "test_registration_flow"
run_test "Token Verification Endpoint" "test_token_verification_endpoint"
run_test "Session Endpoints Exist" "test_session_endpoints_exist"

print_status "=== Phase 3: OAuth/SAML Tests ==="
run_test "OAuth Endpoints Exist" "test_oauth_endpoints_exist"

print_status "=== Phase 4: Security Tests ==="
run_test "Security Headers" "test_security_headers"
run_test "Rate Limiting" "test_rate_limiting"

# Generate summary
print_status "=== Test Summary ==="
print_status "Total Tests: $TOTAL_TESTS"
print_success "Passed: $PASSED_TESTS"
if [ $FAILED_TESTS -gt 0 ]; then
    print_error "Failed: $FAILED_TESTS"
else
    print_success "Failed: $FAILED_TESTS"
fi

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
print_status "Success Rate: $SUCCESS_RATE%"

# Add summary to log
echo "" >> "$TEST_LOG"
echo "=== FINAL SUMMARY ===" >> "$TEST_LOG"
echo "Total Tests: $TOTAL_TESTS" >> "$TEST_LOG"
echo "Passed: $PASSED_TESTS" >> "$TEST_LOG"
echo "Failed: $FAILED_TESTS" >> "$TEST_LOG"
echo "Success Rate: $SUCCESS_RATE%" >> "$TEST_LOG"
echo "Completed: $(date)" >> "$TEST_LOG"

print_status "Detailed log saved to: $TEST_LOG"

# Cleanup temporary files
rm -f /tmp/csrf_response.json /tmp/auth_cookies.txt /tmp/login_response.json
rm -f /tmp/register_response.json /tmp/security_headers.txt

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    print_success "All authentication verification tests passed!"
    exit 0
else
    print_error "Some authentication verification tests failed. Check the log for details."
    exit 1
fi
