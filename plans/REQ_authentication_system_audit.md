# Authentication System Audit — Requirements

## Problem Statement
Recent auth regressions surfaced during manual testing: refresh tokens fail after the first rotation, logout does not actually invalidate sessions, and CSRF protections rely on a default secret even in production. These symptoms suggest structural flaws in the v5 auth stack that must be audited and corrected.

## Goals & Non-Goals
- **Goals**
  - Identify and fix defects that block reliable session management (initial persistence, refresh rotation, blacklist enforcement).
  - Ensure CSRF protection cannot operate with insecure defaults in production environments.
  - Document the audit outcome and remediation steps.
- **Non-Goals**
  - Frontend authentication UX refresh (handled elsewhere).
  - Database schema changes or new tables.
  - Replacing the entire auth stack or introducing new dependencies.

## Scope & Constraints
- Touch backend auth services (`services/auth_service_v5.py`, `services/auth/sessions.py`), DB connection wrappers, and CSRF manager only as needed.
- Keep diffs minimal; prefer adapting existing utilities.
- No database migrations or schema edits.
- Respect existing feature-flag behaviour and cookie semantics.

## Acceptance Criteria
1. Refresh token rotation succeeds repeatedly (no crashes, tokens remain verifiable by `TokenManagerV5`).
2. Blacklisted/invalidated tokens are rejected by `auth_required` via `AuthServiceV5.verify_token`.
3. CSRF manager fails fast when `CSRF_SECRET_KEY` is missing in production, while remaining developer-friendly locally.
4. Automated tests cover refresh rotation + blacklist enforcement + CSRF secret enforcement (unit/integration level as appropriate).
5. Documentation updated to summarise the audit and fixes (plans + task log).

## Open Questions
- None identified; ready for design.
