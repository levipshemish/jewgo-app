#!/bin/bash

# Memory optimization script
echo "🔧 Optimizing server memory usage..."

# 1. Clear system caches
echo "Clearing system caches..."
sync
echo 3 > /proc/sys/vm/drop_caches

# 2. Optimize swap usage
echo "Optimizing swap usage..."
echo 10 > /proc/sys/vm/swappiness
echo 50 > /proc/sys/vm/vfs_cache_pressure

# 3. Set container memory limits
echo "Setting container memory limits..."

# Get current container stats
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 4. Optimize Docker daemon
echo "Optimizing Docker daemon..."
cat > /etc/docker/daemon.json << "DOCKER_EOF"
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "default-ulimits": {
        "memlock": {
            "Hard": -1,
            "Name": "memlock",
            "Soft": -1
        }
    }
}
DOCKER_EOF

# 5. Restart Docker daemon
systemctl restart docker

# 6. Set memory limits for containers
echo "Setting memory limits for containers..."

# Update docker-compose.yml with memory limits
cat > /tmp/docker-compose-memory.yml << "COMPOSE_EOF"
version: "3.8"
services:
  jewgo-backend-new:
    image: jewgo-backend:latest
    container_name: jewgo-backend-new
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://app_user:Jewgo123@localhost:6432/app_db
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    restart: unless-stopped

  jewgo-nginx:
    image: nginx:alpine
    container_name: jewgo-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/letsencrypt
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M
    restart: unless-stopped

  jewgo-pgbouncer:
    image: pgbouncer/pgbouncer:latest
    container_name: jewgo-pgbouncer
    ports:
      - "6432:6432"
    environment:
      - DATABASES_HOST=localhost
      - DATABASES_PORT=5432
      - DATABASES_USER=app_user
      - DATABASES_PASSWORD=Jewgo123
      - DATABASES_DBNAME=app_db
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
    deploy:
      resources:
        limits:
          memory: 64M
        reservations:
          memory: 32M
    restart: unless-stopped
COMPOSE_EOF

echo "✅ Memory optimization completed!"
echo "📊 Current memory usage:"
free -h
echo ""
echo "📊 Current swap usage:"
swapon --show
