# Docker VPS Deployment Guide

This guide provides step-by-step instructions for deploying the JewGo application on a VPS using Docker containers with PostgreSQL running internally.

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores
- **Network**: Public IP with ports 80, 443, 22 open

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Curl

## Installation Steps

### 1. Prepare the VPS

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply group changes
```

### 2. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/jewgo-app.git
cd jewgo-app

# Make deployment script executable
chmod +x scripts/deployment/deploy-docker.sh
```

### 3. Configure Environment

The application uses environment variables defined in the `docker-compose.yml` file. Key configurations:

- **Database**: PostgreSQL running in container
- **Cache**: Redis running in container
- **Backend**: Flask API on port 5000
- **Frontend**: Next.js on port 3000
- **Proxy**: Nginx on ports 80/443

### 4. Deploy the Application

```bash
# Run the deployment script
./scripts/deployment/deploy-docker.sh

# Or run manually:
docker-compose up -d
```

### 5. Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost/health
curl http://localhost:5000/health
curl http://localhost:3000
```

## Container Architecture

### Services Overview

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| PostgreSQL | jewgo-postgres | 5432 | Database |
| Redis | jewgo-redis | 6379 | Cache |
| Backend API | jewgo-backend | 5000 | Flask API |
| Frontend | jewgo-frontend | 3000 | Next.js App |
| Nginx | jewgo-nginx | 80/443 | Reverse Proxy |
| Prometheus | jewgo-prometheus | 9090 | Metrics |
| Grafana | jewgo-grafana | 3001 | Dashboards |

### Network Configuration

- **app-network**: Internal network for application services
- **monitoring**: Network for monitoring stack
- **External access**: Only through Nginx (ports 80/443)

## Database Configuration

### PostgreSQL Container
- **Image**: postgres:15-alpine
- **Database**: app_db
- **User**: app_user
- **Password**: Jewgo123
- **Extensions**: uuid-ossp, pg_trgm, unaccent
- **Data persistence**: Docker volume `postgres_data`

### Initialization
The database is automatically initialized with:
- Required extensions
- Performance indexes
- User permissions
- Update triggers

## Monitoring Setup

### Prometheus
- **URL**: http://your-vps-ip:9090
- **Metrics collection**: All services
- **Retention**: 30 days

### Grafana
- **URL**: http://your-vps-ip:3001
- **Username**: admin
- **Password**: admin123
- **Dashboards**: Pre-configured for all services

### Health Checks
All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Backend: HTTP `/health` endpoint
- Frontend: HTTP root endpoint

## SSL Configuration

### Using Let's Encrypt

1. Install Certbot:
```bash
sudo apt install certbot
```

2. Generate certificates:
```bash
sudo certbot certonly --standalone -d your-domain.com
```

3. Update nginx configuration:
```bash
# Uncomment SSL server block in nginx/nginx.conf
# Update domain name and certificate paths
```

4. Restart nginx:
```bash
docker-compose restart nginx
```

## Backup Strategy

### Automated Backups

The deployment script includes backup functionality:

```bash
# Create backup
./scripts/deployment/deploy-docker.sh backup

# Backups are stored in /opt/backups/
```

### Manual Backup

```bash
# Database backup
docker exec jewgo-postgres pg_dump -U app_user app_db > backup.sql

# Volume backup
docker run --rm -v jewgo_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./scripts/deployment/deploy-docker.sh deploy
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs jewgo-backend -f
docker logs jewgo-frontend -f
docker logs jewgo-postgres -f
```

### Scale Services

```bash
# Scale backend (if needed)
docker-compose up -d --scale backend=3
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :5432
   ```

2. **Permission issues**:
   ```bash
   # Fix Docker permissions
   sudo chown -R $USER:$USER /opt/jewgo
   ```

3. **Database connection issues**:
   ```bash
   # Check database logs
   docker logs jewgo-postgres
   
   # Test connection
   docker exec jewgo-postgres psql -U app_user -d app_db -c "SELECT 1;"
   ```

4. **Memory issues**:
   ```bash
   # Check memory usage
   docker stats
   
   # Increase swap if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Performance Optimization

1. **Database tuning**:
   - Adjust PostgreSQL configuration in docker-compose.yml
   - Add connection pooling if needed

2. **Caching**:
   - Redis is configured for optimal performance
   - Monitor cache hit rates in Grafana

3. **Nginx optimization**:
   - Enable gzip compression (already configured)
   - Adjust worker processes based on CPU cores

## Security Considerations

### Container Security
- All containers run as non-root users
- Minimal base images (alpine)
- No unnecessary packages installed

### Network Security
- Internal services not exposed externally
- Only Nginx accessible from outside
- Rate limiting configured

### Data Security
- Database passwords in environment variables
- SSL/TLS encryption for external traffic
- Regular security updates

## Monitoring and Alerting

### Key Metrics to Monitor
- Application response times
- Database performance
- Memory and CPU usage
- Disk space
- Error rates

### Alerting Setup
Configure alerts in Prometheus/Alertmanager for:
- High error rates
- Slow response times
- Resource exhaustion
- Service downtime

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify health: `./scripts/deployment/deploy-docker.sh status`
3. Review this guide
4. Check GitHub issues

## Next Steps

After successful deployment:
1. Configure domain name and SSL
2. Set up monitoring alerts
3. Configure automated backups
4. Set up CI/CD pipeline
5. Performance testing and optimization
