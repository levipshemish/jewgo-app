# 🕍 JewGo — Kosher Restaurant Discovery Platform

A platform for discovering and reviewing kosher restaurants, synagogues, and Jewish establishments.

## Project Structure

```
jewgo-app/
├── backend/   # Flask API (routes/, services/, utils/, tests/). Entry: app.py, wsgi.py
├── frontend/  # Next.js + TypeScript (app/, components/, __tests__/, public/)
├── scripts/   # Orchestration (Docker, sandbox, build/deploy wrappers)
└── docs/      # Developer & deployment docs (+ supabase/, config/, tools/)
```

## Quick Start

### Prerequisites
- Node.js 18+ (recommended)
- Python 3.11+
- Docker & Docker Compose

### Environment Setup
- Root `.env` is the single source of truth. Example files must use placeholders only.

```bash
# Create/update root .env, then validate
npm run env:check        # strict mode: npm run env:check:strict
```

### Run with Docker (recommended)
```bash
# Easiest path (auto build + start)
./scripts/setup-docker.sh

# Or use package scripts
npm run docker:dev       # start/watch via scripts/auto-docker-dev.sh
npm run docker:status    # status
npm run docker:logs      # logs
```

### Manual Dev (alternative)
Backend (Flask):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py  # default binds 0.0.0.0:8082 (see ConfigManager)
```

Frontend (Next.js):
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000 or 3001 depending on config
```

## Scripts & Workflows

- Build/Deploy system (Docker Hub):
  - `npm run build`, `npm run deploy`, `npm run update`, `npm run status`, `npm run logs`
  - See `BUILD_AND_DEPLOY_QUICK_REFERENCE.md` for full switch matrix (env files, tags, dry-run, etc.).
- Docker dev loop: `npm run docker:dev`, `docker-compose -f docker-compose.optimized.yml ...`, or `./scripts/setup-docker.sh`.
- Env guardrails: `npm run env:check` to enforce placeholder-only examples and key consistency.

## Testing
```bash
# Backend (pytest)
cd backend && pytest

# Frontend (Jest)
cd frontend && npm test
```

## Health & Ports
- Docker (default compose):
  - Frontend: http://localhost:3001
  - Backend:  http://localhost:5001 (health: `/health`)
- Manual backend dev: http://localhost:8082 (health: `/health`)
- Additional health: `/api/health/basic` and `/api/health/full` when blueprints are loaded.

## Contributing
- Follow code style: Python (Black 88/Flake8/isort/mypy), TypeScript (ESLint/Prettier 2-space).
- Keep changes focused; write tests for new functionality; update docs when behavior changes.
- Conventional Commits required (commitlint).

## License
Proprietary — All rights reserved.

—

Last Updated: 2025-08-22
