# JewGo Monitoring Dashboard Setup Guide

This guide provides comprehensive instructions for setting up and using the JewGo monitoring dashboard with Prometheus and Grafana.

## Overview

The monitoring stack includes:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications
- **Node Exporter**: System metrics
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Nginx Exporter**: Web server metrics
- **Blackbox Exporter**: Health checks

## Quick Start

### 1. Start the Monitoring Stack

```bash
# Start all monitoring services
docker-compose up -d prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter nginx-exporter blackbox-exporter

# Check service status
docker-compose ps
```

### 2. Access the Services

- **Grafana Dashboard**: http://localhost:3001
  - Username: `admin`
  - Password: `admin123`
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### 3. Import Dashboards

The dashboards are automatically provisioned and available in Grafana:
- JewGo Application Overview
- JewGo Infrastructure Monitoring
- JewGo Database Monitoring
- JWT Authentication System Monitoring

## Detailed Setup

### Prerequisites

- Docker and Docker Compose
- Access to the JewGo application backend and frontend
- Basic understanding of Prometheus and Grafana

### Configuration Files

#### Prometheus Configuration (`monitoring/prometheus.yml`)
- Scrapes metrics from all JewGo services
- Configures alerting rules
- Sets up service discovery

#### AlertManager Configuration (`monitoring/alertmanager.yml`)
- Routes alerts by severity and component
- Configures notification channels (email, Slack, PagerDuty)
- Sets up alert inhibition rules

#### Grafana Configuration
- Auto-provisioned data sources
- Pre-configured dashboards
- Alert notification channels

### Metrics Endpoints

The application exposes metrics at the following endpoints:

#### Backend Metrics
- `/api/metrics` - Prometheus format metrics
- `/api/metrics/health` - Health check with basic metrics
- `/api/metrics/custom` - Custom JSON metrics
- `/api/metrics/performance` - Performance metrics
- `/api/metrics/database` - Database metrics
- `/api/metrics/search` - Search metrics
- `/api/metrics/cache` - Cache metrics
- `/api/metrics/business` - Business metrics
- `/api/metrics/users` - User metrics
- `/api/metrics/restaurants` - Restaurant metrics
- `/api/metrics/usage` - API usage metrics
- `/api/metrics/errors` - Error metrics
- `/api/metrics/security` - Security metrics

#### Frontend Metrics
- `/api/metrics` - Prometheus format metrics

### Available Metrics

#### HTTP Metrics
- `jewgo_http_requests_total` - Total HTTP requests by method, endpoint, status
- `jewgo_http_request_duration_seconds` - HTTP request duration

#### Database Metrics
- `jewgo_database_queries_total` - Total database queries by operation, table
- `jewgo_database_query_duration_seconds` - Database query duration
- `jewgo_database_connections_active` - Active database connections
- `jewgo_database_connections_failed_total` - Database connection failures
- `jewgo_database_slow_queries_total` - Slow database queries

#### Search Metrics
- `jewgo_search_requests_total` - Total search requests by provider, type, status
- `jewgo_search_duration_seconds` - Search request duration
- `jewgo_search_no_results_total` - Searches with no results

#### Cache Metrics
- `jewgo_cache_requests_total` - Total cache requests by operation
- `jewgo_cache_hits_total` - Total cache hits by operation
- `jewgo_cache_errors_total` - Total cache errors by operation, error type
- `jewgo_cache_memory_usage_bytes` - Cache memory usage
- `jewgo_cache_memory_limit_bytes` - Cache memory limit

#### Business Metrics
- `jewgo_users_registered_total` - Total user registrations by method
- `jewgo_users_active_total` - Total active users
- `jewgo_user_actions_total` - Total user actions by type
- `jewgo_restaurant_searches_total` - Total restaurant searches by type
- `jewgo_synagogue_searches_total` - Total synagogue searches by type

#### API Usage Metrics
- `jewgo_api_requests_total` - Total API requests by endpoint, method, status
- `jewgo_api_request_duration_seconds` - API request duration

#### Error Metrics
- `jewgo_errors_total` - Total application errors by type, component

#### Security Metrics
- `jewgo_auth_failed_logins_total` - Total failed login attempts by method
- `jewgo_rate_limit_exceeded_total` - Total rate limit violations by endpoint

#### System Metrics
- `jewgo_system_memory_usage_bytes` - System memory usage
- `jewgo_system_cpu_usage_percent` - System CPU usage percentage

## Dashboards

### 1. JewGo Application Overview
- Application health status
- Request rate and error rate
- Response time percentiles
- Database, search, and cache performance
- User activity and business metrics

### 2. JewGo Infrastructure Monitoring
- System load average, CPU, memory, disk usage
- Network I/O and errors
- File system usage
- Process counts

### 3. JewGo Database Monitoring
- PostgreSQL and Redis status
- Connection statistics
- Query performance
- Database size and slow queries

### 4. JWT Authentication System Monitoring
- Authentication overview and success rates
- Active sessions and token refresh rates
- Security events and OAuth flows
- Guest user activity and password resets

## Alerting

### Alert Categories

#### Critical Alerts (Immediate Notification)
- Application down
- Database down
- High error rate (>5%)
- Security breaches
- System resource exhaustion

#### Warning Alerts (5-minute delay)
- High response time (>2s P95)
- Low cache hit rate (<70%)
- High database latency (>1s P95)
- Unusual user activity patterns

#### Info Alerts (10-minute delay)
- No new user registrations
- Low search activity
- Business metric anomalies

### Alert Channels

Configured in `monitoring/alertmanager.yml`:
- **Email**: admin@jewgo.app, ops@jewgo.app
- **Slack**: #critical-alerts, #security-alerts
- **PagerDuty**: For critical security alerts

### Customizing Alerts

Edit the alert rules in:
- `monitoring/auth-alerts.yml` - Authentication alerts
- `monitoring/application-alerts.yml` - Application alerts
- `monitoring/infrastructure-alerts.yml` - Infrastructure alerts

## Usage Examples

### Recording Custom Metrics

#### Backend (Python)
```python
from routes.metrics import (
    record_user_action, record_business_metric, 
    record_error, record_security_event
)

# Record user action
record_user_action('restaurant_search')

# Record business metric
record_business_metric('restaurant_search', 'distance_filter')

# Record error
record_error('validation_error', 'restaurants')

# Record security event
record_security_event('failed_login', {'method': 'email'})
```

#### Frontend (TypeScript)
```typescript
import { recordPageView, recordApiCall, recordError } from '@/lib/metrics';

// Record page view
recordPageView('/restaurants', { search_term: 'kosher' });

// Record API call
recordApiCall('/api/restaurants', 'GET', 200, 150);

// Record error
recordError('Network timeout', 'restaurant-search');
```

### Custom Dashboard Queries

#### Application Health
```promql
# Request rate
rate(jewgo_http_requests_total[5m])

# Error rate
rate(jewgo_http_requests_total{status=~"5.."}[5m]) / rate(jewgo_http_requests_total[5m]) * 100

# Response time P95
histogram_quantile(0.95, rate(jewgo_http_request_duration_seconds_bucket[5m]))
```

#### Business Metrics
```promql
# User registrations per hour
rate(jewgo_users_registered_total[1h]) * 3600

# Restaurant search success rate
rate(jewgo_restaurant_searches_total{status="success"}[5m]) / rate(jewgo_restaurant_searches_total[5m]) * 100

# Cache hit rate
rate(jewgo_cache_hits_total[5m]) / rate(jewgo_cache_requests_total[5m]) * 100
```

## Troubleshooting

### Common Issues

#### No Metrics Available
1. Check if metrics endpoints are accessible:
   ```bash
   curl http://localhost:5000/api/metrics
   curl http://localhost:3000/api/metrics
   ```

2. Verify Prometheus scraping configuration:
   - Check `monitoring/prometheus.yml`
   - Verify service targets in Prometheus UI

3. Check application logs for metric errors

#### High Alert Frequency
1. Review alert thresholds in alert rule files
2. Adjust `for` duration for less sensitive alerts
3. Check for actual issues vs false positives

#### Dashboard Not Loading
1. Verify Prometheus data source connection in Grafana
2. Check metric names match backend implementation
3. Ensure time range includes recent data

### Performance Tuning

#### High-Load Environments
- Increase scrape intervals for less critical metrics
- Use recording rules for complex queries
- Consider metric retention policies

#### Resource Usage
- Monitor Prometheus storage usage
- Set up metric retention based on requirements
- Consider federation for multi-region deployments

## Security Considerations

### Metric Endpoint Security
- Consider basic auth for `/metrics` endpoints
- Restrict access to internal networks only
- Monitor access to metrics endpoints

### Sensitive Data in Metrics
- Metrics exclude PII and tokens
- Email addresses are not included in metric labels
- User IDs are hashed where used

## Maintenance

### Regular Tasks
- Review alert thresholds monthly
- Update dashboard panels based on usage patterns
- Clean up old metric data according to retention policy
- Test alert notifications quarterly

### Monitoring the Monitoring
- Set up alerts for Prometheus/Grafana downtime
- Monitor scrape success rates
- Track alert notification delivery

## Integration Examples

### Slack Notifications
```yaml
slack_configs:
- api_url: 'YOUR_SLACK_WEBHOOK_URL'
  channel: '#alerts'
  title: 'JewGo Alert: {{ .GroupLabels.alertname }}'
  text: '{{ .CommonAnnotations.summary }}'
```

### PagerDuty Integration
```yaml
pagerduty_configs:
- service_key: 'YOUR_PAGERDUTY_KEY'
  description: 'JewGo Alert: {{ .GroupLabels.alertname }}'
```

## Support

For additional help:
- Check Prometheus documentation: https://prometheus.io/docs/
- Check Grafana documentation: https://grafana.com/docs/
- Review JewGo application logs for metric collection issues
- Contact the development team for custom metric requirements
