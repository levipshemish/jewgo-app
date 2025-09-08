#!/bin/bash

# Quick deployment script for JewGo monitoring to server
# Usage: ./quick-deploy.sh your-server.com ubuntu

set -e

# Get server details from command line arguments
SERVER_HOST="${1:-}"
SERVER_USER="${2:-ubuntu}"
SERVER_PORT="${3:-22}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server host is provided
if [ -z "$SERVER_HOST" ]; then
    print_error "Server host is required"
    echo "Usage: $0 <server-host> [username] [port]"
    echo "Example: $0 your-server.com ubuntu 22"
    exit 1
fi

print_status "Deploying JewGo monitoring to $SERVER_USER@$SERVER_HOST:$SERVER_PORT"

# Set environment variables and run deployment
export SERVER_HOST="$SERVER_HOST"
export SERVER_USER="$SERVER_USER"
export SERVER_PORT="$SERVER_PORT"
export SSH_KEY="~/.ssh/id_rsa"
export REMOTE_PATH="/home/$SERVER_USER/jewgo-app"

# Run the main deployment script
./monitoring/deploy-to-server.sh

print_success "Quick deployment completed!"
echo ""
echo "Access your monitoring dashboard at:"
echo "  Grafana: http://$SERVER_HOST:3001 (admin/admin123)"
echo "  Prometheus: http://$SERVER_HOST:9090"
echo "  AlertManager: http://$SERVER_HOST:9093"
