# JewGo Documentation

This directory contains comprehensive documentation for the JewGo application, a kosher restaurant discovery platform.

## 📖 Table of Contents

### Core Documentation
- [API Documentation](./V5_API_DOCUMENTATION.md) - Complete V5 API reference
- [Development Guide](./development-guide.md) - Setup and development workflow
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment instructions

### Architecture & Design
- [Database Schema V5](./DATABASE_SCHEMA_V5.md) - Database structure and relationships
- [Authentication Flow](./AUTHENTICATION_FLOW_DOCUMENTATION.md) - User authentication system
- [Filter System](./filter-system.md) - Search and filtering implementation

### Operations & Maintenance
- [Server Quick Reference](./SERVER_QUICK_REFERENCE.md) - Common server operations
- [Production Environment Variables](./PRODUCTION_ENV_VARS.md) - Environment configuration
- [Monitoring](./metrics/README.md) - System monitoring and metrics

### Migration & Updates
- [V5 Migration Guide](./v5_migration_guide.md) - Upgrading to API V5
- [PostGIS Migration](./POSTGIS_MIGRATION.md) - Geographic data migration
- [Database Migration Summary](./DATABASE_MIGRATION_SUMMARY.md) - Recent database changes

### Security & Performance
- [Security Configuration](../backend/docs/SECURITY_CONFIGURATION.md) - Security hardening
- [Performance Improvements](./performance/PERFORMANCE_IMPROVEMENTS_SUMMARY.md) - Performance optimizations
- [Memory Leak Fixes](./MEMORY_LEAK_FIXES_SUMMARY.md) - Memory optimization

### Deployment & Infrastructure
- [Docker Deployment](./deployment/DOCKER_VPS_DEPLOYMENT_GUIDE.md) - Docker-based deployment
- [Server Setup](./NEW_SERVER_SETUP_GUIDE.md) - New server configuration
- [Webhook Deployment](./webhook/WEBHOOK_DEPLOYMENT_ANALYSIS.md) - GitHub webhook setup

## 🚀 Quick Start

1. **For Developers**: Start with the [Development Guide](./development-guide.md)
2. **For API Users**: Check the [API Documentation](./V5_API_DOCUMENTATION.md)
3. **For Deployment**: Follow the [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## 📝 Recent Updates

- **Database Connection Fix** (2025-01-15): Resolved v5 API empty response issue
- **Model Schema Alignment**: Updated Restaurant model to match database schema
- **PostgreSQL Connection**: Fixed UnifiedConnectionManager connection arguments

## 📧 Support

For questions or issues, please refer to the relevant documentation section or check the troubleshooting guides in each document.
