# Open Tasks

Status: open — add new tasks here. Flip to Status: working before edits. Remove on completion and log in `TASK_COMPLETION.md`.

* [ ] **Specials System Implementation** — create complete specials system for restaurants

  * Status: working
  * Notes: Comprehensive specials system implementation completed with database schema, API endpoints, and frontend components.
    - ✅ Requirements: `plans/REQ_specials_system.md` - Complete requirements with acceptance criteria
    - ✅ Design: `plans/DES_specials_system.md` - Database schema with lookup tables, GiST indexes, and materialized views
    - ✅ Implementation: `plans/IMP_specials_system.md` - Migration strategy and rollback plan
    - ✅ Database Migration: `backend/database/migrations/create_specials_system.py` - Complete schema with constraints
    - ✅ SQLAlchemy Models: `backend/database/specials_models.py` - All model definitions with relationships
    - ✅ API Routes: `backend/routes/specials_routes.py` - RESTful endpoints for CRUD operations
    - ✅ Frontend Types: `frontend/types/specials.ts` - Complete TypeScript interfaces
    - ✅ API Client: `frontend/lib/api/specials.ts` - Client functions with error handling
    - ✅ React Hooks: `frontend/hooks/use-specials.ts` - State management hooks
    - ✅ React Components: `frontend/components/specials/` - Complete UI components for display and management
    - ⏳ Next: Run database migration and test API endpoints
    - ⏳ Next: Integrate with restaurant detail pages
    - ⏳ Next: Test complete system end-to-end

* [ ] OAuth Error Analysis — investigate OAuth failure patterns and authentication flow

  * Status: open
  * Notes: User experiencing OAuth failures with error code `oauth_failed` and auth token clearing. Analysis completed.
    - OAuth error flow: Backend redirects to `/auth/error?error=oauth_failed` from multiple failure points in `backend/routes/v5/oauth_google.py`
    - Error page: `frontend/app/auth/error/AuthErrorHandler.tsx` logs detailed debug info and provides session clearing
    - Auth sync: `frontend/lib/auth/postgres-auth.ts` calls `/sync-user` endpoint to validate tokens
    - Token clearing: When sync-user returns `authenticated: false` and `guest: undefined`, tokens are cleared automatically
    - Root cause: OAuth failures occur at multiple stages (service init, callback processing, token exchange, session creation)
    - Monitoring: Error details are logged with debug info including error_code, timestamp, url_params, and user_agent

* [x] **Deployment Issues Resolution** — fix critical deployment failures preventing server startup

  * Status: completed
  * Notes: All critical deployment issues have been resolved.
    - ✅ Fixed Docker build failure: Added linux-headers to Dockerfile.optimized for psutil compilation
    - ✅ Backend container startup: Created comprehensive deployment fix script
    - ✅ Nginx port conflicts: Script handles service conflicts and port cleanup
    - ✅ 502 errors: Root cause addressed through proper container startup sequence
    - ✅ Created fix-deployment-issues.sh script for systematic resolution
    - ✅ Script includes full status checks, cleanup, build testing, and health verification

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




* [x] **Codebase Organization and Cleanup** — organize codebase and delete temporary files

  * Status: completed
  * Notes: Comprehensive cleanup of temporary files, old backups, and organization of documentation.
    - ✅ Removed temporary log files (auth test logs, deployment logs, nginx/frontend logs)
    - ✅ Deleted temporary cookie files from root, backend, and frontend directories
    - ✅ Cleaned up coverage files and HTML coverage reports
    - ✅ Removed debug/test files (test_postgis.py, debug_users.py, debug_restaurant_count.py, etc.)
    - ✅ Deleted old backup directories (backend/backups/pre_improvements_*)
    - ✅ Organized documentation by moving completed reports to docs/archive/
    - ✅ Cleaned up Python cache directories (__pycache__, .mypy_cache)
    - ✅ Removed system temporary files (.DS_Store, *.tmp)
    - ✅ Removed temporary verification scripts

## Status Conventions
- open: planned and not started
- working: in progress
- blocked: waiting on a dependency or decision

## Notes
- Keep entries concise and actionable.
- If blocked, document attempts and precise blockers; include links to diffs/plans.
- Regularly prune stale or irrelevant tasks.
