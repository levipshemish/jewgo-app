# JewGo Server Deployment Guide

## 🚀 Production Server Configuration

This guide covers the complete setup and configuration of the JewGo production server, including SSL certificates, CORS configuration, Docker networking, and API functionality.

### 📋 Table of Contents

- [Server Overview](#server-overview)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [CORS Configuration](#cors-configuration)
- [Docker Configuration](#docker-configuration)
- [Database Setup](#database-setup)
- [Nginx Configuration](#nginx-configuration)
- [API Endpoints](#api-endpoints)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## 🖥️ Server Overview

### Current Server Details
- **Server IP**: `141.148.50.111`
- **Domain**: `api.jewgo.app`
- **OS**: Ubuntu 24.04 LTS
- **User**: `ubuntu`

### Recent Updates (September 2025)
- **✅ API Communication Fixes**: All frontend API routes now properly communicate with backend
- **✅ CORS Issues Resolved**: PostgresAuthClient updated to use frontend API routes
- **✅ Backend Endpoint Corrections**: Synagogues API route fixed to call `/api/v4/synagogues`
- **✅ Fallback Systems**: Statistics and kosher-types APIs return default data when backend endpoints unavailable

### Architecture
```
Internet → Nginx (Port 80/443) → Backend (Port 5000) → PostgreSQL + Redis
```

### Services Running
- **Nginx**: Reverse proxy with SSL termination
- **Backend**: Flask application with host networking
- **PostgreSQL**: Database server
- **Redis**: Caching and session store

## 🔒 SSL Certificate Setup

### Let's Encrypt Configuration

The server uses Let's Encrypt certificates for secure HTTPS communication.

#### Certificate Details
- **Domain**: `api.jewgo.app`
- **Certificate Path**: `/etc/letsencrypt/live/api.jewgo.app/`
- **Nginx SSL Path**: `nginx/ssl/`
- **Auto-renewal**: Configured via crontab

#### Manual Certificate Renewal
```bash
# Stop nginx temporarily
docker stop jewgo-nginx

# Renew certificate
certbot renew --standalone --non-interactive

# Copy certificates to nginx
cp /etc/letsencrypt/live/api.jewgo.app/fullchain.pem nginx/ssl/jewgo.crt
cp /etc/letsencrypt/live/api.jewgo.app/privkey.pem nginx/ssl/jewgo.key

# Restart nginx
docker start jewgo-nginx
```

#### Automatic Renewal (Crontab)
```bash
# Daily at 2 AM
0 2 * * * docker stop jewgo-nginx && certbot renew --standalone --non-interactive && cp /etc/letsencrypt/live/api.jewgo.app/fullchain.pem nginx/ssl/jewgo.crt && cp /etc/letsencrypt/live/api.jewgo.app/privkey.pem nginx/ssl/jewgo.key && docker start jewgo-nginx
```

## 🌐 CORS Configuration

### Current CORS Origins
The backend is configured to accept requests from:
- `http://localhost:3000` (Development)
- `https://jewgo.app` (Production frontend)
- `https://jewgo-app.vercel.app` (Vercel deployment)
- `https://api.jewgo.app` (API self-reference)

### Configuration Files

#### Backend Configuration (`backend/config/config.py`)
```python
class ProductionConfig(Config):
    CORS_ORIGINS = (
        os.environ.get("CORS_ORIGINS", "").split(",")
        if os.environ.get("CORS_ORIGINS")
        else []
    )
```

#### Environment Variables (`.env`)
```bash
CORS_ORIGINS=http://localhost:3000,https://jewgo.app,https://jewgo-app.vercel.app,https://api.jewgo.app
```

### Adding New Origins
1. Update the `CORS_ORIGINS` environment variable
2. Restart the backend container
3. Test the new origin

## 🐳 Docker Configuration

### Docker Compose Setup

The application uses Docker Compose with host networking for the backend service.

#### Key Configuration
```yaml
services:
  nginx:
    image: nginx:latest
    container_name: jewgo-nginx
    network_mode: host
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: always

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.optimized
    container_name: jewgo-backend
    env_file:
      - .env
    network_mode: host
    depends_on:
      - postgres
      - redis
    restart: always
```

### Host Networking
- **Backend**: Uses host networking to access localhost services
- **Nginx**: Uses host networking to directly access backend
- **Database/Redis**: Running on host, accessible via localhost

### Container Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker logs jewgo-nginx
docker logs jewgo-backend

# Restart specific service
docker restart jewgo-nginx
docker restart jewgo-backend
```

## 🗄️ Database Setup

### PostgreSQL Configuration
- **Host**: `localhost:5432`
- **Database**: `app_db`
- **User**: `app_user`
- **Password**: `Jewgo123`

### Redis Configuration
- **Host**: `localhost:6379`
- **Database**: `0`

### Connection Strings
```bash
DATABASE_URL=postgresql://app_user:Jewgo123@localhost:5432/app_db
REDIS_URL=redis://localhost:6379/0
```

### Database Management
```bash
# Connect to PostgreSQL
psql -h localhost -U app_user -d app_db

# Check Redis connection
redis-cli ping

# View database status
sudo systemctl status postgresql
sudo systemctl status redis
```

## ⚙️ Nginx Configuration

### SSL Configuration
```nginx
server {
    listen 80;
    listen 443 ssl;
    http2 on;
    server_name api.jewgo.app;
    
    ssl_certificate /etc/nginx/ssl/jewgo.crt;
    ssl_certificate_key /etc/nginx/ssl/jewgo.key;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
    
    # Proxy to backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

### Rate Limiting
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Apply rate limiting
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:5000;
}

location /auth/ {
    limit_req zone=login burst=5 nodelay;
    proxy_pass http://localhost:5000;
}
```

## 🔌 API Endpoints

### Health Check Endpoints
- **Backend Health**: `https://api.jewgo.app/health`
- **Database Health**: `https://api.jewgo.app/health/db`
- **Redis Health**: `https://api.jewgo.app/health/redis`

### Restaurant API
- **List Restaurants**: `GET https://api.jewgo.app/api/restaurants`
- **Get Restaurant**: `GET https://api.jewgo.app/api/restaurants/{id}`
- **Create Restaurant**: `POST https://api.jewgo.app/api/restaurants`

### Synagogue API
- **List Synagogues**: `GET https://api.jewgo.app/api/synagogues`
- **Get Synagogue**: `GET https://api.jewgo.app/api/synagogues/{id}`

### Authentication API
- **Login**: `POST https://api.jewgo.app/auth/login`
- **Register**: `POST https://api.jewgo.app/auth/register`
- **Refresh Token**: `POST https://api.jewgo.app/auth/refresh`

## 📊 Monitoring & Health Checks

### Health Check Commands
```bash
# Check all services
curl -s https://api.jewgo.app/health

# Check database connectivity
curl -s https://api.jewgo.app/health/db

# Check Redis connectivity
curl -s https://api.jewgo.app/health/redis

# Check nginx status
sudo systemctl status nginx

# Check container status
docker ps
```

### Log Monitoring
```bash
# Nginx logs
docker logs jewgo-nginx --tail 50 -f

# Backend logs
docker logs jewgo-backend --tail 50 -f

# System logs
sudo journalctl -u postgresql -f
sudo journalctl -u redis -f
```

### Performance Monitoring
```bash
# Check port usage
sudo netstat -tlnp | grep -E '(80|443|5000|5432|6379)'

# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

## 🔧 Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues
**Problem**: HTTPS not working, certificate errors
**Solution**:
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/jewgo.crt -text -noout

# Renew certificate
certbot renew --standalone --non-interactive

# Copy certificates
cp /etc/letsencrypt/live/api.jewgo.app/fullchain.pem nginx/ssl/jewgo.crt
cp /etc/letsencrypt/live/api.jewgo.app/privkey.pem nginx/ssl/jewgo.key

# Restart nginx
docker restart jewgo-nginx
```

#### 2. Backend Connection Issues
**Problem**: Backend not responding, 502 errors
**Solution**:
```bash
# Check backend status
docker logs jewgo-backend

# Test backend directly
curl -s http://localhost:5000/health

# Restart backend
docker restart jewgo-backend
```

#### 3. Database Connection Issues
**Problem**: Database connection errors
**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U app_user -d app_db -c "SELECT 1;"

# Check Redis status
redis-cli ping
```

#### 4. CORS Issues
**Problem**: Frontend can't access API
**Solution**:
```bash
# Check CORS configuration
grep CORS_ORIGINS .env

# Update CORS origins
# Edit .env file and restart backend
docker restart jewgo-backend
```

#### 5. Nginx Configuration Issues
**Problem**: Nginx not starting, configuration errors
**Solution**:
```bash
# Test nginx configuration
docker exec jewgo-nginx nginx -t

# Check nginx logs
docker logs jewgo-nginx

# Restart nginx
docker restart jewgo-nginx
```

### Debug Commands
```bash
# Check all container status
docker ps -a

# Check container logs
docker logs jewgo-nginx --tail 100
docker logs jewgo-backend --tail 100

# Check network connectivity
docker exec jewgo-nginx curl -s http://localhost:5000/health

# Check SSL certificate
curl -I https://api.jewgo.app/health

# Check DNS resolution
nslookup api.jewgo.app
```

## 🔄 Maintenance

### Regular Maintenance Tasks

#### Daily
- Check service status: `docker ps`
- Monitor logs for errors
- Check disk space: `df -h`

#### Weekly
- Review SSL certificate expiration
- Check system updates: `sudo apt update && sudo apt list --upgradable`
- Monitor performance metrics

#### Monthly
- Update system packages: `sudo apt upgrade`
- Review and rotate logs
- Check backup status

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U app_user app_db > backup_$(date +%Y%m%d).sql

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz nginx/ .env docker-compose.yml

# SSL certificate backup
cp -r /etc/letsencrypt letsencrypt_backup_$(date +%Y%m%d)
```

### Update Procedure
```bash
# 1. Backup current configuration
cp docker-compose.yml docker-compose.yml.backup
cp -r nginx/ nginx_backup/

# 2. Pull latest changes
git pull origin main

# 3. Update containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verify deployment
curl -s https://api.jewgo.app/health
```

## 📞 Support

### Emergency Contacts
- **Server Access**: SSH to `ubuntu@141.148.50.111`
- **Domain Management**: Check DNS settings for `api.jewgo.app`
- **SSL Certificate**: Let's Encrypt for `api.jewgo.app`

### Useful Commands
```bash
# Quick health check
curl -s https://api.jewgo.app/health && echo " - API OK" || echo " - API FAILED"

# Check all services
docker ps && echo "---" && sudo systemctl status postgresql redis

# View recent logs
docker logs jewgo-nginx --tail 20 && echo "---" && docker logs jewgo-backend --tail 20
```

---

**Last Updated**: January 2025  
**Server Status**: Production Ready ✅  
**SSL Status**: Valid Let's Encrypt Certificate ✅  
**API Status**: Fully Functional ✅
