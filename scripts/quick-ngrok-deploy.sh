#!/bin/bash

# Quick JewGo Production Deployment with Ngrok
# ============================================
# Simple one-time production deployment script

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

echo "🚀 JewGo Quick Production Deployment with Ngrok"
echo "=============================================="
echo ""

# Check prerequisites
log "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    error "Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is required but not installed"
    exit 1
fi

if ! command -v ngrok &> /dev/null; then
    warn "ngrok not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ngrok/ngrok/ngrok
    else
        error "Please install ngrok manually from https://ngrok.com/download"
        exit 1
    fi
fi

# Check ngrok auth
if ! ngrok config check &> /dev/null; then
    warn "ngrok needs authentication"
    echo "Get your free token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    read -p "Enter your ngrok authtoken: " NGROK_TOKEN
    ngrok authtoken "$NGROK_TOKEN"
fi

log "Prerequisites OK"

# Create environment files
log "Setting up environment..."

# Backend environment
cat > "$PROJECT_ROOT/config/environment/backend.production.env" << EOF
FLASK_ENV=production
FLASK_SECRET_KEY=jewgo-prod-$(openssl rand -hex 16)
FLASK_DEBUG=False
DATABASE_URL=postgresql://jewgo_user:jewgo_password@postgres:5432/jewgo
REDIS_URL=redis://redis:6379
CORS_ORIGINS=https://*.ngrok.io,https://*.ngrok-free.app,http://localhost:3000
JWT_SECRET_KEY=jewgo-jwt-$(openssl rand -hex 16)
LOG_LEVEL=INFO
PORT=8082
ENVIRONMENT=production
EOF

# Frontend environment
cat > "$PROJECT_ROOT/config/environment/frontend.production.env" << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://backend:8082
NEXT_PUBLIC_BACKEND_URL=http://backend:8082
NEXT_PUBLIC_URL=http://localhost:3000
DATABASE_URL=postgresql://jewgo_user:jewgo_password@postgres:5432/jewgo
NEXTAUTH_SECRET=jewgo-nextauth-$(openssl rand -hex 16)
NEXTAUTH_URL=http://localhost:3000
EOF

# Create docker-compose file
log "Creating deployment configuration..."

cat > "$PROJECT_ROOT/docker-compose.ngrok.yml" << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jewgo
      POSTGRES_USER: jewgo_user
      POSTGRES_PASSWORD: jewgo_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    networks:
      - jewgo-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - jewgo-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file:
      - ./config/environment/backend.production.env
    volumes:
      - ./backend:/app
    ports:
      - "8082:8082"
    depends_on:
      - postgres
      - redis
    networks:
      - jewgo-network
    restart: unless-stopped
    command: gunicorn -c config/gunicorn.conf.py app:app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.optimized
    env_file:
      - ./config/environment/frontend.production.env
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - jewgo-network
    restart: unless-stopped

  ngrok-frontend:
    image: ngrok/ngrok:latest
    ports:
      - "4040:4040"
    environment:
      - NGROK_AUTHTOKEN=31adOo1S7qte2XRrfyp06yW8VvE_5eqRwUNG8gUCxGgM6copE
    command: http frontend:3000 --log=stdout
    depends_on:
      - frontend
    networks:
      - jewgo-network
    restart: unless-stopped

  ngrok-backend:
    image: ngrok/ngrok:latest
    ports:
      - "4041:4040"
    environment:
      - NGROK_AUTHTOKEN=31adOo1S7qte2XRrfyp06yW8VvE_5eqRwUNG8gUCxGgM6copE
    command: http backend:8082 --log=stdout
    depends_on:
      - backend
    networks:
      - jewgo-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  jewgo-network:
    driver: bridge
EOF

# Deploy
log "Building and starting services..."

# Stop any existing deployment
docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" down --remove-orphans 2>/dev/null || true

# Build and start
docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" build --no-cache
docker-compose -f "$PROJECT_ROOT/docker-compose.ngrok.yml" up -d

# Wait for services
log "Waiting for services to start..."
sleep 45

# Check health
log "Checking service health..."

# Check backend
if curl -f http://localhost:8082/health >/dev/null 2>&1; then
    log "✓ Backend is healthy"
else
    warn "Backend health check failed, but continuing..."
fi

# Check frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    log "✓ Frontend is healthy"
else
    warn "Frontend health check failed, but continuing..."
fi

# Get ngrok URLs
log "Getting ngrok URLs..."
sleep 10

FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "Not available")
BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "Not available")

echo ""
echo "🎉 JewGo Production Deployment Complete!"
echo "========================================"
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔧 Backend API URL: $BACKEND_URL"
echo ""
echo "🌐 Local URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8082"
echo "   Database: localhost:5432"
echo "   Redis:    localhost:6379"
echo ""
echo "📊 Monitoring:"
echo "   Frontend ngrok: http://localhost:4040"
echo "   Backend ngrok:  http://localhost:4041"
echo ""
echo "🛠️  Management:"
echo "   View logs: docker-compose -f docker-compose.ngrok.yml logs -f"
echo "   Stop:      docker-compose -f docker-compose.ngrok.yml down"
echo ""
echo "⚠️  Remember to stop the deployment when done!"
echo ""

log "Deployment completed successfully!"
