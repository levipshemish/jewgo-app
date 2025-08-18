# Service Layer Architecture for JewGo Backend

## Overview

The JewGo backend has been refactored to use a **Service Layer Architecture** that separates business logic from Flask route handlers. This improves code organization, maintainability, testability, and follows the Single Responsibility Principle.

## Architecture Components

### 1. Service Layer (`backend/services/`)

The service layer contains business logic classes that handle specific domains:

#### Base Service (`base_service.py`)
- **Purpose**: Common functionality and utilities for all services
- **Features**:
  - Structured logging with service context
  - Input validation utilities
  - Common error handling patterns

#### Restaurant Service (`restaurant_service.py`)
- **Purpose**: Handles all restaurant-related business logic
- **Key Methods**:
  - `get_all_restaurants(filters)` - Retrieve restaurants with filtering
  - `get_restaurant_by_id(id)` - Get single restaurant by ID
  - `update_restaurant(id, data)` - Update restaurant information
- **Features**:
  - Input validation and sanitization
  - Data processing and computed fields
  - Phone number formatting
  - Business rule enforcement

#### Google Places Service (`google_places_service.py`)
- **Purpose**: Handles external Google Places API interactions
- **Key Methods**:
  - `update_missing_websites(batch_size)` - Update websites for restaurants
  - `_fetch_restaurant_website(restaurant)` - Fetch website for single restaurant
- **Features**:
  - API key management
  - Rate limiting and error handling
  - Batch processing capabilities

#### Health Service (`health_service.py`)
- **Purpose**: System health monitoring and status reporting
- **Key Methods**:
  - `get_health_status()` - Comprehensive health check
  - `_check_database_health()` - Database connectivity check
  - `_check_external_services()` - External service availability
- **Features**:
  - Database connectivity testing
  - External service monitoring
  - Timestamp and version tracking

### 2. Application Factory (`app_factory.py`)

The application factory pattern provides proper dependency injection and configuration:

#### Key Features:
- **Dependency Injection**: Services receive database manager and config
- **Configuration Management**: Centralized app configuration
- **Error Handler Registration**: Automatic error handler setup
- **Route Registration**: Clean route organization
- **Testing Support**: Easy to create test instances

#### Factory Methods:
- `create_app(config_class)` - Main factory function
- `_initialize_database_manager(config)` - Database setup
- `_initialize_services(db_manager, config)` - Service initialization
- `_register_routes(app, services, limiter)` - Route registration

### 3. Error Handling (`utils/error_handler.py`)

Enhanced error handling with service layer support:

#### Error Classes:
- `ValidationError` - Input validation failures
- `NotFoundError` - Resource not found
- `ExternalServiceError` - External API failures
- `DatabaseError` - Database operation failures

#### Error Handler Registration:
- `register_error_handlers(app)` - Standalone function for error handler setup
- Consistent JSON error responses
- Structured logging for all errors

## Benefits of Service Layer Architecture

### 1. **Separation of Concerns**
- **Routes**: Handle HTTP requests/responses only
- **Services**: Contain business logic
- **Database**: Handle data persistence
- **Utils**: Provide shared utilities

### 2. **Improved Testability**
- Services can be unit tested independently
- Mock database manager for testing
- Isolated business logic testing
- Easy to test error scenarios

### 3. **Better Maintainability**
- Clear responsibility boundaries
- Reduced code duplication
- Centralized business logic
- Easier to modify and extend

### 4. **Enhanced Error Handling**
- Consistent error responses
- Structured logging
- Proper error propagation
- Service-specific error context

### 5. **Scalability**
- Easy to add new services
- Independent service scaling
- Clear dependency management
- Modular architecture

## Usage Examples

### Basic Service Usage

```python
# Initialize services
restaurant_service = RestaurantService(db_manager, config)
google_places_service = GooglePlacesService(db_manager, config)
health_service = HealthService(db_manager, config)

# Use services in routes
@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    filters = {
        'location': request.args.get('location'),
        'cuisine_type': request.args.get('cuisine_type')
    }
    restaurants = restaurant_service.get_all_restaurants(filters)
    return jsonify({'restaurants': restaurants})
```

### Error Handling

```python
try:
    restaurant = restaurant_service.get_restaurant_by_id(restaurant_id)
    return jsonify(restaurant), 200
except NotFoundError as e:
    # Automatically handled by error handlers
    raise e
except ValidationError as e:
    # Automatically handled by error handlers
    raise e
```

### Health Checks

```python
health_status = health_service.get_health_status()
if health_status['status'] == 'healthy':
    return jsonify(health_status), 200
else:
    return jsonify(health_status), 503
```

## Database Integration

### Database Manager Methods Used

The services integrate with the existing `EnhancedDatabaseManager`:

#### Restaurant Service:
- `search_places()` - Get restaurants with filtering
- `get_place_by_id()` - Get single restaurant
- `update_restaurant_data()` - Update restaurant information

#### Google Places Service:
- `get_restaurants_without_websites()` - Get restaurants needing websites
- `update_restaurant_data()` - Update restaurant with website

#### Health Service:
- `health_check()` - Database connectivity test

### Field Mapping

The services handle the database schema correctly:

```python
# Database field names
'phone_number'  # Not 'phone'
'kosher_category'  # Not 'cuisine_type'
'short_description'  # Not 'description'
'hours_of_operation'  # Not 'hours'
```

## Testing

### Running Service Tests

```bash
cd backend
python test_services.py
```

### Test Coverage

The test script verifies:
- Service initialization
- Database connectivity
- Restaurant retrieval
- Health checks
- Error handling

## Migration Guide

### From Old Architecture

1. **Replace direct database calls** with service calls
2. **Move business logic** from routes to services
3. **Update error handling** to use service exceptions
4. **Test thoroughly** before deployment

### Example Migration

**Before (in route):**
```python
@app.route('/api/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    session = db_manager.get_session()
    restaurant = session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    return jsonify(restaurant.to_dict()), 200
```

**After (using service):**
```python
@app.route('/api/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    restaurant = restaurant_service.get_restaurant_by_id(restaurant_id)
    return jsonify(restaurant), 200
```

## Configuration

### Environment Variables

The services use the same configuration as the main app:

```python
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Google Places API
GOOGLE_PLACES_API_KEY=your_api_key

# Logging
LOG_LEVEL=INFO
```

### Service Configuration

Services receive configuration through dependency injection:

```python
# In app_factory.py
services = {
    'restaurant_service': RestaurantService(db_manager, app.config),
    'google_places_service': GooglePlacesService(db_manager, app.config),
    'health_service': HealthService(db_manager, app.config)
}
```

## Best Practices

### 1. **Service Design**
- Keep services focused on single domain
- Use dependency injection
- Implement proper error handling
- Add comprehensive logging

### 2. **Error Handling**
- Use specific exception types
- Provide meaningful error messages
- Log errors with context
- Handle external service failures gracefully

### 3. **Testing**
- Unit test each service independently
- Mock external dependencies
- Test error scenarios
- Use test fixtures for data

### 4. **Logging**
- Use structured logging
- Include service context
- Log important operations
- Monitor performance metrics

## Future Enhancements

### Planned Improvements

1. **Caching Layer**: Add Redis caching for frequently accessed data
2. **Async Support**: Implement async/await for external API calls
3. **Event System**: Add event-driven architecture for notifications
4. **Metrics**: Add performance monitoring and metrics collection
5. **API Versioning**: Implement API versioning support

### Service Extensions

1. **User Service**: Handle user management and authentication
2. **Review Service**: Manage restaurant reviews and ratings
3. **Notification Service**: Handle push notifications and emails
4. **Analytics Service**: Process usage analytics and reporting

## Conclusion

The service layer architecture provides a solid foundation for the JewGo backend, improving code quality, maintainability, and scalability. The modular design makes it easy to add new features and maintain existing functionality while following best practices for enterprise applications.
