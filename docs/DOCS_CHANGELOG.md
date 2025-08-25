# Docs Changelog

This changelog summarizes recent documentation and script alignment for ports, health endpoints, and compose files.

Date: 2025-08-25

Highlights
- Updated root README: Node.js 22.x prerequisite; link to docs/CONTRIBUTING.md.
- Updated frontend README to use npm (aligns with package-lock.json) and correct env variable list.
- Updated docs index last updated date to August 2025.
- Standardized environment variable docs to use placeholders only and reference `.env` / `.env.local`.
- Added root `ENVIRONMENT.md` consolidating env variables and where to define them.

Notes
- Frontend engine is Node 22.x (`frontend/package.json`); keep npm as package manager across docs.
 - Sanitized sensitive examples in multiple docs (Supabase, admin token, backend URLs) to remove real-looking values.

---

Date: 2025-08-22

Highlights
- Normalized local Docker ports: frontend 3001, backend 5001 (optimized compose).
- Clarified frontend-only compose uses port 3000 for dev scenarios.
- Standardized health endpoints: container health uses `/health`; API blueprint provides `/api/health/*` where enabled.
- Replaced references to removed compose files with current ones.

Scripts aligned
- `scripts/auto-docker-dev.sh`: uses `docker-compose.frontend.dev.yml`.
- `scripts/docker-full.sh`: uses `docker-compose.optimized.yml`; checks 3001/5001.
- `scripts/docker-setup.sh`: `frontend-only` → `docker-compose.frontend.dev.yml` (3000); `full` → `docker-compose.optimized.yml` (3001/5001).
- `scripts/test-docker-build.sh`: uses `docker-compose.frontend.prod.yml`.

Key docs updated
- `AGENTS.md`: Agent workflow, script map, env guardrails.
- `README.md`: Flask backend, docker-first quick start, ports/health.
- `QUICK_START.md`: Docker-first, Flask `app.py` for backend dev.
- `BUILD_AND_DEPLOY_*`: Test curls use 3001/5001.
- `DOCKER_*` guides: unified compose filenames; clarified ports; added optimized flow.
- `CLOUD_DEPLOYMENT_GUIDE.md`: Render start command via Gunicorn `wsgi:app`.
- `PRODUCTION_TESTING_GUIDE.md`: Backend runs with `python app.py` on 8082.

Notes
- Historical reports (e.g., `CLEANUP_SUMMARY.md`) retain legacy filenames for context.
- Internal container checks in Dockerfiles and healthchecks still target `http://localhost:5000/health` (inside container).
