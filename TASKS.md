# Open Tasks

Status: open — add new tasks here. Flip to Status: working before edits. Remove on completion and log in `TASK_COMPLETION.md`.

* [ ] OAuth Error Analysis — investigate OAuth failure patterns and authentication flow

  * Status: open
  * Notes: User experiencing OAuth failures with error code `oauth_failed` and auth token clearing. Analysis completed.
    - OAuth error flow: Backend redirects to `/auth/error?error=oauth_failed` from multiple failure points in `backend/routes/v5/oauth_google.py`
    - Error page: `frontend/app/auth/error/AuthErrorHandler.tsx` logs detailed debug info and provides session clearing
    - Auth sync: `frontend/lib/auth/postgres-auth.ts` calls `/sync-user` endpoint to validate tokens
    - Token clearing: When sync-user returns `authenticated: false` and `guest: undefined`, tokens are cleared automatically
    - Root cause: OAuth failures occur at multiple stages (service init, callback processing, token exchange, session creation)
    - Monitoring: Error details are logged with debug info including error_code, timestamp, url_params, and user_agent

* [ ] Authentication System Audit — review backend auth routes for flaws and propose fixes

  * Status: open
  * Notes: Requested deep analysis of authentication, CSRF, cookies, and route structure. Pending REQ/DES/IMP documentation before code changes.

* [ ] Security Remediation — address critical audit findings

  * Status: open
  * Notes: Identified high-risk issues during codebase audit that require prompt fixes.
    - Remove hardcoded database credentials from Next.js API routes and switch to env vars with server-only access
      - frontend/app/api/shuls/route.ts:5
      - frontend/app/api/shuls/[id]/route.ts:5
      - frontend/app/api/mikvahs/[id]/route.ts:5
    - Disable debug blueprint in production; guard `/api/v5/debug/*` behind env flag or admin allowlist
      - backend/app_factory_full.py:762
      - backend/routes/debug_api.py:16
    - Redact PII from auth logs (emails, lists of emails) and remove endpoints that return all emails
      - backend/utils/postgres_auth.py:206
      - backend/routes/debug_api.py:26
    - Replace Haversine-based distance filtering with PostGIS/earthdistance for consistency and performance
      - backend/database/repositories/restaurant_repository.py:49
    - Fix avatar serving content-type: let Flask infer mimetype instead of hardcoding 'image/jpeg'
      - backend/routes/v5/auth_api.py:1131
    - Sanitize documentation leaking credentials/IPs; remove real `PGPASSWORD` and SSH key paths from docs
      - docs/SYNAGOGUE_API_SHULS_TABLE_FIX.md:155
    - Review use of eval in alerting script; restrict inputs or replace with safe expression evaluator
      - backend/scripts/alerting_system.py:280



## Status Conventions
- open: planned and not started
- working: in progress
- blocked: waiting on a dependency or decision

## Notes
- Keep entries concise and actionable.
- If blocked, document attempts and precise blockers; include links to diffs/plans.
- Regularly prune stale or irrelevant tasks.
