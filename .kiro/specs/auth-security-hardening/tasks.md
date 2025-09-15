# Implementation Plan

- [x] 1. Database Schema Migration for Session Management
  - Create Alembic migration to add required fields to auth_sessions table: family_id, current_jti, revoked_at, reused_jti_of, device_hash, last_ip_cidr, auth_time
  - Add partial unique index: one active current_jti per family_id where revoked_at IS NULL
  - Add database indexes for performance: idx_auth_sessions_family_id, idx_auth_sessions_current_jti, idx_auth_sessions_revoked_at
  - Add not-null constraints and defaults where safe, backfill legacy rows
  - Write migration rollback functionality for safe deployment
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. CSRF Protection System Implementation
- [x] 2.1 Create CSRF Manager Core Module
  - Implement CSRFManager class with HMAC-based token generation using session_id, user_agent, and day bucket
  - Add token validation with timing attack protection using constant-time comparison
  - Create environment-aware cookie configuration method
  - Write unit tests for CSRF token generation, validation, and timing attack resistance
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Implement CSRF Middleware Integration
  - Add blueprint-wide before_request hook for mutating HTTP methods (POST, PUT, PATCH, DELETE)
  - Create GET /api/v5/auth/csrf endpoint to issue CSRF tokens and set secure cookies
  - Implement 403 Forbidden responses for missing or invalid CSRF tokens
  - Add CSRF token validation to existing auth endpoints
  - Write integration tests for CSRF protection across all mutating endpoints
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Enhanced Token Management System
- [x] 3.1 Implement TokenManagerV5 with Leeway Support
  - Create TokenManagerV5 class with configurable leeway for JWT verification (default 60 seconds)
  - Implement HEAD /api/v5/auth/verify-token endpoint with sub-120ms p95 performance target
  - Add enhanced token minting with JTI (JWT ID) for tracking and revocation
  - Write performance tests to ensure verify-token endpoint meets latency requirements
  - _Requirements: 2.1, 2.2, 2.5, 8.8_

- [x] 3.2 Implement Session Family Management with Replay Hardening
  - Create SessionFamilyManager class for managing token families and rotation
  - Implement server-side refresh mutex per family_id using Redis SET NX with 10s TTL
  - Add one-time use refresh token validation (revoke used JTI, second use triggers family revoke)
  - Persist revocation state in PostgreSQL with Redis as cache layer (enable AOF/RDB)
  - Create session listing functionality for user account management
  - Write unit tests for session rotation, replay detection, family revocation, and concurrency handling
  - Write integration tests for simultaneous refresh attempts (exactly one success, other gets 409/429 with Retry-After)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3_

- [x] 3.3 Implement Signing Keys and JWKS Rotation System
  - Store private keys in KMS/HSM using RS256/ES256 algorithms (no symmetric HS256 in production)
  - Implement /.well-known/jwks.json endpoint publishing current + 1-2 retired keys
  - Add kid (key ID) to all JWTs with algorithm pinning and iss/aud enforcement
  - Create key rotation script with runbook for emergency key rotation
  - Implement JWKS caching in frontend middleware with 5-minute TTL
  - Write tests for old kid validation during grace window and unknown kid rejection (401)
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4. Environment-Aware Configuration System
- [x] 4.1 Implement Cookie Policy Manager with Preview Environment Support
  - Create CookiePolicyManager class with environment-specific cookie configurations
  - Implement production settings: Secure, HttpOnly, SameSite=None, Domain=.jewgo.app
  - Implement preview settings: host-only cookies, SameSite=None, Secure (HTTPS only) for Vercel compatibility
  - Add development settings with relaxed security for local development
  - Write tests to verify cookie settings across all environments, including *.vercel.app persistence testing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 Implement CORS Handler with Multiple Origin Support
  - Create CORSHandler class with exact origin matching from FRONTEND_ORIGINS environment variable supporting multiple origins
  - Implement preflight request handling with proper credentials support and Vary: Origin header
  - Add CORS headers to all auth responses including HEAD method support
  - Create CORS configuration validation in health checks
  - Write integration tests for CORS preflight requests with credentials on *.vercel.app domains
  - _Requirements: 4.3, 4.4, 4.5, 8.2, 9.3_

- [x] 5. Security Headers and Monitoring Implementation
- [x] 5.1 Implement Comprehensive Security Headers Middleware
  - Create after_request middleware to add security headers: X-Frame-Options=DENY, X-Content-Type-Options=nosniff, Referrer-Policy=no-referrer
  - Add Cache-Control: no-store on all auth responses to prevent caching
  - Add mandatory Permissions-Policy: geolocation=(), microphone=(), camera=() for privacy protection
  - Implement correlation ID generation and header attachment for request tracing
  - Write tests to verify security headers are present on all responses
  - _Requirements: 5.1, 5.4_

- [x] 5.2 Implement Comprehensive Authentication Metrics System
  - Create AuthMetrics class with counters: login success/fail by reason, refresh {success|replay|revoked}, CSRF {valid|invalid}
  - Implement histograms: /verify-token latency p50/p95, refresh operation latency
  - Add correlation ID propagation from frontend through backend to logs and metrics
  - Add security event logging with PII masking for audit trails
  - Create Prometheus metrics endpoints for monitoring integration
  - Write tests to verify metrics collection, PII masking, and correlation ID propagation
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 6. Frontend Authentication Client Enhancements
- [x] 6.1 Implement Enhanced Auth Client with Loop Guards
  - Modify PostgresAuthClient to use direct backend URLs from NEXT_PUBLIC_BACKEND_URL
  - Implement 401 loop guard with maximum 2 refresh attempts and exponential backoff with jitter
  - Add request deduplication using shared in-flight promises for concurrent refresh requests
  - Implement request timeout with AbortController (default 10 seconds)
  - Add 403 response handling to clear CSRF cookies and local session state
  - Write Jest tests for loop guard, deduplication, timeout, and error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.4_

- [x] 6.2 Implement API Proxy Enhancements
  - Modify API route handlers to use Node.js runtime only where necessary
  - Implement proper multiple Set-Cookie header forwarding using response.headers.raw()['set-cookie']
  - Add network error mapping while preserving original status codes
  - Implement proper 401/403 handling without exposing backend implementation details
  - Write end-to-end tests to verify multiple Set-Cookie headers reach the browser
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.4_

- [-] 7. Next.js Middleware Security Implementation
- [-] 7.1 Implement Enhanced Authentication Middleware
  - Modify Next.js middleware to use HEAD /api/v5/auth/verify-token for performance
  - Implement returnTo parameter preservation for post-login redirects
  - Add route matchers to apply middleware only to protected routes for performance
  - Implement proper error handling for authentication failures
  - Write tests to verify middleware performance and returnTo functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.2 Implement Step-up Authentication Gate
  - Create step-up authentication middleware for sensitive operations (role changes, API key issuance, billing)
  - Require fresh session (auth_time <= 5 minutes) or WebAuthn for elevated operations
  - Add middleware hint system and backend enforcement
  - Implement step-up challenge UI components
  - Write tests for step-up authentication flows and bypass prevention
  - _Requirements: 5.1, 5.4, 8.1_

- [ ] 8. Infrastructure Security Configuration
- [ ] 8.1 Implement Nginx Rate Limiting and Security
  - Configure Nginx rate limiting: 10 requests per minute with burst of 5 for auth endpoints
  - Add proxy_cookie_domain configuration for production environment (.jewgo.app)
  - Implement no-cache headers for all /api/v5/auth/* endpoints
  - Add optional IP allowlist configuration for admin endpoints
  - Write configuration tests and deployment scripts
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8.3 Implement Abuse Controls and CAPTCHA Protection
  - Create app-level sliding window rate limiting per username with exponential backoff using Redis
  - Implement Turnstile/ReCAPTCHA on registration endpoint (mandatory)
  - Add optional CAPTCHA on login after N failed attempts per username
  - Create metrics: auth_login_fail_total{reason} by failure bucket
  - Write tests for per-username throttling and CAPTCHA integration
  - _Requirements: 1.1, 1.2, 5.2, 5.3_

- [ ] 8.2 Implement Health Check System
  - Create comprehensive health check endpoint that reports JWT key presence, CSRF secret configuration, CORS origins, and database connectivity
  - Add Redis connectivity check and session system validation
  - Implement health check response time optimization (target <100ms p95)
  - Add configuration validation on application startup with clear error messages
  - Write health check integration tests and monitoring alerts
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9. Comprehensive Testing Suite
- [ ] 9.1 Implement Security Integration Tests
  - Write integration tests for CSRF protection covering success and failure scenarios
  - Create tests for JWKS rotation, cache TTL behavior, and old kid validation during grace window
  - Add replay attack tests: second use of refresh token triggers family revocation and metric increment
  - Implement refresh lock contention tests for concurrent refresh attempts
  - Add tests for preview environment cookies (host-only) persistence on *.vercel.app
  - Create CORS preflight tests with credentials returning HEAD in Allow-Methods and <204 response
  - Add tests for multiple Set-Cookie header forwarding through proxies
  - Create canary A/B cookie tests: v4/v5 isolation and rollback (expire v5, accept both)
  - Create end-to-end authentication flow tests with all security features enabled
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9.2 Implement Performance and Load Testing
  - Create performance tests for token verification latency (target sub-120ms p95)
  - Implement load testing for CSRF validation under concurrent requests
  - Add session rotation performance testing under high load
  - Create rate limiting validation tests with Nginx configuration
  - Write automated performance regression tests for CI/CD pipeline
  - _Requirements: 5.2, 8.8, 9.1, 9.2_

- [ ] 10. Session Management UI Implementation
- [ ] 10.1 Create Session List Component
  - Implement React component to display active user sessions with device information
  - Add session metadata display: login time, last activity, device type, location
  - Create responsive design that works on mobile and desktop
  - Implement loading states and error handling for session data fetching
  - Write component tests for session list rendering and data handling
  - _Requirements: 10.1, 10.4_

- [ ] 10.2 Implement Session Revocation Functionality
  - Create individual session revocation with confirmation dialog
  - Implement "logout all devices" functionality with family-wide revocation
  - Add success/error notifications for revocation actions
  - Implement optimistic UI updates with rollback on failure
  - Write tests for session revocation UI and API integration
  - _Requirements: 10.2, 10.3, 10.4_

- [ ] 11. Monitoring and Alerting Implementation
- [ ] 11.1 Implement Prometheus Metrics Integration
  - Create Prometheus metrics exporters for authentication events
  - Implement custom metrics for CSRF validation, token rotation, and security events
  - Add histogram metrics for performance tracking (token verification, CSRF validation)
  - Create metrics dashboard configuration for Grafana
  - Write metrics collection tests and validation scripts
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 11.2 Implement Security Alerting System
  - Create Prometheus alerting rules: refresh_replay_ratio > 0.1% (5m), csrf_invalid >5% (2m), verify p95 >200ms (5m)
  - Add JWKS fetch error alerts and high authentication failure rate detection
  - Implement correlation ID-based incident tracking and response procedures
  - Create security incident response runbooks with escalation procedures
  - Write alert testing scripts and validation procedures
  - _Requirements: 5.4, 5.5_

- [ ] 11.3 Implement Data Retention and PII Hygiene
  - Create automated purge job for audit and failed-login rows after 90 days
  - Implement email and IP masking in application logs (full data only in audit table)
  - Add data retention policy enforcement with configurable retention periods
  - Create privacy compliance reporting and audit trail functionality
  - Write tests for data purging and PII masking effectiveness
  - _Requirements: 5.4, 5.5_

- [ ] 12. Deployment and Rollback System
- [ ] 12.1 Implement Canary Deployment Strategy
  - Create A/B cookie naming system for gradual rollout (5% initial traffic)
  - Implement metrics-based canary validation with automatic rollback triggers
  - Add backward compatibility for existing v4 cookies during transition period
  - Create deployment scripts with environment-specific configurations
  - Write rollback procedures and testing scripts
  - _Requirements: All requirements - deployment validation_

- [ ] 12.2 Implement Configuration Management and Definition of Done
  - Create environment-specific configuration files for production, preview, and development
  - Implement configuration validation with startup checks and clear error messages
  - Add secret management integration for JWT keys and CSRF secrets
  - Create configuration deployment scripts and validation tools
  - Write configuration testing and validation procedures
  - Ensure Definition of Done criteria: metrics visible on Grafana dashboard, alerts configured with thresholds, e2e tests pass in CI on preview and prod-like domains, runbooks updated for rotation/replay incidents/canary rollback
  - _Requirements: 4.1, 4.2, 4.3, 8.3, 8.4_