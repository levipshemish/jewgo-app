#!/bin/bash

# Nginx Configuration Testing Script
# Tests rate limiting, security headers, CORS, and other security features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://api.jewgo.app}"
TEST_ORIGIN="${TEST_ORIGIN:-https://jewgo.app}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test rate limiting for auth endpoints
test_auth_rate_limiting() {
    log_info "Testing auth endpoint rate limiting..."
    
    local auth_endpoint="$BASE_URL/api/auth/login"
    local max_requests=15
    local success_count=0
    local rate_limited_count=0
    
    log_info "Sending $max_requests requests to $auth_endpoint..."
    
    for i in $(seq 1 $max_requests); do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@example.com","password":"test"}' \
            "$auth_endpoint" || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "400" ] || [ "$response" = "401" ]; then
            ((success_count++))
        elif [ "$response" = "429" ]; then
            ((rate_limited_count++))
            log_info "Request $i: Rate limited (429)"
        else
            log_warning "Request $i: Unexpected response code $response"
        fi
        
        # Small delay between requests
        sleep 0.1
    done
    
    log_info "Auth rate limiting test results:"
    log_info "  Successful requests: $success_count"
    log_info "  Rate limited requests: $rate_limited_count"
    
    if [ $rate_limited_count -gt 0 ]; then
        log_success "Auth rate limiting is working correctly"
        return 0
    else
        log_warning "No auth rate limiting detected. This might be expected."
        return 1
    fi
}

# Test rate limiting for general API endpoints
test_api_rate_limiting() {
    log_info "Testing API endpoint rate limiting..."
    
    local api_endpoint="$BASE_URL/health"
    local max_requests=25
    local success_count=0
    local rate_limited_count=0
    
    log_info "Sending $max_requests requests to $api_endpoint..."
    
    for i in $(seq 1 $max_requests); do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$api_endpoint" || echo "000")
        
        if [ "$response" = "200" ]; then
            ((success_count++))
        elif [ "$response" = "429" ]; then
            ((rate_limited_count++))
            log_info "Request $i: Rate limited (429)"
        else
            log_warning "Request $i: Unexpected response code $response"
        fi
        
        # Small delay between requests
        sleep 0.1
    done
    
    log_info "API rate limiting test results:"
    log_info "  Successful requests: $success_count"
    log_info "  Rate limited requests: $rate_limited_count"
    
    if [ $rate_limited_count -gt 0 ]; then
        log_success "API rate limiting is working correctly"
        return 0
    else
        log_warning "No API rate limiting detected. This might be expected."
        return 1
    fi
}

# Test security headers
test_security_headers() {
    log_info "Testing security headers..."
    
    local test_url="$BASE_URL/health"
    local headers=$(curl -s -I "$test_url" || echo "")
    
    if [ -z "$headers" ]; then
        log_error "Failed to retrieve headers from $test_url"
        return 1
    fi
    
    local required_headers=(
        "Strict-Transport-Security"
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Referrer-Policy"
        "Permissions-Policy"
    )
    
    local missing_headers=()
    local present_headers=()
    
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            present_headers+=("$header")
            log_success "Security header present: $header"
        else
            missing_headers+=("$header")
            log_warning "Security header missing: $header"
        fi
    done
    
    log_info "Security headers summary:"
    log_info "  Present: ${#present_headers[@]}/${#required_headers[@]}"
    log_info "  Missing: ${#missing_headers[@]}"
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        log_success "All required security headers are present"
        return 0
    else
        log_error "Missing security headers: ${missing_headers[*]}"
        return 1
    fi
}

# Test CORS configuration
test_cors_config() {
    log_info "Testing CORS configuration..."
    
    local test_url="$BASE_URL/health"
    local origin="$TEST_ORIGIN"
    
    # Test preflight request
    local preflight_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$test_url" || echo "000")
    
    if [ "$preflight_response" = "204" ]; then
        log_success "CORS preflight request successful (204)"
    else
        log_warning "CORS preflight request failed with code: $preflight_response"
    fi
    
    # Test actual request with origin
    local cors_headers=$(curl -s -I -H "Origin: $origin" "$test_url" || echo "")
    
    if echo "$cors_headers" | grep -qi "Access-Control-Allow-Origin"; then
        log_success "CORS headers are present for origin: $origin"
        
        # Check if origin is correctly reflected
        local allowed_origin=$(echo "$cors_headers" | grep -i "Access-Control-Allow-Origin" | cut -d: -f2 | tr -d ' \r\n')
        if [ "$allowed_origin" = "$origin" ]; then
            log_success "CORS origin correctly reflected: $allowed_origin"
        else
            log_warning "CORS origin not correctly reflected. Expected: $origin, Got: $allowed_origin"
        fi
        return 0
    else
        log_error "CORS headers not detected"
        return 1
    fi
}

# Test no-cache headers for auth endpoints
test_auth_no_cache() {
    log_info "Testing no-cache headers for auth endpoints..."
    
    local auth_endpoint="$BASE_URL/api/auth/login"
    local headers=$(curl -s -I \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"test"}' \
        "$auth_endpoint" || echo "")
    
    if [ -z "$headers" ]; then
        log_error "Failed to retrieve headers from auth endpoint"
        return 1
    fi
    
    local cache_headers=(
        "Cache-Control"
        "Pragma"
        "Expires"
    )
    
    local missing_headers=()
    
    for header in "${cache_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log_success "Cache control header present: $header"
        else
            missing_headers+=("$header")
            log_warning "Cache control header missing: $header"
        fi
    done
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        log_success "All required cache control headers are present for auth endpoints"
        return 0
    else
        log_error "Missing cache control headers: ${missing_headers[*]}"
        return 1
    fi
}

# Test HEAD method support
test_head_method() {
    log_info "Testing HEAD method support..."
    
    local test_url="$BASE_URL/api/v5/auth/verify-token"
    local head_response=$(curl -s -o /dev/null -w "%{http_code}" -I "$test_url" || echo "000")
    
    if [ "$head_response" = "200" ] || [ "$head_response" = "401" ]; then
        log_success "HEAD method is supported (response code: $head_response)"
        return 0
    else
        log_error "HEAD method not supported or unexpected response: $head_response"
        return 1
    fi
}

# Test CSRF token header support
test_csrf_headers() {
    log_info "Testing CSRF token header support..."
    
    local test_url="$BASE_URL/api/auth/login"
    local headers=$(curl -s -I \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: test-token" \
        -d '{"email":"test@example.com","password":"test"}' \
        "$test_url" || echo "")
    
    if [ -z "$headers" ]; then
        log_error "Failed to retrieve headers with CSRF token"
        return 1
    fi
    
    # Check if the request was processed (not rejected due to missing CSRF support)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: test-token" \
        -d '{"email":"test@example.com","password":"test"}' \
        "$test_url" || echo "000")
    
    if [ "$response_code" = "200" ] || [ "$response_code" = "400" ] || [ "$response_code" = "401" ] || [ "$response_code" = "403" ]; then
        log_success "CSRF token header is accepted (response code: $response_code)"
        return 0
    else
        log_error "CSRF token header not accepted (response code: $response_code)"
        return 1
    fi
}

# Main test function
run_all_tests() {
    log_info "Starting comprehensive Nginx configuration tests..."
    log_info "Testing against: $BASE_URL"
    log_info "Using origin: $TEST_ORIGIN"
    
    local tests_passed=0
    local tests_total=0
    
    # Run all tests
    tests=(
        "test_security_headers"
        "test_cors_config"
        "test_auth_no_cache"
        "test_head_method"
        "test_csrf_headers"
        "test_api_rate_limiting"
        "test_auth_rate_limiting"
    )
    
    for test in "${tests[@]}"; do
        ((tests_total++))
        log_info "Running test: $test"
        
        if $test; then
            ((tests_passed++))
        else
            log_warning "Test failed: $test"
        fi
        
        echo "---"
    done
    
    # Summary
    log_info "Test Summary:"
    log_info "  Tests passed: $tests_passed/$tests_total"
    
    if [ $tests_passed -eq $tests_total ]; then
        log_success "All tests passed! Nginx configuration is working correctly."
        return 0
    else
        local failed_tests=$((tests_total - tests_passed))
        log_warning "$failed_tests test(s) failed. Please review the configuration."
        return 1
    fi
}

# Help function
show_help() {
    cat << EOF
Nginx Configuration Testing Script

Usage: $0 [OPTIONS] [TEST_NAME]

Options:
    -h, --help          Show this help message
    -u, --url URL       Base URL to test against (default: https://api.jewgo.app)
    -o, --origin ORIGIN Origin header for CORS tests (default: https://jewgo.app)
    -a, --all           Run all tests (default)
    -r, --rate-limit    Test rate limiting only
    -s, --security      Test security headers only
    -c, --cors          Test CORS configuration only

Available Tests:
    test_security_headers      Test security headers
    test_cors_config          Test CORS configuration
    test_auth_no_cache        Test no-cache headers for auth endpoints
    test_head_method          Test HEAD method support
    test_csrf_headers         Test CSRF token header support
    test_api_rate_limiting    Test API rate limiting
    test_auth_rate_limiting   Test auth endpoint rate limiting

Examples:
    $0                      # Run all tests
    $0 --rate-limit         # Test rate limiting only
    $0 --security           # Test security headers only
    $0 -u http://localhost  # Test against localhost
    $0 test_cors_config     # Run specific test

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -o|--origin)
            TEST_ORIGIN="$2"
            shift 2
            ;;
        -a|--all)
            run_all_tests
            exit $?
            ;;
        -r|--rate-limit)
            test_api_rate_limiting
            test_auth_rate_limiting
            exit $?
            ;;
        -s|--security)
            test_security_headers
            exit $?
            ;;
        -c|--cors)
            test_cors_config
            exit $?
            ;;
        test_*)
            if declare -f "$1" > /dev/null; then
                $1
                exit $?
            else
                log_error "Unknown test: $1"
                show_help
                exit 1
            fi
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default: run all tests
run_all_tests
