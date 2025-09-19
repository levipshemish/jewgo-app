# Authentication System Audit — Implementation Plan

## Minimal-Diff Strategy
1. **DB Manager Interface**
   - Update `database/connection_manager.py` to expose `_unified_manager` via a `connection_manager` property.
   - Mirror the property in `database/database_manager_v5.py` (returns `self`) to keep the contract consistent.
2. **Refresh Session Helpers**
   - In `services/auth/sessions.py`, add a lazy `_get_token_manager_v5()` helper and use it for minting rotated refresh tokens.
   - Ensure `rotate_or_reject` respects the caller-provided TTL so `TokenManagerV5` claims stay aligned.
3. **Auth Service Blacklist Enforcement**
   - Modify `AuthServiceV5.verify_token` to short-circuit if `is_token_blacklisted(token)` is true.
4. **CSRF Secret Hardening**
   - Guard `CSRFManager.__init__` so production envs without `CSRF_SECRET_KEY` raise a `RuntimeError`; keep warning fallback for non-production.
5. **Tests**
   - Expand `backend/tests/test_auth_comprehensive_v5.py` (or add new test module) to cover refresh rotation & blacklist rejection using fakes/mocks for DB + Redis.
   - Add a unit test in `backend/tests/test_csrf_manager.py` asserting that production without a secret raises.
6. **Docs & Task Logs**
   - Update `TASKS.md` status, record completion in `TASK_COMPLETION.md` when done, and document audit summary in plan files.

## Files to Touch
- `backend/database/connection_manager.py`
- `backend/database/database_manager_v5.py`
- `backend/services/auth/sessions.py`
- `backend/services/auth_service_v5.py`
- `backend/utils/csrf_manager.py`
- `backend/tests/test_auth_comprehensive_v5.py`
- `backend/tests/test_csrf_manager.py`
- `TASKS.md`, `TASK_COMPLETION.md`
- Plan files (already created)

## Test Plan
- `pytest backend/tests/test_auth_comprehensive_v5.py::TestAuthRefreshFlows` (new/updated cases).
- `pytest backend/tests/test_csrf_manager.py::TestCSRFManager` new case.
- Spot-check lint/pass by running targeted tests only (no full suite per guidelines).

## Rollback Strategy
- Revert touched files to previous commit state; no schema/DB changes made.
- Disable new tests if temporary breakage discovered (since they only exercise logic-level behaviour).
