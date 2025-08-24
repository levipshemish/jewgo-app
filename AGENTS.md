# Repository & Agent Guide

## Project Structure
- `frontend/`: Next.js + TypeScript app (`app/`, `components/`, `__tests__/`, `public/`).
- `backend/`: Flask API (`routes/`, `services/`, `utils/`, `tests/`). Entry points: `app.py`, `wsgi.py`.
- `scripts/`: Orchestration (Docker, sandbox, build/deploy wrappers).
- `docs/`: Developer and deployment docs; `supabase/`: DB config; `config/`, `tools/` for CI/MCP utilities.

## Core Commands
- Frontend dev: `cd frontend && npm install && npm run dev` (Next.js dev server).
- Frontend QA: `npm run build`, `npm test`, `npm run lint`, `npm run type-check`.
- Backend dev: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py`.
- Backend tests: `cd backend && pytest` (coverage: `pytest --cov`).
- Orchestrated (root): `npm run docker:dev`, `npm run build`, `npm run deploy`, `npm run status`, `npm run logs`.
- Env consistency: `npm run env:check` (strict: `npm run env:check:strict`).

## Coding Standards
- Python: Black (88), Flake8, isort, mypy. 4-space indent. Functions/vars snake_case; classes PascalCase; modules lowercase_underscores.
- TypeScript/React: ESLint + Prettier (2 spaces). Components PascalCase; hooks camelCase prefixed with `use*`; route segments lowercase. Keep files small and colocate tests.
- Formatters: run `pre-commit install` once; then `black .` (backend) and `npm run lint` / Prettier (frontend).

## Testing
- Frontend: Jest + Testing Library (jsdom). Place tests in `frontend/__tests__/` or `*.test.ts(x)`. Run `npm test` or `npm run test:watch`.
- Backend: pytest with strict markers; tests in `backend/tests/` named `test_*.py`. Use markers `unit`, `integration`, `slow` as appropriate.
- Favor fast unit tests; prefer route-level integration tests for cross‑layer logic.

## Commits & PRs
- Conventional Commits via commitlint (e.g., `feat(auth): add TOTP backup codes`). Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert. Subject ≤72 chars.
- PRs: clear description, linked issues, screenshots for UI changes, updated docs, passing CI (lint, type‑check, tests). Keep PRs focused and small.

## Security & Configuration
- Never commit secrets. Root `.env` is the source of truth; example files (e.g., `env.template`, `frontend/env.example`) must use placeholders only.
- Validate env consistency: `npm run env:check` (strict: `npm run env:check:strict`).
- Prefer Docker or `scripts/sandbox.sh` for reproducible environments. See `SUPABASE_SETUP.md` and the `DOCKER_*` guides for service setup.

## Agent Workflow (AI Assistants)
- Planning: For multi-step work, keep a short plan with clear steps and update it as you go.
- Preambles: Before running grouped commands, briefly state what you’re checking/doing.
- File edits: Minimize scope; change only what’s needed; keep style consistent.
- Validation: Use existing scripts to verify work:
  - `npm run env:check` to validate environment keys.
  - `npm run status` and `npm run logs` for deployment/runtime status.
  - Backend tests via `cd backend && pytest`; frontend via `cd frontend && npm test`.
- Safety: Don’t touch secrets; example/env templates must use placeholders only.
- Docker workflows: Use root scripts for builds/deploys:
  - `npm run update` (build, push, deploy), `npm run build`, `npm run deploy`.
  - Docker dev loop: `npm run docker:dev` or `./scripts/setup-docker.sh`.

## Useful Script Map
- Build/Deploy: `scripts/build-and-deploy.sh` via `npm run {build|deploy|update|status|logs|restart}`.
- Docker Dev: `scripts/auto-docker-dev.sh` via `npm run docker:*`.
- Docker Hub: `scripts/docker-hub-workflow.sh` via `npm run docker:*` (hub variants).
- Sandbox: `scripts/sandbox.sh` via `npm run sandbox:*`.
- Environment checks: `scripts/env-consistency-check.js` via `npm run env:check`.

For a summary of recent documentation/script normalization (ports, health endpoints, compose files), see `docs/DOCS_CHANGELOG.md`.

Last updated: 2025-08-22
