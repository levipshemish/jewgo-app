#!/bin/bash

# JewGo Production Deployment with Ngrok
# ======================================
# This script creates a one-time production deployment of the JewGo system
# with ngrok for external access.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYMENT_NAME="jewgo-production-$(date +%Y%m%d-%H%M%S)"
BACKEND_PORT=8081
FRONTEND_PORT=3000
DATABASE_PORT=5432
REDIS_PORT=6379

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check ngrok
    if ! command -v ngrok &> /dev/null; then
        warn "ngrok is not installed. Installing ngrok..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install ngrok/ngrok/ngrok
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
            echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
            sudo apt update && sudo apt install ngrok
        else
            error "Unsupported OS. Please install ngrok manually from https://ngrok.com/download"
            exit 1
        fi
    fi
    
    # Check if ngrok is authenticated
    if ! ngrok config check &> /dev/null; then
        warn "ngrok is not authenticated. Please run 'ngrok authtoken YOUR_TOKEN' first."
        info "You can get a free token from https://dashboard.ngrok.com/get-started/your-authtoken"
        read -p "Enter your ngrok authtoken: " NGROK_TOKEN
        ngrok authtoken "$NGROK_TOKEN"
    fi
    
    log "Prerequisites check completed successfully"
}

# Create production environment files
setup_environment() {
    log "Setting up production environment..."
    
    # Create backend production environment
    cat > "$PROJECT_ROOT/config/environment/backend.production.env" << EOF
# Production Environment Configuration for Ngrok Deployment
FLASK_ENV=production
FLASK_SECRET_KEY=jewgo-production-secret-$(openssl rand -hex 32)
FLASK_DEBUG=False

# Database Configuration
DATABASE_URL=postgresql://jewgo_user:jewgo_password@postgres:5432/jewgo

# Redis Configuration
REDIS_URL=redis://redis:6379

# CORS Configuration - Allow ngrok domains
CORS_ORIGINS=https://*.ngrok.io,https://*.ngrok-free.app,http://localhost:3000

# Security Configuration
JWT_SECRET_KEY=jewgo-jwt-secret-$(openssl rand -hex 32)

# Google API Keys (you'll need to set these)
GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY:-}
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-}

# Logging Configuration
LOG_LEVEL=INFO

# Rate Limiting
RATELIMIT_DEFAULT=200 per day;50 per hour;10 per minute

# Server Configuration
PORT=$BACKEND_PORT

# Environment
ENVIRONMENT=production
EOF

    # Create frontend production environment
    cat > "$PROJECT_ROOT/config/environment/frontend.production.env" << EOF
# Frontend Production Environment for Ngrok Deployment
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://backend:$BACKEND_PORT
NEXT_PUBLIC_BACKEND_URL=http://backend:$BACKEND_PORT
NEXT_PUBLIC_URL=http://localhost:$FRONTEND_PORT

# Database (for NextAuth if needed)
DATABASE_URL=postgresql://jewgo_user:jewgo_password@postgres:5432/jewgo

# NextAuth Configuration
NEXTAUTH_SECRET=jewgo-nextauth-secret-$(openssl rand -hex 32)
NEXTAUTH_URL=http://localhost:$FRONTEND_PORT

# SMTP Configuration (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-info@jewgo.com}
EOF

    log "Environment files created successfully"
}

# Create production docker-compose file
create_production_compose() {
    log "Creating production docker-compose configuration..."
    
    cat > "$PROJECT_ROOT/docker-compose.production-ngrok.yml" << EOF
version: '3.8'

services:
  # PostgreSQL Database
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
      - "$DATABASE_PORT:5432"
    networks:
      - jewgo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jewgo_user -d jewgo"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "$REDIS_PORT:6379"
    networks:
      - jewgo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        - BUILDKIT_INLINE_CACHE=1
    env_file:
      - ./config/environment/backend.production.env
    volumes:
      - ./backend:/app
    ports:
      - "$BACKEND_PORT:$BACKEND_PORT"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - jewgo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:$BACKEND_PORT/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    command: gunicorn -c config/gunicorn.conf.py app:app

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.optimized
      args:
        - BUILDKIT_INLINE_CACHE=1
    env_file:
      - ./config/environment/frontend.production.env
    ports:
      - "$FRONTEND_PORT:3000"
    depends_on:
      - backend
    networks:
      - jewgo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Ngrok tunnels
  ngrok-frontend:
    image: ngrok/ngrok:latest
    ports:
      - "4040:4040"
    environment:
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN:-}
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
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN:-}
    command: http backend:$BACKEND_PORT --log=stdout
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

    log "Production docker-compose file created"
}

# Build and start services
deploy_services() {
    log "Building and deploying services..."
    
    # Stop any existing containers
    docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" down --remove-orphans 2>/dev/null || true
    
    # Build images
    log "Building Docker images..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check database
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" exec -T postgres pg_isready -U jewgo_user -d jewgo >/dev/null 2>&1; then
        log "✓ Database is healthy"
    else
        error "✗ Database health check failed"
        return 1
    fi
    
    # Check Redis
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" exec -T redis redis-cli ping >/dev/null 2>&1; then
        log "✓ Redis is healthy"
    else
        error "✗ Redis health check failed"
        return 1
    fi
    
    # Check backend
    if curl -f http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
        log "✓ Backend is healthy"
    else
        error "✗ Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
        log "✓ Frontend is healthy"
    else
        error "✗ Frontend health check failed"
        return 1
    fi
    
    log "All services are healthy!"
}

# Get ngrok URLs
get_ngrok_urls() {
    log "Getting ngrok URLs..."
    
    # Wait for ngrok to start
    sleep 10
    
    # Get frontend URL
    FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "Not available")
    
    # Get backend URL
    BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "Not available")
    
    echo ""
    echo "=========================================="
    echo "🎉 JewGo Production Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "📱 Frontend URL: $FRONTEND_URL"
    echo "🔧 Backend API URL: $BACKEND_URL"
    echo ""
    echo "🌐 Local URLs:"
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT"
    echo "   Database: localhost:$DATABASE_PORT"
    echo "   Redis:    localhost:$REDIS_PORT"
    echo ""
    echo "📊 Monitoring:"
    echo "   Frontend ngrok: http://localhost:4040"
    echo "   Backend ngrok:  http://localhost:4041"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   View logs: docker-compose -f docker-compose.production-ngrok.yml logs -f"
    echo "   Stop:      docker-compose -f docker-compose.production-ngrok.yml down"
    echo "   Restart:   docker-compose -f docker-compose.production-ngrok.yml restart"
    echo ""
    echo "⚠️  IMPORTANT: This is a production deployment with real data!"
    echo "   - Keep the ngrok URLs secure"
    echo "   - Monitor the logs for any issues"
    echo "   - Remember to stop the deployment when done"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml" down --volumes --remove-orphans 2>/dev/null || true
    rm -f "$PROJECT_ROOT/docker-compose.production-ngrok.yml"
    rm -f "$PROJECT_ROOT/config/environment/backend.production.env"
    rm -f "$PROJECT_ROOT/config/environment/frontend.production.env"
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting JewGo Production Deployment with Ngrok"
    log "Deployment name: $DEPLOYMENT_NAME"
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]] || [[ ! -d "$PROJECT_ROOT/backend" ]]; then
        error "This script must be run from the JewGo project root directory"
        exit 1
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Create production compose file
    create_production_compose
    
    # Deploy services
    deploy_services
    
    # Get ngrok URLs
    get_ngrok_urls
    
    log "Deployment completed successfully!"
    log "Use 'docker-compose -f docker-compose.production-ngrok.yml logs -f' to monitor logs"
    log "Use 'docker-compose -f docker-compose.production-ngrok.yml down' to stop the deployment"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
