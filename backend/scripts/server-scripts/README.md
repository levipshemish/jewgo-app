# Server Scripts

This directory contains all the server-side scripts that were deployed to the production server.

## Scripts Overview

### Backup Scripts
- **`database-backup.sh`** - Creates local PostgreSQL database backups
- **`application-backup.sh`** - Creates local application code backups  
- **`cloud-backup.sh`** - Uploads local backups to AWS S3

### Health Monitoring Scripts
- **`system-health-check.sh`** - Comprehensive system health monitoring
- **`nginx-health-monitor.sh`** - Nginx container health monitoring
- **`container-watchdog.sh`** - Ensures critical Docker containers are running

### SSL Management
- **`ssl-renewal.sh`** - Automated SSL certificate renewal with Let's Encrypt

## Configuration Files

### Systemd Configuration
- **`aws-env.conf`** - AWS environment variables for the backend service

### Monitoring Configuration
- **`monitoring/`** - Prometheus and Grafana configuration files
  - `prometheus.yml` - Prometheus metrics collection configuration
  - `grafana-datasources.yml` - Grafana data source configuration
  - `grafana-dashboards.yml` - Grafana dashboard configuration
  - `dashboards/jewgo-dashboard.json` - Custom JewGo dashboard

## Deployment

These scripts are deployed to the production server at:
- **Location**: `/usr/local/bin/`
- **Permissions**: Executable (755)
- **Owner**: root

## Cron Jobs

The following cron jobs are configured on the server:

```bash
# Daily backups
0 3 * * * /usr/local/bin/database-backup.sh >> /var/log/database-backup.log 2>&1
0 4 * * * /usr/local/bin/application-backup.sh >> /var/log/application-backup.log 2>&1
0 5 * * * /usr/local/bin/cloud-backup.sh >> /var/log/cloud-backup.log 2>&1

# SSL renewal (weekly)
0 2 * * 0 /usr/local/bin/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1

# Health monitoring (every 5 minutes)
*/5 * * * * /usr/local/bin/system-health-check.sh >> /var/log/system-health-check.log 2>&1
*/5 * * * * /usr/local/bin/nginx-health-monitor.sh >> /var/log/nginx-health-monitor.log 2>&1
*/5 * * * * /usr/local/bin/container-watchdog.sh >> /var/log/container-watchdog.log 2>&1
```

## Log Files

All scripts log to `/var/log/` with the following naming convention:
- `{script-name}.log` - Main log file
- Logs are rotated daily with 30-day retention

## AWS S3 Backup Configuration

The cloud backup system uses the following AWS configuration:
- **Access Key**: `your_aws_access_key_here`
- **Secret Key**: `your_aws_secret_key_here`
- **Region**: `us-east-1`
- **Bucket**: `jewgo-backups1`

## Security Notes

- All scripts run with appropriate permissions
- AWS credentials are stored securely in systemd environment files
- Log files are protected and rotated automatically
- SSL certificates are automatically renewed

## Maintenance

To update these scripts on the server:

1. Modify the local files in this directory
2. Copy to server: `scp script.sh ubuntu@api.jewgo.app:/usr/local/bin/`
3. Set permissions: `ssh ubuntu@api.jewgo.app 'sudo chmod +x /usr/local/bin/script.sh'`
4. Test the script manually before relying on cron jobs

## Monitoring

The monitoring stack includes:
- **Prometheus**: Metrics collection on port 9090
- **Grafana**: Dashboards on port 3001
- **Node Exporter**: Host metrics on port 9100
- **cAdvisor**: Container metrics on port 8080

Access URLs:
- Prometheus: http://api.jewgo.app:9090
- Grafana: http://api.jewgo.app:3001 (admin/admin123)
- Node Exporter: http://api.jewgo.app:9100
- cAdvisor: http://api.jewgo.app:8080
