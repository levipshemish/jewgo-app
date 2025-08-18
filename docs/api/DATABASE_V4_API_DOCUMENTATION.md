# DatabaseManager v4 API Documentation

## Overview

DatabaseManager v4 introduces a modular, repository-based architecture that improves maintainability, testability, and performance. This document provides comprehensive API documentation for the new database layer.

## Architecture

### Core Components

```
DatabaseManager v4
├── ConnectionManager (Database connections & sessions)
├── BaseRepository (Generic CRUD operations)
├── RestaurantRepository (Restaurant-specific operations)
├── ReviewRepository (Review-specific operations)
├── UserRepository (User-specific operations)
└── ImageRepository (Image-specific operations)
```

### Key Improvements

- **Modular Design**: Separated concerns into focused repositories
- **Repository Pattern**: Clean interfaces for data access
- **Connection Management**: Centralized connection handling with retry logic
- **Caching Layer**: Redis integration with fallback to in-memory cache
- **Error Handling**: Structured error handling and logging
- **Performance**: Optimized queries and connection pooling

## DatabaseManager v4

### Initialization

```python
from database.database_manager_v4 import DatabaseManager

# Initialize with default configuration
db_manager = DatabaseManager()

# Initialize with custom database URL
db_manager = DatabaseManager(database_url="postgresql://user:pass@localhost/db")

# Connect to database
success = db_manager.connect()
```

### Core Methods

#### Connection Management

```python
# Connect to database
success = db_manager.connect()

# Disconnect from database
db_manager.disconnect()

# Check database health
is_healthy = db_manager.health_check()

# Test connection
is_connected = db_manager.test_connection()

# Close all connections
db_manager.close()
```

#### Restaurant Operations

```python
# Get all restaurants
restaurants = db_manager.get_restaurants(
    limit=50,
    offset=0,
    as_dict=True,
    filters={"status": "active", "kosher_category": "dairy"}
)

# Get restaurant by ID
restaurant = db_manager.get_restaurant_by_id(restaurant_id)

# Search restaurants
results = db_manager.search_restaurants(
    query="pizza",
    limit=20,
    offset=0
)

# Search restaurants near location
nearby = db_manager.search_restaurants_near_location(
    latitude=25.7617,
    longitude=-80.1918,
    radius_miles=5.0,
    limit=20
)

# Add new restaurant
success = db_manager.add_restaurant(restaurant_data)

# Update restaurant
success = db_manager.update_restaurant_data(restaurant_id, update_data)

# Delete restaurant
success = db_manager.delete_restaurant(restaurant_id)

# Get restaurant statistics
stats = db_manager.get_restaurant_statistics()
```

#### Review Operations

```python
# Get reviews
reviews = db_manager.get_reviews(
    restaurant_id=1,
    status="approved",
    limit=20,
    offset=0,
    filters={"rating": 5}
)

# Get review count
count = db_manager.get_reviews_count(
    restaurant_id=1,
    status="approved"
)

# Get review by ID
review = db_manager.get_review_by_id(review_id)

# Create review
review_id = db_manager.create_review(review_data)

# Update review
success = db_manager.update_review(review_id, update_data)

# Delete review
success = db_manager.delete_review(review_id)

# Get review statistics
stats = db_manager.get_review_statistics()
```

#### User Operations

```python
# Get users
users = db_manager.get_users(
    limit=20,
    offset=0,
    filters={"role": "admin"}
)

# Get user count
count = db_manager.get_users_count(filters={"role": "admin"})

# Get user by ID
user = db_manager.get_user_by_id(user_id)

# Update user role
success = db_manager.update_user_role(user_id, is_super_admin=True)

# Delete user
success = db_manager.delete_user(user_id)

# Get user statistics
stats = db_manager.get_user_statistics()
```

#### Image Operations

```python
# Get restaurant images
images = db_manager.get_restaurant_images(restaurant_id)

# Add restaurant image
image = db_manager.add_restaurant_image(
    restaurant_id=1,
    image_url="https://example.com/image.jpg",
    image_order=1,
    cloudinary_public_id="cloudinary_id"
)

# Delete restaurant image
success = db_manager.delete_restaurant_image(image_id)

# Get image statistics
stats = db_manager.get_image_statistics()
```

## Repository Layer

### BaseRepository

Generic CRUD operations that can be inherited by specific repositories.

```python
from database.base_repository import BaseRepository
from database.models import Restaurant

class RestaurantRepository(BaseRepository[Restaurant]):
    def __init__(self, connection_manager):
        super().__init__(connection_manager, Restaurant)
```

#### Available Methods

```python
# Create
record = repository.create(data)

# Read
record = repository.get_by_id(id)
records = repository.get_all(limit=10, offset=0, filters={})
count = repository.count(filters={})

# Update
success = repository.update(id, data)

# Delete
success = repository.delete(id)

# Utility
exists = repository.exists(id)
record = repository.find_by_field("name", "value")
records = repository.find_all_by_field("status", "active")

# Bulk operations
records = repository.bulk_create(data_list)
success = repository.bulk_update(updates)
```

### RestaurantRepository

Restaurant-specific database operations.

```python
from database.repositories.restaurant_repository import RestaurantRepository

repo = RestaurantRepository(connection_manager)
```

#### Methods

```python
# Get restaurants with filters
restaurants = repo.get_restaurants_with_filters(
    kosher_type="dairy",
    status="active",
    limit=20,
    offset=0,
    filters={"search": "pizza"}
)

# Search restaurants
results = repo.search_restaurants("query", limit=20, offset=0)

# Search by location
nearby = repo.search_restaurants_near_location(
    latitude=25.7617,
    longitude=-80.1918,
    radius_miles=5.0,
    limit=20
)

# Get restaurant by name
restaurant = repo.get_restaurant_by_name("Restaurant Name")

# Get statistics
stats = repo.get_statistics()

# Update hours
success = repo.update_restaurant_hours(restaurant_id, hours_data)

# Update ORB data
success = repo.update_restaurant_orb_data(restaurant_id, orb_data)
```

### ReviewRepository

Review-specific database operations.

```python
from database.repositories.review_repository import ReviewRepository

repo = ReviewRepository(connection_manager)
```

#### Methods

```python
# Get reviews
reviews = repo.get_reviews(
    restaurant_id=1,
    status="approved",
    limit=20,
    offset=0
)

# Get reviews by restaurant
restaurant_reviews = repo.get_reviews_by_restaurant(
    restaurant_id=1,
    status="approved",
    limit=20,
    offset=0
)

# Get reviews by user
user_reviews = repo.get_reviews_by_user(
    user_id="user_123",
    limit=20,
    offset=0
)

# Create review
review_id = repo.create_review(review_data)

# Update status
success = repo.update_review_status(
    review_id="rev_123",
    status="approved",
    moderator_notes="Good review"
)

# Flag review
success = repo.flag_review(review_id, flag_data)

# Get flagged reviews
flagged = repo.get_flagged_reviews()

# Get statistics
stats = repo.get_review_statistics()
```

### UserRepository

User-specific database operations.

```python
from database.repositories.user_repository import UserRepository

repo = UserRepository(connection_manager)
```

#### Methods

```python
# Get users
users = repo.get_users(limit=20, offset=0, filters={})

# Get users count
count = repo.get_users_count(filters={})

# Get user by email
user = repo.get_user_by_email("user@example.com")

# Get admin users
admins = repo.get_admin_users()

# Get admin count
admin_count = repo.get_admin_count()

# Update user role
success = repo.update_user_role(user_id, is_super_admin=True)

# Delete user
success = repo.delete_user(user_id)

# Get statistics
stats = repo.get_user_statistics()

# Get user sessions
sessions = repo.get_user_sessions(user_id)

# Get user accounts
accounts = repo.get_user_accounts(user_id)
```

### ImageRepository

Image-specific database operations.

```python
from database.repositories.image_repository import ImageRepository

repo = ImageRepository(connection_manager)
```

#### Methods

```python
# Get restaurant images
images = repo.get_restaurant_images(restaurant_id)

# Get image count
count = repo.get_restaurant_images_count(restaurant_id)

# Add image
image = repo.add_restaurant_image(
    restaurant_id=1,
    image_url="https://example.com/image.jpg",
    image_order=1,
    cloudinary_public_id="cloudinary_id"
)

# Update image order
success = repo.update_image_order(image_id, new_order)

# Update image URL
success = repo.update_image_url(image_id, new_url)

# Update Cloudinary ID
success = repo.update_cloudinary_public_id(image_id, cloudinary_id)

# Delete image
success = repo.delete_restaurant_image(image_id)

# Delete all restaurant images
success = repo.delete_all_restaurant_images(restaurant_id)

# Reorder images
success = repo.reorder_restaurant_images(restaurant_id, image_orders)

# Get images without Cloudinary ID
images = repo.get_images_without_cloudinary_id()

# Get images by Cloudinary ID
images = repo.get_images_by_cloudinary_id(cloudinary_id)

# Get statistics
stats = repo.get_image_statistics()

# Bulk update Cloudinary IDs
success = repo.bulk_update_cloudinary_ids(updates)
```

## Connection Management

### DatabaseConnectionManager

Handles database connections, sessions, and connection pooling.

```python
from database.connection_manager import DatabaseConnectionManager

conn_manager = DatabaseConnectionManager(database_url)
```

#### Methods

```python
# Connect to database
success = conn_manager.connect()

# Get session
session = conn_manager.get_session()

# Use session context manager
with conn_manager.session_scope() as session:
    # Database operations
    pass

# Test connection
is_connected = conn_manager.test_connection()

# Health check
is_healthy = conn_manager.health_check()

# Disconnect
conn_manager.disconnect()

# Close all connections
conn_manager.close()
```

## Caching Layer

### CacheManagerV4

Redis-based caching with in-memory fallback.

```python
from utils.cache_manager_v4 import CacheManagerV4

cache = CacheManagerV4(
    redis_url="redis://localhost:6379",
    default_ttl=3600,
    enable_cache=True,
    cache_prefix="jewgo:v4:"
)
```

#### Methods

```python
# Basic operations
cache.set("key", value, ttl=3600)
value = cache.get("key", default=None)
success = cache.delete("key")
exists = cache.exists("key")

# Pattern operations
deleted_count = cache.delete_pattern("pattern:*")

# Get or set
value = cache.get_or_set("key", default_func, ttl=3600)

# Invalidation
cache.invalidate_restaurant_cache(restaurant_id)
cache.invalidate_review_cache(review_id, restaurant_id)
cache.invalidate_user_cache(user_id)
cache.invalidate_image_cache(restaurant_id)

# Statistics
stats = cache.get_cache_stats()

# Health check
is_healthy = cache.health_check()

# Clear all
success = cache.clear()

# Close connections
cache.close()
```

#### Cache Decorators

```python
from utils.cache_manager_v4 import cache_restaurant, cache_review, cache_user, cache_statistics

@cache_restaurant(ttl=1800)
def get_restaurant_by_id(self, restaurant_id):
    # Implementation
    pass

@cache_review(ttl=900)
def get_reviews(self, restaurant_id):
    # Implementation
    pass

@cache_user(ttl=3600)
def get_user_by_id(self, user_id):
    # Implementation
    pass

@cache_statistics(ttl=300)
def get_statistics(self):
    # Implementation
    pass
```

## Service Layer

### RestaurantServiceV4

Business logic for restaurant operations.

```python
from services.restaurant_service_v4 import RestaurantServiceV4

service = RestaurantServiceV4(db_manager=db_manager)
```

#### Methods

```python
# Get all restaurants
restaurants = service.get_all_restaurants(filters={})

# Get restaurant by ID
restaurant = service.get_restaurant_by_id(restaurant_id)

# Search restaurants
results = service.search_restaurants("query", filters={}, limit=20, offset=0)

# Search by location
nearby = service.search_restaurants_near_location(
    latitude=25.7617,
    longitude=-80.1918,
    radius_miles=5.0,
    limit=20
)

# Create restaurant
restaurant = service.create_restaurant(restaurant_data)

# Update restaurant
restaurant = service.update_restaurant(restaurant_id, update_data)

# Delete restaurant
success = service.delete_restaurant(restaurant_id)

# Get statistics
stats = service.get_restaurant_statistics()

# Image operations
images = service.get_restaurant_images(restaurant_id)
image = service.add_restaurant_image(restaurant_id, image_url, image_order)
```

### ReviewServiceV4

Business logic for review operations.

```python
from services.review_service_v4 import ReviewServiceV4

service = ReviewServiceV4(db_manager=db_manager)
```

#### Methods

```python
# Get reviews
reviews = service.get_reviews(
    restaurant_id=1,
    status="approved",
    limit=20,
    offset=0,
    filters={}
)

# Get review count
count = service.get_reviews_count(restaurant_id=1, status="approved")

# Get review by ID
review = service.get_review_by_id(review_id)

# Create review
review_id = service.create_review(review_data)

# Update review
success = service.update_review(review_id, update_data)

# Delete review
success = service.delete_review(review_id)

# Get statistics
stats = service.get_review_statistics()

# Get reviews by restaurant
restaurant_reviews = service.get_reviews_by_restaurant(restaurant_id)

# Get reviews by user
user_reviews = service.get_reviews_by_user(user_id)

# Update status
success = service.update_review_status(review_id, status, moderator_notes)
```

### UserServiceV4

Business logic for user operations.

```python
from services.user_service_v4 import UserServiceV4

service = UserServiceV4(db_manager=db_manager)
```

#### Methods

```python
# Get users
users = service.get_users(limit=20, offset=0, filters={})

# Get user count
count = service.get_users_count(filters={})

# Get user by ID
user = service.get_user_by_id(user_id)

# Update user role
success = service.update_user_role(user_id, is_super_admin)

# Delete user
success = service.delete_user(user_id)

# Get statistics
stats = service.get_user_statistics()

# Get admin users
admins = service.get_admin_users()

# Get users by role
users = service.get_users_by_role("admin", limit=20, offset=0)

# Search users
results = service.search_users("query", limit=20, offset=0)

# Get users with verified email
verified_users = service.get_users_with_verified_email(limit=20, offset=0)

# Get users without verified email
unverified_users = service.get_users_without_verified_email(limit=20, offset=0)
```

## Error Handling

### Error Types

```python
from utils.error_handler import NotFoundError, ValidationError, DatabaseError

# Not found error
raise NotFoundError("Restaurant not found")

# Validation error
raise ValidationError("Invalid restaurant ID")

# Database error
raise DatabaseError("Database connection failed")
```

### Error Handling in Repositories

```python
try:
    result = repository.get_by_id(id)
    if not result:
        raise NotFoundError(f"Record with ID {id} not found")
    return result
except SQLAlchemyError as e:
    logger.exception("Database error", error=str(e))
    raise DatabaseError("Database operation failed")
```

## Performance Optimization

### Query Optimization

1. **Eager Loading**: Use `_eager_load_restaurant_images()` for related data
2. **Indexing**: Ensure proper database indexes on frequently queried fields
3. **Pagination**: Always use `limit` and `offset` for large datasets
4. **Filtering**: Use specific filters to reduce result sets

### Caching Strategy

1. **Frequently Accessed Data**: Cache restaurant details, user profiles
2. **Statistics**: Cache aggregated data with short TTL
3. **Search Results**: Cache search queries with appropriate TTL
4. **Invalidation**: Use targeted cache invalidation for updates

### Connection Pooling

1. **Pool Size**: Configure appropriate pool size for your workload
2. **Connection Timeout**: Set reasonable timeouts for connections
3. **Retry Logic**: Implement retry logic for transient failures
4. **Health Checks**: Regular health checks to detect connection issues

## Migration Guide

### From v3 to v4

1. **Update Imports**:
   ```python
   # Old
   from database.database_manager_v3 import EnhancedDatabaseManager
   
   # New
   from database.database_manager_v4 import DatabaseManager
   ```

2. **Initialize Manager**:
   ```python
   # Old
   db_manager = EnhancedDatabaseManager()
   
   # New
   db_manager = DatabaseManager()
   ```

3. **Method Compatibility**: Most methods maintain the same interface

4. **Service Layer**: Use new service classes for business logic

5. **Caching**: Integrate CacheManagerV4 for performance improvements

## Testing

### Unit Tests

```python
from tests.test_database_v4 import TestDatabaseManagerV4

# Test database manager
def test_initialization(self):
    db_manager = DatabaseManager()
    assert db_manager.connection_manager is not None

# Test repositories
def test_restaurant_repository(self):
    repo = RestaurantRepository(connection_manager)
    restaurants = repo.get_restaurants_with_filters()
    assert len(restaurants) >= 0
```

### Integration Tests

```python
from tests.test_services_v4 import TestRestaurantServiceV4

# Test service layer
def test_get_all_restaurants(self):
    service = RestaurantServiceV4(db_manager=mock_db_manager)
    restaurants = service.get_all_restaurants()
    assert isinstance(restaurants, list)
```

### Performance Tests

```python
# Test caching
def test_cache_performance(self):
    cache = CacheManagerV4()
    start_time = time.time()
    for i in range(1000):
        cache.set(f"key_{i}", f"value_{i}")
    end_time = time.time()
    assert (end_time - start_time) < 1.0  # Should complete in under 1 second
```

## Monitoring

### Health Checks

```python
# Database health
db_healthy = db_manager.health_check()

# Cache health
cache_healthy = cache_manager.health_check()

# Connection health
conn_healthy = connection_manager.health_check()
```

### Metrics

```python
# Cache statistics
cache_stats = cache_manager.get_cache_stats()

# Database statistics
db_stats = db_manager.get_restaurant_statistics()
```

### Logging

```python
import structlog

logger = structlog.get_logger()

# Log operations
logger.info("Retrieved restaurants", count=len(restaurants))

# Log errors
logger.exception("Database error", error=str(e))
```

## Best Practices

1. **Always use connection context managers**:
   ```python
   with connection_manager.session_scope() as session:
       # Database operations
   ```

2. **Implement proper error handling**:
   ```python
   try:
       result = operation()
   except NotFoundError:
       # Handle not found
   except ValidationError:
       # Handle validation errors
   ```

3. **Use caching for frequently accessed data**:
   ```python
   @cache_restaurant(ttl=1800)
   def get_restaurant_by_id(self, restaurant_id):
       # Implementation
   ```

4. **Validate input data**:
   ```python
   if not restaurant_id or restaurant_id <= 0:
       raise ValidationError("Invalid restaurant ID")
   ```

5. **Use appropriate TTL for cache entries**:
   - Statistics: 5 minutes
   - Reviews: 15 minutes
   - Restaurants: 30 minutes
   - Users: 1 hour

6. **Monitor performance metrics**:
   - Query execution times
   - Cache hit rates
   - Connection pool usage
   - Error rates

## Troubleshooting

### Common Issues

1. **Connection Timeouts**: Increase connection timeout settings
2. **Memory Usage**: Monitor cache size and adjust TTL
3. **Query Performance**: Add database indexes for slow queries
4. **Cache Misses**: Review cache invalidation strategy

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable SQL query logging
import structlog
structlog.configure(processors=[structlog.dev.ConsoleRenderer()])
```

This documentation provides a comprehensive guide to using DatabaseManager v4. For additional support, refer to the migration guide and test examples.
