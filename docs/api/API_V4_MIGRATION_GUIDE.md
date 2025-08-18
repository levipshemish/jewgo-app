# API v4 Migration Guide

## Overview

This guide documents the migration from the existing v3 API to the new v4 API architecture. The v4 API introduces a service layer pattern, improved error handling, enhanced caching, and better separation of concerns.

## Architecture Changes

### v3 Architecture
```
API Routes → Database Manager v3 → Database
```

### v4 Architecture
```
API Routes v4 → Service Layer v4 → Database Manager v4 → Repository Layer → Database
```

## Key Improvements

### 1. Service Layer
- **Business Logic Separation**: Business logic is now separated from data access
- **Reusability**: Services can be reused across different API endpoints
- **Testability**: Services can be easily unit tested in isolation
- **Validation**: Centralized validation logic

### 2. Repository Pattern
- **Data Access Abstraction**: Database operations are abstracted through repositories
- **Entity-Specific Logic**: Each entity has its own repository with specialized methods
- **Query Optimization**: Repositories can optimize queries for specific use cases

### 3. Enhanced Caching
- **Redis Integration**: Primary caching with Redis
- **In-Memory Fallback**: Automatic fallback to in-memory caching
- **Cache Decorators**: Easy integration of caching into service methods
- **Pattern-Based Invalidation**: Intelligent cache invalidation

### 4. Improved Error Handling
- **Structured Errors**: Consistent error response format
- **Error Categories**: Different types of errors (Validation, Database, External, etc.)
- **Context Preservation**: Error context is preserved for debugging

## Migration Strategy

### Phase 1: Infrastructure Setup ✅
- [x] Create Database Manager v4 with repository pattern
- [x] Implement service layer (RestaurantServiceV4, ReviewServiceV4, UserServiceV4)
- [x] Add caching layer with Redis integration
- [x] Create comprehensive test suite

### Phase 2: API Layer Migration ✅
- [x] Create v4 API routes with service layer integration
- [x] Implement feature flags for gradual rollout
- [x] Add monitoring and health check endpoints
- [x] Create migration management tools

### Phase 3: Gradual Rollout (Current)
- [ ] Enable testing mode for internal testing
- [ ] Partial rollout to small user group
- [ ] Monitor performance and error rates
- [ ] Full rollout to all users

### Phase 4: Completion
- [ ] Deprecate v3 API endpoints
- [ ] Remove v3 code
- [ ] Update documentation

## Feature Flags

The migration uses feature flags to control the gradual rollout:

### Flag Categories
- `api_v4_enabled`: Master flag for v4 API
- `api_v4_restaurants`: Restaurant endpoints
- `api_v4_reviews`: Review endpoints
- `api_v4_users`: User endpoints
- `api_v4_statistics`: Statistics endpoints
- `api_v4_cache`: Caching layer
- `api_v4_validation`: Enhanced validation
- `api_v4_error_handling`: Enhanced error handling

### Migration Stages
1. **DISABLED**: Feature is completely disabled
2. **TESTING**: Feature is enabled for testing
3. **PARTIAL**: Feature is enabled for a percentage of users
4. **FULL**: Feature is enabled for all users
5. **COMPLETE**: Feature is permanently enabled

## API Endpoints

### v4 API Base URL
```
/api/v4/
```

### Restaurant Endpoints
```
GET    /api/v4/restaurants              # Get restaurants with filtering
GET    /api/v4/restaurants/search       # Search restaurants
GET    /api/v4/restaurants/{id}         # Get specific restaurant
POST   /api/v4/restaurants              # Create restaurant
PUT    /api/v4/restaurants/{id}         # Update restaurant
DELETE /api/v4/restaurants/{id}         # Delete restaurant
```

### Review Endpoints
```
GET    /api/v4/reviews                  # Get reviews with filtering
POST   /api/v4/reviews                  # Create review
GET    /api/v4/reviews/{id}             # Get specific review
PUT    /api/v4/reviews/{id}             # Update review
DELETE /api/v4/reviews/{id}             # Delete review
```

### User Endpoints (Admin)
```
GET    /api/v4/admin/users              # Get users
PUT    /api/v4/admin/users              # Update user role
DELETE /api/v4/admin/users              # Delete user
```

### Statistics Endpoints
```
GET    /api/v4/statistics               # Get application statistics
```

### Migration Endpoints
```
GET    /api/v4/migration/status         # Get migration status
GET    /api/v4/migration/health         # Get component health
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "status_code": 400,
  "details": {
    // Additional error details
  }
}
```

## Migration Tools

### Migration Manager Script
```bash
# Check current status
python scripts/migration/api_v4_migration_manager.py --action status

# Test v4 endpoints
python scripts/migration/api_v4_migration_manager.py --action test

# Enable testing mode
python scripts/migration/api_v4_migration_manager.py --action testing

# Enable partial rollout (10%)
python scripts/migration/api_v4_migration_manager.py --action partial --percentage 10

# Enable full rollout
python scripts/migration/api_v4_migration_manager.py --action full

# Complete migration
python scripts/migration/api_v4_migration_manager.py --action complete

# Rollback migration
python scripts/migration/api_v4_migration_manager.py --action rollback

# Generate migration report
python scripts/migration/api_v4_migration_manager.py --action report --output report.json
```

### Environment Variables
```bash
# Enable specific features
export API_V4_RESTAURANTS=true
export API_V4_REVIEWS=true
export API_V4_USERS=true
export API_V4_STATISTICS=true

# Set rollout percentages
export API_V4_RESTAURANTS_ROLLOUT=25.0
export API_V4_REVIEWS_ROLLOUT=50.0

# User-specific overrides
export API_V4_RESTAURANTS_USER_123=true
```

## Testing

### Unit Tests
```bash
# Run v4 API tests
python -m pytest tests/test_api_v4.py -v

# Run service layer tests
python -m pytest tests/test_services_v4.py -v

# Run database v4 tests
python -m pytest tests/test_database_v4.py -v
```

### Integration Tests
```bash
# Run migration tests
python scripts/migration/v3_to_v4_migration.py
```

### Performance Tests
```bash
# Compare v3 vs v4 performance
python scripts/migration/api_v4_migration_manager.py --action report
```

## Monitoring

### Health Checks
- **Database v4**: Connection and basic query test
- **Cache v4**: Redis connection and basic operations
- **Services v4**: Service layer health check
- **Overall**: All components healthy

### Metrics to Monitor
- Response times (v3 vs v4)
- Error rates
- Cache hit rates
- Database connection pool usage
- Memory usage

### Logging
- Structured logging with `structlog`
- Request correlation IDs
- Error context preservation
- Performance metrics

## Rollback Plan

### Immediate Rollback
```bash
# Disable all v4 features
python scripts/migration/api_v4_migration_manager.py --action rollback
```

### Gradual Rollback
```bash
# Disable specific features
export API_V4_RESTAURANTS=false
export API_V4_REVIEWS=false
```

### Database Rollback
- v4 uses the same database schema as v3
- No data migration required
- Can switch back to v3 immediately

## Performance Considerations

### Caching Strategy
- **Restaurant Data**: 30 minutes TTL
- **Review Data**: 15 minutes TTL
- **User Data**: 60 minutes TTL
- **Statistics**: 5 minutes TTL

### Database Optimization
- Connection pooling
- Query optimization in repositories
- Index optimization
- Statement timeouts

### Memory Management
- In-memory cache fallback
- Garbage collection optimization
- Memory leak prevention

## Security

### Authentication
- Admin endpoints require authentication
- User-specific feature flags
- Request validation

### Data Validation
- Input sanitization
- Schema validation
- SQL injection prevention

### Error Handling
- No sensitive data in error messages
- Structured error responses
- Audit logging

## Troubleshooting

### Common Issues

#### Feature Flag Not Working
```bash
# Check flag status
curl http://localhost:5000/api/v4/migration/status

# Enable flag manually
export API_V4_RESTAURANTS=true
```

#### Service Not Available
```bash
# Check health status
curl http://localhost:5000/api/v4/migration/health

# Check logs
tail -f logs/app.log
```

#### Performance Issues
```bash
# Compare performance
python scripts/migration/api_v4_migration_manager.py --action report

# Check cache status
curl http://localhost:5000/api/admin/cache/stats
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Enable feature flags
export API_V4_ENABLED=true
export API_V4_RESTAURANTS=true
```

## Support

### Documentation
- [Database v4 API Documentation](DATABASE_V4_API_DOCUMENTATION.md)
- [Service Layer Documentation](SERVICE_LAYER_V4_DOCUMENTATION.md)
- [Migration Scripts Documentation](MIGRATION_SCRIPTS_DOCUMENTATION.md)

### Contact
- Development Team: dev@jewgo.com
- Emergency Contact: oncall@jewgo.com

## Timeline

### Week 1: Testing
- Enable testing mode
- Internal testing and validation
- Performance baseline establishment

### Week 2: Partial Rollout
- 10% user rollout
- Monitor metrics and errors
- Gather feedback

### Week 3: Expanded Rollout
- 50% user rollout
- Performance optimization
- Bug fixes

### Week 4: Full Rollout
- 100% user rollout
- Monitor for 48 hours
- Complete migration

### Week 5: Cleanup
- Deprecate v3 endpoints
- Remove v3 code
- Update documentation
