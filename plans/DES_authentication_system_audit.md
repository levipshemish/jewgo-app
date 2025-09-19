# Authentication System Audit — Design

## Current Architecture
- `AuthServiceV5.generate_tokens` persists refresh sessions through `services.auth.sessions.persist_initial`, which expects a DB manager exposing `.connection_manager.session_scope()`.
- Refresh rotation lives in `services.auth.sessions.rotate_or_reject`; it currently re-mints refresh tokens via legacy `services.auth.tokens.mint_refresh` (HS256, no issuer/audience claims).
- `AuthServiceV5.verify_token` delegates to `TokenManagerV5.verify_token` but never checks Redis blacklist entries created by `invalidate_token`.
- `utils.csrf_manager.CSRFManager` instantiates a global manager at import-time with a default secret, even if `ENVIRONMENT=production`.

## Identified Issues
1. `DatabaseConnectionManager` (and similar wrappers) lack a `.connection_manager` attribute, causing `persist_initial`/`rotate_or_reject` to raise `AttributeError` → refresh tokens never rotate & session rows aren't inserted.
2. Mixing v4/v5 token helpers yields refresh tokens missing `iss`/`aud`, so `TokenManagerV5.verify_token` rejects rotated tokens on the next refresh attempt.
3. Logout blacklist entries are ignored because `verify_token` returns payloads for blacklisted JTIs.
4. CSRF default secret makes tokens deterministic/predictable in production misconfiguration scenarios.

## Proposed Changes
- Extend DB manager shims (`database/connection_manager.py`, `database/database_manager_v5.py`) with a read-only `.connection_manager` property to expose the underlying manager (or `self`). No schema impact.
- Update `services/auth/sessions.py`:
  - Introduce a lazily-instantiated `TokenManagerV5` helper for refresh rotation.
  - Use it to mint rotated refresh tokens, preserving `iss`/`aud` claims and consistent TTLs.
- Enhance `AuthServiceV5.verify_token` to consult `is_token_blacklisted` after signature validation and drop tokens that were invalidated.
- Harden `CSRFManager.__init__` to raise in production when `CSRF_SECRET_KEY` is unset/placeholder, while keeping warnings + defaults in non-production environments.
- Add unit tests:
  - Exercise refresh rotation end-to-end (initial persist + rotate) ensuring new tokens validate and session rows update.
  - Confirm blacklisted token rejection.
  - Verify CSRF manager raises in production without a secret.

## Risks & Mitigations
- **Risk:** Token manager instantiation in `sessions.py` could fail if env vars missing. *Mitigation:* lazy singleton, reused secret expectations.
- **Risk:** Tightening CSRF secret requirement may break misconfigured envs. *Mitigation:* only raise for `ENVIRONMENT=production`, keep warning otherwise.
- **Risk:** Adjusting DB manager interface might affect other call sites. *Mitigation:* property only exposes existing underlying object; no behavioural change for consumers already using `.session_scope()`.

## Test Strategy
- Targeted unit tests in `backend/tests` for auth service refresh + blacklist.
- CSRF manager test case in existing `test_csrf_manager.py` to cover secret enforcement.
