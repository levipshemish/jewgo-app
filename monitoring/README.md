# JewGo Monitoring Stack

This directory contains a proper monitoring stack that integrates with the existing JewGo backend monitoring system.

## What's Included

- **Prometheus**: Metrics collection and storage
- **cAdvisor**: Container metrics (CPU, memory, network, filesystem)
- **Node Exporter**: Host system metrics
- **Blackbox Exporter**: HTTP/HTTPS endpoint probing
- **Alertmanager**: Alert routing and notifications
- **Grafana**: Dashboards and visualization
- **Uptime Kuma**: Public status page

## Integration with Existing System

This stack integrates with the existing JewGo monitoring system:
- Uses existing `backend/monitoring/v4_monitoring.py` for application metrics
- Uses existing `backend/monitoring/performance_monitor.py` for performance tracking
- New health endpoints in `backend/routes/health_proper.py` provide `/healthz`, `/readyz`, and `/metrics`

## Quick Start

1. **Start the monitoring stack:**
   ```bash
   cd monitoring
   docker compose up -d
   ```

2. **Access the services:**
   - Grafana: http://localhost:3000 (admin/admin)
   - Prometheus: http://localhost:9090
   - Uptime Kuma: http://localhost:3001
   - Alertmanager: http://localhost:9093

3. **Configure Uptime Kuma:**
   - Add monitors for your endpoints
   - Set up status page
   - Configure notifications

## Health Endpoints

The backend now provides proper health endpoints:

- `GET /healthz` - Shallow health check (process is up)
- `GET /readyz` - Deep health check (dependencies are reachable)
- `GET /metrics` - Prometheus metrics (internal only)
- `GET /monitoring/status` - Comprehensive monitoring status

## SLOs and Alerts

The system monitors:
- **Availability**: 99.9% monthly uptime
- **Latency**: p95 < 800ms, p99 < 1.5s
- **Error Rate**: < 1% 5xx errors
- **System Resources**: Memory < 80%, CPU < 80%

## Public Status Page

Uptime Kuma provides a clean, public-facing status page that shows:
- Current status of all services
- Historical uptime (24h/7d/30d)
- Incident history
- Maintenance windows

## Security Notes

- Prometheus, Grafana, and Alertmanager should be behind VPN/auth
- The `/metrics` endpoint should only be accessible internally
- Use proper TLS certificates for production
- Configure proper authentication for Grafana

## Maintenance

- Metrics retention: 15 days (configurable)
- Regular cleanup of old alerts
- Backup Grafana dashboards
- Monitor disk usage for metrics storage