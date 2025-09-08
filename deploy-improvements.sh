#!/bin/bash

# Deploy JewGo Backend Improvements
# This script deploys all the performance and scalability improvements

set -e

echo "🚀 Deploying JewGo Backend Improvements..."

# Configuration
SERVER="ubuntu@141.148.50.111"
APP_DIR="/home/ubuntu/jewgo-app"
BACKUP_DIR="/home/ubuntu/backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run commands on server
run_on_server() {
    ssh "$SERVER" "$1"
}

# Function to sync files to server
sync_to_server() {
    local source="$1"
    local dest="$2"
    print_status "Syncing $source to $dest"
    rsync -avz --delete "$source" "$SERVER:$dest"
}

# Create backup
print_status "Creating backup of current deployment..."
run_on_server "mkdir -p $BACKUP_DIR"
run_on_server "cp -r $APP_DIR $BACKUP_DIR/"

# Stop current services
print_status "Stopping current services..."
run_on_server "cd $APP_DIR && docker-compose down --remove-orphans"

# Sync new files
print_status "Syncing improved backend files..."

# Enhanced caching service
sync_to_server "backend/services/enhanced_restaurant_cache.py" "$APP_DIR/backend/services/"

# Rate limiter
sync_to_server "backend/utils/rate_limiter.py" "$APP_DIR/backend/utils/"

# Optimized database manager
sync_to_server "backend/database/optimized_database_manager.py" "$APP_DIR/backend/database/"

# CDN manager
sync_to_server "backend/utils/cdn_manager.py" "$APP_DIR/backend/utils/"

# Updated restaurant service
sync_to_server "backend/services/restaurant_service_v4.py" "$APP_DIR/backend/services/"

# Updated API routes
sync_to_server "backend/routes/api_v4.py" "$APP_DIR/backend/routes/"

# Load balancer configuration
sync_to_server "nginx/load_balancer.conf" "$APP_DIR/nginx/"

# Scaling Docker Compose
sync_to_server "docker-compose.scaling.yml" "$APP_DIR/"

# Update requirements if needed
print_status "Updating Python requirements..."
run_on_server "cd $APP_DIR/backend && pip install -r requirements.txt"

# Create Redis configuration
print_status "Creating Redis configuration..."
run_on_server "mkdir -p $APP_DIR/redis"
cat > /tmp/redis.conf << EOF
# Redis configuration for JewGo
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
tcp-keepalive 60
timeout 300
EOF
sync_to_server "/tmp/redis.conf" "$APP_DIR/redis/"

# Create PostgreSQL configuration files
print_status "Creating PostgreSQL configuration..."
run_on_server "mkdir -p $APP_DIR/postgres"

# Primary PostgreSQL config
cat > /tmp/postgresql.conf << EOF
# PostgreSQL configuration for JewGo Primary
listen_addresses = '*'
port = 5432
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Replication settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on
EOF
sync_to_server "/tmp/postgresql.conf" "$APP_DIR/postgres/"

# Replica PostgreSQL config
cat > /tmp/postgresql-replica.conf << EOF
# PostgreSQL configuration for JewGo Replica
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 128MB
effective_cache_size = 512MB
maintenance_work_mem = 32MB
checkpoint_completion_target = 0.9
wal_buffers = 8MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2MB
min_wal_size = 512MB
max_wal_size = 2GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2

# Replication settings
hot_standby = on
EOF
sync_to_server "/tmp/postgresql-replica.conf" "$APP_DIR/postgres/"

# pg_hba.conf
cat > /tmp/pg_hba.conf << EOF
# PostgreSQL Client Authentication Configuration
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
host    replication     replicator      0.0.0.0/0               md5
EOF
sync_to_server "/tmp/pg_hba.conf" "$APP_DIR/postgres/"

# Update environment variables
print_status "Updating environment variables..."
run_on_server "cd $APP_DIR && cat >> .env << 'EOF'

# Performance Improvements
REDIS_URL=redis://localhost:6379/0
CACHE_TYPE=redis
CACHE_REDIS_URL=redis://localhost:6379/0
CACHE_DEFAULT_TIMEOUT=1800
CACHE_KEY_PREFIX=jewgo:

# Database Optimization
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# CDN Configuration
CDN_PROVIDER=cloudflare
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_CDN_URL=https://cdn.jewgo.app

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE_URL=redis://localhost:6379/1

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
EOF"

# Start services with scaling configuration
print_status "Starting services with scaling configuration..."
run_on_server "cd $APP_DIR && docker-compose -f docker-compose.scaling.yml up -d"

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Health check
print_status "Performing health checks..."

# Check backend health
if run_on_server "curl -f http://localhost:5000/health > /dev/null 2>&1"; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
    exit 1
fi

# Check Redis
if run_on_server "docker exec jewgo-redis redis-cli ping > /dev/null 2>&1"; then
    print_success "Redis health check passed"
else
    print_error "Redis health check failed"
    exit 1
fi

# Check PostgreSQL
if run_on_server "docker exec jewgo-postgres-primary pg_isready -U postgres > /dev/null 2>&1"; then
    print_success "PostgreSQL health check passed"
else
    print_error "PostgreSQL health check failed"
    exit 1
fi

# Check load balancer
if run_on_server "curl -f http://localhost/health > /dev/null 2>&1"; then
    print_success "Load balancer health check passed"
else
    print_error "Load balancer health check failed"
    exit 1
fi

# Test API endpoints
print_status "Testing API endpoints..."

# Test restaurant list with caching
if run_on_server "curl -f 'http://localhost/api/restaurants?limit=5' > /dev/null 2>&1"; then
    print_success "Restaurant API test passed"
else
    print_error "Restaurant API test failed"
fi

# Test search endpoint
if run_on_server "curl -f 'http://localhost/api/restaurants/search?q=kosher' > /dev/null 2>&1"; then
    print_success "Search API test passed"
else
    print_error "Search API test failed"
fi

# Check monitoring
print_status "Checking monitoring services..."

# Check Prometheus
if run_on_server "curl -f http://localhost:9090/-/healthy > /dev/null 2>&1"; then
    print_success "Prometheus is running"
else
    print_warning "Prometheus health check failed"
fi

# Check Grafana
if run_on_server "curl -f http://localhost:3001/api/health > /dev/null 2>&1"; then
    print_success "Grafana is running"
else
    print_warning "Grafana health check failed"
fi

# Performance test
print_status "Running performance test..."
run_on_server "cd $APP_DIR && curl -w '@-' -o /dev/null -s 'http://localhost/api/restaurants?limit=100' << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF"

# Show service status
print_status "Service status:"
run_on_server "cd $APP_DIR && docker-compose -f docker-compose.scaling.yml ps"

# Show resource usage
print_status "Resource usage:"
run_on_server "docker stats --no-stream --format 'table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}'"

print_success "🎉 JewGo Backend Improvements Deployed Successfully!"

echo ""
echo "📊 Monitoring URLs:"
echo "  - Grafana: http://141.148.50.111:3001 (admin/admin123)"
echo "  - Prometheus: http://141.148.50.111:9090"
echo "  - API Health: http://141.148.50.111/health"
echo ""
echo "🔧 New Features:"
echo "  ✅ Enhanced Redis caching for restaurant data"
echo "  ✅ Rate limiting on API endpoints"
echo "  ✅ Optimized database queries with connection pooling"
echo "  ✅ Load balancing with Nginx"
echo "  ✅ PostgreSQL read replicas"
echo "  ✅ CDN integration ready"
echo "  ✅ Auto-scaling configuration"
echo "  ✅ Comprehensive monitoring"
echo ""
echo "📈 Performance Improvements:"
echo "  - Reduced database load through caching"
echo "  - Better resource utilization with connection pooling"
echo "  - Improved response times with load balancing"
echo "  - Enhanced scalability with read replicas"
echo "  - Better monitoring and observability"
echo ""
echo "🚀 Next Steps:"
echo "  1. Configure CDN provider credentials in .env"
echo "  2. Set up SSL certificates for HTTPS"
echo "  3. Configure auto-scaling triggers"
echo "  4. Set up alerting rules in Grafana"
echo "  5. Monitor performance metrics"
