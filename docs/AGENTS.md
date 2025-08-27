# Repository Guidelines

This guide summarizes how to work in this repo. For agent operating rules (guardrails, budgets), see the root `AGENTS.md`.

## Project Structure & Module Organization
- `frontend/`: Next.js + TypeScript (`app/`, `components/`, `__tests__/`, `public/`).
- `backend/`: Flask API (`routes/`, `services/`, `utils/`, `tests/`). Entrypoints: `app.py` (dev), `wsgi.py` (prod).
- `scripts/`: Docker/dev orchestration; `docs/`: developer & deploy docs; `supabase/`: DB config.
- Tests: `frontend/__tests__/` and `backend/tests/`.

## Build, Test, and Development Commands
- Frontend dev: `cd frontend && npm install && npm run dev`.
- Frontend QA: `npm run build && npm test && npm run lint && npm run type-check`.
- Backend dev: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py`.
- Backend tests: `cd backend && pytest` (coverage: `pytest --cov`).
- Root orchestration: `npm run docker:dev`, `npm run build`, `npm run deploy`, `npm run status`, `npm run logs`.

## Coding Style & Naming Conventions
- Python: Black (line length 88), Flake8, isort, mypy; 4-space indent. Names: `snake_case` (funcs/vars), `PascalCase` (classes), modules `lowercase_underscores`.
- TypeScript/React: ESLint + Prettier (2 spaces). Components `PascalCase`; hooks `useCamelCase`; route segments lowercase.
- Run formatters: `pre-commit install` (once), then `black .` (backend) and `npm run lint` (frontend).

## Testing Guidelines
- Frontend: Jest + Testing Library (jsdom). Place tests in `frontend/__tests__/` or `*.test.ts(x)`; run `npm test`.
- Backend: pytest with markers `unit`, `integration`, `slow`; files `backend/tests/test_*.py`. Favor fast unit tests; add route-level integration for cross-layer logic.

## Commit & Pull Request Guidelines
- Conventional Commits: `type(scope): subject` (≤72 chars). Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert.
- PRs: clear description, linked issues, testing notes, screenshots (UI), risk & rollback, updated docs. Require green checks (lint, type, tests).

## Security & Configuration Tips
- Secrets: never commit real values. Root `.env`/`.env.local` are sources of truth; examples use placeholders only. Run `npm run env:check` to validate (user-run).
- Auth: Supabase-only; backend verifies JWTs (no password logic). DB changes via migrations (`supabase/`, `backend/migrations/` with Alembic).
- Path rules (mirror of agent guardrail G‑OPS‑4): edit only within `frontend/`, `backend/`, `scripts/`, `docs/`, `supabase/`, `config/`, `tools/`. Never commit `node_modules/`, `.venv/`, build artifacts, or binaries.
- Read safety (G‑OPS‑5): avoid dumping `.env*` or binaries in reviews; keep previews ≤250 lines.
- Secret scanning (G‑SEC‑6): enable gitleaks (or equivalent) in pre-commit and CI.

