# V4 API Training Guide

## Overview

This training guide provides comprehensive information for the development team on the new v4 API architecture, migration process, monitoring, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Concepts](#key-concepts)
3. [Service Layer Pattern](#service-layer-pattern)
4. [Repository Pattern](#repository-pattern)
5. [Caching Strategy](#caching-strategy)
6. [Error Handling](#error-handling)
7. [Feature Flags](#feature-flags)
8. [Monitoring & Observability](#monitoring--observability)
9. [Migration Process](#migration-process)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Development Workflow](#development-workflow)

## Architecture Overview

### v3 vs v4 Comparison

**v3 Architecture (Legacy):**
```
API Routes → Database Manager v3 → Database
```

**v4 Architecture (New):**
```
API Routes v4 → Service Layer v4 → Database Manager v4 → Repository Layer → Database
```

### Key Improvements

1. **Separation of Concerns**: Business logic separated from data access
2. **Testability**: Each layer can be tested independently
3. **Maintainability**: Smaller, focused components
4. **Performance**: Enhanced caching and query optimization
5. **Scalability**: Better resource management and connection pooling

## Key Concepts

### 1. Service Layer

The service layer contains business logic and orchestrates operations between the API and data layers.

**Key Responsibilities:**
- Business logic implementation
- Data validation
- Transaction management
- Error handling
- Caching coordination

**Example Service:**
```python
class RestaurantServiceV4(BaseService):
    def get_restaurant_by_id(self, restaurant_id: int) -> dict:
        # Business logic
        if restaurant_id <= 0:
            raise ValidationError("Invalid restaurant ID")
        
        # Data access through repository
        restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
        
        # Additional business logic
        if restaurant:
            restaurant['reviews_count'] = self._get_reviews_count(restaurant_id)
        
        return restaurant
```

### 2. Repository Pattern

Repositories abstract data access and provide entity-specific operations.

**Key Benefits:**
- Centralized data access logic
- Query optimization
- Consistent error handling
- Easy testing with mocks

**Example Repository:**
```python
class RestaurantRepository(BaseRepository):
    def search_restaurants(self, query: str, limit: int = 20) -> List[Dict]:
        with self.get_session() as session:
            restaurants = session.query(Restaurant).filter(
                Restaurant.name.ilike(f"%{query}%")
            ).limit(limit).all()
            return [restaurant.to_dict() for restaurant in restaurants]
```

### 3. Caching Strategy

**Multi-Level Caching:**
1. **Redis Cache**: Primary cache for distributed systems
2. **In-Memory Cache**: Fallback for performance
3. **Cache Decorators**: Easy integration

**Cache TTL Strategy:**
- Restaurant data: 30 minutes
- Review data: 15 minutes
- User data: 60 minutes
- Statistics: 5 minutes

## Service Layer Pattern

### Creating a New Service

1. **Extend BaseService:**
```python
from services.base_service import BaseService

class MyServiceV4(BaseService):
    def __init__(self, db_manager=None, cache_manager=None, config=None):
        super().__init__(db_manager, cache_manager, config)
```

2. **Implement Business Logic:**
```python
def my_business_operation(self, data: dict) -> dict:
    # Validation
    self._validate_input(data)
    
    # Business logic
    result = self._process_data(data)
    
    # Cache result
    self.cache_manager.set(f"my_key_{data['id']}", result, ttl=300)
    
    return result
```

3. **Error Handling:**
```python
def _validate_input(self, data: dict):
    if not data.get('required_field'):
        raise ValidationError("Required field is missing")
```

### Service Best Practices

1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Accept dependencies in constructor
3. **Error Propagation**: Use custom exceptions
4. **Caching**: Use cache decorators for frequently accessed data
5. **Logging**: Use structured logging with context

## Repository Pattern

### Creating a New Repository

1. **Extend BaseRepository:**
```python
from database.base_repository import BaseRepository
from database.models import MyModel

class MyRepository(BaseRepository):
    def __init__(self, connection_manager):
        super().__init__(connection_manager, MyModel)
```

2. **Implement Entity-Specific Methods:**
```python
def find_by_custom_field(self, field_value: str) -> List[MyModel]:
    with self.get_session() as session:
        return session.query(self.model).filter(
            self.model.custom_field == field_value
        ).all()
```

3. **Query Optimization:**
```python
def get_with_relationships(self, entity_id: int) -> MyModel:
    with self.get_session() as session:
        return session.query(self.model).options(
            joinedload(self.model.relationship)
        ).filter(self.model.id == entity_id).first()
```

### Repository Best Practices

1. **Session Management**: Always use context managers
2. **Query Optimization**: Use appropriate joins and eager loading
3. **Error Handling**: Catch and re-raise with context
4. **Connection Pooling**: Leverage connection manager
5. **Transaction Management**: Use explicit transactions when needed

## Caching Strategy

### Cache Decorators

**Usage:**
```python
from utils.cache_manager_v4 import cache_restaurant

class RestaurantServiceV4(BaseService):
    @cache_restaurant(ttl=1800)  # 30 minutes
    def get_restaurant_by_id(self, restaurant_id: int) -> dict:
        return self.db_manager.get_restaurant_by_id(restaurant_id)
```

**Available Decorators:**
- `@cache_restaurant(ttl=1800)`
- `@cache_review(ttl=900)`
- `@cache_user(ttl=3600)`
- `@cache_statistics(ttl=300)`

### Manual Caching

```python
def get_cached_data(self, key: str):
    # Try cache first
    cached = self.cache_manager.get(key)
    if cached:
        return cached
    
    # Fetch from database
    data = self.db_manager.get_data()
    
    # Cache for future use
    self.cache_manager.set(key, data, ttl=300)
    
    return data
```

### Cache Invalidation

```python
def update_restaurant(self, restaurant_id: int, data: dict):
    # Update database
    success = self.db_manager.update_restaurant(restaurant_id, data)
    
    if success:
        # Invalidate related caches
        self.cache_manager.invalidate_pattern(f"restaurant_{restaurant_id}")
        self.cache_manager.invalidate_pattern("restaurants_list")
    
    return success
```

## Error Handling

### Custom Exceptions

```python
from utils.error_handler import (
    ValidationError, NotFoundError, DatabaseError, 
    ExternalServiceError, APIError
)

# Usage in services
def get_restaurant(self, restaurant_id: int):
    if restaurant_id <= 0:
        raise ValidationError("Invalid restaurant ID")
    
    restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
    if not restaurant:
        raise NotFoundError(f"Restaurant {restaurant_id} not found")
    
    return restaurant
```

### Error Response Format

```json
{
  "success": false,
  "error": "Restaurant not found",
  "status_code": 404,
  "details": {
    "restaurant_id": 123,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Handling Best Practices

1. **Use Specific Exceptions**: Don't use generic exceptions
2. **Provide Context**: Include relevant details in error messages
3. **Log Errors**: Use structured logging with error context
4. **Graceful Degradation**: Handle errors gracefully when possible
5. **User-Friendly Messages**: Don't expose internal details to users

## Feature Flags

### Flag Management

**Environment Variables:**
```bash
# Enable specific features
export API_V4_RESTAURANTS=true
export API_V4_REVIEWS=true

# Set rollout percentages
export API_V4_RESTAURANTS_ROLLOUT=25.0

# User-specific overrides
export API_V4_RESTAURANTS_USER_123=true
```

**Programmatic Control:**
```python
from utils.feature_flags_v4 import api_v4_flags

# Check if feature is enabled
if api_v4_flags.is_enabled("api_v4_restaurants", user_id="123"):
    # Use v4 API
    pass
else:
    # Use v3 API
    pass
```

### Migration Stages

1. **DISABLED**: Feature completely disabled
2. **TESTING**: Enabled for internal testing
3. **PARTIAL**: Enabled for percentage of users
4. **FULL**: Enabled for all users
5. **COMPLETE**: Permanently enabled

## Monitoring & Observability

### Metrics Collection

**Request Metrics:**
```python
from monitoring.v4_monitoring import record_v4_request

def api_endpoint():
    start_time = time.time()
    try:
        result = process_request()
        response_time = (time.time() - start_time) * 1000
        
        record_v4_request(
            endpoint="/api/v4/restaurants",
            method="GET",
            response_time_ms=response_time,
            status_code=200,
            user_id="123"
        )
        
        return result
    except Exception as e:
        record_v4_error(
            endpoint="/api/v4/restaurants",
            error_type="validation_error",
            error_message=str(e),
            user_id="123"
        )
        raise
```

### Health Checks

**Component Health:**
```python
from monitoring.v4_monitoring import get_v4_metrics_summary

def health_check():
    metrics = get_v4_metrics_summary(hours=1)
    
    return {
        "database_healthy": metrics.get("database", {}).get("connection_time", 0) < 1000,
        "cache_healthy": metrics.get("cache", {}).get("hit_rate", 0) > 70,
        "error_rate": metrics.get("errors", {}).get("total", 0) / metrics.get("requests", {}).get("total", 1) * 100
    }
```

### Alerting

**Alert Types:**
- High error rate (>5%)
- Slow response times (>1 second)
- High memory usage (>80%)
- High CPU usage (>80%)
- Database connection failures
- Cache hit rate below threshold

## Migration Process

### Phase 1: Infrastructure Setup ✅

**Completed Tasks:**
- [x] Database Manager v4 with repository pattern
- [x] Service layer implementation
- [x] Caching layer with Redis
- [x] Comprehensive test suite

### Phase 2: API Layer Migration ✅

**Completed Tasks:**
- [x] v4 API routes with service integration
- [x] Feature flags for gradual rollout
- [x] Monitoring and health checks
- [x] Migration management tools

### Phase 3: Gradual Rollout (Current)

**Steps:**
1. **Testing Mode**: Enable for internal testing
2. **Partial Rollout**: 5-10% of users
3. **Monitor Metrics**: Performance and error rates
4. **Incremental Increase**: 10% increments every 24 hours
5. **Full Rollout**: 100% of users
6. **Complete Migration**: Deprecate v3

### Phase 4: Completion

**Tasks:**
- [ ] Deprecate v3 API endpoints
- [ ] Remove v3 code
- [ ] Update documentation
- [ ] Team training completion

### Rollout Commands

```bash
# Check current status
python scripts/migration/gradual_rollout_manager.py --action status

# Start rollout
python scripts/migration/gradual_rollout_manager.py --action start

# Force percentage (admin only)
python scripts/migration/gradual_rollout_manager.py --action force --percentage 25

# Generate report
python scripts/migration/gradual_rollout_manager.py --action report
```

## Best Practices

### Development

1. **Code Organization:**
   - Keep services focused on business logic
   - Use repositories for data access
   - Implement proper error handling
   - Use type hints consistently

2. **Testing:**
   - Unit test services with mocked dependencies
   - Integration test repositories
   - Performance test critical paths
   - Test error scenarios

3. **Performance:**
   - Use caching appropriately
   - Optimize database queries
   - Monitor memory usage
   - Use connection pooling

4. **Security:**
   - Validate all inputs
   - Use parameterized queries
   - Implement proper authentication
   - Log security events

### Deployment

1. **Feature Flags:**
   - Use flags for all new features
   - Test with flags disabled
   - Monitor flag usage
   - Clean up unused flags

2. **Monitoring:**
   - Set up alerts for critical metrics
   - Monitor error rates
   - Track performance trends
   - Review logs regularly

3. **Rollback Plan:**
   - Keep v3 API available during migration
   - Test rollback procedures
   - Monitor for issues
   - Have emergency contacts ready

## Troubleshooting

### Common Issues

**1. Database Connection Issues:**
```bash
# Check connection
python -c "from database.database_manager_v4 import DatabaseManager; db = DatabaseManager(); print(db.connect())"

# Check logs
tail -f logs/app.log | grep "database"
```

**2. Cache Issues:**
```bash
# Check Redis connection
redis-cli ping

# Check cache hit rate
curl http://localhost:5000/api/v4/migration/health
```

**3. Performance Issues:**
```bash
# Run performance tests
python tests/performance/test_v4_performance.py --save

# Check metrics
curl http://localhost:5000/api/v4/migration/status
```

**4. Feature Flag Issues:**
```bash
# Check flag status
curl http://localhost:5000/api/v4/migration/status

# Enable flags manually
export API_V4_RESTAURANTS=true
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Enable all v4 features
export API_V4_ENABLED=true
export API_V4_RESTAURANTS=true
export API_V4_REVIEWS=true
export API_V4_USERS=true
export API_V4_STATISTICS=true
```

### Getting Help

1. **Documentation**: Check this guide and API documentation
2. **Logs**: Review application logs for errors
3. **Monitoring**: Check metrics and alerts
4. **Team**: Contact development team lead
5. **Emergency**: Use rollback procedures if needed

## Development Workflow

### Adding New Features

1. **Create Service:**
```python
# services/new_feature_service_v4.py
class NewFeatureServiceV4(BaseService):
    def new_operation(self, data: dict) -> dict:
        # Implementation
        pass
```

2. **Create Repository:**
```python
# database/repositories/new_feature_repository.py
class NewFeatureRepository(BaseRepository):
    def custom_query(self, params: dict) -> List[Dict]:
        # Implementation
        pass
```

3. **Add API Route:**
```python
# routes/api_v4.py
@api_v4.route("/new-feature", methods=["GET"])
@require_api_v4_flag("api_v4_new_feature")
def get_new_feature():
    # Implementation
    pass
```

4. **Add Tests:**
```python
# tests/test_new_feature_v4.py
class TestNewFeatureV4:
    def test_new_operation(self):
        # Test implementation
        pass
```

5. **Add Feature Flag:**
```python
# utils/feature_flags_v4.py
"api_v4_new_feature": {
    "default": False,
    "description": "Enable new feature",
    "stage": MigrationStage.DISABLED
}
```

### Code Review Checklist

- [ ] Service layer implements business logic correctly
- [ ] Repository uses proper session management
- [ ] Error handling is comprehensive
- [ ] Caching is implemented where appropriate
- [ ] Tests cover success and error scenarios
- [ ] Feature flags are used for new functionality
- [ ] Documentation is updated
- [ ] Performance impact is considered

### Deployment Checklist

- [ ] All tests pass
- [ ] Performance tests show no regression
- [ ] Feature flags are configured
- [ ] Monitoring is set up
- [ ] Rollback plan is ready
- [ ] Team is notified
- [ ] Documentation is updated

## Conclusion

The v4 API architecture provides significant improvements in maintainability, testability, and performance. By following the patterns and best practices outlined in this guide, the development team can effectively work with the new architecture and contribute to its continued improvement.

### Key Takeaways

1. **Service Layer**: Contains business logic and orchestrates operations
2. **Repository Pattern**: Abstracts data access and provides entity-specific operations
3. **Caching Strategy**: Multi-level caching for performance optimization
4. **Error Handling**: Structured error handling with custom exceptions
5. **Feature Flags**: Gradual rollout and A/B testing capabilities
6. **Monitoring**: Comprehensive metrics and alerting
7. **Migration Process**: Safe, gradual migration with rollback capabilities

### Next Steps

1. Complete team training on v4 architecture
2. Begin gradual rollout process
3. Monitor performance and error rates
4. Gather feedback and iterate
5. Complete migration to v4
6. Deprecate v3 API

For questions or support, contact the development team lead or refer to the comprehensive documentation in the `docs/` directory.
