# Security Hardening: Admin and CSRF

This document summarizes required environment variables and rotation practices for JewGo admin and CSRF protection.

## Required Secrets (Production)
- `CSRF_SECRET`: 32+ bytes cryptographically strong secret used to HMAC‑sign admin CSRF tokens.
  - Must be set in production. The app throws if missing.
- `ADMIN_TOKEN`: 32+ bytes cryptographically strong token used by backend admin endpoints.
  - May also set `ADMIN_TOKEN_1..ADMIN_TOKEN_5` for rolling tokens.

## Generation & Rotation
- Admin token generation:
  - Backend Python helper: `scripts/generate_admin_token.py` (prints a secure token)
  - Set new token in your deployment provider (e.g., Render) as `ADMIN_TOKEN`.
- Rotation process (recommended quarterly or on suspicion):
  1. Generate a new token and add as `ADMIN_TOKEN_1`.
  2. Deploy and verify `/api/debug/admin-tokens` is disabled in production and admin flows work.
  3. Update clients/services to use new token where applicable.
  4. Promote new token to `ADMIN_TOKEN`; remove old token(s).

## Verification
- Ensure the following environment variables are populated in production:
  - `CSRF_SECRET` (>= 32 chars)
  - `ADMIN_TOKEN` (>= 32 chars)
- Optional rate limiting envs: `ADMIN_RATE_LIMIT_HOUR`, `TOKEN_RATE_LIMIT_HOUR`.

## Notes
- Admin Next.js API routes validate mutations with a signed CSRF token sent in `x-csrf-token`.
- Admin tokens are never logged in full. Avoid printing any token values in logs.

