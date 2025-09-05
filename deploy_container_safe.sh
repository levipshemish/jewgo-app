#!/bin/bash
set -euo pipefail

# Resolve base dir relative to this script, with overrides
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="${APP_ROOT:-$SCRIPT_DIR}"          # allow override via env
export HOME="${HOME:-/root}"                 # containers usually run as root

# If you truly need a repo/app dir distinct from the script location:
APP_DIR="${APP_DIR:-$APP_ROOT}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

echo "Starting deployment..."
echo "Script directory: $SCRIPT_DIR"
echo "App directory: $APP_DIR"
echo "Working directory: $(pwd)"

# Change to the app directory
cd "$APP_DIR"

echo "Pulling latest changes..."
git pull origin main

echo "Stopping containers..."
docker-compose down

echo "Building containers..."
docker-compose build --no-cache

echo "Starting containers..."
docker-compose up -d

echo "Waiting for services..."
sleep 30

echo "Health check..."
curl -f -s https://api.jewgo.app/health && echo " - API OK" || echo " - API FAILED"

echo "Deployment completed!"
