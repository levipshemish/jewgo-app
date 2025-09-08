# JewGo Monitoring Server Setup Guide

This guide provides step-by-step instructions for deploying the JewGo monitoring stack directly to your server via SSH.

## Prerequisites

### Local Machine Requirements
- SSH client
- rsync
- Docker (for testing locally)
- Access to your server via SSH

### Server Requirements
- Ubuntu/Debian server with Docker and docker-compose installed
- SSH access with key-based authentication
- Ports 3001, 9090, 9093 available
- At least 2GB RAM and 10GB disk space

## Quick Deployment

### 1. Set Environment Variables

```bash
# Required: Your server details
export SERVER_HOST="your-server.com"  # or IP address
export SERVER_USER="ubuntu"           # or your username
export SERVER_PORT="22"               # SSH port (default: 22)
export SSH_KEY="~/.ssh/id_rsa"        # Path to your SSH key
export REMOTE_PATH="/home/ubuntu/jewgo-app"  # Path on server
```

### 2. Run Deployment Script

```bash
# Deploy monitoring stack to server
./monitoring/deploy-to-server.sh
```

The script will:
- Test server connection
- Check server requirements
- Sync all monitoring files
- Install Python dependencies
- Start monitoring services
- Verify deployment

## Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

### 1. Connect to Server

```bash
ssh -i ~/.ssh/id_rsa ubuntu@your-server.com
```

### 2. Install Server Requirements

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
exit
ssh -i ~/.ssh/id_rsa ubuntu@your-server.com
```

### 3. Create Project Directory

```bash
mkdir -p /home/ubuntu/jewgo-app
cd /home/ubuntu/jewgo-app
```

### 4. Sync Files from Local Machine

From your local machine:

```bash
# Sync monitoring files
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./monitoring/ ubuntu@your-server.com:/home/ubuntu/jewgo-app/monitoring/

# Sync docker-compose.yml
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./docker-compose.yml ubuntu@your-server.com:/home/ubuntu/jewgo-app/

# Sync backend metrics files
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./backend/routes/metrics.py ubuntu@your-server.com:/home/ubuntu/jewgo-app/backend/routes/

rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./backend/middleware/metrics_middleware.py ubuntu@your-server.com:/home/ubuntu/jewgo-app/backend/middleware/

rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./backend/app.py ubuntu@your-server.com:/home/ubuntu/jewgo-app/backend/

# Sync frontend metrics files
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./frontend/app/api/metrics/ ubuntu@your-server.com:/home/ubuntu/jewgo-app/frontend/app/api/metrics/

rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
    ./frontend/lib/metrics.ts ubuntu@your-server.com:/home/ubuntu/jewgo-app/frontend/lib/
```

### 5. Install Python Dependencies

On the server:

```bash
cd /home/ubuntu/jewgo-app/backend

# Install prometheus_client
pip install prometheus_client==0.19.0

# Or add to requirements.txt and install
echo "prometheus_client==0.19.0" >> requirements.txt
pip install -r requirements.txt
```

### 6. Start Monitoring Services

```bash
cd /home/ubuntu/jewgo-app

# Start monitoring services
docker-compose up -d prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter nginx-exporter blackbox-exporter

# Check status
docker-compose ps
```

### 7. Verify Deployment

```bash
# Check service health
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3001/api/health  # Grafana
curl http://localhost:9093/-/healthy  # AlertManager

# Check running containers
docker-compose ps | grep -E "(prometheus|grafana|alertmanager|exporter)"
```

## Configuration

### Firewall Setup

```bash
# Allow monitoring ports
sudo ufw allow 3001/tcp  # Grafana
sudo ufw allow 9090/tcp  # Prometheus
sudo ufw allow 9093/tcp  # AlertManager

# Check firewall status
sudo ufw status
```

### SSL/TLS Setup (Optional)

For production, set up SSL certificates:

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d monitoring.your-domain.com

# Update nginx configuration to use SSL
```

### Environment Variables

Create a `.env` file on the server:

```bash
# /home/ubuntu/jewgo-app/.env
GRAFANA_ADMIN_PASSWORD=your-secure-password
PROMETHEUS_RETENTION=30d
ALERTMANAGER_SMTP_HOST=your-smtp-host
ALERTMANAGER_SMTP_USER=your-smtp-user
ALERTMANAGER_SMTP_PASSWORD=your-smtp-password
```

## Management Commands

### Start Services
```bash
cd /home/ubuntu/jewgo-app
docker-compose up -d
```

### Stop Services
```bash
cd /home/ubuntu/jewgo-app
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f alertmanager
```

### Restart Services
```bash
cd /home/ubuntu/jewgo-app
docker-compose restart prometheus grafana alertmanager
```

### Update Services
```bash
cd /home/ubuntu/jewgo-app
docker-compose pull
docker-compose up -d
```

## Access URLs

After successful deployment:

- **Grafana Dashboard**: http://your-server.com:3001
  - Username: `admin`
  - Password: `admin123` (change in production)
- **Prometheus**: http://your-server.com:9090
- **AlertManager**: http://your-server.com:9093

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if services are running
docker-compose ps

# Check port availability
netstat -tulpn | grep -E ":(3001|9090|9093)"

# Check firewall
sudo ufw status
```

#### 2. Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER /home/ubuntu/jewgo-app
chmod -R 755 /home/ubuntu/jewgo-app/monitoring/grafana/
```

#### 3. Docker Issues
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Check Docker status
sudo systemctl status docker
```

#### 4. No Metrics Available
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check application metrics endpoint
curl http://localhost:5000/api/metrics
```

### Log Analysis

```bash
# Check specific service logs
docker-compose logs prometheus | tail -50
docker-compose logs grafana | tail -50
docker-compose logs alertmanager | tail -50

# Check for errors
docker-compose logs | grep -i error
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Check disk usage
df -h

# Check memory usage
free -h
```

## Security Considerations

### Production Security

1. **Change Default Passwords**
   ```bash
   # Update Grafana password in docker-compose.yml
   - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
   ```

2. **Restrict Access**
   ```bash
   # Use nginx reverse proxy with authentication
   # Or restrict access to specific IPs
   sudo ufw allow from YOUR_IP to any port 3001
   ```

3. **Enable SSL**
   ```bash
   # Use Let's Encrypt certificates
   # Update nginx configuration for HTTPS
   ```

4. **Regular Updates**
   ```bash
   # Update Docker images regularly
   docker-compose pull
   docker-compose up -d
   ```

## Backup and Recovery

### Backup Monitoring Data

```bash
# Backup Grafana data
docker run --rm -v jewgo-app_grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .

# Backup Prometheus data
docker run --rm -v jewgo-app_prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz -C /data .
```

### Restore Monitoring Data

```bash
# Restore Grafana data
docker run --rm -v jewgo-app_grafana_data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /data

# Restore Prometheus data
docker run --rm -v jewgo-app_prometheus_data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /data
```

## Monitoring the Monitoring

Set up alerts for the monitoring system itself:

```bash
# Check if monitoring services are healthy
curl -f http://localhost:9090/-/healthy || echo "Prometheus down"
curl -f http://localhost:3001/api/health || echo "Grafana down"
curl -f http://localhost:9093/-/healthy || echo "AlertManager down"
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service logs
3. Verify network connectivity
4. Check resource usage
5. Contact the development team

---

**Happy Monitoring! 🎯**
