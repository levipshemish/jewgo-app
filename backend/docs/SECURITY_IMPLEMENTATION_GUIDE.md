# Security Implementation Guide

## Overview

This guide documents the comprehensive security implementation for the JewGo application, including all the enhancements made to consolidate authentication, improve security, and implement best practices.

## Security Architecture

### 1. Consolidated Authentication Service

The `ConsolidatedAuthService` provides a unified interface for all authentication operations:

```python
from services.auth.auth_service_consolidated import get_consolidated_auth_service

auth_service = get_consolidated_auth_service()

# Authenticate user
success, user_data = auth_service.authenticate_user(email, password, ip_address, user_agent)

# Register user
success, result = auth_service.register_user(email, password, name, ip_address, user_agent)

# Generate tokens
tokens = auth_service.generate_tokens(user_data, remember_me=False)

# Refresh tokens
success, new_tokens = auth_service.refresh_access_token(refresh_token, ip_address, user_agent)
```

### 2. Secure Password Handling

The `SecurePasswordHandler` provides secure password operations:

```python
from services.auth.secure_password_handler import get_password_handler

password_handler = get_password_handler()

# Hash password
password_hash = password_handler.hash_password(password)

# Verify password
is_valid = password_handler.verify_password(password, password_hash)

# Validate password strength
result = password_handler.validate_password_strength(password)
if result.is_valid:
    print(f"Password score: {result.score}")
else:
    print(f"Issues: {result.issues}")

# Generate secure password
secure_password = password_handler.generate_secure_password(length=16)
```

### 3. Unified Session Management

The `UnifiedSessionManager` handles all session operations:

```python
from services.auth.unified_session_manager import get_session_manager

session_manager = get_session_manager()

# Create session
session_id, family_id = session_manager.create_session(user_id, user_agent, ip_address)

# Validate session
session_info = session_manager.validate_session(session_id)

# List user sessions
sessions = session_manager.list_user_sessions(user_id)

# Revoke session
success = session_manager.revoke_session(session_id, user_id)

# Revoke all sessions
count = session_manager.revoke_user_sessions(user_id, except_session_id)
```

### 4. WebAuthn Support

The `WebAuthnManager` provides FIDO2/passkey authentication:

```python
from services.auth.webauthn_manager import get_webauthn_manager

webauthn_manager = get_webauthn_manager()

# Create registration challenge
options = webauthn_manager.create_registration_challenge(user_id, user_name, user_display_name)

# Verify registration
success = webauthn_manager.verify_registration(challenge, credential_data)

# Create authentication challenge
options = webauthn_manager.create_authentication_challenge(user_id)

# Verify authentication
user_id = webauthn_manager.verify_authentication(challenge, credential_data)
```

### 5. Security Headers Middleware

The `SecurityHeadersMiddleware` applies comprehensive security headers:

```python
from middleware.security_headers_middleware import register_security_headers_middleware

# Register with Flask app
register_security_headers_middleware(app)
```

Security headers include:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### 6. Secure Error Handling

The `SecureErrorHandler` prevents information disclosure:

```python
from utils.secure_error_handler import get_error_handler

error_handler = get_error_handler()

# Handle error securely
response_data, status_code = error_handler.handle_error(error, context)
```

## Configuration

### Environment Variables

#### Required Variables
```bash
# Core Security
JWT_SECRET_KEY=your-jwt-secret-key-32-chars-minimum
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://localhost:6379

# Frontend URL for CORS
FRONTEND_URL=https://jewgo.app
```

#### Optional Security Variables
```bash
# Environment
FLASK_ENV=production  # development, production, testing

# JWT Configuration
JWT_ACCESS_TOKEN_TTL=900      # 15 minutes
JWT_REFRESH_TOKEN_TTL=2592000  # 30 days
JWT_ALGORITHM=HS256            # HS256, RS256, ES256

# Password Security
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMITING_ENABLED=true
RATE_LIMIT_DEFAULT=1000 per minute
RATE_LIMIT_AUTH=10 per minute

# WebAuthn
WEBAUTHN_ENABLED=false
WEBAUTHN_RP_ID=jewgo.app
WEBAUTHN_RP_NAME=JewGo
WEBAUTHN_TIMEOUT=300

# Session Management
SESSION_TTL_SECONDS=2592000  # 30 days
MAX_SESSIONS_PER_USER=10

# Security Features
CSRF_ENABLED=true
CORS_ORIGINS=https://jewgo.app,https://preview.jewgo.app
SECURE_COOKIES=true
```

### Security Configuration

The `SecurityConfig` class provides centralized security configuration:

```python
from config.security_config import get_security_config

config = get_security_config()

# Get JWT configuration
jwt_config = config.get_jwt_config()

# Get security headers
headers = config.get_security_headers()

# Get CORS configuration
cors_config = config.get_cors_config()

# Get rate limiting configuration
rate_config = config.get_rate_limiting_config()
```

## Database Schema

### WebAuthn Support

The WebAuthn implementation requires the following database tables:

```sql
-- WebAuthn credentials table
CREATE TABLE webauthn_credentials (
    id SERIAL PRIMARY KEY,
    credential_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- WebAuthn challenges table
CREATE TABLE webauthn_challenges (
    id SERIAL PRIMARY KEY,
    challenge VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    challenge_type VARCHAR(50) NOT NULL,
    credential_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at TIMESTAMP WITH TIME ZONE
);
```

## API Endpoints

### Authentication Endpoints

#### POST /api/v5/auth/login
Authenticate user with email and password.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "password123",
    "remember_me": false
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "user_id",
            "email": "user@example.com",
            "name": "User Name",
            "roles": [{"role": "user", "level": 1}]
        },
        "tokens": {
            "access_token": "jwt_token",
            "refresh_token": "refresh_token",
            "expires_in": 900
        }
    }
}
```

#### POST /api/v5/auth/register
Register new user account.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "password123",
    "name": "User Name",
    "terms_accepted": true
}
```

#### POST /api/v5/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
    "refresh_token": "refresh_token"
}
```

#### POST /api/v5/auth/logout
Logout user and invalidate tokens.

**Request:**
```json
{
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
}
```

### WebAuthn Endpoints

#### POST /api/v5/auth/webauthn/register/challenge
Create WebAuthn registration challenge.

**Request:**
```json
{
    "user_id": "user_id",
    "user_name": "user@example.com",
    "user_display_name": "User Name"
}
```

**Response:**
```json
{
    "challenge": "base64_challenge",
    "rp": {
        "id": "jewgo.app",
        "name": "JewGo"
    },
    "user": {
        "id": "user_id_hash",
        "name": "user@example.com",
        "displayName": "User Name"
    },
    "pubKeyCredParams": [
        {"type": "public-key", "alg": -7},
        {"type": "public-key", "alg": -257}
    ],
    "timeout": 300000,
    "attestation": "none"
}
```

#### POST /api/v5/auth/webauthn/register/verify
Verify WebAuthn registration.

**Request:**
```json
{
    "challenge": "base64_challenge",
    "credential": {
        "id": "credential_id",
        "type": "public-key",
        "response": {
            "attestationObject": "attestation_object",
            "clientDataJSON": "client_data_json"
        }
    }
}
```

## Security Testing

### Running Security Tests

```bash
# Run comprehensive security tests
python -m pytest backend/tests/test_comprehensive_security.py -v

# Run specific security test categories
python -m pytest backend/tests/test_comprehensive_security.py::TestAuthenticationSecurity -v
python -m pytest backend/tests/test_comprehensive_security.py::TestInputValidationSecurity -v
python -m pytest backend/tests/test_comprehensive_security.py::TestWebAuthnSecurity -v
```

### Security Test Coverage

The security test suite covers:

1. **Authentication Security**
   - Password strength validation
   - Password hashing security
   - Session management security
   - JWT token security

2. **Input Validation Security**
   - SQL injection prevention
   - XSS prevention
   - Path traversal prevention

3. **Error Handling Security**
   - Information disclosure prevention
   - Secure error responses

4. **Security Headers**
   - CSP policy generation
   - HSTS policy configuration
   - Security header validation

5. **WebAuthn Security**
   - Challenge generation
   - Credential validation
   - Authentication flow

6. **Rate Limiting Security**
   - Rate limit configuration
   - Rate limit enforcement

7. **CORS Security**
   - Origin validation
   - Credential handling

## Deployment

### Production Deployment Checklist

1. **Environment Configuration**
   - [ ] Set `FLASK_ENV=production`
   - [ ] Configure `JWT_SECRET_KEY` (32+ characters)
   - [ ] Set `DATABASE_URL` for production database
   - [ ] Configure `REDIS_URL` for production Redis
   - [ ] Set `FRONTEND_URL` for CORS

2. **Security Configuration**
   - [ ] Enable `WEBAUTHN_ENABLED=true` if using WebAuthn
   - [ ] Configure `CORS_ORIGINS` with production domains
   - [ ] Set `SECURE_COOKIES=true`
   - [ ] Configure rate limiting

3. **Database Migration**
   - [ ] Run WebAuthn migration: `20250127_webauthn_support.sql`
   - [ ] Verify all tables created successfully
   - [ ] Test database connections

4. **Security Headers**
   - [ ] Verify security headers are applied
   - [ ] Test CSP policy
   - [ ] Verify HSTS header

5. **Monitoring**
   - [ ] Set up security monitoring
   - [ ] Configure alerting for security events
   - [ ] Test health check endpoints

### Docker Deployment

```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app
WORKDIR /app

# Run security-enhanced app
CMD ["python", "app_factory_security_enhanced.py"]
```

## Monitoring and Alerting

### Security Metrics

Monitor the following security metrics:

1. **Authentication Metrics**
   - Login success/failure rates
   - Failed login attempts per IP
   - Account lockouts

2. **Session Metrics**
   - Active sessions per user
   - Session revocation rates
   - Token refresh rates

3. **Security Events**
   - Rate limit violations
   - CSRF token failures
   - Suspicious request patterns

4. **System Health**
   - Database connection health
   - Redis connection health
   - Security header compliance

### Alerting Rules

Set up alerts for:

- Failed login attempts > 10 per minute from single IP
- Rate limit violations > 5 per minute
- Authentication bypass attempts
- Privilege escalation attempts
- Unusual traffic patterns
- Security header violations

## Troubleshooting

### Common Issues

1. **JWT Secret Key Issues**
   - Ensure `JWT_SECRET_KEY` is set and at least 32 characters
   - Verify secret key is consistent across all instances

2. **CORS Issues**
   - Check `CORS_ORIGINS` configuration
   - Verify frontend URL matches CORS origins
   - Test preflight requests

3. **Rate Limiting Issues**
   - Check Redis connection
   - Verify rate limit configuration
   - Monitor rate limit logs

4. **WebAuthn Issues**
   - Verify `WEBAUTHN_ENABLED=true`
   - Check `WEBAUTHN_RP_ID` configuration
   - Ensure database tables are created

5. **Security Headers Issues**
   - Verify middleware registration
   - Check CSP policy syntax
   - Test header compliance

### Debug Mode

For debugging security issues:

```bash
# Enable debug mode
export FLASK_ENV=development
export DEBUG=true

# Run with debug logging
python app_factory_security_enhanced.py
```

## Security Best Practices

1. **Regular Updates**
   - Keep dependencies updated
   - Apply security patches promptly
   - Review security configurations regularly

2. **Monitoring**
   - Monitor security metrics continuously
   - Set up automated alerting
   - Review security logs regularly

3. **Testing**
   - Run security tests regularly
   - Conduct penetration testing
   - Perform security audits

4. **Documentation**
   - Keep security documentation updated
   - Document security procedures
   - Maintain incident response plans

---

**Last Updated**: 2025-01-27  
**Version**: 1.0  
**Next Review**: 2025-04-27