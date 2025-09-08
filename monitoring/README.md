# JewGo Monitoring Dashboard

A comprehensive monitoring solution for the JewGo application using Prometheus, Grafana, and AlertManager.

## 🚀 Quick Start

### Start Monitoring Stack
```bash
./monitoring/start-monitoring.sh
```

### Access Dashboards
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### Stop Monitoring Stack
```bash
./monitoring/stop-monitoring.sh
```

## 📊 Available Dashboards

1. **JewGo Application Overview** - High-level application metrics
2. **JewGo Infrastructure Monitoring** - System resources and performance
3. **JewGo Database Monitoring** - PostgreSQL and Redis metrics
4. **JWT Authentication System Monitoring** - Authentication and security metrics

## 🔧 Components

### Core Services
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **AlertManager** - Alert routing and notifications

### Exporters
- **Node Exporter** - System metrics (CPU, memory, disk, network)
- **PostgreSQL Exporter** - Database metrics
- **Redis Exporter** - Cache metrics
- **Nginx Exporter** - Web server metrics
- **Blackbox Exporter** - Health checks

## 📈 Metrics

The monitoring stack collects metrics from:

### Application Metrics
- HTTP request rates and response times
- Database query performance
- Search operation metrics
- Cache hit rates and performance
- User activity and business metrics
- Error rates and types
- Security events

### Infrastructure Metrics
- System resource usage (CPU, memory, disk)
- Network I/O and errors
- Process counts and system load
- Container health and performance

### Business Metrics
- User registrations and activity
- Restaurant and synagogue searches
- API usage patterns
- Performance trends

## 🚨 Alerting

### Alert Categories
- **Critical** - Immediate notification (service down, security breaches)
- **Warning** - 5-minute delay (performance issues, high error rates)
- **Info** - 10-minute delay (business metrics, maintenance)

### Notification Channels
- Email notifications
- Slack integration
- PagerDuty for critical alerts

## 📁 File Structure

```
monitoring/
├── prometheus.yml              # Prometheus configuration
├── alertmanager.yml            # AlertManager configuration
├── blackbox.yml               # Blackbox exporter configuration
├── auth-alerts.yml            # Authentication alert rules
├── application-alerts.yml     # Application alert rules
├── infrastructure-alerts.yml  # Infrastructure alert rules
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/       # Auto-configured data sources
│   │   └── dashboards/        # Dashboard provisioning
│   └── dashboards/            # Dashboard definitions
├── start-monitoring.sh        # Startup script
├── stop-monitoring.sh         # Shutdown script
├── MONITORING_SETUP_GUIDE.md  # Detailed setup guide
└── README.md                  # This file
```

## 🔍 Troubleshooting

### Common Issues

1. **Services not starting**
   - Check Docker is running: `docker info`
   - Verify ports are available: `netstat -tulpn | grep :3001`

2. **No metrics in Grafana**
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify application metrics endpoints are accessible

3. **High alert frequency**
   - Review alert thresholds in alert rule files
   - Adjust `for` duration for less sensitive alerts

### Logs
```bash
# View service logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs alertmanager

# Follow logs in real-time
docker-compose logs -f prometheus
```

## 🛠️ Customization

### Adding Custom Metrics
1. Update `backend/routes/metrics.py` with new metric definitions
2. Add metric recording calls in your application code
3. Update Grafana dashboards to display new metrics

### Creating Custom Dashboards
1. Create dashboard JSON in `monitoring/grafana/dashboards/`
2. Dashboard will be automatically provisioned
3. Access via Grafana UI

### Modifying Alert Rules
1. Edit alert rule files in `monitoring/`
2. Reload Prometheus configuration
3. Test alerts using AlertManager UI

## 📚 Documentation

- [Detailed Setup Guide](MONITORING_SETUP_GUIDE.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

## 🔒 Security

- Metrics endpoints should be restricted to internal networks
- Grafana admin password should be changed in production
- AlertManager should be configured with proper authentication
- Consider using TLS for all monitoring communications

## 🚀 Production Deployment

For production deployment:

1. **Update passwords** in `docker-compose.yml`
2. **Configure proper data sources** in Grafana
3. **Set up external notification channels** (Slack, PagerDuty, email)
4. **Configure TLS certificates** for secure access
5. **Set up backup procedures** for monitoring data
6. **Configure log retention policies**

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Consult the detailed setup guide
4. Contact the development team

---

**Happy Monitoring! 🎯**
