# JewGo Server Quick Reference

## 🚀 Production Server Status

### Server Details
- **IP**: `141.148.50.111`
- **Domain**: `api.jewgo.app`
- **Status**: ✅ Production Ready
- **SSL**: ✅ Valid Let's Encrypt Certificate
- **API**: ✅ Fully Functional

## 🔧 Quick Commands

### Server Access
```bash
# SSH to server
ssh ubuntu@141.148.50.111

# Check all services
docker ps

# View recent logs
docker logs jewgo-nginx --tail 20
docker logs jewgo-backend --tail 20
```

### Health Checks
```bash
# API health
curl -s https://api.jewgo.app/health

# Database health
curl -s https://api.jewgo.app/health/db

# Redis health
curl -s https://api.jewgo.app/health/redis

# Test API endpoints
curl -s https://api.jewgo.app/api/restaurants | head -3
curl -s https://api.jewgo.app/api/synagogues | head -3
```

### Service Management
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker restart jewgo-nginx
docker restart jewgo-backend

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

## 🔒 SSL Certificate Management

### Check Certificate Status
```bash
# Check certificate expiration
openssl x509 -in nginx/ssl/jewgo.crt -text -noout | grep "Not After"

# Test HTTPS endpoint
curl -I https://api.jewgo.app/health
```

### Manual Certificate Renewal
```bash
# Stop nginx
docker stop jewgo-nginx

# Renew certificate
certbot renew --standalone --non-interactive

# Copy certificates
cp /etc/letsencrypt/live/api.jewgo.app/fullchain.pem nginx/ssl/jewgo.crt
cp /etc/letsencrypt/live/api.jewgo.app/privkey.pem nginx/ssl/jewgo.key

# Restart nginx
docker start jewgo-nginx
```

## 🌐 CORS Configuration

### Current CORS Origins
```bash
# Check current CORS configuration
grep CORS_ORIGINS .env
```

**Current Origins:**
- `http://localhost:3000` (Development)
- `https://jewgo.app` (Production frontend)
- `https://jewgo-app.vercel.app` (Vercel deployment)
- `https://api.jewgo.app` (API self-reference)

### Update CORS Origins
```bash
# Edit environment file
nano .env

# Update CORS_ORIGINS line
CORS_ORIGINS=http://localhost:3000,https://jewgo.app,https://jewgo-app.vercel.app,https://api.jewgo.app

# Restart backend
docker restart jewgo-backend
```

## 🗄️ Database Management

### Database Connection
```bash
# Connect to PostgreSQL
psql -h localhost -U app_user -d app_db

# Test Redis connection
redis-cli ping
```

### Database Status
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check Redis status
sudo systemctl status redis

# Check database connectivity from backend
docker exec jewgo-backend python -c "import psycopg2; conn = psycopg2.connect('postgresql://app_user:Jewgo123@localhost:5432/app_db'); print('Database: OK'); conn.close()"
```

## ⚙️ Nginx Configuration

### Configuration Files
```bash
# Main nginx config
cat nginx/nginx.conf

# Site configuration
cat nginx/conf.d/default.conf

# Test nginx configuration
docker exec jewgo-nginx nginx -t
```

### Port Status
```bash
# Check listening ports
sudo netstat -tlnp | grep -E '(80|443|5000|5432|6379)'

# Expected output:
# :80 (nginx HTTP)
# :443 (nginx HTTPS)
# :5000 (backend)
# :5432 (PostgreSQL)
# :6379 (Redis)
```

## 🐳 Docker Configuration

### Container Status
```bash
# List all containers
docker ps -a

# Check container logs
docker logs jewgo-nginx --tail 50
docker logs jewgo-backend --tail 50

# Check container resource usage
docker stats
```

### Docker Compose
```bash
# View compose configuration
cat docker-compose.yml

# Check compose status
docker-compose ps

# Restart with rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. API Not Responding
```bash
# Check backend status
docker logs jewgo-backend --tail 20

# Test backend directly
curl -s http://localhost:5000/health

# Restart backend
docker restart jewgo-backend
```

#### 2. SSL Certificate Issues
```bash
# Check certificate files
ls -la nginx/ssl/

# Test SSL endpoint
curl -I https://api.jewgo.app/health

# Renew certificate if needed
certbot renew --standalone --non-interactive
```

#### 3. Database Connection Issues
```bash
# Check database status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U app_user -d app_db -c "SELECT 1;"

# Check Redis
redis-cli ping
```

#### 4. CORS Issues
```bash
# Check CORS configuration
grep CORS_ORIGINS .env

# Update and restart
docker restart jewgo-backend
```

### Debug Commands
```bash
# Full system check
echo "=== Docker Status ===" && docker ps
echo "=== Port Status ===" && sudo netstat -tlnp | grep -E '(80|443|5000|5432|6379)'
echo "=== API Health ===" && curl -s https://api.jewgo.app/health
echo "=== Database Health ===" && curl -s https://api.jewgo.app/health/db
echo "=== Redis Health ===" && curl -s https://api.jewgo.app/health/redis
```

## 📊 Monitoring

### System Resources
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check system load
uptime
```

### Application Logs
```bash
# Nginx access logs
docker exec jewgo-nginx tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec jewgo-nginx tail -f /var/log/nginx/error.log

# Backend logs
docker logs jewgo-backend -f
```

## 🔄 Maintenance

### Regular Tasks
```bash
# Daily health check
curl -s https://api.jewgo.app/health && echo " - API OK" || echo " - API FAILED"

# Weekly system update check
sudo apt update && sudo apt list --upgradable

# Monthly certificate check
openssl x509 -in nginx/ssl/jewgo.crt -text -noout | grep "Not After"
```

### Backup Commands
```bash
# Database backup
pg_dump -h localhost -U app_user app_db > backup_$(date +%Y%m%d).sql

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz nginx/ .env docker-compose.yml
```

## 📞 Emergency Contacts

### Quick Access
- **Server**: `ssh ubuntu@141.148.50.111`
- **API**: `https://api.jewgo.app`
- **Health Check**: `https://api.jewgo.app/health`

### Emergency Procedures
1. **API Down**: Check `docker ps` and restart containers
2. **SSL Issues**: Renew certificate and restart nginx
3. **Database Issues**: Check PostgreSQL and Redis status
4. **Full System Check**: Run debug commands above

---

**Last Updated**: January 2025  
**Server Status**: Production Ready ✅  
**Quick Reference**: Keep this handy for server management
