# Environment Setup Guide

## Overview

All environment variables for the JewGo application are now centralized in a single `.env` file in the root directory. This simplifies configuration management and ensures consistency across all services.

## Quick Setup

1. **Run the setup script:**
   ```bash
   ./scripts/setup-env.sh
   ```

2. **Edit the `.env` file** with your actual values

3. **Start the application:**
   ```bash
   docker-compose -f docker-compose.optimized.yml up -d
   ```

## Environment Variables

### Required Variables

#### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### Database Configuration
```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
```

#### Security Keys
```bash
JWT_SECRET_KEY=your-jwt-secret-key-here
SECRET_KEY=your-secret-key-here
MERGE_COOKIE_HMAC_KEY_CURRENT=your-hmac-key-current
MERGE_COOKIE_HMAC_KEY_PREVIOUS=your-hmac-key-previous
```

### Optional Variables

#### Google APIs
```bash
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_KNOWLEDGE_GRAPH_API_KEY=your-google-knowledge-graph-api-key
```

#### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379
```

#### Monitoring & Analytics
```bash
SENTRY_DSN=your-sentry-dsn-here
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-google-analytics-measurement-id
```

## Docker Configuration

The Docker Compose configuration has been updated to use the root `.env` file:

```yaml
services:
  frontend:
    env_file:
      - ./.env
  backend:
    env_file:
      - ./.env
```

## Development vs Production

### Development
- Use placeholder values for non-critical services
- Enable debug logging
- Use local database and Redis instances

### Production
- Use real credentials for all services
- Disable debug logging
- Use production database and Redis instances
- Enable monitoring and analytics

## Security Notes

1. **Never commit the `.env` file** - it's already in `.gitignore`
2. **Use strong, unique secrets** for production
3. **Rotate keys regularly** for security
4. **Use environment-specific values** for different deployments

## Troubleshooting

### Common Issues

1. **Missing environment variables:**
   - Check that all required variables are set in `.env`
   - Verify variable names match exactly (case-sensitive)

2. **Docker can't find .env file:**
   - Ensure `.env` file is in the root directory
   - Check file permissions

3. **Services can't connect:**
   - Verify database and Redis URLs are correct
   - Check network connectivity

### Validation

The application includes environment validation that will show errors for missing or invalid configuration:

```bash
# Check environment validation
docker-compose -f docker-compose.optimized.yml logs frontend | grep "Environment validation"
```

## Migration from Old Configuration

If you were using separate environment files:

1. **Backup your existing configuration**
2. **Run the setup script** to create the new `.env` file
3. **Copy your values** from the old files to the new `.env` file
4. **Remove old environment files** (optional)

## Support

For issues with environment setup:
1. Check the application logs
2. Verify all required variables are set
3. Test connectivity to external services
4. Review the troubleshooting section above 