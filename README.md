# 🕍 JewGo — Kosher Restaurant Discovery Platform

Discover and review kosher restaurants and related establishments, with location search, kosher supervision details, and a modern web experience.

## Project Structure

```
jewgo-app/
├── frontend/   # Next.js + TypeScript (app/, components/, __tests__/, public/)
├── backend/    # Flask API (routes/, services/, utils/, tests/). Entry: app.py, wsgi.py
├── scripts/    # Orchestration (Docker, sandbox, build/deploy wrappers)
└── docs/       # Developer & deployment docs; plus config/, tools/, supabase/
```

## Getting Started

- Prerequisites: Node.js 22.x, Python 3.11+, Docker
- Environment: Root `.env` (backend) and `frontend/.env.local` are the sources of truth. Example files use placeholders only. Never include real values in documentation.

```bash
# Validate environment keys
npm run env:check            # strict: npm run env:check:strict
```

### Run with Docker (recommended)
```bash
# One-step setup (build + start)
./scripts/setup-docker.sh

# Or via package scripts
npm run docker:dev           # start/watch
npm run docker:status        # status
npm run docker:logs          # logs
```

### Manual Development
Backend (Flask):
```bash
cd backend
source .venv/bin/activate   # Virtual environment already exists
python app.py               # binds 0.0.0.0:8082
```

Frontend (Next.js):
```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

## Core Commands
- Orchestrated at root: `npm run docker:dev`, `npm run build`, `npm run deploy`, `npm run status`, `npm run logs`
- Frontend dev/QA: `npm run build`, `npm test`, `npm run lint`, `npm run type-check`
- Backend dev/tests: `python app.py`, `pytest` (coverage: `pytest --cov`)
- Env consistency: `npm run env:check` (strict: `npm run env:check:strict`)

## Testing
```bash
# Backend (pytest)
cd backend && pytest

# Frontend (Jest)
cd frontend && npm test
```

## Ports & Health
- Docker (optimized compose): frontend http://localhost:3001, backend http://localhost:5001 (health: `/health`)
- Manual backend dev: http://localhost:8082 (health: `/healthz`)
- Additional API health: `/api/health/basic`, `/api/v4/direct-test`

## Docs & Guides
- Full documentation index: `docs/README.md`
- Repository & Agent Guide (standards, workflows, scripts): `AGENTS.md`

## Contributing
- Conventional Commits required; follow Python (Black/Flake8/isort/mypy) and TypeScript (ESLint/Prettier) standards.
- See `docs/CONTRIBUTING.md` for details.

## License
Proprietary — All rights reserved.

Last updated: 2025-08-25

See `docs/DOCS_CHANGELOG.md` for recent documentation/script alignment.
