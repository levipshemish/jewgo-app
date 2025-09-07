# Monitoring Services Access Guide

## Current Issue
The monitoring services (Prometheus and Grafana) are running on the server but not accessible via the external domain due to cloud provider firewall restrictions.

## Services Status
- Prometheus: Running on port 9090 ✅
- Grafana: Running on port 3001 ✅
- Firewall: Ports 9090 and 3001 are open ✅
- Local access: Working ✅
- External access: Blocked by cloud provider ❌

## Solutions

### Option 1: SSH Tunneling (Recommended)
Use SSH port forwarding to access the services securely:

```bash
# For Prometheus (port 9090)
ssh -L 9090:localhost:9090 ubuntu@api.jewgo.app

# For Grafana (port 3001)  
ssh -L 3001:localhost:3001 ubuntu@api.jewgo.app

# Then access via:
# http://localhost:9090 (Prometheus)
# http://localhost:3001 (Grafana)
```

### Option 2: Cloud Provider Security Groups
If using AWS/DigitalOcean, open ports 9090 and 3001 in the security groups:
- AWS: EC2 Security Groups
- DigitalOcean: Firewall settings
- Google Cloud: VPC Firewall rules

### Option 3: Nginx Reverse Proxy (Future)
Set up Nginx reverse proxy with subdomains:
- prometheus.jewgo.app → localhost:9090
- grafana.jewgo.app → localhost:3001

## Current Monitoring Stack
- Prometheus: Metrics collection
- Grafana: Dashboards and visualization
- Node Exporter: Host metrics
- cAdvisor: Container metrics
- Custom JewGo dashboard: Application metrics

## Access URLs (via SSH tunnel)
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Grafana Login: admin/admin (default)
