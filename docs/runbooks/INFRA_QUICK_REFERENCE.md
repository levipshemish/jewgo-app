# Infrastructure Quick Reference (Sanitized)

Per G-SEC-1 (no secrets in repo), all credentials are removed. Replace placeholders with environment-managed values locally.

## Quick Start
```bash
# Deploy everything
./deploy-infrastructure.sh

# Check health
./monitor-infrastructure.sh

# Load test
./scripts/load-test.sh
```

## Endpoints (placeholders)
- API Load Balancer: https://<api-domain>/health/lb
- Instance 1: http://<host-1>:<port>/health/lb
- Instance 2: http://<host-2>:<port>/health/lb
- Instance 3: http://<host-3>:<port>/health/lb

## Common Commands
```bash
# Restart all backend services (example pattern)
sudo systemctl restart jewgo-backend*

# Check Redis (example — uses env var, not inline secret)
redis-cli -a "$REDIS_PASSWORD" -h "$REDIS_HOST" -p "$REDIS_PORT" ping

# View logs
sudo journalctl -u jewgo-backend* -f

# Nginx reload
sudo nginx -t && sudo systemctl restart nginx
```

Notes:
- Manage secrets via .env files or your secrets manager; do not paste into docs.
- For environment-specific values, see your deployment vault or ops runbook.

