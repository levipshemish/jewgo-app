# Server Monitoring and Maintenance Scripts

This directory contains scripts for monitoring and maintaining the production server at `api.jewgo.app`.

## Scripts Overview

### 1. `ssl-renewal.sh`
**Purpose**: Safely renews SSL certificates and restarts nginx
**Cron Schedule**: Daily at 2:00 AM UTC
**Features**:
- Stops nginx container before renewal
- Renews SSL certificates using certbot
- Copies certificates to nginx SSL directory
- Restarts nginx container
- Comprehensive error handling and logging
- Health verification after restart

### 2. `nginx-health-monitor.sh`
**Purpose**: Monitors nginx container health and restarts if needed
**Cron Schedule**: Every 5 minutes
**Features**:
- Checks if nginx container is running
- Verifies nginx responds to health checks
- Automatic restart with cooldown period
- Detailed logging of all actions

### 3. `system-health-check.sh`
**Purpose**: Comprehensive system health monitoring
**Cron Schedule**: Every 15 minutes
**Features**:
- Docker container health monitoring
- Disk space monitoring
- Memory usage monitoring
- SSL certificate expiration checking
- Network connectivity testing
- Detailed health reports

### 4. `container-watchdog.sh`
**Purpose**: Ensures critical containers stay running
**Cron Schedule**: Every 10 minutes
**Features**:
- Monitors critical containers (nginx, backend)
- Automatic restart of stopped containers
- Health verification after restart
- Prevents infinite restart loops

## Installation on Server

These scripts are installed on the production server at `/usr/local/bin/` and managed via root cron jobs.

## Log Files

All scripts log to `/var/log/` on the server:
- `/var/log/ssl-renewal.log` - SSL renewal activities
- `/var/log/nginx-health-monitor.log` - Nginx monitoring
- `/var/log/system-health-check.log` - System health reports
- `/var/log/container-watchdog.log` - Container monitoring

## Cron Configuration

The root crontab on the server contains:
```bash
# SSL Certificate Renewal - Fixed version
0 2 * * * /usr/local/bin/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1

# Nginx Health Monitoring - Every 5 minutes  
*/5 * * * * /usr/local/bin/nginx-health-monitor.sh >> /var/log/nginx-health-monitor.log 2>&1

# System Health Check - Every 15 minutes
*/15 * * * * /usr/local/bin/system-health-check.sh >> /var/log/system-health-check.log 2>&1

# Container Watchdog - Every 10 minutes
*/10 * * * * /usr/local/bin/container-watchdog.sh >> /var/log/container-watchdog.log 2>&1
```

## Troubleshooting

If the server goes down again:
1. SSH into the server: `ssh ubuntu@api.jewgo.app`
2. Check container status: `docker ps -a`
3. Check logs: `tail -f /var/log/*.log`
4. Manually restart containers: `docker start jewgo-nginx jewgo-backend-new`
5. Verify health: `curl -I https://api.jewgo.app/health`

## Maintenance

- SSL certificates are valid for 90 days and auto-renew 30 days before expiration
- All scripts include comprehensive error handling and logging
- Container restart policies prevent infinite restart loops
- Health checks verify services are actually responding, not just running
