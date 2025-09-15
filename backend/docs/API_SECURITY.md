# API Security Documentation

This document describes the security features and authentication mechanisms for the JewGo API.

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [API Endpoints Security](#api-endpoints-security)
3. [Authentication Endpoints](#authentication-endpoints)
4. [Step-up Authentication](#step-up-authentication)
5. [WebAuthn Integration](#webauthn-integration)
6. [Rate Limiting](#rate-limiting)
7. [Error Responses](#error-responses)
8. [Security Headers](#security-headers)

## Authentication Overview

JewGo uses JWT (JSON Web Tokens) for API authentication with the following features:

- **Bearer Token Authentication**: Include JWT in `Authorization` header
- **Cookie-based Authentication**: Automatic cookie handling for web clients
- **Token Refresh**: Automatic token renewal using refresh tokens
- **Session Management**: Grouped tokens with family-based revocation
- **Step-up Authentication**: Additional verification for sensitive operations

### Token Types

| Token Type | Purpose | Lifetime | Storage |
|------------|---------|----------|---------|
| Access Token | API access | 1 hour | Memory/localStorage |
| Refresh Token | Token renewal | 30 days | HttpOnly cookie |

### Authentication Methods

```http
# Bearer token (recommended for API clients)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cookie-based (automatic for web clients)
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints Security

### Security Levels

JewGo API endpoints are protected at different security levels:

#### Public Endpoints
No authentication required. Rate limited by IP address.

```http
GET /api/v5/restaurants
GET /api/v5/synagogues
GET /api/v5/mikvahs
GET /test
```

#### Authenticated Endpoints
Require valid JWT token. Rate limited by user.

```http
GET /api/v5/auth/profile
PUT /api/v5/auth/profile
GET /api/v5/auth/permissions
POST /api/v5/auth/logout
```

#### Admin Endpoints
Require authentication + admin role.

```http
DELETE /api/v5/restaurants/{id}
DELETE /api/v5/synagogues/{id}
DELETE /api/v5/mikvahs/{id}
POST /api/v5/admin/*
```

#### Step-up Protected Endpoints
Require recent authentication or additional verification.

```http
POST /api/v5/auth/change-password
PUT /api/v5/admin/users/{id}/roles
POST /api/v5/admin/api-keys
```

### Rate Limiting by Endpoint

| Endpoint Pattern | Auth Level | Requests/Hour | Notes |
|------------------|------------|---------------|-------|
| `GET /api/v5/{entities}` | Public | 200 | Entity listings |
| `GET /api/v5/{entities}/{id}` | Public | 300 | Individual entities |
| `POST /api/v5/auth/login` | Public | 10/15min | Strict brute force protection |
| `POST /api/v5/auth/register` | Public | 5/hour | Account creation |
| `POST /api/v5/auth/refresh` | Public | 30 | Token renewal |
| `GET /api/v5/auth/profile` | Auth | 100 | Profile access |
| `PUT /api/v5/auth/profile` | Auth | 10 | Profile updates |
| `POST /api/v5/{entities}` | Auth+Perm | 10 | Entity creation |
| `PUT /api/v5/{entities}/{id}` | Auth+Perm | 20 | Entity updates |
| `DELETE /api/v5/{entities}/{id}` | Admin | 5 | Entity deletion |

## Authentication Endpoints

### Login

Authenticate user and receive JWT tokens.

```http
POST /api/v5/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword",
    "remember_me": false
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "user": {
        "id": "user123",
        "email": "user@example.com",
        "name": "John Doe",
        "roles": ["user"],
        "permissions": ["read"]
    },
    "tokens": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 3600
    }
}
```

**Rate Limit:** 10 requests per 15 minutes per IP

### Register

Create new user account.

```http
POST /api/v5/auth/register
Content-Type: application/json

{
    "email": "newuser@example.com",
    "password": "securepassword",
    "name": "Jane Doe",
    "terms_accepted": true
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "user": {
        "id": "user456",
        "email": "newuser@example.com",
        "name": "Jane Doe",
        "email_verified": false
    },
    "message": "Account created successfully. Please check your email for verification."
}
```

**Rate Limit:** 5 requests per hour per IP

### Token Refresh

Refresh access token using refresh token.

```http
POST /api/v5/auth/refresh
Content-Type: application/json
Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "tokens": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 3600
    }
}
```

**Rate Limit:** 30 requests per hour per user

### Logout

Invalidate current session tokens.

```http
POST /api/v5/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

### Token Verification

Verify token validity (optimized HEAD method).

```http
HEAD /api/v5/auth/verify-token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):** Empty body, token is valid
**Response (401 Unauthorized):** Token is invalid or expired

### User Profile

Get current user profile.

```http
GET /api/v5/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
    "success": true,
    "user": {
        "id": "user123",
        "email": "user@example.com",
        "name": "John Doe",
        "roles": [
            {
                "role": "user",
                "granted_at": "2024-01-01T00:00:00Z"
            }
        ],
        "permissions": ["read"],
        "email_verified": true,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z"
    }
}
```

## Step-up Authentication

Step-up authentication requires additional verification for sensitive operations.

### Create Step-up Challenge

Request step-up authentication challenge.

```http
POST /api/v5/auth/step-up/challenge
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "required_method": "password",
    "return_to": "/admin/users/123/roles"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "challenge_id": "challenge_abc123",
    "required_method": "password",
    "expires_at": "2024-01-15T10:40:00Z",
    "step_up_url": "/auth/step-up?challenge=challenge_abc123"
}
```

### Verify Step-up Challenge

Complete step-up authentication.

```http
POST /api/v5/auth/step-up/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "challenge_id": "challenge_abc123",
    "method": "password",
    "password": "currentpassword"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Step-up authentication completed",
    "valid_until": "2024-01-15T11:30:00Z"
}
```

## WebAuthn Integration

WebAuthn provides passwordless authentication using FIDO2 security keys or biometrics.

### Registration Challenge

Create WebAuthn registration challenge.

```http
POST /api/v5/auth/webauthn/register/challenge
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "device_name": "iPhone Touch ID"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "options": {
        "challenge": "base64-encoded-challenge",
        "rp": {
            "name": "JewGo",
            "id": "jewgo.app"
        },
        "user": {
            "id": "base64-user-id",
            "name": "user@example.com",
            "displayName": "John Doe"
        },
        "pubKeyCredParams": [
            {"alg": -7, "type": "public-key"},
            {"alg": -257, "type": "public-key"}
        ],
        "timeout": 300000,
        "attestation": "none"
    }
}
```

### Registration Verification

Verify WebAuthn registration response.

```http
POST /api/v5/auth/webauthn/register/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "credential": {
        "id": "credential-id",
        "rawId": "base64-raw-id",
        "response": {
            "clientDataJSON": "base64-client-data",
            "attestationObject": "base64-attestation"
        },
        "type": "public-key"
    },
    "device_name": "iPhone Touch ID"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "credential_id": "credential-id",
    "message": "WebAuthn credential registered successfully"
}
```

### Authentication Challenge

Create WebAuthn authentication challenge.

```http
POST /api/v5/auth/webauthn/challenge
Content-Type: application/json

{
    "username": "user@example.com"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "options": {
        "challenge": "base64-encoded-challenge",
        "timeout": 300000,
        "rpId": "jewgo.app",
        "allowCredentials": [
            {
                "id": "credential-id",
                "type": "public-key",
                "transports": ["internal", "usb"]
            }
        ],
        "userVerification": "preferred"
    }
}
```

### Authentication Verification

Verify WebAuthn authentication response.

```http
POST /api/v5/auth/webauthn/verify
Content-Type: application/json

{
    "assertion": {
        "id": "credential-id",
        "rawId": "base64-raw-id",
        "response": {
            "clientDataJSON": "base64-client-data",
            "authenticatorData": "base64-auth-data",
            "signature": "base64-signature"
        },
        "type": "public-key"
    }
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "user": {
        "id": "user123",
        "email": "user@example.com",
        "name": "John Doe"
    },
    "tokens": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 3600
    }
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 3600
```

### Rate Limit Exceeded Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 3600

{
    "error": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 3600,
    "limit": 100,
    "window": 3600
}
```

## Error Responses

### Standard Error Format

All API errors follow this format:

```json
{
    "error": "Human readable error message",
    "code": "MACHINE_READABLE_CODE",
    "message": "Detailed error description",
    "correlation_id": "req-123456789",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### Authentication Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_TOKEN` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | Token is malformed or invalid |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `ADMIN_REQUIRED` | 403 | Admin role required |
| `STEP_UP_REQUIRED` | 403 | Step-up authentication required |
| `ACCOUNT_DISABLED` | 403 | User account is disabled |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |

### Example Error Responses

**Missing Authentication:**
```json
{
    "error": "Authentication required",
    "code": "MISSING_TOKEN",
    "message": "This endpoint requires authentication. Please provide a valid token.",
    "correlation_id": "req-123456789"
}
```

**Insufficient Permissions:**
```json
{
    "error": "Access denied",
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform this action.",
    "required_permissions": ["admin_access"],
    "correlation_id": "req-123456789"
}
```

**Step-up Required:**
```json
{
    "error": "Step-up authentication required",
    "code": "STEP_UP_REQUIRED",
    "message": "This operation requires additional verification.",
    "challenge_id": "challenge_abc123",
    "required_method": "password",
    "step_up_url": "/auth/step-up?challenge=challenge_abc123",
    "correlation_id": "req-123456789"
}
```

## Security Headers

### Automatic Security Headers

JewGo automatically adds these security headers to all responses:

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-XSS-Protection: 1; mode=block
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Authentication-Specific Headers

For authentication endpoints:

```http
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```

### CORS Headers

For cross-origin requests:

```http
Access-Control-Allow-Origin: https://jewgo.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
Vary: Origin
```

## Best Practices

### Client Implementation

1. **Token Storage**:
   - Store access tokens in memory or sessionStorage
   - Never store tokens in localStorage for security
   - Let refresh tokens be handled via HttpOnly cookies

2. **Token Refresh**:
   - Implement automatic token refresh before expiration
   - Handle 401 responses by attempting token refresh
   - Implement exponential backoff for failed refresh attempts

3. **Error Handling**:
   - Always check for step-up authentication requirements
   - Implement proper error messaging for users
   - Log security events for monitoring

4. **Rate Limiting**:
   - Implement client-side rate limiting to avoid hitting limits
   - Handle 429 responses gracefully with retry logic
   - Show appropriate user feedback for rate limits

### Security Considerations

1. **HTTPS Only**: All authentication must use HTTPS in production
2. **Token Validation**: Always validate tokens on the server side
3. **CORS Configuration**: Properly configure CORS origins
4. **Rate Limiting**: Implement appropriate rate limits for your use case
5. **Monitoring**: Monitor authentication patterns for anomalies

For additional information, see the [Security Configuration Guide](SECURITY_CONFIGURATION.md).