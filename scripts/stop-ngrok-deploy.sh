#!/bin/bash

# Stop JewGo Ngrok Deployment
# ===========================
# Cleanup script to stop the production deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] $1${NC}"; }

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🛑 Stopping JewGo Ngrok Deployment"
echo "=================================="
echo ""

# Check if deployment is running
if ! docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" ps | grep -q "Up"; then
    warn "No ngrok deployment found running"
    exit 0
fi

# Stop services
log "Stopping services..."
docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" down --volumes --remove-orphans

# Clean up environment files
log "Cleaning up environment files..."
rm -f "$PROJECT_ROOT/config/environment/backend.production.env"
rm -f "$PROJECT_ROOT/config/environment/frontend.production.env"
rm -f "$PROJECT_ROOT/docker-compose.ngrok.yml"

# Clean up any dangling images (optional)
read -p "Remove unused Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Removing unused Docker images..."
    docker image prune -f
fi

log "Deployment stopped and cleaned up successfully!"
echo ""
echo "✅ All services stopped"
echo "✅ Environment files cleaned up"
echo "✅ Docker compose file removed"
echo ""
