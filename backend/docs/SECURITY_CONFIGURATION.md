# Security Configuration Guide

This document provides comprehensive configuration guidance for JewGo's security features, including authentication, authorization, rate limiting, and WebAuthn.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Authentication Configuration](#authentication-configuration)
3. [Authorization & Permissions](#authorization--permissions)
4. [Rate Limiting](#rate-limiting)
5. [WebAuthn Configuration](#webauthn-configuration)
6. [Security Headers](#security-headers)
7. [Error Handling](#error-handling)
8. [Monitoring & Logging](#monitoring--logging)
9. [Deployment Checklist](#deployment-checklist)

## Environment Variables

### Required Variables

These variables are **required** for production deployment:

```bash
# Core Security
SECRET_KEY=your-super-secret-key-here-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-here-different-from-secret-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (required in production)
REDIS_URL=redis://localhost:6379/0

# Frontend URL for CORS
FRONTEND_URL=https://jewgo.app
```

### Optional Security Variables

```bash
# Environment
FLASK_ENV=production  # development, production, testing

# JWT Configuration
JWT_ACCESS_TOKEN_TTL=3600      # 1 hour in seconds
JWT_REFRESH_TOKEN_TTL=2592000  # 30 days in seconds
JWT_ALGORITHM=RS256            # HS256, RS256, ES256

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE=redis       # redis, memory

# WebAuthn
WEBAUTHN_ENABLED=false         # Enable WebAuthn support
WEBAUTHN_RP_ID=jewgo.app      # Relying Party ID
WEBAUTHN_RP_NAME=JewGo        # Relying Party Name
WEBAUTHN_ORIGIN=https://jewgo.app
WEBAUTHN_TIMEOUT=300          # 5 minutes

# Session Management
SESSION_TIMEOUT_HOURS=8
REFRESH_MUTEX_TTL_SECONDS=10

# Security Features
CSRF_ENABLED=true
CORS_ORIGINS=https://jewgo.app,https://preview.jewgo.app
SECURE_COOKIES=true           # Force secure cookies

# Logging
LOG_LEVEL=INFO                # DEBUG, INFO, WARNING, ERROR
SECURITY_LOG_ENABLED=true
```

## Authentication Configuration

### JWT Token Management

JewGo uses JWT tokens for authentication with the following features:

- **Access Tokens**: Short-lived (1 hour default) for API access
- **Refresh Tokens**: Long-lived (30 days default) for token renewal
- **Token Blacklisting**: Revoked tokens are stored in Redis
- **Session Families**: Grouped tokens for better session management

#### Token Configuration

```python
# In your environment
JWT_ACCESS_TOKEN_TTL=3600      # 1 hour
JWT_REFRESH_TOKEN_TTL=2592000  # 30 days
JWT_ALGORITHM=RS256            # Use RS256 for production
```

### Authentication Decorators

Use these decorators to protect your endpoints:

```python
from middleware.auth_decorators import (
    auth_required,
    admin_required,
    optional_auth,
    permission_required,
    step_up_required
)

# Require authentication
@auth_required
def protected_endpoint():
    pass

# Require admin role
@auth_required
@admin_required
def admin_endpoint():
    pass

# Optional authentication (works with or without token)
@optional_auth
def public_endpoint():
    pass

# Require specific permissions
@auth_required
@permission_required(['create_entities', 'admin_access'])
def create_endpoint():
    pass

# Require step-up authentication
@auth_required
@step_up_required('password')  # or 'webauthn'
def sensitive_endpoint():
    pass
```

## Authorization & Permissions

### Role Hierarchy

JewGo implements a hierarchical role system:

```
super_admin
├── admin
│   ├── moderator
│   │   └── user
│   └── user
└── user
```

### Permission Groups

Permissions are organized into logical groups:

```python
PERMISSION_GROUPS = {
    'entity_management': [
        'create_entities',
        'update_entities', 
        'delete_entities'
    ],
    'user_management': [
        'create_users',
        'update_users',
        'delete_users'
    ],
    'admin_operations': [
        'admin_access',
        'system_config'
    ],
    'content_management': [
        'create_content',
        'update_content',
        'delete_content'
    ]
}
```

### Role Assignment

Roles can be assigned through the admin interface or API:

```python
# Assign role to user
POST /api/v5/auth/users/{user_id}/roles
{
    "role": "moderator",
    "granted_by": "admin_user_id",
    "expires_at": "2024-12-31T23:59:59Z"  # Optional
}
```

## Rate Limiting

### Configuration

Rate limiting is applied per-user and per-endpoint:

```python
# Apply rate limiting to endpoints
@rate_limit_by_user(max_requests=100, window_minutes=60)
def api_endpoint():
    pass
```

### Default Rate Limits

| Endpoint Type | Requests | Window | Notes |
|---------------|----------|---------|-------|
| Login | 10 | 15 min | Strict to prevent brute force |
| Registration | 5 | 60 min | Very strict |
| Token Refresh | 30 | 60 min | Allow frequent refresh |
| Read Operations | 200-300 | 60 min | Generous for browsing |
| Write Operations | 10-20 | 60 min | Moderate for creation |
| Delete Operations | 5 | 60 min | Very strict |

### Custom Rate Limits

```python
# Custom rate limiting
@rate_limit_by_user(max_requests=50, window_minutes=30)
def custom_endpoint():
    pass
```

## WebAuthn Configuration

### Enabling WebAuthn

1. Set environment variables:
```bash
WEBAUTHN_ENABLED=true
WEBAUTHN_RP_ID=jewgo.app
WEBAUTHN_RP_NAME=JewGo
WEBAUTHN_ORIGIN=https://jewgo.app
```

2. Configure your domain for WebAuthn:
   - Ensure HTTPS is enabled
   - Configure proper CORS headers
   - Set up proper domain validation

### WebAuthn Flow

1. **Registration**:
   ```javascript
   // Frontend: Request registration challenge
   const challenge = await fetch('/api/v5/auth/webauthn/register/challenge', {
       method: 'POST',
       headers: { 'Authorization': 'Bearer ' + token }
   });
   
   // Use WebAuthn API to create credential
   const credential = await navigator.credentials.create({
       publicKey: challenge.options
   });
   
   // Send credential to backend
   await fetch('/api/v5/auth/webauthn/register/verify', {
       method: 'POST',
       headers: { 'Authorization': 'Bearer ' + token },
       body: JSON.stringify({ credential })
   });
   ```

2. **Authentication**:
   ```javascript
   // Request authentication challenge
   const challenge = await fetch('/api/v5/auth/webauthn/challenge');
   
   // Use WebAuthn API to get assertion
   const assertion = await navigator.credentials.get({
       publicKey: challenge.options
   });
   
   // Verify assertion
   const result = await fetch('/api/v5/auth/webauthn/verify', {
       method: 'POST',
       body: JSON.stringify({ assertion })
   });
   ```

## Security Headers

JewGo automatically applies security headers to all responses:

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cache-Control: no-store (for auth endpoints)
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Custom Security Headers

Add custom headers in your middleware:

```python
@app.after_request
def add_security_headers(response):
    response.headers['Custom-Security-Header'] = 'value'
    return response
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
    "error": "Human readable error message",
    "code": "MACHINE_READABLE_CODE",
    "message": "Detailed error description",
    "correlation_id": "unique-request-id",
    "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_TOKEN` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `STEP_UP_REQUIRED` | 403 | Step-up authentication needed |
| `VALIDATION_ERROR` | 400 | Request validation failed |

### Custom Error Handling

```python
from middleware.error_handlers import ValidationError

# Raise custom errors
raise ValidationError("Invalid email format", field="email")
```

## Monitoring & Logging

### Security Event Logging

All security events are logged with correlation IDs:

```python
logger.warning("Authentication failed", 
              user_id=user_id,
              ip_address=request.remote_addr,
              correlation_id=g.correlation_id,
              reason="invalid_password")
```

### Metrics Collection

Key security metrics are collected:

- Authentication success/failure rates
- Token refresh patterns
- Rate limit violations
- Step-up authentication usage
- WebAuthn usage statistics

### Log Format

```json
{
    "timestamp": "2024-01-01T00:00:00Z",
    "level": "WARNING",
    "event": "authentication_failed",
    "user_id": "user123",
    "ip_address": "192.168.1.1",
    "correlation_id": "req-123456",
    "details": {
        "reason": "invalid_password",
        "endpoint": "/api/v5/auth/login"
    }
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] All required environment variables set
- [ ] SECRET_KEY is cryptographically secure (32+ characters)
- [ ] JWT_SECRET_KEY is different from SECRET_KEY
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] HTTPS enabled and certificates valid
- [ ] CORS origins properly configured

### Security Validation

- [ ] No hardcoded secrets in code
- [ ] Debug mode disabled in production
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting configured and tested
- [ ] Authentication decorators applied to all protected endpoints
- [ ] Admin endpoints properly secured
- [ ] WebAuthn configuration tested (if enabled)

### Monitoring Setup

- [ ] Security event logging enabled
- [ ] Metrics collection configured
- [ ] Alerting rules set up for:
  - High authentication failure rates
  - Rate limit violations
  - Unusual access patterns
  - Token refresh anomalies

### Testing

- [ ] Authentication flow tested
- [ ] Authorization rules validated
- [ ] Rate limiting verified
- [ ] Error handling tested
- [ ] Security headers present
- [ ] CORS functionality verified

### Post-Deployment

- [ ] Monitor authentication metrics
- [ ] Review security logs regularly
- [ ] Update dependencies regularly
- [ ] Rotate JWT keys periodically
- [ ] Review and update permissions as needed

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check JWT_SECRET_KEY configuration
   - Verify token expiration settings
   - Check Redis connectivity for token blacklisting

2. **CORS Issues**
   - Verify FRONTEND_URL matches your domain
   - Check CORS_ORIGINS includes all necessary domains
   - Ensure credentials are included in requests

3. **Rate Limiting Problems**
   - Check Redis connectivity
   - Verify rate limit configuration
   - Monitor rate limit metrics

4. **WebAuthn Issues**
   - Ensure HTTPS is enabled
   - Verify WEBAUTHN_RP_ID matches your domain
   - Check browser WebAuthn support

### Debug Mode

Enable debug logging for troubleshooting:

```bash
LOG_LEVEL=DEBUG
FLASK_ENV=development
```

**Warning**: Never enable debug mode in production!

## Security Best Practices

1. **Secrets Management**
   - Use environment variables for all secrets
   - Rotate secrets regularly
   - Never commit secrets to version control

2. **Token Security**
   - Use short-lived access tokens
   - Implement proper token rotation
   - Blacklist revoked tokens

3. **Rate Limiting**
   - Apply appropriate limits for each endpoint type
   - Monitor for abuse patterns
   - Implement progressive penalties

4. **Monitoring**
   - Log all security events
   - Set up alerting for anomalies
   - Regular security audits

5. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Test security updates thoroughly

For additional support, consult the [API Documentation](API_DOCUMENTATION.md) or contact the development team.