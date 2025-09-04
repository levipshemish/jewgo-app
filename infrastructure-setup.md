# JewGo Backend Infrastructure Setup

## Overview
Complete production infrastructure with HTTPS, auto-deployment, monitoring, horizontal scaling, Redis, and load balancing.

## Components Installed

### 1. HTTPS/SSL (Let's Encrypt)
- Domain: api.jewgo.app
- Certificate: /etc/letsencrypt/live/api.jewgo.app/
- Auto-renewal: Configured
- Status: ✅ Active and working

### 2. Load Balancer (Nginx)
- Config: /etc/nginx/sites-available/jewgo-loadbalancer
- SSL termination and traffic distribution
- Health check endpoint: /health/lb
- Status: ✅ Active and distributing traffic

### 3. Backend Instances
- Instance 1: jewgo-backend.service (Port 8082)
- Instance 2: jewgo-backend-2.service (Port 8083)  
- Instance 3: jewgo-backend-3.service (Port 8084)
- All managed by systemd
- Status: ✅ All 3 instances running and healthy

### 4. Redis Configuration
- Config: /etc/redis/redis.conf
- Password: ddbdbe33595452921b4ea6b03d7975ba
- Memory-only mode (no persistence)
- Port: 6379
- Status: ✅ Running and integrated

### 5. Database Read Replicas
- User: jewgo_readonly
- Database: app_db
- Permissions: SELECT only
- Status: ✅ User created and configured

## Environment Variables
```bash
export REDIS_PASSWORD="ddbdbe33595452921b4ea6b03d7975ba"
export REDIS_HOST="127.0.0.1"
export REDIS_PORT="6379"
export INSTANCE_ID="jewgo-backend-1" # Per instance
export PORT="8082" # Per instance
```

## Service Management
```bash
# Start all services
sudo systemctl start jewgo-backend*

# Check status
sudo systemctl status jewgo-backend*

# Restart all
sudo systemctl restart jewgo-backend*
```

## Health Check Endpoints
- Individual: http://127.0.0.1:8082/health/lb
- Load Balancer: https://api.jewgo.app/health/lb
- Basic Health: https://api.jewgo.app/healthz

## Redis Commands
```bash
# Connect to Redis
redis-cli -a "ddbdbe33595452921b4ea6b03d7975ba"

# Check session data
keys "jewgo:*"

# Monitor Redis
monitor
```

## Load Testing
```bash
# Run comprehensive load test
./scripts/load-test.sh

# Test session sharing
curl -c cookies.txt https://api.jewgo.app/health/lb
curl -b cookies.txt https://api.jewgo.app/health/lb
```

## Troubleshooting
- Redis stuck: sudo pkill -9 -f redis-server
- Service logs: sudo journalctl -u jewgo-backend*
- Nginx config test: sudo nginx -t
- Redis config: /etc/redis/redis.conf

## Backup Commands
```bash
# Backup Nginx config
sudo cp /etc/nginx/sites-available/jewgo-loadbalancer ~/nginx-backup.conf

# Backup Redis config  
sudo cp /etc/redis/redis.conf ~/redis-backup.conf

# Backup systemd services
sudo cp /etc/systemd/system/jewgo-backend*.service ~/
```

## Deployment Checklist
- [x] All 3 backend instances running
- [x] Nginx load balancer active
- [x] Redis running and accessible
- [x] SSL certificates valid
- [x] Health checks passing
- [x] Load balancer distributing traffic

## Current Status: PRODUCTION READY ✅
