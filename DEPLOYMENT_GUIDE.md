# 🚀 JewGo Backend VPS Deployment Guide

This guide will walk you through deploying your JewGo backend to a VPS server using Docker.

## 📋 Prerequisites

- A VPS server with Ubuntu 20.04+ or CentOS 8+
- SSH access to your VPS
- Domain name (optional, but recommended)
- Basic knowledge of Linux commands

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80/443)│    │  Backend (8000) │    │  PostgreSQL     │
│   (Reverse Proxy)│◄──►│   (Flask API)   │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         └─────────────►│    Redis        │◄─────────────┘
                        │   (Cache)       │
                        └─────────────────┘
```

## 🚀 Quick Deployment

### 1. Configure Your VPS Details

The deployment scripts are already configured for your VPS:
- **VPS User**: `ubuntu`
- **VPS Host**: `141.148.50.111`
- **VPS Path**: `/srv/jewgo-backend`

### 2. Run the Deployment Script

```bash
# Make the script executable
chmod +x deploy-to-vps.sh

# Run the deployment
./deploy-to-vps.sh
```

The script will:
- ✅ Check requirements
- ✅ Test SSH connection
- ✅ Create directory structure
- ✅ Copy Docker files
- ✅ Install Docker & Docker Compose
- ✅ Setup environment configuration

## 🔧 Manual Deployment Steps

If you prefer to deploy manually:

### 1. SSH to Your VPS

```bash
ssh ubuntu@141.148.50.111
```

### 2. Install Docker

```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
```

### 3. Create Directory Structure

```bash
sudo mkdir -p /srv/jewgo-backend
sudo mkdir -p /srv/jewgo-backend/logs
sudo mkdir -p /srv/jewgo-backend/nginx/conf.d
sudo mkdir -p /srv/jewgo-backend/nginx/ssl
sudo mkdir -p /srv/jewgo-backend/nginx/logs

# Set ownership
sudo chown -R ubuntu:ubuntu /srv/jewgo-backend
sudo chmod -R 755 /srv/jewgo-backend
```

### 4. Copy Files to VPS

From your local machine:

```bash
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='.claude' \
    --exclude='.gemini' \
    --exclude='.github' \
    --exclude='.husky' \
    --exclude='.serena' \
    --exclude='.vscode' \
    ./ ubuntu@141.148.50.111:/srv/jewgo-backend/
```

### 5. Configure Environment

```bash
# SSH to VPS
ssh ubuntu@141.148.50.111

# Navigate to project directory
cd /srv/jewgo-backend

# Copy and edit environment file
cp env.production.template .env
nano .env
```

**Important Environment Variables to Set:**

```bash
# Database
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://jewgo_user:your_secure_password_here@postgres:5432/jewgo_db

# Redis
REDIS_PASSWORD=your_secure_redis_password_here

# Security
SECRET_KEY=your_super_secure_secret_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# CORS
CORS_ORIGINS=https://jewgo.app,https://your-frontend-domain.com
```

### 6. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

## 🌐 Domain & SSL Setup

### 1. Point Domain to VPS

Set your domain's A record to your VPS IP address: `141.148.50.111`

### 2. Install Certbot for SSL

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Update Nginx Configuration

Edit `nginx/conf.d/default.conf` and update:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Update this
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # Update this
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # ... rest of configuration
}
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check service status
docker-compose ps

# Check health endpoint
curl http://141.148.50.111/api/health

# View logs
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Backup Database

```bash
# Create backup script
nano /srv/jewgo-backend/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/srv/jewgo-backend/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U jewgo_user jewgo_db > $BACKUP_DIR/jewgo_db_$DATE.sql

# Keep only last 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
chmod +x backup-db.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
0 2 * * * /srv/jewgo-backend/backup-db.sh
```

### Update Application

```bash
# Pull latest changes
cd /srv/jewgo-backend
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
```

## 🔒 Security Considerations

### 1. Firewall Setup

```bash
# Install UFW
sudo apt-get install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSH Security

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
Port 2222  # Change from default 22
PermitRootLogin no
PasswordAuthentication no
AllowUsers ubuntu

# Restart SSH
sudo systemctl restart sshd
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80

# Kill process or change port in docker-compose.yml
```

**2. Database Connection Failed**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Check database status
docker-compose exec postgres pg_isready -U jewgo_user
```

**3. Redis Connection Failed**
```bash
# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

**4. Nginx Configuration Error**
```bash
# Test Nginx config
docker-compose exec nginx nginx -t

# Check Nginx logs
docker-compose logs nginx
```

### Log Locations

```bash
# Application logs
docker-compose logs -f backend

# Nginx logs
docker-compose logs -f nginx

# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis
```

## 📈 Performance Optimization

### 1. Database Optimization

```bash
# Check database performance
docker-compose exec postgres psql -U jewgo_user -d jewgo_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### 2. Redis Optimization

```bash
# Monitor Redis memory usage
docker-compose exec redis redis-cli info memory

# Check Redis performance
docker-compose exec redis redis-cli slowlog get 10
```

### 3. Nginx Optimization

```bash
# Check Nginx status
docker-compose exec nginx nginx -s status

# Monitor Nginx performance
docker-compose exec nginx nginx -s reload
```

## 🎯 Next Steps

After successful deployment:

1. **Test your API endpoints**
2. **Set up monitoring** (Sentry, health checks)
3. **Configure backups** (database, logs)
4. **Set up CI/CD** for automatic deployments
5. **Monitor performance** and optimize as needed

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f [service-name]`
2. Verify environment variables are set correctly
3. Ensure all required ports are open
4. Check Docker and Docker Compose versions are compatible

---

**Happy Deploying! 🚀**
