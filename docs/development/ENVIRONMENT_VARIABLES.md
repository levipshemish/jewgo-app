# Environment Variables

This document describes the environment variables used by the JewGo backend application.

## Authentication & Security

### Supabase Configuration
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_PROJECT_ID`: Supabase project ID
- `SUPABASE_JWT_AUD`: JWT audience (default: "authenticated")
- `JWT_CLOCK_SKEW_LEEWAY`: Clock skew tolerance in seconds (default: 0)

### JWKS Cache Configuration
- `JWKS_CACHE_TTL`: JWKS cache TTL in seconds (default: 86400 - 24 hours)
- `JWKS_REFRESH_INTERVAL`: JWKS refresh interval in seconds (default: 3600 - 1 hour)
- `ENABLE_JWKS_SCHEDULER`: Enable JWKS refresh scheduler (default: true)

### Admin Role Configuration
- `ADMIN_ROLE_CACHE_TTL`: Admin role cache TTL in seconds (preferred, default: 90)
- `ADMIN_ROLE_CACHE_SECONDS`: Admin role cache TTL in seconds (legacy, default: 90)
- `ENABLE_CACHE_INVALIDATION_LISTENER`: Enable admin role cache invalidation listener (default: true)
- `ENABLE_DB_NOTIFY_LISTENER`: Enable database notification listener for cache invalidation (default: false)

## Database Configuration

### PostgreSQL
- `POSTGRES_HOST`: PostgreSQL host (default: localhost)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `POSTGRES_DB`: PostgreSQL database name (default: postgres)
- `POSTGRES_USER`: PostgreSQL username (default: postgres)
- `POSTGRES_PASSWORD`: PostgreSQL password

## Redis Configuration

### Redis Connection
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_DB`: Redis database number (default: 0)
- `REDIS_PASSWORD`: Redis password
- `REDIS_SSL`: Enable SSL for Redis (default: false)

## Application Configuration

### Environment
- `ENVIRONMENT`: Application environment (development, staging, production)
- `PORT`: Application port (default: 5000)

### CORS
- `CORS_ORIGINS`: Comma-separated list of allowed CORS origins

### Legacy Authentication (Deprecated)
- `ENABLE_LEGACY_USER_AUTH`: Enable legacy user authentication (default: false)
- `ENABLE_LEGACY_ADMIN_AUTH`: Enable legacy admin authentication (default: false)
- `JWT_SECRET`: Legacy JWT secret (deprecated)
- `ADMIN_TOKEN`: Legacy admin token (deprecated)
- `SUPER_ADMIN_TOKEN`: Legacy super admin token (deprecated)

## Monitoring & Logging

### Sentry
- `SENTRY_DSN`: Sentry DSN for error tracking

### Logging
- `LOG_LEVEL`: Logging level (default: INFO)
- `LOG_FORMAT`: Log format (json, text)

## Development

### Debug
- `DEBUG`: Enable debug mode (default: false)
- `FLASK_ENV`: Flask environment (development, production)

## Example .env file

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_JWT_AUD=authenticated
JWT_CLOCK_SKEW_LEEWAY=30

# JWKS Cache Configuration
JWKS_CACHE_TTL=86400
JWKS_REFRESH_INTERVAL=3600
ENABLE_JWKS_SCHEDULER=true

# Admin Role Configuration
ADMIN_ROLE_CACHE_TTL=90
ENABLE_CACHE_INVALIDATION_LISTENER=true
ENABLE_DB_NOTIFY_LISTENER=false

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jewgo
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_SSL=false

# Application Configuration
ENVIRONMENT=development
PORT=5000
CORS_ORIGINS=http://localhost:3000,https://jewgo.app

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
LOG_FORMAT=json

# Development
DEBUG=true
FLASK_ENV=development
```
