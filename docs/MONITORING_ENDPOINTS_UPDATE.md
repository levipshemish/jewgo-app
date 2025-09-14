# Monitoring Endpoints Update

## Overview
Updated all monitoring systems to use correct API endpoints with proper URL formatting. This addresses issues with HTTP 429 errors and ensures reliable health monitoring.

## Changes Made

### 1. Prometheus Configuration (`monitoring/prometheus.yml`)
- **Added new health endpoints** to blackbox monitoring:
  - `https://api.jewgo.app/api/v5/auth/health`
  - `https://api.jewgo.app/api/v5/search/health`
  - `https://api.jewgo.app/api/v5/monitoring/health`
  - `https://api.jewgo.app/api/v5/metrics/health`

### 2. Frontend Monitoring (`frontend/config/monitoring.json`)
- **Added API health endpoints** to uptime monitoring:
  - `https://api.jewgo.app/healthz`
  - `https://api.jewgo.app/api/v5/auth/health`
  - `https://api.jewgo.app/api/v5/search/health`
  - `https://api.jewgo.app/api/v5/monitoring/health`

### 3. Monitoring Scripts
#### `monitoring/start-monitoring.sh`
- Added JewGo API health checks to startup verification
- Checks basic health, auth health, and search health endpoints

#### `monitoring/deploy-to-server.sh`
- Added comprehensive API health verification during deployment
- Includes checks for all major API endpoints

### 4. Health Check Script (`scripts/health-check.sh`)
- **New comprehensive health check script**
- Checks all available health endpoints
- Handles authentication-required endpoints properly
- Provides detailed status reporting
- Configurable timeout and base URL

#### Usage:
```bash
# Basic usage
./scripts/health-check.sh

# Custom base URL
BASE_URL="http://localhost:5000" ./scripts/health-check.sh

# Verbose output
VERBOSE=true ./scripts/health-check.sh
```

### 5. Update Script (`scripts/update-monitoring-endpoints.sh`)
- **Automated script** to update all monitoring configurations
- Creates backups before making changes
- Updates Prometheus, frontend monitoring, and scripts
- Provides detailed feedback on changes made

## Available Health Endpoints

### Public Endpoints (No Authentication Required)
- `GET /healthz` - Basic health check
- `GET /api/v5/auth/health` - Auth service health
- `GET /api/v5/search/health` - Search service health
- `GET /api/v5/metrics/health` - Metrics service health
- `GET /api/v5/feature-flags/health` - Feature flags health

### Protected Endpoints (Authentication Required)
- `GET /api/v5/monitoring/health` - Monitoring service health
- `GET /api/v5/monitoring/health/database` - Database health
- `GET /api/v5/monitoring/health/redis` - Redis health
- `GET /api/v5/monitoring/health/system` - System health

## Testing

### Manual Testing
```bash
# Test individual endpoints
curl -s "https://api.jewgo.app/healthz"
curl -s "https://api.jewgo.app/api/v5/auth/health"

# Run comprehensive health check
./scripts/health-check.sh
```

### Expected Results
- **Public endpoints**: Should return HTTP 200 with JSON health status
- **Protected endpoints**: Should return HTTP 401 (authentication required)
- **Health check script**: Should show all checks as passed (9/9)

## Monitoring Integration

### Prometheus
- Blackbox exporter monitors all health endpoints
- Alerts configured for endpoint failures
- Metrics available in Grafana dashboards

### Grafana Dashboards
- Health status indicators for all services
- Response time monitoring
- Availability tracking

### Alerting
- Application health alerts
- High error rate detection
- Response time monitoring
- Service availability tracking

## Deployment

### Local Development
```bash
# Start monitoring stack
cd monitoring
./start-monitoring.sh

# Check health endpoints
cd ..
./scripts/health-check.sh
```

### Production Deployment
```bash
# Deploy to server
cd monitoring
./deploy-to-server.sh

# Verify health endpoints
./scripts/health-check.sh BASE_URL="https://api.jewgo.app"
```

## Troubleshooting

### Common Issues

1. **HTTP 429 Errors**
   - **Cause**: Incorrect endpoint URLs or rate limiting
   - **Solution**: Use correct endpoint URLs (no trailing slashes for most endpoints)

2. **Authentication Required (401)**
   - **Expected**: For monitoring endpoints that require authentication
   - **Solution**: Normal behavior, not an error

3. **Connection Timeouts**
   - **Cause**: Network issues or service down
   - **Solution**: Check service status and network connectivity

### Health Check Script Issues
```bash
# Debug status code extraction
curl -s -w "%{http_code}" "https://api.jewgo.app/healthz" | tail -c 4

# Test with verbose output
VERBOSE=true ./scripts/health-check.sh
```

## Benefits

1. **Reliable Monitoring**: All health endpoints properly configured
2. **Comprehensive Coverage**: Monitors all major services
3. **Automated Checks**: Scripts for easy verification
4. **Proper Error Handling**: Distinguishes between real errors and expected auth requirements
5. **Easy Maintenance**: Centralized configuration and update scripts

## Next Steps

1. **Deploy Updates**: Run the monitoring deployment scripts
2. **Verify Endpoints**: Use the health check script to confirm all endpoints work
3. **Monitor Alerts**: Check Grafana dashboards for health status
4. **Regular Testing**: Schedule periodic health checks using the provided script

## Files Modified

- `monitoring/prometheus.yml`
- `frontend/config/monitoring.json`
- `monitoring/start-monitoring.sh`
- `monitoring/deploy-to-server.sh`
- `scripts/health-check.sh` (new)
- `scripts/update-monitoring-endpoints.sh` (new)
- `docs/MONITORING_ENDPOINTS_UPDATE.md` (new)
