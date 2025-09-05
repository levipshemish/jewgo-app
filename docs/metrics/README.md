# Auth Metrics and Dashboards

This repo exposes Prometheus metrics for authentication flows when `METRICS_ENABLED=true`.

## Prometheus

Example scrape config (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: jewgo-backend
    static_configs:
      - targets: ["backend:5000"]  # adjust to your backend host:port
    metrics_path: /metrics
```

## Grafana

Import the dashboard JSON at `docs/metrics/grafana_dashboard_auth.json`.
It includes panels for:

- auth_logins_total by result/method
- auth_refresh_total by result
- auth_guest_total by event
- auth_logout_total by result
- auth_oauth_total by step/result
- auth_refresh_latency_seconds histogram (p50/p95/p99)

## Environment flags

- `METRICS_ENABLED=true` to enable the `/metrics` endpoint.
- `LEGACY_AUTH_ENABLED=true|false` to control legacy auth route registration on the backend.
- `NEXT_PUBLIC_LEGACY_AUTH_ENABLED=true|false` to control legacy cookie checks in middleware.

