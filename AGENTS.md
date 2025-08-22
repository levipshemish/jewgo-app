# Repository Guidelines

## Project Structure & Module Organization
- frontend/: Next.js + TypeScript app (app/, components/, __tests__/, public/).
- backend/: Flask API (routes/, services/, utils/, tests/). Entry points: app.py, wsgi.py.
- scripts/: Orchestration (Docker, sandbox, build/deploy wrappers).
- docs/: Developer and deployment docs; supabase/: DB config; config/, tools/ for CI/MCP utilities.

## Build, Test, and Development Commands
- Frontend dev: `cd frontend && npm install && npm run dev` (starts Next.js).
- Frontend build/test: `npm run build`, `npm test`, `npm run lint`, `npm run type-check`.
- Backend dev: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py`.
- Backend tests: `cd backend && pytest` (use `pytest --cov` for coverage).
- Orchestrated workflows (root): `npm run docker:dev`, `npm run build`, `npm run deploy`, `npm run status`, `npm run logs`.

## Coding Style & Naming Conventions
- Python: Black (88 chars), Flake8, isort, mypy. Indent 4 spaces; functions/vars snake_case; classes PascalCase; modules lowercase_underscores.
- TypeScript/React: ESLint + Prettier (2‑space indent). Components PascalCase; hooks use camelCase and prefix `use*`; route segments lowercase. Keep files small and colocate tests.
- Run formatters: `pre-commit install` once, then `black .` (backend) and `npm run lint` / Prettier (frontend).

## Testing Guidelines
- Frontend: Jest + Testing Library (jsdom). Place tests in `frontend/__tests__/` or `*.test.ts(x)`. Run `npm test` or `npm run test:watch`.
- Backend: pytest (strict markers). Place tests in `backend/tests/` named `test_*.py`. Use markers `unit`, `integration`, `slow` as appropriate.
- Aim for meaningful assertions and fast unit tests; favor integration tests via API routes for cross‑layer logic.

## Commit & Pull Request Guidelines
- Conventional Commits enforced by commitlint (e.g., `feat(auth): add TOTP backup codes`). Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert. Keep subject ≤72 chars.
- PRs: clear description, linked issues, screenshots for UI changes, updated docs, passing CI (`ci:*`, lint, type‑check, tests). Keep PRs focused and small.

## Security & Configuration Tips
- Never commit secrets. Use `env.template`, `frontend/env.example`, and `.env.*` locally. Validate with `npm run validate` (root) or `cd frontend && npm run validate-env`.
- Prefer Docker or `scripts/sandbox.sh` for reproducible environments. See SUPABASE_SETUP.md and DOCKER_* guides for service setup.

