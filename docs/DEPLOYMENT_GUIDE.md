# JewGo Deployment Guide

This guide explains how to deploy JewGo with comprehensive security hardening to your production server.

## Overview

JewGo has two main deployment scripts:

1. **Application Deployment** (`scripts/deploy-to-server.sh`) - Deploys the application code
2. **Security Hardening** (`scripts/deploy-security-remote.sh`) - Deploys security infrastructure

## Prerequisites

### Local Machine Requirements
- SSH access to your server
- SSH key file (`.secrets/ssh-key-2025-09-11.key`)
- Bash shell with standard Unix tools

### Server Requirements
- Ubuntu/Debian Linux server
- Docker and Docker Compose installed
- Nginx installed
- PostgreSQL database accessible
- Redis server running
- Sudo privileges for the deployment user

## Deployment Options

### Option 1: Full Deployment (Recommended)

Deploy both application and security hardening in one command:

```bash
# Deploy application with security hardening
DEPLOY_SECURITY_HARDENING=true ./scripts/deploy-to-server.sh
```

### Option 2: Separate Deployments

Deploy application and security separately:

```bash
# 1. Deploy application only
./scripts/deploy-to-server.sh

# 2. Deploy security hardening
./scripts/deploy-security-remote.sh
```

### Option 3: Selective Security Deployment

Deploy specific security components:

```bash
# Deploy only backend security components
./scripts/deploy-security-remote.sh --backend-only

# Deploy only Nginx security configuration
./scripts/deploy-security-remote.sh --nginx-only

# Deploy only monitoring configuration
./scripts/deploy-security-remote.sh --monitoring-only

# Deploy only key rotation system
./scripts/deploy-security-remote.sh --key-rotation-only
```

## Deployment Process

### 1. Application Deployment (`scripts/deploy-to-server.sh`)

This script performs the following actions:

1. **Connection Test**: Verifies SSH connectivity to the server
2. **Backup**: Creates backup of current deployment
3. **Code Update**: Pulls latest code from GitHub
4. **Docker Cleanup**: Removes old containers and images
5. **Build**: Builds new Docker image for the backend
6. **Deploy**: Starts new backend container
7. **Health Check**: Verifies all endpoints are working
8. **Testing**: Runs comprehensive endpoint tests

#### Key Features:
- Automatic rollback on failure
- Comprehensive health checks
- Detailed logging
- Endpoint testing (25+ endpoints)
- Docker resource cleanup

### 2. Security Hardening (`scripts/deploy-security-remote.sh`)

This script deploys security infrastructure:

1. **Backend Security**: Authentication decorators, error handling, validation
2. **Nginx Security**: Rate limiting, security headers, SSL configuration
3. **Monitoring**: Prometheus metrics, Grafana dashboards, alerting rules
4. **Key Rotation**: Automated JWT key rotation system
5. **Testing**: Security component validation

#### Security Features Deployed:
- Rate limiting (10 req/min auth, 100 req/min API)
- Security headers (HSTS, CSP, X-Frame-Options)
- CSRF protection
- JWT token management with blacklisting
- Automated key rotation (weekly)
- Comprehensive error handling
- Security event monitoring

## Environment Variables

### Required Environment Variables

Set these in your server's `.env` file:

```bash
# Core Security
SECRET_KEY=your-super-secret-key-here-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-here-different-from-secret-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://localhost:6379/0

# Frontend
FRONTEND_URL=https://jewgo.app
```

### Optional Security Variables

```bash
# JWT Configuration
JWT_ACCESS_TOKEN_TTL=3600      # 1 hour
JWT_REFRESH_TOKEN_TTL=2592000  # 30 days
JWT_ALGORITHM=RS256

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE=redis

# WebAuthn
WEBAUTHN_ENABLED=false
WEBAUTHN_RP_ID=jewgo.app
WEBAUTHN_RP_NAME=JewGo
WEBAUTHN_ORIGIN=https://jewgo.app

# Key Rotation
JWT_ROTATION_INTERVAL_HOURS=168  # 7 days
JWT_CHECK_INTERVAL_MINUTES=60    # 1 hour
JWT_ENABLE_METRICS=true
JWT_ENABLE_ALERTS=true
```

### Deployment Control Variables

Control deployment behavior with these variables:

```bash
# Security hardening deployment
DEPLOY_SECURITY_HARDENING=true

# Health check controls
ENABLE_READYZ_CHECK=true
ENABLE_AUTH_HEALTH_CHECK=true
ENABLE_METRICS_HEALTH_CHECK=true

# Testing controls
ENABLE_DISTANCE_SMOKE_TEST=true
```

## Monitoring and Verification

### Health Check Endpoints

After deployment, verify these endpoints:

```bash
# Public health checks
curl https://api.jewgo.app/healthz
curl https://api.jewgo.app/readyz

# Service health checks
curl https://api.jewgo.app/api/v5/auth/health
curl https://api.jewgo.app/api/v5/metrics/health

# Core API endpoints
curl https://api.jewgo.app/api/v5/restaurants?limit=1
curl https://api.jewgo.app/api/v5/synagogues?limit=1
curl https://api.jewgo.app/api/v5/mikvahs?limit=1
curl https://api.jewgo.app/api/v5/stores?limit=1
```

### Service Status

Check service status on the server:

```bash
# Application services
docker ps --filter 'name=jewgo_'

# Security services
systemctl status jewgo-key-rotation.service
systemctl status nginx
systemctl status prometheus
systemctl status grafana-server

# JWT key status
cd /home/ubuntu/jewgo-app/backend
source .venv/bin/activate
python scripts/rotate_jwt_keys.py status
```

### Log Files

Monitor these log files:

```bash
# Application logs
docker logs -f jewgo_backend

# Nginx logs
tail -f /var/log/nginx/jewgo_access.log
tail -f /var/log/nginx/jewgo_error.log

# Key rotation logs
journalctl -u jewgo-key-rotation.service -f

# Deployment logs
ls -la ./deployment-logs/
```

## Security Features

### Rate Limiting

The deployment configures rate limiting at multiple levels:

| Endpoint Type | Rate Limit | Burst | Notes |
|---------------|------------|-------|-------|
| Authentication | 10/min | 5 | Login, register, password reset |
| General API | 100/min | 20 | Most API endpoints |
| Static Files | 500/min | 50 | CSS, JS, images |
| Admin | 10/min | 2 | Admin operations |

### Security Headers

All responses include security headers:

- `Strict-Transport-Security`: HSTS with preload
- `Content-Security-Policy`: Comprehensive CSP
- `X-Frame-Options`: DENY
- `X-Content-Type-Options`: nosniff
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: Restricts dangerous features

### JWT Key Rotation

Automated key rotation system:

- **Rotation Interval**: Weekly (configurable)
- **Check Interval**: Hourly
- **Emergency Rotation**: Triggered by security events
- **Monitoring**: Prometheus metrics and alerts
- **Backup**: Previous keys maintained for grace period

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```bash
   # Check SSH key permissions
   chmod 600 .secrets/ssh-key-2025-09-11.key
   
   # Test connection manually
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18
   ```

2. **Docker Build Failed**
   ```bash
   # Check Docker daemon status
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "docker info"
   
   # Clean up Docker resources
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "docker system prune -f"
   ```

3. **Health Check Failed**
   ```bash
   # Check backend logs
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "docker logs jewgo_backend"
   
   # Check container status
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "docker ps -a"
   ```

4. **Nginx Configuration Error**
   ```bash
   # Test Nginx configuration
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "sudo nginx -t"
   
   # Check Nginx status
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "systemctl status nginx"
   ```

5. **Key Rotation Service Failed**
   ```bash
   # Check service status
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "systemctl status jewgo-key-rotation.service"
   
   # Check service logs
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18 "journalctl -u jewgo-key-rotation.service -n 50"
   ```

### Rollback Procedure

If deployment fails, the script automatically attempts rollback:

1. **Automatic Rollback**: Script detects failure and reverts to previous commit
2. **Manual Rollback**: 
   ```bash
   # SSH to server
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18
   
   # Check backup commit
   cat /home/ubuntu/backups/previous-commit.txt
   
   # Rollback code
   cd /home/ubuntu/jewgo-app
   git reset --hard $(cat /home/ubuntu/backups/previous-commit.txt)
   
   # Rebuild and restart
   docker compose build backend
   docker compose up -d backend
   ```

## Best Practices

### Pre-Deployment

1. **Test Locally**: Always test changes locally first
2. **Review Changes**: Review all code changes before deployment
3. **Backup Database**: Create database backup before major deployments
4. **Check Dependencies**: Ensure all required services are running

### During Deployment

1. **Monitor Logs**: Watch deployment logs for errors
2. **Verify Health**: Check all health endpoints after deployment
3. **Test Functionality**: Test critical user flows
4. **Monitor Metrics**: Watch system metrics during deployment

### Post-Deployment

1. **Monitor Alerts**: Check for any security or performance alerts
2. **Review Logs**: Review application and security logs
3. **Test Security**: Verify rate limiting and security headers
4. **Update Documentation**: Update any relevant documentation

## Support

For deployment issues:

1. **Check Logs**: Review deployment logs in `./deployment-logs/`
2. **Verify Configuration**: Ensure all environment variables are set
3. **Test Connectivity**: Verify SSH and network connectivity
4. **Review Documentation**: Check this guide and security documentation
5. **Contact Support**: Reach out with specific error messages and logs

## Security Considerations

### Production Checklist

- [ ] All environment variables configured
- [ ] SSH keys properly secured (600 permissions)
- [ ] Database credentials rotated
- [ ] SSL certificates valid and up to date
- [ ] Rate limiting configured and tested
- [ ] Security headers verified
- [ ] JWT key rotation working
- [ ] Monitoring and alerting configured
- [ ] Backup procedures in place
- [ ] Incident response plan documented

### Regular Maintenance

- **Weekly**: Review security logs and alerts
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and rotate credentials
- **Annually**: Security audit and penetration testing

This deployment system provides enterprise-grade security and reliability for your JewGo application.