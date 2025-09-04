# JewGo Backend VPS Deployment Guide

## Overview
This guide covers deploying the JewGo backend to an Ubuntu VPS with systemd services, local PostgreSQL, and Redis.

## Prerequisites
- Ubuntu VPS with root/sudo access
- PostgreSQL installed and running
- Redis installed and running
- Python 3.12+ with virtual environment

## VPS Setup Steps

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Python dependencies
sudo apt install python3-venv python3-pip -y
```

### 2. Setup Database
```bash
# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE app_db;
CREATE USER app_user WITH PASSWORD 'Jewgo123';
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
\q

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Setup Redis
```bash
# Configure Redis password
sudo nano /etc/redis/redis.conf
# Add: requirepass ddbdbe33595452921b4ea6b03d7975ba

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 4. Deploy Application
```bash
# Clone/pull the repository
cd /srv
sudo git clone https://github.com/mml555/jewgo-app.git jewgo
cd jewgo

# Create virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Run the deployment script
sudo ./scripts/deploy-vps.sh
```

## Service Configuration

### Systemd Services
The deployment creates three systemd services:
- `jewgo-backend` - Port 8082
- `jewgo-backend-2` - Port 8083  
- `jewgo-backend-3` - Port 8084

### Environment Variables
Key environment variables are set in `config/environment/active/backend.vps.env`:
- `DATABASE_URL` - Local PostgreSQL connection
- `REDIS_URL` - Local Redis connection
- `PORT` - Set per service via systemd environment

## Management Commands

### Service Management
```bash
# Check status
sudo systemctl status jewgo-backend*

# Restart services
sudo systemctl restart jewgo-backend*

# View logs
sudo journalctl -u jewgo-backend* -f

# Stop all services
sudo systemctl stop jewgo-backend*
```

### Health Checks
```bash
# Test individual ports
curl http://127.0.0.1:8082/health/lb
curl http://127.0.0.1:8083/health/lb
curl http://127.0.0.1:8084/health/lb

# Test load balancer
curl https://api.jewgo.app/health/lb
```

### Monitoring
```bash
# Run infrastructure health check
./monitor-infrastructure.sh

# Check port usage
sudo netstat -tlnp | grep :808
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :8082

# Kill processes if needed
sudo pkill -f "python.*app.py"
```

#### 2. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U app_user -d app_db
```

#### 3. Redis Connection Failed
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli -a "ddbdbe33595452921b4ea6b03d7975ba" ping
```

#### 4. Service Won't Start
```bash
# Check service logs
sudo journalctl -u jewgo-backend --no-pager -n 50

# Check working directory
sudo systemctl cat jewgo-backend | grep WorkingDirectory
```

### Log Locations
- **Service logs**: `sudo journalctl -u jewgo-backend*`
- **Application logs**: Check `backend/logs/` directory
- **System logs**: `/var/log/syslog`

## Updates and Maintenance

### Updating the Backend
```bash
# Pull latest changes
git pull origin main

# Restart services
sudo systemctl restart jewgo-backend*
```

### Database Migrations
```bash
# Activate virtual environment
source backend/venv/bin/activate

# Run migrations (if applicable)
cd backend
python scripts/run_migration.py
```

### Backup
```bash
# Backup database
sudo -u postgres pg_dump app_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup configuration
sudo cp /etc/systemd/system/jewgo-backend*.service ~/backup/
```

## Security Considerations

### Firewall
```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Service User
- Services run as `ubuntu` user (non-root)
- Working directory permissions are restricted
- Environment variables are isolated per service

### Database Security
- PostgreSQL listens only on localhost
- Database user has minimal required privileges
- Strong password authentication

## Performance Tuning

### PostgreSQL
```bash
# Edit postgresql.conf for performance
sudo nano /etc/postgresql/*/main/postgresql.conf

# Key settings:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
```

### Redis
```bash
# Edit redis.conf for persistence
sudo nano /etc/redis/redis.conf

# Key settings:
# save 900 1
# save 300 10
# save 60 10000
```

### System
```bash
# Check system resources
htop
free -h
df -h

# Monitor service performance
sudo systemctl status jewgo-backend* --no-pager
```

## Support and Monitoring

### Health Monitoring
- Health check endpoints: `/health/lb`, `/healthz`
- Load balancer health checks
- Systemd service monitoring

### Alerting
- Service failure notifications
- Database connection monitoring
- Resource usage alerts

### Maintenance Windows
- Schedule updates during low-traffic periods
- Use rolling restarts to maintain availability
- Monitor logs during updates

## Conclusion
This deployment provides a robust, scalable backend infrastructure for JewGo with proper monitoring, logging, and maintenance procedures.
