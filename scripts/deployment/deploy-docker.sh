#!/bin/bash

# Docker Deployment Script for VPS
# This script deploys the JewGo application using Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="jewgo"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/jewgo-deploy.log"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a non-root user with sudo privileges."
    fi
}

# Check if Docker is installed and running
check_docker() {
    log "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker service."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    success "Docker and Docker Compose are available"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p /var/log
    sudo mkdir -p /opt/jewgo/uploads
    sudo mkdir -p /opt/jewgo/logs
    
    # Set proper permissions
    sudo chown -R $USER:$USER /opt/jewgo
    sudo chmod -R 755 /opt/jewgo
    
    success "Directories created successfully"
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database if it exists
    if docker ps -q -f name=jewgo-postgres | grep -q .; then
        log "Backing up PostgreSQL database..."
        docker exec jewgo-postgres pg_dump -U app_user app_db > "$BACKUP_PATH/database.sql"
    fi
    
    # Backup uploads
    if [ -d "/opt/jewgo/uploads" ]; then
        cp -r /opt/jewgo/uploads "$BACKUP_PATH/"
    fi
    
    # Backup logs
    if [ -d "/opt/jewgo/logs" ]; then
        cp -r /opt/jewgo/logs "$BACKUP_PATH/"
    fi
    
    success "Backup created at $BACKUP_PATH"
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" pull
    
    success "Images pulled successfully"
}

# Build custom images
build_images() {
    log "Building custom Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    success "Images built successfully"
}

# Stop existing containers
stop_containers() {
    log "Stopping existing containers..."
    
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    success "Containers stopped successfully"
}

# Start containers
start_containers() {
    log "Starting containers..."
    
    docker-compose -f "$COMPOSE_FILE" up -d
    
    success "Containers started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    log "Waiting for PostgreSQL..."
    timeout 60 bash -c 'until docker exec jewgo-postgres pg_isready -U app_user -d app_db; do sleep 2; done'
    
    # Wait for Redis
    log "Waiting for Redis..."
    timeout 30 bash -c 'until docker exec jewgo-redis redis-cli ping; do sleep 2; done'
    
    # Wait for Backend
    log "Waiting for Backend API..."
    timeout 60 bash -c 'until curl -f http://localhost:5000/health; do sleep 5; done'
    
    # Wait for Frontend
    log "Waiting for Frontend..."
    timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 5; done'
    
    success "All services are healthy"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait a bit more for the backend to be fully ready
    sleep 10
    
    # Run migrations through the backend container
    docker exec jewgo-backend python -c "
import sys
sys.path.append('/app')
from database.database_manager_v4 import DatabaseManager
db = DatabaseManager()
db.run_migrations()
print('Migrations completed successfully')
"
    
    success "Database migrations completed"
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Check PostgreSQL
    if ! docker exec jewgo-postgres pg_isready -U app_user -d app_db &> /dev/null; then
        error "PostgreSQL is not healthy"
    fi
    
    # Check Redis
    if ! docker exec jewgo-redis redis-cli ping &> /dev/null; then
        error "Redis is not healthy"
    fi
    
    # Check Backend
    if ! curl -f http://localhost:5000/health &> /dev/null; then
        error "Backend API is not healthy"
    fi
    
    # Check Frontend
    if ! curl -f http://localhost:3000 &> /dev/null; then
        error "Frontend is not healthy"
    fi
    
    success "All services are healthy"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    echo "Container Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  Nginx: http://localhost:80"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3001"
    echo ""
    echo "Logs:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Backend logs: docker logs jewgo-backend -f"
    echo "  Frontend logs: docker logs jewgo-frontend -f"
    echo "  Database logs: docker logs jewgo-postgres -f"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting JewGo Docker deployment..."
    
    check_permissions
    check_docker
    create_directories
    backup_data
    pull_images
    build_images
    stop_containers
    start_containers
    wait_for_services
    run_migrations
    check_health
    show_status
    
    success "Deployment completed successfully!"
    log "Application is now running at http://localhost"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    stop)
        log "Stopping all containers..."
        docker-compose -f "$COMPOSE_FILE" down
        success "All containers stopped"
        ;;
    restart)
        log "Restarting all containers..."
        docker-compose -f "$COMPOSE_FILE" restart
        success "All containers restarted"
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup_data
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status|cleanup|backup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  stop     - Stop all containers"
        echo "  restart  - Restart all containers"
        echo "  logs     - Show logs from all containers"
        echo "  status   - Show deployment status"
        echo "  cleanup  - Clean up old Docker resources"
        echo "  backup   - Create backup of current data"
        exit 1
        ;;
esac
