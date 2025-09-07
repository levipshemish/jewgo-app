#!/bin/bash

echo "🔄 Setting up load balancing for high availability..."

# 1. Create a second backend instance
echo "Creating second backend instance..."
docker run -d --name jewgo-backend-2 \
  --network host \
  -e DATABASE_URL=postgresql://app_user:Jewgo123@localhost:6432/app_db \
  -e REDIS_URL=redis://redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345 \
  -e ENVIRONMENT=production \
  -e PORT=5001 \
  -p 5001:5001 \
  jewgo-backend:latest

# 2. Update Nginx upstream configuration
echo "Updating Nginx upstream configuration..."
cat > /tmp/nginx-upstream.conf << "NGINX_EOF"
upstream backend {
    least_conn;
    server localhost:5000 max_fails=3 fail_timeout=30s weight=1;
    server localhost:5001 max_fails=3 fail_timeout=30s weight=1;
    keepalive 32;
}

upstream backend_health {
    server localhost:5000;
    server localhost:5001;
}
NGINX_EOF

# 3. Create health check script
echo "Creating health check script..."
cat > /usr/local/bin/backend-health-check.sh << "HEALTH_EOF"
#!/bin/bash

check_backend() {
    local port=\$1
    local response=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:\$port/health)
    if [ "\$response" = "200" ]; then
        echo "Backend on port \$port is healthy"
        return 0
    else
        echo "Backend on port \$port is unhealthy (HTTP \$response)"
        return 1
    fi
}

# Check both backends
check_backend 5000
backend1_healthy=\$?

check_backend 5001
backend2_healthy=\$?

# If both are healthy, return 0
if [ \$backend1_healthy -eq 0 ] && [ \$backend2_healthy -eq 0 ]; then
    echo "All backends are healthy"
    exit 0
else
    echo "Some backends are unhealthy"
    exit 1
fi
HEALTH_EOF

chmod +x /usr/local/bin/backend-health-check.sh

# 4. Create load balancer monitoring script
echo "Creating load balancer monitoring script..."
cat > /usr/local/bin/load-balancer-monitor.sh << "MONITOR_EOF"
#!/bin/bash

LOG_FILE="/var/log/load-balancer-monitor.log"

log() {
    echo "[\$(date)] \$1" | tee -a "\$LOG_FILE"
}

check_load_balancer() {
    log "Checking load balancer status..."
    
    # Check Nginx status
    if docker ps | grep -q jewgo-nginx; then
        log "✅ Nginx is running"
    else
        log "❌ Nginx is not running"
        docker start jewgo-nginx
    fi
    
    # Check backend instances
    if docker ps | grep -q jewgo-backend-new; then
        log "✅ Backend 1 (port 5000) is running"
    else
        log "❌ Backend 1 (port 5000) is not running"
        docker start jewgo-backend-new
    fi
    
    if docker ps | grep -q jewgo-backend-2; then
        log "✅ Backend 2 (port 5001) is running"
    else
        log "❌ Backend 2 (port 5001) is not running"
        docker start jewgo-backend-2
    fi
    
    # Check PgBouncer
    if docker ps | grep -q jewgo-pgbouncer; then
        log "✅ PgBouncer is running"
    else
        log "❌ PgBouncer is not running"
        docker start jewgo-pgbouncer
    fi
    
    # Test load balancing
    log "Testing load balancing..."
    for i in {1..5}; do
        response=\$(curl -s http://localhost/health)
        if [ "\$response" = "healthy" ]; then
            log "✅ Load balancer test \$i: SUCCESS"
        else
            log "❌ Load balancer test \$i: FAILED"
        fi
        sleep 1
    done
}

check_load_balancer
MONITOR_EOF

chmod +x /usr/local/bin/load-balancer-monitor.sh

# 5. Add cron job for monitoring
echo "Adding cron job for load balancer monitoring..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/load-balancer-monitor.sh") | crontab -

echo "✅ Load balancing setup completed!"
echo "📊 Current container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
