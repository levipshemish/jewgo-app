# User Profile API Rate Limiting and ETag Implementation

## Summary
Successfully implemented per-user rate limiting (60/min) and ETag-based caching for `GET /api/user/profile` endpoint.

## Key Changes Made

### 1. New HTTP Cache Utilities (`backend/services/http_cache.py`)
- `make_stable_etag()`: Generates deterministic weak ETags from JSON payloads using SHA-256
- `http_date()`: Creates RFC 7231 compliant HTTP Date headers

### 2. Rate Limiting Key Function (`backend/services/rate_limit_keys.py`)
- `key_user_or_ip()`: Returns user ID for authenticated users, IP address for unauthenticated
- Handles proxy headers (X-Forwarded-For, X-Real-IP) for accurate client identification

### 3. Enhanced User Profile Route (`backend/routes/user_api.py`)
- Added `@current_app.limiter.limit("60 per minute", key_func=key_user_or_ip)` decorator
- Implemented stable view generation with sorted roles for consistent ETag generation
- Added conditional request handling with `If-None-Match` header support
- Returns 304 Not Modified when ETag matches, 200 OK with fresh data otherwise
- Set proper cache headers: `Cache-Control: private, max-age=30`, `Vary: Authorization`, `Date`

## Technical Details
- **Rate Limiting**: Per-user 60 requests per minute using Flask-Limiter with Redis storage
- **ETag Generation**: Weak ETags (W/"digest") for safe comparison
- **Cache Strategy**: Private caching with 30-second max-age, varies on Authorization header
- **Response Codes**: 200 OK (fresh data), 304 Not Modified (cached), 404 (user not found), 500 (server error)

## Verification
- ✅ Linting: All Ruff checks passed
- ✅ Functionality: HTTP cache utilities tested and working
- ✅ Type Safety: Fixed type annotations for Python 3.13 compatibility
- ✅ Integration: Uses existing limiter bridge pattern from app factory

## Memory Entry
```json
{"timestamp": "2025-09-05T22:09:45Z", "change": "user_profile_rate_limiting_etag", "files": ["backend/routes/user_api.py", "backend/services/http_cache.py", "backend/services/rate_limit_keys.py"], "summary": "Added per-user 60/min rate limiting and ETag-based caching to GET /api/user/profile with 304 Not Modified support"}
```