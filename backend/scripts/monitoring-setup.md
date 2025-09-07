# Monitoring Stack Setup

## Overview
The JewGo application now includes a comprehensive monitoring stack with Prometheus, Grafana, Node Exporter, and cAdvisor.

## Components

### 1. Prometheus (Port 9090)
- **Purpose**: Metrics collection and storage
- **Access**: `http://api.jewgo.app:9090`
- **Configuration**: `/home/ubuntu/monitoring/prometheus.yml`
- **Data Retention**: 200 hours

### 2. Grafana (Port 3001)
- **Purpose**: Dashboards and visualization
- **Access**: `http://api.jewgo.app:3001`
- **Credentials**: admin/admin123
- **Configuration**: `/home/ubuntu/monitoring/grafana/`

### 3. Node Exporter (Port 9100)
- **Purpose**: System metrics collection
- **Metrics**: CPU, memory, disk, network usage

### 4. cAdvisor (Port 8080)
- **Purpose**: Container metrics collection
- **Metrics**: Container CPU, memory, network, filesystem usage

## Monitoring Targets

The following services are monitored:
- **jewgo-backend-new:5000** - Backend API metrics
- **jewgo-nginx:9113** - Nginx metrics (if exporter available)
- **redis-exporter:9121** - Redis metrics (if exporter available)

## Firewall Rules

Monitoring ports are accessible from your IP (104.203.9.103):
- 9090 (Prometheus)
- 3001 (Grafana)
- 9100 (Node Exporter)
- 8080 (cAdvisor)

## Dashboard

A custom JewGo dashboard is available in Grafana with:
- System CPU usage
- Memory usage
- Disk usage
- Container CPU usage
- Container memory usage

## Maintenance

### Starting the monitoring stack:
```bash
cd /home/ubuntu
docker-compose -f docker-compose-monitoring.yml up -d
```

### Stopping the monitoring stack:
```bash
cd /home/ubuntu
docker-compose -f docker-compose-monitoring.yml down
```

### Viewing logs:
```bash
docker logs jewgo-prometheus
docker logs jewgo-grafana
docker logs jewgo-cadvisor
docker logs jewgo-node-exporter
```

## Data Persistence

- **Prometheus data**: Stored in Docker volume `ubuntu_prometheus_data`
- **Grafana data**: Stored in Docker volume `ubuntu_grafana_data`

## Security Notes

- Grafana admin password should be changed in production
- Consider restricting access to monitoring ports
- Enable HTTPS for production use
