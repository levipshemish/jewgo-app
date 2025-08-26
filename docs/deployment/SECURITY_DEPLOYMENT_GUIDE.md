# Security Deployment Guide

**Date**: 2025-08-26  
**Version**: 2.0  
**Status**: Updated for Security Improvements

## Overview

This guide provides deployment instructions with the latest security improvements implemented. All deployments must follow these security requirements to ensure proper functionality and security compliance.

## Pre-Deployment Security Checklist

### ✅ Environment Variables
- [ ] `NEXT_PUBLIC_BACKEND_URL` is set in production
- [ ] `CORS_ORIGINS` is configured with explicit origins
- [ ] All required API keys are properly configured
- [ ] No hardcoded secrets in configuration files

### ✅ Security Configuration
- [ ] CORS origins are explicitly defined (no wildcards)
- [ ] HTTP timeouts are configured for external calls
- [ ] Error handling is properly configured
- [ ] Monitoring and alerting are set up

## Environment Configuration

### Production Environment

#### Required Environment Variables
```bash
# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# API Keys (configure as needed)
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_KNOWLEDGE_GRAPH_API_KEY=your-google-knowledge-graph-api-key

# Database Configuration
DATABASE_URL=your-database-connection-string

# Security Configuration
SECRET_KEY=your-secure-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
```

#### Frontend Configuration
```javascript
// next.config.js will validate these requirements
const isProduction = process.env.NODE_ENV === 'production';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 
  (isProduction ? null : 'http://127.0.0.1:8082');
```

### Development Environment

#### Optional Fallbacks (Development Only)
```bash
# Development fallbacks (not allowed in production)
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8082
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Security Features

### 1. HTTP Request Timeouts

All external API calls now use standardized timeouts:
- **Connect Timeout**: 3.05 seconds
- **Read Timeout**: 10 seconds
- **Retry Strategy**: 3 attempts with exponential backoff
- **Retryable Errors**: 429, 500, 502, 503, 504

### 2. Error Handling

Enhanced error handling with specific exception types:
- `DatabaseServiceError`: Database operation failures
- `ExternalAPIError`: External API call failures
- `ValidationServiceError`: Validation failures
- `ServiceError`: Generic service errors

### 3. CORS Security

Explicit origin configuration required:
```python
# backend/config/settings.py
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    CORS_ORIGINS = []  # No wildcard defaults
```

## Deployment Steps

### 1. Environment Setup

#### Production
```bash
# Set required environment variables
export NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
export CORS_ORIGINS=https://your-frontend-domain.com

# Verify configuration
echo "Backend URL: $NEXT_PUBLIC_BACKEND_URL"
echo "CORS Origins: $CORS_ORIGINS"
```

#### Development
```bash
# Optional development fallbacks
export NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8082
export CORS_ORIGINS=http://localhost:3000
```

### 2. Backend Deployment

#### Configuration Validation
```bash
# Verify CORS configuration
python -c "
import os
from backend.config.settings import CORS_ORIGINS
print(f'CORS Origins: {CORS_ORIGINS}')
assert CORS_ORIGINS != ['*'], 'Wildcard CORS not allowed'
"
```

#### Health Check
```bash
# Test backend health with timeout
curl --max-time 10 https://your-backend-domain.com/api/health
```

### 3. Frontend Deployment

#### Configuration Validation
```bash
# Verify environment variables
node -e "
const isProduction = process.env.NODE_ENV === 'production';
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
if (isProduction && !backendUrl) {
  console.error('NEXT_PUBLIC_BACKEND_URL required in production');
  process.exit(1);
}
console.log('Configuration validated');
"
```

#### Build Verification
```bash
# Build with environment validation
npm run build
```

## Monitoring and Alerting

### Required Alerts

#### 1. Configuration Alerts
- Missing `NEXT_PUBLIC_BACKEND_URL` in production
- Missing `CORS_ORIGINS` configuration
- Invalid CORS origin format

#### 2. Performance Alerts
- HTTP timeout frequency
- Retry attempt patterns
- Error rate increases

#### 3. Security Alerts
- Unauthorized CORS requests
- Invalid API key usage
- Database connection failures

### Logging Configuration

#### Structured Logging
```python
# Example log format
{
  "timestamp": "2025-08-26T10:30:00Z",
  "level": "ERROR",
  "service": "restaurant_service",
  "operation": "get_restaurant_by_id",
  "error_type": "DatabaseServiceError",
  "context": {
    "restaurant_id": 123,
    "user_id": "user_456"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptoms**: Browser CORS errors in frontend
**Solution**: Verify `CORS_ORIGINS` includes your frontend domain

#### 2. Backend Connection Timeouts
**Symptoms**: Frontend can't connect to backend
**Solution**: Check `NEXT_PUBLIC_BACKEND_URL` configuration

#### 3. API Timeout Errors
**Symptoms**: External API calls timing out
**Solution**: Monitor timeout patterns and adjust if needed

### Debug Commands

#### Check Configuration
```bash
# Backend configuration
python -c "from backend.config.settings import CORS_ORIGINS; print(CORS_ORIGINS)"

# Frontend configuration
node -e "console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL)"
```

#### Test HTTP Client
```python
# Test timeout behavior
from backend.utils.http_client import get_http_client
client = get_http_client()
response = client.get('https://httpbin.org/delay/5', timeout=(1, 1))
```

## Security Best Practices

### 1. Environment Management
- Use environment-specific configuration files
- Never commit secrets to version control
- Rotate API keys regularly

### 2. Network Security
- Use HTTPS for all production traffic
- Configure proper firewall rules
- Monitor network access patterns

### 3. Error Handling
- Log errors with context but no sensitive data
- Use structured error responses
- Implement graceful degradation

### 4. Monitoring
- Set up comprehensive logging
- Configure alerting for security events
- Monitor performance metrics

## Compliance Notes

### Data Protection
- No sensitive data in error logs
- Structured error responses only
- Contextual information for debugging

### Audit Requirements
- Comprehensive logging of all operations
- Error tracking and categorization
- Performance monitoring and alerting

## Support

For deployment issues:
1. Check the troubleshooting section
2. Verify environment configuration
3. Review security requirements
4. Contact the development team

## References

- [Security Improvements Summary](../security/SECURITY_IMPROVEMENTS_SUMMARY.md)
- [Static Analysis Fixes Summary](../maintenance/STATIC_ANALYSIS_FIXES_SUMMARY.md)
- [Error Handling Improvements](../maintenance/ERROR_HANDLING_IMPROVEMENTS.md)
