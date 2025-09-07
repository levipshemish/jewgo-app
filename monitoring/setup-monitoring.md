# JWT Authentication System Monitoring Setup

This guide explains how to set up comprehensive monitoring for the JWT authentication system using Prometheus and Grafana.

## Prerequisites

- Prometheus server running
- Grafana instance with Prometheus data source configured
- AlertManager for alert routing (optional but recommended)

## Setup Steps

### 1. Enable Metrics in Backend

Update your backend environment variables:

```bash
# Enable Prometheus metrics collection
METRICS_ENABLED=true

# Optional: Configure metrics endpoint path (default: /metrics)
METRICS_PATH=/metrics
```

Restart your backend service to enable metrics collection.

### 2. Configure Prometheus Scraping

Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'jewgo-auth'
    static_configs:
      - targets: ['localhost:5000']  # Adjust to your backend URL
    scrape_interval: 15s
    metrics_path: /metrics
    scrape_timeout: 10s
```

### 3. Import Grafana Dashboard

1. Open Grafana web interface
2. Go to Dashboards > Import
3. Upload the `grafana-auth-dashboard.json` file
4. Configure the Prometheus data source
5. Save the dashboard

### 4. Set Up Alerting (Optional)

If using AlertManager:

1. Copy `auth-alerts.yml` to your Prometheus rules directory
2. Update your `prometheus.yml` to include the rules:

```yaml
rule_files:
  - "auth-alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

3. Configure AlertManager routes in `alertmanager.yml`:

```yaml
route:
  group_by: ['alertname', 'component']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
        component: authentication
      receiver: 'critical-auth'

receivers:
  - name: 'default'
    # Configure your default notification method
  - name: 'critical-auth'
    # Configure critical authentication alerts
    # Examples: PagerDuty, Slack, email, etc.
```

## Available Metrics

### Login Metrics
- `auth_logins_total{result, method}` - Total login attempts
- `auth_operation_latency_seconds{operation}` - Authentication operation latency

### Token Metrics  
- `auth_refresh_total{result}` - Token refresh attempts
- `auth_refresh_latency_seconds` - Token refresh latency

### Security Metrics
- `auth_errors_total{error_type}` - Authentication errors by type
- Token reuse detection events
- CSRF validation failures

### OAuth Metrics
- `auth_oauth_total{step, result}` - OAuth flow events
- OAuth success/failure rates

### Guest User Metrics
- `auth_guest_total{event}` - Guest user events

### Password Reset Metrics
- `auth_password_reset_total{event}` - Password reset events

## Dashboard Panels

The Grafana dashboard includes:

1. **Authentication Overview** - High-level metrics
2. **Login Success Rate** - Success percentage over time
3. **Active Sessions** - Estimated concurrent sessions  
4. **Authentication Events Timeline** - Event rates over time
5. **Authentication Latency** - Performance metrics
6. **Security Events** - Token reuse, CSRF failures, rate limits
7. **OAuth Events** - OAuth flow monitoring
8. **Guest User Activity** - Guest user patterns
9. **Password Reset Activity** - Reset request patterns
10. **Authentication Method Distribution** - Login method breakdown
11. **Error Rate Heatmap** - Error patterns

## Critical Alerts

### Security Alerts (Critical)
- **Token Reuse Detection** - Potential security breach
- **Authentication System Down** - Service unavailable
- **Database Errors** - Data layer issues

### Performance Alerts (Warning)  
- **High Login Failure Rate** - > 30% failure rate
- **High Authentication Latency** - > 2s login latency
- **High Refresh Latency** - > 1s refresh latency

### Rate Limiting Alerts (Warning)
- **Rate Limiting Triggered** - Frequent rate limit hits
- **CSRF Attack Attempts** - Potential attacks

## Troubleshooting

### No Metrics Available
1. Check `METRICS_ENABLED=true` in backend environment
2. Verify `/metrics` endpoint is accessible
3. Check Prometheus scraping configuration
4. Review backend logs for metric errors

### High Alert Frequency
1. Review alert thresholds in `auth-alerts.yml`
2. Adjust `for` duration for less sensitive alerts
3. Check for actual issues vs false positives

### Dashboard Not Loading
1. Verify Prometheus data source connection
2. Check metric names match backend implementation
3. Ensure time range includes recent data

## Performance Tuning

### High-Load Environments
- Increase scrape intervals for less critical metrics
- Use recording rules for complex queries
- Consider metric retention policies

### Resource Usage
- Monitor Prometheus storage usage
- Set up metric retention based on requirements
- Consider federation for multi-region deployments

## Security Considerations

### Metric Endpoint Security
- Consider basic auth for `/metrics` endpoint
- Restrict access to internal networks only
- Monitor access to metrics endpoint

### Sensitive Data in Metrics
- Metrics exclude PII and tokens
- Email addresses are not included in metric labels
- User IDs are hashed where used

## Integration Examples

### Slack Notifications
```yaml
receivers:
- name: 'slack-auth'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#security-alerts'
    title: 'Auth System Alert'
    text: '{{ .CommonAnnotations.summary }}'
```

### PagerDuty Integration
```yaml
receivers:
- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_KEY'
    severity: 'critical'
```

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

For additional help, refer to the [Prometheus](https://prometheus.io/docs/) and [Grafana](https://grafana.com/docs/) documentation.