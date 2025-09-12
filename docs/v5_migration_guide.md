# V5 API Migration Guide

This guide provides comprehensive instructions for migrating from the v4 to v5 API architecture.

## Overview

The v5 API introduces significant improvements including:
- Enhanced service layer architecture
- Improved caching and performance
- Better error handling and monitoring
- Feature flag support
- Advanced rate limiting and idempotency
- Comprehensive audit logging

## Prerequisites

Before starting the migration, ensure you have:

1. **Database Backup**: Complete backup of your current database
2. **Code Backup**: Git commit of current codebase
3. **Environment Access**: Access to production/staging environments
4. **Maintenance Window**: Scheduled downtime for migration
5. **Rollback Plan**: Clear rollback procedures

## Migration Steps

### 1. Pre-Migration Validation

```bash
# Validate current system state
python backend/migrations/v4_to_v5_migration.py --dry-run --verbose

# Check database connectivity
python -c "from database.connection_manager import get_connection_manager; print('DB OK')"
```

### 2. Run Migration

```bash
# Execute the migration (production)
python backend/migrations/v4_to_v5_migration.py --verbose

# Or run in dry-run mode first
python backend/migrations/v4_to_v5_migration.py --dry-run --verbose
```

### 3. Post-Migration Validation

```bash
# Test v5 endpoints
curl -X GET "https://api.jewgo.app/api/v5/restaurants?limit=5"

# Check feature flags
curl -X GET "https://api.jewgo.app/api/v5/feature-flags/entity_api_v5"

# Verify health endpoints
curl -X GET "https://api.jewgo.app/api/v5/monitoring/health"
```

## Database Changes

### New Columns Added

The migration adds the following columns to entity tables:

```sql
-- V5 metadata for enhanced functionality
ALTER TABLE restaurants ADD COLUMN v5_metadata JSONB;
ALTER TABLE synagogues ADD COLUMN v5_metadata JSONB;
ALTER TABLE mikvahs ADD COLUMN v5_metadata JSONB;
ALTER TABLE stores ADD COLUMN v5_metadata JSONB;

-- Audit columns for tracking changes
ALTER TABLE restaurants ADD COLUMN created_by INTEGER;
ALTER TABLE restaurants ADD COLUMN updated_by INTEGER;
-- (similar for other entity tables)
```

### New Indexes

```sql
-- GIN indexes for JSONB metadata
CREATE INDEX idx_restaurants_v5_metadata ON restaurants USING GIN (v5_metadata);
CREATE INDEX idx_synagogues_v5_metadata ON synagogues USING GIN (v5_metadata);
CREATE INDEX idx_mikvahs_v5_metadata ON mikvahs USING GIN (v5_metadata);
CREATE INDEX idx_stores_v5_metadata ON stores USING GIN (v5_metadata);
```

## Configuration Changes

### Environment Variables

Add the following environment variables:

```bash
# V5 Feature Flags
V5_ENTITY_API_ENABLED=true
V5_AUTH_API_ENABLED=true
V5_SEARCH_API_ENABLED=true
V5_ADMIN_API_ENABLED=true
V5_REVIEWS_API_ENABLED=true

# V5 Redis Configuration
REDIS_V5_URL=redis://localhost:6379/1
REDIS_V5_PREFIX=jewgo:v5:

# V5 Rate Limiting
V5_RATE_LIMIT_ENABLED=true
V5_RATE_LIMIT_REDIS_URL=redis://localhost:6379/2
```

### Application Configuration

Update your application configuration to enable v5 features:

```python
# In your app configuration
V5_FEATURES = {
    'entity_api_v5': True,
    'auth_api_v5': True,
    'search_api_v5': True,
    'admin_api_v5': True,
    'reviews_api_v5': True,
    'webhook_api_v5': True,
    'monitoring_api_v5': True,
    'feature_flags_api_v5': True,
}
```

## API Endpoint Changes

### New V5 Endpoints

The following new endpoints are available in v5:

```
# Entity Management
GET    /api/v5/restaurants
POST   /api/v5/restaurants
GET    /api/v5/restaurants/{id}
PUT    /api/v5/restaurants/{id}
DELETE /api/v5/restaurants/{id}

# Authentication
POST   /api/v5/auth/login
POST   /api/v5/auth/register
POST   /api/v5/auth/logout
POST   /api/v5/auth/refresh

# Search
GET    /api/v5/search
GET    /api/v5/search/suggest

# Admin
GET    /api/v5/admin/health
GET    /api/v5/admin/audit-log
GET    /api/v5/admin/analytics

# Monitoring
GET    /api/v5/monitoring/health
GET    /api/v5/monitoring/status
GET    /api/v5/monitoring/metrics

# Feature Flags
GET    /api/v5/feature-flags
GET    /api/v5/feature-flags/{flag_name}
```

### Response Format Changes

V5 API responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "cursor": "...",
    "limit": 20,
    "has_more": true
  },
  "meta": {
    "request_id": "req_123456789",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Testing

### Unit Tests

Run the v5 unit tests:

```bash
# Backend tests
cd backend
python -m pytest tests/test_v5/ -v

# Frontend tests
cd frontend
npm test -- --testPathPattern=v5
```

### Integration Tests

```bash
# Run integration tests
python backend/tests/integration/test_v5_integration.py

# Performance tests
python backend/tests/performance/test_v5_performance.py
```

### Manual Testing

1. **Entity CRUD Operations**
   ```bash
   # Test restaurant creation
   curl -X POST "https://api.jewgo.app/api/v5/restaurants" \
        -H "Content-Type: application/json" \
        -d '{"name": "Test Restaurant", "address": "123 Test St"}'
   ```

2. **Authentication Flow**
   ```bash
   # Test login
   curl -X POST "https://api.jewgo.app/api/v5/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "password123"}'
   ```

3. **Search Functionality**
   ```bash
   # Test search
   curl -X GET "https://api.jewgo.app/api/v5/search?q=kosher&types=restaurants"
   ```

## Monitoring

### Health Checks

Monitor the following endpoints:

- `/api/v5/monitoring/health` - Overall system health
- `/api/v5/monitoring/status` - Detailed status information
- `/api/v5/monitoring/metrics` - Performance metrics

### Key Metrics to Monitor

1. **Response Times**: Monitor API response times
2. **Error Rates**: Track 4xx and 5xx error rates
3. **Cache Hit Rates**: Monitor Redis cache performance
4. **Database Performance**: Track query execution times
5. **Rate Limiting**: Monitor rate limit violations

## Rollback Procedures

If issues occur during or after migration, follow these rollback steps:

### 1. Immediate Rollback

```bash
# Run the rollback script
python scripts/rollback_v5.py --backup-dir backups/v4_to_v5_migration_YYYYMMDD_HHMMSS --verbose
```

### 2. Manual Rollback Steps

If the automated rollback fails:

1. **Disable V5 Features**
   ```bash
   # Set all v5 feature flags to false
   export V5_ENTITY_API_ENABLED=false
   export V5_AUTH_API_ENABLED=false
   # ... etc
   ```

2. **Restore Database**
   ```bash
   # Restore from backup
   psql -d your_database -f backups/v4_to_v5_migration_YYYYMMDD_HHMMSS/restaurants.sql
   ```

3. **Revert Code**
   ```bash
   # Revert to previous git commit
   git reset --hard HEAD~1
   ```

### 3. Post-Rollback Validation

```bash
# Test v4 endpoints
curl -X GET "https://api.jewgo.app/api/restaurants?limit=5"

# Verify database integrity
python -c "from database.connection_manager import get_connection_manager; print('DB OK')"
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database connectivity
   - Verify connection pool settings
   - Review database logs

2. **Redis Connection Issues**
   - Verify Redis server is running
   - Check Redis connection string
   - Review Redis logs

3. **Feature Flag Issues**
   - Verify feature flag configuration
   - Check feature flag API endpoints
   - Review feature flag logs

4. **Rate Limiting Issues**
   - Check rate limit configuration
   - Verify Redis rate limit storage
   - Review rate limit logs

### Debug Commands

```bash
# Check database schema
psql -d your_database -c "\d restaurants"

# Check Redis connectivity
redis-cli ping

# Check application logs
tail -f logs/application.log

# Check feature flags
curl -X GET "https://api.jewgo.app/api/v5/feature-flags"
```

## Performance Optimization

### Caching

V5 API includes enhanced caching:

- **Entity Caching**: Redis-based entity caching
- **ETag Support**: HTTP ETag caching
- **Query Result Caching**: Cached search results

### Database Optimization

- **Connection Pooling**: Optimized connection pool settings
- **Query Optimization**: Improved query performance
- **Index Optimization**: Enhanced database indexes

### Monitoring

- **Real-time Metrics**: Live performance monitoring
- **Alerting**: Automated alert system
- **Logging**: Comprehensive logging system

## Support

For migration support:

1. **Documentation**: Check this guide and API documentation
2. **Logs**: Review application and system logs
3. **Monitoring**: Use monitoring dashboards
4. **Team**: Contact the development team

## Conclusion

The v5 API migration provides significant improvements in performance, reliability, and maintainability. Follow this guide carefully and test thoroughly before deploying to production.

Remember to:
- Always backup before migration
- Test in staging environment first
- Monitor closely after deployment
- Have rollback plan ready
- Document any custom changes
