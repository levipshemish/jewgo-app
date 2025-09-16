# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` (Next.js 15, TypeScript): `app/` routes, `components/`, `lib/`, `hooks/`, `__tests__/`.
- `backend/` (Flask, Python): `routes/`, `services/`, `database/`, `utils/`, `tests/`.
- `docs/` project documentation, `scripts/` deployment/ops, `nginx/` config, `docker-compose.yml` for local stack.

## Build, Test, and Development Commands
- Frontend: `cd frontend`
  - `npm install` — install deps
  - `npm run dev` — start Next.js dev server
  - `npm test` — run Jest tests
  - `npm run build && npm start` — production build/run
- Backend: `cd backend`
  - `pip install -r requirements.txt` — install deps
  - `python app.py` — run Flask API locally
  - `pytest` or `pytest --cov` — run tests with coverage
- Docker (API + Redis + Nginx): at repo root `docker-compose up -d`

## Coding Style & Naming Conventions
- Frontend (TS/React): Prettier 80 cols, 2 spaces, single quotes (`frontend/.prettierrc`). ESLint enabled.
  - Files: React components `PascalCase.tsx`; hooks `useSomething.ts`; tests `*.test.tsx`.
  - Variables/functions: `camelCase`; components: `PascalCase`.
- Backend (Python): Black 88 cols; Ruff linting.
  - Files/modules: `snake_case.py`; classes: `CapWords`; functions/vars: `snake_case`.

## Testing Guidelines
- Frontend: Jest + Testing Library in `frontend/__tests__/` (name `*.test.ts(x)`).
- Backend: Pytest configured via `backend/pytest.ini` (files `test_*.py`, markers: `unit`, `integration`, `slow`, `security`, `performance`).
- Run focused tests: `pytest -k "keyword"`; watch mode for FE: `npm run test:watch`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat(frontend): add filter chips`, `fix(backend): correct PostGIS query`).
- PRs: clear description, link issues, include screenshots for UI changes, list test coverage/steps, and note breaking changes/migrations.

## Security & Configuration Tips
- Never commit secrets; use `.env`, `env.production.template` as reference.
- Geospatial: use PostGIS for distance calculations (pre-commit forbids Python haversine in `backend/routes/`).
- CORS/URLs: align with values in `docker-compose.yml` and `frontend/.env.local`.

