# Project Task List (Maintained)

Updated: 2025-09-03

Notes
- Source of truth for active work. Keep concise and actionable.
- Avoid tool/vendor chatter and unverifiable claims. Link to proofs (tests, PRs, docs) when available.
- Root-level TASKS.md is legacy; prefer this file for status.

Critical (P0)
- Production API v4 availability: Verify v4 routes live in prod; confirm required feature flags set (API_V4_ENABLED, related). Add checks/alerts and document runbook.
- Auth boundaries: Ensure backend strictly verifies Supabase JWTs (G‑SEC‑5). Confirm no password handling in Flask routes/services.

High (P1)
- Testing coverage: Establish baseline unit/integration tests in backend/tests and frontend/__tests__/ with ≥80% on changed files. Add quick “smoke” pytest target for CI (≤90s, G‑OPS‑1).
- Rate limiting: Apply rate limits on auth and all write endpoints (G‑SEC‑4). Document limits and exceptions.
- CORS/CSRF: Enforce allowlisted origins; enable CSRF if cookies are used (G‑SEC‑3). Add docs for allowed origins per env.
- Health/Observability: Provide /healthz and /readyz (G‑OBS‑1). Instrument error tracking (e.g., Sentry) across backend and frontend (G‑OBS‑2).
- Cache strategy: Document cache keys, TTLs, and invalidation hooks. Implement invalidation on writes affecting cached reads.

Medium (P2)
- Lint/type hygiene: Track and drive down ESLint warnings; keep TypeScript builds clean. Add fast type check to CI as advisory (respect G‑OPS‑1 for local/CI step timeouts).
- CI hardening: Ensure required checks (lint, type, tests) are green (G‑CI‑1). Add lockfile drift detection for npm in CI (G‑CI‑2) without running npm here (policy reference only).
- Docs consistency: Keep setup and runbooks current (G‑DOCS‑1). Record significant decisions as ADRs in docs/adr/.

Backlog
- Performance: Identify top endpoints by p95 latency; add focused optimizations and budget targets.
- Data quality: Add validation and monitoring for external data integrations; define alert thresholds.
- Feature flags: Centralize flags and add a one-pager for naming, rollout, and cleanup.

Validation & Links
- Backend quick tests: cd backend && pytest -q (≤90s budget).
- Frontend types: npx tsc --noEmit (user-run per G‑OPS‑1; provide output link in PRs).
- CI: Ensure artifacts for tests/coverage retained 7–14 days (G‑CI‑4).

Housekeeping
- Replace references to root TASKS.md with docs/status/TASK_LIST.md over time (do not edit root file per G‑OPS‑4).
- When closing tasks, add a terse proof link (commit/PR/test/doc) instead of long narrative.

