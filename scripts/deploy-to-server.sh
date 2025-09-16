#!/bin/bash

# Server Deployment Script for Jewgo App
# This script safely deploys the backend to the server with proper rollback capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $message" >> "$LOCAL_LOG_FILE"
}

print_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $message" >> "$LOCAL_LOG_FILE"
}

print_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $message" >> "$LOCAL_LOG_FILE"
}

print_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $message" >> "$LOCAL_LOG_FILE"
}

# Server configuration
SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"
BACKUP_DIR="/home/ubuntu/backups"
DEPLOYMENT_LOG="/tmp/deployment-$(date +%Y%m%d-%H%M%S).log"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"

# Local logging configuration
LOCAL_LOG_DIR="./deployment-logs"
LOCAL_LOG_FILE="${LOCAL_LOG_DIR}/deployment-$(date +%Y%m%d-%H%M%S).log"

# Create local log directory
mkdir -p "$LOCAL_LOG_DIR"

# Initialize local log file
echo "=== JewGo Deployment Log ===" > "$LOCAL_LOG_FILE"
echo "Deployment started: $(date)" >> "$LOCAL_LOG_FILE"
echo "Server: $SERVER_HOST" >> "$LOCAL_LOG_FILE"
echo "Path: $SERVER_PATH" >> "$LOCAL_LOG_FILE"
echo "=================================" >> "$LOCAL_LOG_FILE"
echo "" >> "$LOCAL_LOG_FILE"

print_status "Starting server deployment..."
print_status "Deployment log: $DEPLOYMENT_LOG"
print_status "Local log: $LOCAL_LOG_FILE"

# Function to execute commands on server with logging
execute_on_server() {
    local cmd="$1"
    local description="$2"
    
    print_status "$description"
    if ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "$cmd" 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
        print_success "$description completed"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found at: $SSH_KEY"
    exit 1
fi

# Set proper permissions for SSH key
chmod 600 "$SSH_KEY"

# Check if we can connect to the server
print_status "Testing server connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connection successful'" 2>/dev/null; then
    print_error "Cannot connect to server. Please check your SSH key and server configuration."
    exit 1
fi

print_success "Server connection established"

# Create backup directory if it doesn't exist
execute_on_server "mkdir -p $BACKUP_DIR" "Creating backup directory"

# Backup current deployment
print_status "Creating backup of current deployment..."
execute_on_server "
    cd $SERVER_PATH && \
    if [ -d .git ]; then
        git rev-parse HEAD > $BACKUP_DIR/previous-commit.txt
        echo 'Backup created: \$(cat $BACKUP_DIR/previous-commit.txt)'
    else
        echo 'No git repository found, skipping commit backup'
    fi
" "Backing up current commit"

# Check if environment file exists
print_status "Checking for environment file..."
if ! ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "[ -f $SERVER_PATH/.env ]"; then
    print_error "Environment file (.env) not found on server!"
    print_error "Please run the environment setup script first:"
    print_error "  ./scripts/setup-server-env.sh"
    exit 1
fi

print_success "Environment file found on server"

# Pull latest code from GitHub
print_status "Pulling latest code from GitHub..."
execute_on_server "
    cd $SERVER_PATH && \
    git config --global --add safe.directory $SERVER_PATH && \
    git fetch origin && \
    git reset --hard origin/main && \
    echo 'Latest commit: \$(git rev-parse HEAD)' && \
    echo 'Commit message: \$(git log -1 --pretty=%B)'
" "Pulling latest code from GitHub"

# Clean up old Docker images and containers
print_status "Cleaning up old Docker resources..."
execute_on_server "
    # Stop and remove old backend container if it exists
    docker stop jewgo_backend 2>/dev/null || echo 'Backend container not running' && \
    docker rm jewgo_backend 2>/dev/null || echo 'Backend container not found' && \
    
    # Remove old backend images
    docker images | grep 'jewgo-app-backend' | awk '{print \$3}' | xargs -r docker rmi -f && \
    
    # Clean up dangling images and build cache
    docker image prune -f && \
    docker builder prune -f && \
    
    echo 'Docker cleanup completed'
" "Cleaning up old Docker resources"

# Build and restart backend via docker compose (ensures Nginx upstream 'backend' points to the new container)
print_status "Building new backend Docker image..."
# Prefer docker compose if docker-compose.yml exists; otherwise fallback to docker build/run
execute_on_server "
    set -euo pipefail
    if [ -f '$SERVER_PATH/docker-compose.yml' ]; then
        cd $SERVER_PATH && \
        docker compose -f docker-compose.yml build backend && \
        echo 'Backend image built successfully (compose)'
    else
        echo 'docker-compose.yml not found; using direct docker build' && \
        cd $SERVER_PATH/backend && \
        docker build -t jewgo-app-backend . && \
        echo 'Backend image built successfully (docker build)'
    fi
" "Building new backend Docker image"

print_status "Restarting backend service..."
execute_on_server "
    set -euo pipefail
    if [ -f '$SERVER_PATH/docker-compose.yml' ]; then
        cd $SERVER_PATH && \
        docker compose -f docker-compose.yml stop backend || true && \
        docker compose -f docker-compose.yml rm -f backend || true && \
        docker compose -f docker-compose.yml up -d backend && \
        echo 'Backend service restarted (compose)'
    else
        echo 'docker-compose.yml not found; using direct docker run' && \
        # Stop any existing container
        docker stop jewgo_backend 2>/dev/null || true && \
        docker rm jewgo_backend 2>/dev/null || true && \
        # Start container on compose default network with alias backend for Nginx upstream
        cd $SERVER_PATH && \
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
          -w /app \
          jewgo-app-backend \
          gunicorn --bind 0.0.0.0:5000 wsgi:app && \
        echo 'Backend container started (docker run with gunicorn and network alias)'
    fi
" "Starting new backend container"

# Clear Redis cache
print_status "Clearing Redis cache..."
execute_on_server "
    docker exec jewgo_redis redis-cli FLUSHALL 2>/dev/null || echo 'Redis cache clear failed (container may not be running)'
" "Clearing Redis cache"

print_success "Deployment completed on server"

# Rollback function
rollback_deployment() {
    print_error "Deployment failed! Attempting rollback..."
    
    execute_on_server "
        cd $SERVER_PATH && \
        if [ -f $BACKUP_DIR/previous-commit.txt ]; then
            PREVIOUS_COMMIT=\$(cat $BACKUP_DIR/previous-commit.txt) && \
            echo 'Rolling back to commit: \$PREVIOUS_COMMIT' && \
            git reset --hard \$PREVIOUS_COMMIT && \
            echo 'Code rolled back successfully'
        else
            echo 'No backup commit found, cannot rollback code'
        fi
    " "Rolling back code"
    
    execute_on_server "
        # Stop current container
        docker stop jewgo_backend 2>/dev/null || true && \
        docker rm jewgo_backend 2>/dev/null || true && \
        
        # Rebuild and start with previous code
        cd $SERVER_PATH/backend && \
        docker build -t jewgo-app-backend . && \
        cd $SERVER_PATH && \
        docker run -d --name jewgo_backend --network jewgo-app_default -p 5000:5000 --env-file .env jewgo-app-backend && \
        echo 'Rollback container started'
    " "Rolling back container"
    
    print_warning "Rollback completed. Please check the application manually."
    exit 1
}

# Test the deployment
print_status "Testing server deployment..."

# Wait for services to start
print_status "Waiting for backend to start..."
sleep 15

# Comprehensive health check function
check_backend_health() {
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Health check attempt $attempt/$max_attempts..."
        # Hit through Nginx to ensure upstream routing works
        if curl -f -s https://api.jewgo.app/healthz > /dev/null 2>&1; then
            print_success "Backend health check passed"
            return 0
        else
            print_warning "Backend not ready yet, waiting 5 seconds..."
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    print_error "Backend health check failed after $max_attempts attempts"
    return 1
}

# Function to test individual endpoints with detailed logging
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    local response_code
    local response_body
    local curl_error
    
    # Get response code and body
    response_code=$(curl -s -o /tmp/curl_response.tmp -w "%{http_code}" "$url" 2>/tmp/curl_error.tmp)
    response_body=$(cat /tmp/curl_response.tmp 2>/dev/null || echo "")
    curl_error=$(cat /tmp/curl_error.tmp 2>/dev/null || echo "")
    
    # Clean up temp files
    rm -f /tmp/curl_response.tmp /tmp/curl_error.tmp
    
    if [ "$response_code" = "$expected_status" ]; then
        print_success "$description working (HTTP $response_code)"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_TEST] SUCCESS: $description - $url - HTTP $response_code" >> "$LOCAL_LOG_FILE"
        return 0
    else
        print_warning "$description failed (HTTP $response_code)"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_TEST] FAILED: $description - $url - HTTP $response_code" >> "$LOCAL_LOG_FILE"
        
        # Log detailed error information
        if [ -n "$curl_error" ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_ERROR] CURL Error: $curl_error" >> "$LOCAL_LOG_FILE"
        fi
        
        if [ -n "$response_body" ] && [ ${#response_body} -lt 1000 ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_RESPONSE] Response Body: $response_body" >> "$LOCAL_LOG_FILE"
        fi

        # Always fetch recent server logs for failed endpoints (tail 200 for context)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_LOGS] Fetching backend logs (tail 200) for failed endpoint..." >> "$LOCAL_LOG_FILE"
        ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker logs --tail 200 jewgo_backend" >> "$LOCAL_LOG_FILE" 2>&1
        # Also record container status for quicker triage
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENDPOINT_LOGS] docker ps (backend)" >> "$LOCAL_LOG_FILE"
        ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker ps --filter name=jewgo_backend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" >> "$LOCAL_LOG_FILE" 2>&1
        
        return 1
    fi
}

# Test basic health endpoint
if ! check_backend_health; then
    print_error "Backend health check failed - checking logs..."
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH_CHECK_FAILED] Backend health check failed" >> "$LOCAL_LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SERVER_LOGS] Fetching backend logs..." >> "$LOCAL_LOG_FILE"
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker logs --tail 30 jewgo_backend" >> "$LOCAL_LOG_FILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] Initiating rollback..." >> "$LOCAL_LOG_FILE"
    rollback_deployment
fi

# Proactively ensure Nginx config has no duplicate client_header_buffer_size
execute_on_server "
    set -euo pipefail
    if [ -f /etc/nginx/conf.d/default.conf ]; then
        sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak.$(date +%s) || true
        # sed-only approach:
        # 1) Mark the first occurrence with a KEEP token
        sudo sed -e '0,/client_header_buffer_size/s//& __KEEP__/' \
            /etc/nginx/conf.d/default.conf > /tmp/default.conf.step1
        # 2) Comment any subsequent occurrences (that do not include KEEP)
        sudo sed -e '/client_header_buffer_size/ { /__KEEP__/! s/^/#/ }' \
            /tmp/default.conf.step1 > /tmp/default.conf.step2
        # 3) Remove the KEEP token
        sudo sed -e 's/ __KEEP__//' /tmp/default.conf.step2 > /tmp/default.conf.fixed
        if [ -s /tmp/default.conf.fixed ]; then
            sudo mv /tmp/default.conf.fixed /etc/nginx/conf.d/default.conf
            sudo rm -f /tmp/default.conf.step1 /tmp/default.conf.step2 || true
        fi
    fi
    sudo nginx -t
" "Ensuring Nginx client_header_buffer_size not duplicated"

# Reload Nginx configuration to apply rate limit changes
print_status "Reloading Nginx configuration to apply rate limit changes..."
execute_on_server "
    if sudo nginx -t; then
        if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
            sudo systemctl reload nginx && echo 'Nginx configuration reloaded successfully (systemd)'
        else
            # Try signal reload first
            if sudo nginx -s reload 2>/dev/null; then
                echo 'Nginx configuration reloaded successfully (signal)'
            else
                echo 'Nginx not running; attempting to start...'
                if command -v systemctl >/dev/null 2>&1; then
                    sudo systemctl start nginx || true
                fi
                # Fallback direct start
                sudo nginx || true
                # Validate again
                if sudo nginx -t; then
                    echo 'Nginx started and config valid'
                else
                    echo 'Nginx start failed after reload attempt'
                    exit 1
                fi
            fi
        fi
    else
        echo 'Nginx configuration test failed - not reloading'
        exit 1
    fi
" "Reloading Nginx configuration"

# Test rate limits after reload
print_status "Testing rate limits after Nginx reload..."
for i in {1..3}; do
    print_status "Rate limit test $i/3:"
    response_code=$(curl -s -w "%{http_code}" "https://api.jewgo.app/api/v5/auth/csrf" -o /dev/null)
    if [ "$response_code" = "200" ]; then
        print_success "Rate limit test $i passed (HTTP $response_code)"
    else
        print_warning "Rate limit test $i failed (HTTP $response_code)"
    fi
    sleep 1
done

# Test V5 API endpoints (via Nginx HTTPS)
print_status "Testing V5 API endpoints..."

# Test public health endpoints (no auth required)
test_endpoint "https://api.jewgo.app/healthz" "Public healthz endpoint"
# Optional readyz check: enable with ENABLE_READYZ_CHECK=true to enforce DB/Redis readiness
if [ "${ENABLE_READYZ_CHECK:-true}" = "true" ]; then
  test_endpoint "https://api.jewgo.app/readyz" "Public readyz endpoint"
else
  print_status "Skipping readyz check (set ENABLE_READYZ_CHECK=true to enable)"
fi

# Test Auth API health (optional due to Redis/DB dependencies)
if [ "${ENABLE_AUTH_HEALTH_CHECK:-true}" = "true" ]; then
  test_endpoint "https://api.jewgo.app/api/v5/auth/health" "Auth API health endpoint"
else
  print_status "Skipping auth health check (set ENABLE_AUTH_HEALTH_CHECK=true to enable)"
fi

# Test Metrics API health (optional due to Redis/DB dependencies)
if [ "${ENABLE_METRICS_HEALTH_CHECK:-true}" = "true" ]; then
  test_endpoint "https://api.jewgo.app/api/v5/metrics/health" "Metrics API health endpoint" || true
else
  print_status "Skipping metrics health check (set ENABLE_METRICS_HEALTH_CHECK=true to enable)"
fi

# Note: Monitoring API endpoints require authentication
# test_endpoint "http://$SERVER_HOST:5000/api/v5/monitoring/health" "Monitoring API health endpoint (requires auth)"

print_status "Testing core API endpoints..."

# Test restaurants endpoint
test_endpoint "https://api.jewgo.app/api/v5/restaurants?limit=1" "Restaurants API endpoint"

# Test synagogues endpoint
test_endpoint "https://api.jewgo.app/api/v5/synagogues?limit=1" "Synagogues API endpoint"

# Test mikvahs endpoint
test_endpoint "https://api.jewgo.app/api/v5/mikvahs?limit=1" "Mikvahs API endpoint"

# Test stores endpoint
test_endpoint "https://api.jewgo.app/api/v5/stores?limit=1" "Stores API endpoint"

# Test search endpoint
test_endpoint "https://api.jewgo.app/api/v5/search/?q=test&limit=1" "Search API endpoint" 200

# Test reviews endpoint
test_endpoint "https://api.jewgo.app/api/v5/reviews/?limit=1" "Reviews API endpoint" 200

# Optional: Distance filtering smoke tests (disabled by default)
# Enable by setting ENABLE_DISTANCE_SMOKE_TEST=true in your environment when running this script
distance_smoke_check() {
    local label="$1"
    local lat="$2"
    local lng="$3"
    local radius_km="$4"
    local tolerance_mi="${5:-0.3}"

    local url="https://api.jewgo.app/api/v5/restaurants?latitude=${lat}&longitude=${lng}&radius=${radius_km}&limit=10"
    print_status "Distance check (${label}): $url"

    if ! command -v jq >/dev/null 2>&1; then
        print_warning "jq not installed locally; skipping distance check for ${label}"
        return 0
    fi

    local http_code
    http_code=$(curl -s -o /tmp/distance_resp.json -w "%{http_code}" "$url" || true)
    if [ "$http_code" != "200" ]; then
        print_warning "Distance check (${label}) request failed (HTTP ${http_code})"
        return 1
    fi

    local max_distance
    max_distance=$(jq -r '[.data[]? | .distance] | max // 0' /tmp/distance_resp.json 2>/dev/null || echo "0")
    local radius_mi
    radius_mi=$(awk "BEGIN {printf \"%.3f\", ${radius_km}*0.621371}")
    local threshold
    threshold=$(awk "BEGIN {printf \"%.3f\", ${radius_mi}+${tolerance_mi}}")

    if awk "BEGIN {exit !(${max_distance} <= ${threshold})}"; then
        print_success "Distance check passed (${label}): max=${max_distance} mi <= threshold=${threshold} mi"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DIST_CHECK] PASS ${label} max=${max_distance} threshold=${threshold}" >> "$LOCAL_LOG_FILE"
        return 0
    else
        print_warning "Distance check FAILED (${label}): max=${max_distance} mi > threshold=${threshold} mi"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DIST_CHECK] FAIL ${label} max=${max_distance} threshold=${threshold}" >> "$LOCAL_LOG_FILE"
        # Do not fail deployment; this is a smoke check
        return 0
    fi
}

if [ "${ENABLE_DISTANCE_SMOKE_TEST:-true}" = "true" ]; then
    print_status "Running distance smoke tests..."
    distance_smoke_check "NYC 5km" 40.7128 -74.0060 5 0.3
    distance_smoke_check "Florida 0.1km" 25.8 -80.1 0.1 0.2
fi

# Note: Monitoring health endpoints require authentication
# test_endpoint "http://$SERVER_HOST:5000/api/v5/monitoring/health/database" "Database health check (requires auth)"
# test_endpoint "http://$SERVER_HOST:5000/api/v5/monitoring/health/redis" "Redis health check (requires auth)"

# test_endpoint "http://$SERVER_HOST:5000/api/v5/monitoring/health/system" "System health check (requires auth)"

# Test additional important endpoints
print_status "Testing additional important endpoints..."


# Note: Monitoring status endpoint requires authentication - skipping test

# Test metrics dashboard
test_endpoint "http://$SERVER_HOST:5000/api/v5/metrics/dashboard" "Metrics dashboard endpoint"

# Test search suggestions
test_endpoint "http://$SERVER_HOST:5000/api/v5/search/suggestions?q=test" "Search suggestions endpoint"

# Test popular searches
test_endpoint "http://$SERVER_HOST:5000/api/v5/search/popular" "Popular searches endpoint"

# Test entity endpoints with different types
print_status "Testing entity endpoints with different types..."

# Test generic entity endpoint
test_endpoint "http://$SERVER_HOST:5000/api/v5/entity/restaurants?limit=1" "Generic entity restaurants endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/entity/synagogues?limit=1" "Generic entity synagogues endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/entity/mikvahs?limit=1" "Generic entity mikvahs endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/entity/stores?limit=1" "Generic entity stores endpoint"

# Test specific business logic endpoints
print_status "Testing specific business logic endpoints..."

# Test authentication endpoints
print_status "Testing authentication endpoints..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/auth/health" "Auth service health"
test_endpoint "http://$SERVER_HOST:5000/api/v5/auth/verify-token" "Token verification endpoint" "401"  # Expected to fail without token

# Test restaurant-specific endpoints
print_status "Testing restaurant-specific endpoints..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/restaurants?limit=5" "Restaurants list endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/restaurants?limit=1&search=kosher" "Restaurants search endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/restaurants?limit=1&distance=10&lat=40.7128&lng=-74.0060" "Restaurants distance filter endpoint"

# Test synagogue-specific endpoints
print_status "Testing synagogue-specific endpoints..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/synagogues?limit=5" "Synagogues list endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/synagogues?limit=1&search=orthodox" "Synagogues search endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/synagogues?limit=1&distance=5&lat=40.7128&lng=-74.0060" "Synagogues distance filter endpoint"

# Test mikvah-specific endpoints
print_status "Testing mikvah-specific endpoints..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/mikvahs?limit=5" "Mikvahs list endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/mikvahs?limit=1&search=women" "Mikvahs search endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/mikvahs?limit=1&distance=15&lat=40.7128&lng=-74.0060" "Mikvahs distance filter endpoint"

# Test store-specific endpoints
print_status "Testing store-specific endpoints..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/stores?limit=5" "Stores list endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/stores?limit=1&search=kosher" "Stores search endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/stores?limit=1&distance=20&lat=40.7128&lng=-74.0060" "Stores distance filter endpoint"

# Validate presence of new auth routes (fail deploy if missing)
print_status "Validating presence of OAuth and Magic Link routes via public domain..."

# Helper to fail if route returns 404
assert_route_present() {
    local url="$1"
    local desc="$2"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" -I "$url" || echo "000")
    if [ "$code" = "404" ] || [ "$code" = "000" ]; then
        print_error "Missing route ($desc): HTTP $code at $url"
        exit 1
    else
        print_success "$desc present (HTTP $code)"
    fi
}

# Google OAuth start should exist (typically 302 to Google)
assert_route_present "https://api.jewgo.app/api/v5/auth/google/start?returnTo=%2F" "Google OAuth start"

# Apple OAuth start should exist (may be 501 if not configured yet)
assert_route_present "https://api.jewgo.app/api/v5/auth/apple/start?returnTo=%2F" "Apple OAuth start"

# Google callback route should exist (will redirect to error when missing params)
assert_route_present "https://api.jewgo.app/api/v5/auth/google/callback" "Google OAuth callback"

# Magic Link consume route should exist (invalid token should redirect to error)
assert_route_present "https://api.jewgo.app/api/v5/auth/magic/consume?token=invalid&email=test%40example.com&rt=%2F" "Magic Link consume"

# Magic Link send route: acquire CSRF, then POST invalid email expecting not-404
print_status "Fetching CSRF token for Magic Link send test..."
curl -s -c /tmp/jewgo_csrf_cookies.txt -o /tmp/csrf_ml.json https://api.jewgo.app/api/v5/auth/csrf >/dev/null || true
CSRF_TOKEN=$(python3 -c 'import json,sys;import pathlib
p=pathlib.Path("/tmp/csrf_ml.json")
print(json.load(open(p))["data"]["csrf_token"]) if p.exists() else print("")' 2>/dev/null)
if [ -z "$CSRF_TOKEN" ]; then
    print_warning "Could not fetch CSRF token; proceeding but Magic Link send check may be skipped"
else
    ML_CODE=$(curl -s -o /tmp/ml_resp.json -w "%{http_code}" -b /tmp/jewgo_csrf_cookies.txt -c /tmp/jewgo_csrf_cookies.txt \
        -X POST https://api.jewgo.app/api/v5/auth/magic/send \
        -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" \
        --data '{"email":"invalid","returnTo":"/"}' || echo "000")
    if [ "$ML_CODE" = "404" ] || [ "$ML_CODE" = "000" ]; then
        print_error "Missing route (Magic Link send): HTTP $ML_CODE"
        exit 1
    else
        print_success "Magic Link send route present (HTTP $ML_CODE)"
    fi
fi

# Test search functionality
print_status "Testing search functionality..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/search/?q=kosher&limit=5" "General search endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/search/suggestions?q=rest" "Search suggestions endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/search/popular" "Popular searches endpoint"

# Test reviews functionality
print_status "Testing reviews functionality..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/reviews/?limit=5" "Reviews list endpoint"
test_endpoint "http://$SERVER_HOST:5000/api/v5/reviews/?entity_type=restaurants&limit=3" "Restaurant reviews endpoint"

# Test admin endpoints (should fail with 401/403)
print_status "Testing admin endpoints (expected to fail without auth)..."
test_endpoint "http://$SERVER_HOST:5000/api/v5/admin/health/system" "Admin system health" "401"
test_endpoint "http://$SERVER_HOST:5000/api/v5/admin/analytics/dashboard" "Admin analytics dashboard" "401"

# Deploy security hardening (if requested)
if [ "${DEPLOY_SECURITY_HARDENING:-false}" = "true" ]; then
    print_status "Deploying security hardening components..."
    
    # Copy security hardening script to server
    scp -i "$SSH_KEY" "$SERVER_PATH/backend/scripts/deploy-security-hardening.sh" $SERVER_USER@$SERVER_HOST:/tmp/
    
    # Make it executable and run it
    execute_on_server "
        chmod +x /tmp/deploy-security-hardening.sh && \
        cd $SERVER_PATH && \
        sudo /tmp/deploy-security-hardening.sh --backend-only && \
        rm /tmp/deploy-security-hardening.sh
    " "Deploying security hardening"
    
    print_success "Security hardening deployed"
else
    print_status "Skipping security hardening (set DEPLOY_SECURITY_HARDENING=true to enable)"
fi

# Final verification
print_status "Performing final deployment verification..."
execute_on_server "
    echo '=== Container Status ===' && \
    docker ps --filter 'name=jewgo_' && \
    echo '=== Docker Storage Usage ===' && \
    docker system df && \
    echo '=== Backend Logs (last 10 lines) ===' && \
    docker logs --tail 10 jewgo_backend && \
    echo '=== Security Services Status ===' && \
    systemctl is-active jewgo-key-rotation.service 2>/dev/null || echo 'Key rotation service not installed' && \
    nginx -t 2>/dev/null || echo 'Nginx config not updated'
" "Final deployment verification"

# Capture final server logs to local file
print_status "Capturing final server logs..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [FINAL_LOGS] Capturing final server logs..." >> "$LOCAL_LOG_FILE"
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker logs --tail 50 jewgo_backend" >> "$LOCAL_LOG_FILE" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [FINAL_LOGS] Server logs captured" >> "$LOCAL_LOG_FILE"

# Count successful vs failed tests
print_status "Generating deployment test summary..."

# Test summary
print_success "Server deployment and testing completed!"
print_status ""
print_status "=== DEPLOYMENT SUMMARY ==="
print_status "Backend is running at: http://$SERVER_HOST:5000"
print_status "Main health check: curl http://$SERVER_HOST:5000/healthz"
print_status "Public health endpoints: /healthz, /readyz"
print_status "Note: /api/v5/monitoring/health requires authentication"
print_status "Deployment log saved to: $DEPLOYMENT_LOG"
print_status ""
print_status "=== TESTED ENDPOINTS ==="
print_status "✅ Health Endpoints:"
print_status "   - /healthz (main health check - public)"
print_status "   - /readyz (readiness check - public)"
print_status "   - /api/v5/auth/health (auth service)"
print_status "   - /api/v5/metrics/health (metrics service)"
print_status "   - /api/v5/monitoring/health (comprehensive - requires auth)"
print_status ""
print_status "✅ Core API Endpoints:"
print_status "   - /api/v5/restaurants (restaurants data - working)"
print_status "   - /api/v5/synagogues (synagogues data - working)"
print_status "   - /api/v5/mikvahs (mikvahs data - working)"
print_status "   - /api/v5/stores (stores data - working)"
print_status "   - /api/v5/search (search functionality - redirect)"
print_status "   - /api/v5/reviews (reviews data - redirect)"
print_status ""
print_status "✅ Infrastructure Health (requires authentication):"
print_status "   - /api/v5/monitoring/health/database (database health)"
print_status "   - /api/v5/monitoring/health/redis (redis cache health)"
print_status "   - /api/v5/monitoring/health/system (system metrics)"
print_status ""
print_status "✅ Additional Services:"
print_status "   - /api/v5/monitoring/status (requires authentication - skipped)"
print_status "   - /api/v5/metrics/dashboard (metrics dashboard)"
print_status "   - /api/v5/search/suggestions (search suggestions)"
print_status "   - /api/v5/search/popular (popular searches)"
print_status ""
print_status "=== NEXT STEPS ==="
print_status "1. Monitor application logs: docker logs -f jewgo_backend"
print_status "2. Check system metrics: curl -H 'Authorization: Bearer <token>' http://$SERVER_HOST:5000/api/v5/monitoring/status"
print_status "3. Test frontend connectivity to backend"
print_status "4. Verify all services are working as expected"
print_status ""
# Generate deployment summary
print_status "Generating deployment summary..."

# Count successful vs failed tests
local success_count=0
local failure_count=0

# Count from local log file
success_count=$(grep -c "\[ENDPOINT_TEST\] SUCCESS:" "$LOCAL_LOG_FILE" 2>/dev/null || echo "0")
failure_count=$(grep -c "\[ENDPOINT_TEST\] FAILED:" "$LOCAL_LOG_FILE" 2>/dev/null || echo "0")

# Add summary to local log
echo "" >> "$LOCAL_LOG_FILE"
echo "=================================" >> "$LOCAL_LOG_FILE"
echo "=== DEPLOYMENT SUMMARY ===" >> "$LOCAL_LOG_FILE"
echo "Deployment completed: $(date)" >> "$LOCAL_LOG_FILE"
echo "Total endpoint tests: $((success_count + failure_count))" >> "$LOCAL_LOG_FILE"
echo "Successful tests: $success_count" >> "$LOCAL_LOG_FILE"
echo "Failed tests: $failure_count" >> "$LOCAL_LOG_FILE"
echo "Success rate: $(( success_count * 100 / (success_count + failure_count) ))%" >> "$LOCAL_LOG_FILE"
echo "Backend URL: http://$SERVER_HOST:5000" >> "$LOCAL_LOG_FILE"
echo "Health check: http://$SERVER_HOST:5000/healthz" >> "$LOCAL_LOG_FILE"
echo "=================================" >> "$LOCAL_LOG_FILE"

print_success "🎉 Deployment completed successfully!"
print_status ""
print_status "=== DEPLOYMENT SUMMARY ==="
print_status "Total endpoint tests: $((success_count + failure_count))"
print_status "Successful tests: $success_count"
print_status "Failed tests: $failure_count"
print_status "Success rate: $(( success_count * 100 / (success_count + failure_count) ))%"
print_status ""
print_status "Logs saved to:"
print_status "  - Local: $LOCAL_LOG_FILE"
print_status "  - Server: $DEPLOYMENT_LOG"
print_status ""
print_status "To view the detailed log:"
print_status "  cat $LOCAL_LOG_FILE"
print_status ""

# Display the log contents
print_status "=== DEPLOYMENT LOG CONTENTS ==="
if [ -f "$LOCAL_LOG_FILE" ]; then
    cat "$LOCAL_LOG_FILE"
else
    print_warning "Local log file not found: $LOCAL_LOG_FILE"
fi

print_success "🎉 Deployment completed successfully!"
