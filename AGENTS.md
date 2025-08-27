# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js + TypeScript app (`app/`, `components/`, `__tests__/`, `public/`).
- `backend/`: Flask API (`routes/`, `services/`, `utils/`, `tests/`). Entrypoints: `app.py`, `wsgi.py`.
- `scripts/`: Docker/dev orchestration; `docs/`: developer and deploy docs.
- `supabase/`: DB config; `config/`, `tools/`: CI/MCP utilities.
- Tests live in `frontend/__tests__/` and `backend/tests/`.

## Build, Test, and Development Commands
- Frontend dev: `cd frontend && npm install && npm run dev` (Next.js server).
- Frontend QA: `npm run build`, `npm test`, `npm run lint`, `npm run type-check`.
- Backend dev: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py`.
- Backend tests: `cd backend && pytest` (coverage: `pytest --cov`).
- Orchestrated (root): `npm run docker:dev`, `npm run build`, `npm run deploy`, `npm run status`, `npm run logs`.
- Env consistency: `npm run env:check` (strict: `npm run env:check:strict`).

## Coding Style & Naming Conventions
- Python: Black (line length 88), Flake8, isort, mypy; 4‑space indent. Names: functions/vars `snake_case`, classes `PascalCase`, modules `lowercase_underscores`.
- TypeScript/React: ESLint + Prettier (2 spaces). Components `PascalCase`; hooks `useCamelCase`; route segments lowercase. Keep files small; colocate tests.
- Formatters: run `pre-commit install` once; then `black .` (backend) and `npm run lint` / Prettier (frontend).

## Testing Guidelines
- Frontend: Jest + Testing Library (jsdom). Place tests in `frontend/__tests__/` or `*.test.ts(x)`. Run `npm test` or `npm run test:watch`.
- Backend: pytest with strict markers: `@pytest.mark.unit`, `integration`, `slow`. Tests in `backend/tests/test_*.py`.
- Favor fast unit tests; use route-level integration tests for cross‑layer logic.

## Commit & Pull Request Guidelines
- Conventional Commits (e.g., `feat(auth): add TOTP backup codes`). Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert. Subject ≤ 72 chars.
- PRs: clear description, linked issues, screenshots for UI changes, updated docs, and passing CI (lint, type‑check, tests). Keep changes focused and small.

## Security & Configuration
- Do not commit secrets. Root `.env` is source of truth; example files (e.g., `frontend/env.example`) use placeholders only.
- Validate envs with `npm run env:check`. Prefer Docker or `scripts/sandbox.sh` for reproducible dev.

## Agent-Specific Instructions
- Plan multi‑step work and keep `update_plan` current.
- Use brief preambles before grouped commands; minimize scope of edits.
- Validate via existing scripts: `npm run env:check`, `cd backend && pytest`, `cd frontend && npm test`.
- Never touch secrets; update docs when behavior or commands change.

### Running Tool Commands Directly
- Shell: run commands via the `shell` tool by sending an action preamble, then invoking with an array of arguments, for example: `shell {"command": ["bash", "-lc", "cd backend && pytest" ]}`.
- Escalation: if a command needs network access or writes outside the workspace, include `with_escalated_permissions: true` and a short `justification`, for example: `shell {"command":["bash","-lc","npm install"], "with_escalated_permissions": true, "justification": "Install dependencies requires network access"}`.
- File edits: use `apply_patch` with the patch envelope. Example: `apply_patch << 'PATCH' ... PATCH` with Add/Update/Delete file ops and minimal diff hunks.
- Plans: update progress using `update_plan` with one `in_progress` step at a time. Mark finished steps as `completed` before starting the next.
- Output discipline: prefer `rg` for searches; read files in chunks (≤250 lines) with `sed -n` or similar to avoid truncation.
- Safety: avoid destructive commands unless explicitly requested. For long operations, inform the user with a concise preamble first.

#### Common Workflow Examples
- Run backend tests: preamble “Running backend tests,” then `shell {"command":["bash","-lc","cd backend && pytest" ]}`.
- Run backend tests with coverage: `shell {"command":["bash","-lc","cd backend && pytest --cov" ]}`.
- Start backend dev server (virtualenv assumed set up): `shell {"command":["bash","-lc","cd backend && python app.py" ]}`.
- Install frontend deps (needs network): `shell {"command":["bash","-lc","cd frontend && npm install"], "with_escalated_permissions": true, "justification": "Install dependencies requires network access"}`.
- Run frontend dev server: `shell {"command":["bash","-lc","cd frontend && npm run dev" ]}`.
- Frontend QA suite: `shell {"command":["bash","-lc","cd frontend && npm run build && npm test && npm run lint && npm run type-check" ]}`.
- Env check at root: `shell {"command":["bash","-lc","npm run env:check" ]}`.
- Edit a file: `apply_patch << 'PATCH'` … patch diff … `PATCH`.
