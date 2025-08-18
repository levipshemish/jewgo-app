# Redis Integration for JewGo App

## Overview

Redis has been integrated into the JewGo app to provide high-performance caching and session management. This integration improves API response times, reduces database load, and enhances overall application performance.

## Features

### 🚀 Performance Improvements
- **API Response Caching**: Restaurant data, search results, and statistics are cached
- **Session Management**: User sessions stored in Redis for better scalability
- **Rate Limiting**: Enhanced rate limiting with Redis backend
- **Memory Optimization**: Intelligent cache invalidation and TTL management

### 📊 Monitoring & Management
- **Health Checks**: Redis status included in application health endpoints
- **Cache Statistics**: Admin endpoints for cache monitoring
- **Performance Metrics**: Hit rates, memory usage, and operation statistics
- **Cache Management**: Tools for clearing and managing cache data

## Architecture

### Cache Manager
The `CacheManager` class provides a unified interface for Redis operations:

```python
from utils.cache_manager import cache_manager

# Cache restaurant data
cache_manager.cache_restaurants(restaurants_data, ttl=600)

# Get cached data
cached_data = cache_manager.get_cached_restaurants()

# Invalidate cache
cache_manager.invalidate_restaurant_cache(restaurant_id)
```

### Caching Strategy
- **Restaurant Lists**: 10-minute TTL for filtered restaurant queries
- **Individual Restaurants**: 30-minute TTL for detailed restaurant data
- **Search Results**: 5-minute TTL for search queries
- **Statistics**: 1-hour TTL for application statistics

### Cache Invalidation
Cache is automatically invalidated when:
- New reviews are created
- Restaurant data is updated
- Search parameters change

## Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password_if_needed

# Cache Configuration
CACHE_TYPE=redis
CACHE_REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TIMEOUT=300
CACHE_KEY_PREFIX=jewgo:

# Session Configuration
SESSION_TYPE=redis
SESSION_REDIS=redis://localhost:6379
SESSION_KEY_PREFIX=jewgo_session:
PERMANENT_SESSION_LIFETIME=3600
```

### Production Configuration
For production environments, consider:
- Using Redis Cloud, AWS ElastiCache, or similar managed services
- Setting up Redis clustering for high availability
- Configuring proper authentication and SSL
- Setting appropriate memory limits and eviction policies

## Setup Instructions

### 1. Install Redis
Run the setup script:
```bash
./scripts/setup_redis.sh
```

Or install manually:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2. Install Python Dependencies
```bash
cd backend
pip install redis==5.0.1 Flask-Caching==2.1.0 Flask-Session==0.5.0
```

### 3. Configure Environment
Copy the environment variables from the configuration section above to your `.env` file.

### 4. Test Installation
```bash
# Test Redis connection
redis-cli ping

# Test application health
curl http://localhost:5000/health
```

## API Endpoints

### Health Check
```
GET /health
```
Returns Redis status along with other health metrics.

### Cache Management (Admin)
```
POST /api/admin/cache/clear
```
Clears all application cache.

```
GET /api/admin/cache/stats
```
Returns cache statistics and performance metrics.

## Monitoring

### Redis Monitor Script
Use the monitoring script for detailed Redis analysis:

```bash
# Basic status report
python scripts/monitor_redis.py

# Continuous monitoring
python scripts/monitor_redis.py --continuous --interval 30

# Export metrics
python scripts/monitor_redis.py --export metrics.json
```

### Key Metrics to Monitor
- **Hit Rate**: Should be >80% for optimal performance
- **Memory Usage**: Monitor for memory pressure
- **Connected Clients**: Track application connections
- **Evicted Keys**: High eviction rates indicate memory issues

## Performance Optimization

### Cache Keys
The application uses structured cache keys:
- `restaurant:{id}:details` - Individual restaurant data
- `restaurants:list` - Restaurant list cache
- `search:{query}:{filters}` - Search results
- `statistics:app` - Application statistics

### TTL Strategy
- **Short TTL (5-10 min)**: Frequently changing data
- **Medium TTL (30 min)**: Semi-static data
- **Long TTL (1+ hour)**: Static reference data

### Memory Management
- **LRU Eviction**: Automatic key eviction when memory is full
- **Compression**: Large objects are compressed
- **TTL Expiration**: Automatic cleanup of expired keys

## Troubleshooting

### Common Issues

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Restart Redis service
sudo systemctl restart redis-server
```

#### High Memory Usage
```bash
# Check memory usage
redis-cli info memory

# Clear cache via API
curl -X POST http://localhost:5000/api/admin/cache/clear
```

#### Low Hit Rate
- Review cache TTL settings
- Check cache invalidation logic
- Monitor cache key patterns

### Debug Commands
```bash
# Monitor Redis operations
redis-cli monitor

# Check specific keys
redis-cli keys "jewgo:*"

# Get key information
redis-cli object encoding "jewgo:restaurant:1:details"
```

## Security Considerations

### Production Security
- **Authentication**: Use Redis password authentication
- **Network Security**: Restrict Redis to localhost or VPN
- **SSL/TLS**: Enable SSL for remote Redis connections
- **Firewall**: Block Redis port from external access

### Data Protection
- **Sensitive Data**: Never cache sensitive user information
- **Session Data**: Use secure session configuration
- **Key Patterns**: Use namespaced keys to prevent conflicts

## Migration Guide

### From Memory Cache
If migrating from in-memory caching:
1. Install Redis and configure environment
2. Update application configuration
3. Test cache functionality
4. Monitor performance improvements

### From Other Cache Systems
1. Review existing cache keys and TTL
2. Update cache manager implementation
3. Test cache invalidation logic
4. Verify data consistency

## Best Practices

### Development
- Use cache decorators for function-level caching
- Implement proper cache invalidation
- Test cache behavior in development
- Monitor cache performance

### Production
- Set up Redis monitoring and alerting
- Configure backup and recovery procedures
- Use Redis clustering for high availability
- Implement cache warming strategies

### Maintenance
- Regular cache cleanup and optimization
- Monitor cache hit rates and performance
- Update Redis configuration as needed
- Review and adjust TTL settings

## Future Enhancements

### Planned Features
- **Cache Warming**: Pre-populate cache with frequently accessed data
- **Distributed Caching**: Multi-node Redis cluster support
- **Cache Analytics**: Advanced cache performance analytics
- **Smart Invalidation**: Intelligent cache invalidation based on data changes

### Performance Improvements
- **Compression**: Implement data compression for large objects
- **Pipelining**: Use Redis pipelining for batch operations
- **Connection Pooling**: Optimize Redis connection management
- **Cache Partitioning**: Partition cache by data type or region

## Support

For Redis-related issues:
1. Check the troubleshooting section
2. Review Redis logs and monitoring data
3. Test with the monitoring script
4. Consult Redis documentation and community resources

## References

- [Redis Documentation](https://redis.io/documentation)
- [Flask-Caching Documentation](https://flask-caching.readthedocs.io/)
- [Flask-Session Documentation](https://flask-session.readthedocs.io/)
- [Redis Best Practices](https://redis.io/topics/optimization)
