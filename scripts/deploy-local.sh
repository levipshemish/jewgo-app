#!/bin/bash

# Local deployment helper for JewGo backend
# Mirrors the remote deploy workflow but runs everything on the host machine

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/deployment-logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOCAL_LOG_FILE="$LOG_DIR/deployment-local-$TIMESTAMP.log"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

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

print_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $message" >> "$LOCAL_LOG_FILE"
}

fail() {
    print_error "$1"
    exit 1
}

cd "$ROOT_DIR"

print_status "Starting local deployment (log: $LOCAL_LOG_FILE)"

# Sanity checks
command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
command -v docker compose >/dev/null 2>&1 || fail "Docker Compose V2 (docker compose) is required"

if [ ! -f .env ]; then
    fail ".env file not found in repository root"
fi

print_status "Ensuring Redis services are running"
if [[ "${ENABLE_REDIS_CLUSTER:-true}" == "true" ]]; then
    docker compose up -d redis-master redis-slave-1 redis-slave-2 >> "$LOCAL_LOG_FILE" 2>&1
else
    print_status "Skipping Redis cluster startup (ENABLE_REDIS_CLUSTER=false)"
fi

if [[ "${SKIP_BACKEND_BUILD:-false}" != "true" ]]; then
    print_status "Building backend image"
    docker compose build backend >> "$LOCAL_LOG_FILE" 2>&1
else
    print_status "Skipping backend build (SKIP_BACKEND_BUILD=true)"
fi

print_status "Starting backend container"
docker compose up -d backend >> "$LOCAL_LOG_FILE" 2>&1

print_status "Waiting for backend health check"
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -sf http://localhost:5000/healthz >/dev/null 2>&1; then
        print_success "Backend passed health check"
        break
    fi
    print_status "Health check attempt $attempt/$max_attempts failed; retrying in 5s"
    sleep 5
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    print_error "Backend failed health check after $max_attempts attempts"
    print_status "Recent backend logs:"
    docker compose logs --tail 100 backend | tee -a "$LOCAL_LOG_FILE"
    exit 1
fi

print_status "Current service status"
docker compose ps >> "$LOCAL_LOG_FILE"
docker compose ps

print_success "Local deployment completed"

echo ""
echo "Next steps:"
echo "  - Review logs in $LOCAL_LOG_FILE"
echo "  - Use ./scripts/deploy-to-server.sh for remote deployment"

