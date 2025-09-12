# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js 15 (TypeScript) app — key dirs: `app/`, `components/`, `lib/`, `prisma/`, `__tests__/`, `public/`.
- `backend/`: Flask API — key dirs: `routes/`, `services/`, `utils/`, `tests/`; entrypoints: `app.py`, `wsgi.py`.
- `nginx/`: Reverse-proxy configuration for production.
- `docs/`, `docker-compose.yml`, `logs/`, `uploads/`: Supporting docs, orchestration, and runtime artifacts.

## Development, Test, and Build Policy
- Do not start dev servers or run builds in this repo. Use static checks and tests only. The backend API/DB is available at `https://api.jewgo.app`.
- Frontend checks: `cd frontend && npm ci && npm run type-check && npm run lint:check && npm test`.
- Backend checks: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && pytest -q && ruff check . && black --check . && mypy .`.

## Configuration
- Frontend API target: set `NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app` in `.env` (defaults already point here in many API routes).
- Do not run Prisma migrations or local databases from this repo. Skip any `npm run build` or `prisma migrate` workflows.

## Coding Style & Naming Conventions
- Python: Black (88 cols), Ruff rules, type hints preferred. Files/modules `snake_case`; classes `PascalCase`; functions/vars `snake_case`.
- TypeScript/React: Prettier (80 cols, 2 spaces, single quotes). Follow ESLint and React Hooks rules. Components `PascalCase` (`UserCard.tsx`), hooks `useXyz`. Route folders and non-component files use `kebab-case`.

## Testing Guidelines
- Backend: Pytest in `backend/tests` (`test_*.py`). Marks available: `unit`, `integration`, `slow`, `security`, `performance`. Coverage reports to `htmlcov/`, `coverage.xml`.
- Frontend: Jest + Testing Library. Tests in `__tests__/` or `*.test.ts(x)`. Coverage outputs to `frontend/coverage/` with thresholds in `jest.config.js`.

## Commit & Pull Request Guidelines
- Commit messages: use Conventional Commits (e.g., `feat: add ID-based routing`, `fix: prevent infinite fetch loop`). Keep changes scoped and atomic.
- Pull requests: include a clear description, linked issues, screenshots for UI changes, test plan, and any config migrations. Ensure `npm run lint && npm test && npm run type-check` (frontend) and `pytest` + linters (backend) pass.

## Security & Configuration Tips
- Never commit secrets.

the backend Server is hosted on a server external to this repository.
The backend Database is hosted on a server external to this repository.
The Frontend is hosted on Vercel and dev local for testing.

