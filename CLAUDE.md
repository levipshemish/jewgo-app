# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Agent Operating Rules & Guardrails

### Non-Negotiable Hard Guardrails

#### Security Guardrails (G-SEC)
- **G-SEC-1**: Never print, edit, or commit secrets. `.env` & `.env.local` are single sources of truth.
- **G-SEC-3**: Enforce CORS allowlist; enable CSRF if cookies are used.
- **G-SEC-4**: Rate-limit auth and all write endpoints.
- **G-SEC-5**: Backend verifies Supabase JWTs using official methods. No password handling in Flask.
- **G-SEC-6**: Enforce gitleaks (or equivalent) in pre-commit and CI to block secret leaks.

#### Operational Guardrails (G-OPS)
- **G-OPS-2**: Network egress is off by default. Include justification if needed.
- **G-OPS-3**: No destructive operations (`rm -rf`, schema drops) without explicit task and user confirmation.
- **G-OPS-4**: Edit only within `frontend/`, `backend/`, `scripts/`, `docs/`, `supabase/`, `config/`, `tools/`. Never touch `node_modules/`, `.venv/`, build artifacts.
- **G-OPS-5**: Never read `.env*` or binary files. Preview large files ≤250 lines and summarize.

#### Database Guardrails (G-DB)
- **G-DB-1**: All DB schema changes via migrations only (Supabase: `supabase/`, Backend: `backend/migrations/`).
- **G-DB-2**: Every migration includes up/down steps and rollback notes.
- **G-DB-3**: Prefer additive/compatible changes; call out breaking moves explicitly.

### Workflow Contract (G-WF)

**G-WF-1 Plan**: **MANDATORY** - Create and maintain task lists in project files (TASKS.md, TODO.md, or CURRENT_TASKS.md). Update file-based task lists as work progresses, not just TodoWrite tool.
**G-WF-2 Preamble**: State intent and expected output in 1-2 lines before running commands.
**G-WF-3 Search**: Use targeted search with `rg`. Preview with reasonable limits to avoid large dumps.
**G-WF-4 Surgical Patch**: Use minimal diffs with one logical change per patch. Comment non-obvious code.
**G-WF-5 Quick Validate**: Run appropriate validations including builds and tests as needed.
**G-WF-6 Doc Update**: Update docs in the same patch when behavior/commands/env change.
**G-WF-7 Exit Checklist**: Confirm path allowlist, no secrets, docs updated, migrations when needed.

### Task List Management (G-TASK)
- **G-TASK-1**: Always create and maintain task lists in project files (TASKS.md preferred)
- **G-TASK-2**: Update task list files as work progresses, marking completed items
- **G-TASK-3**: Use clear task categories: `## In Progress`, `## Pending`, `## Completed`  
- **G-TASK-4**: Include task descriptions, acceptance criteria, and completion status
- **G-TASK-5**: Commit updated task lists with code changes for project continuity

### Context7 Integration Requirements (G-DOCS-2)
- **Mandatory Documentation**: Use Context7 MCP for latest library docs before making changes
- **Library Resolution**: Use `mcp_context7_resolve-library-id` to get proper library IDs
- **Documentation Fetch**: Use `mcp_context7_get-library-docs` for comprehensive API docs
- **Fallback Strategy**: If Context7 unavailable, document as TODO for later review
- **PR Validation**: All PRs require Context7 confirmation or skip justification

### Development Capabilities

#### Agent Can Run:
- All npm/npx commands for frontend development and testing
- Backend Python operations: `pytest`, `python app.py`, coverage analysis
- Database migrations and schema operations
- Build processes, linting, and type checking
- Environment validation and setup commands
- Docker operations and container management
- Full test suites and coverage analysis

#### Agent Should Avoid:
- Destructive operations without explicit confirmation (G-OPS-3)
- Reading sensitive files like `.env*` or binary files (G-OPS-5)
- Editing files outside allowed directory structure (G-OPS-4)

## Architecture Overview

This is a **full-stack TypeScript/Python kosher restaurant discovery platform** with:
- **Frontend**: Next.js 15 app with TypeScript, Tailwind CSS, Supabase auth, and Google Maps integration
- **Backend**: Flask API with PostgreSQL database, Redis caching, and SQLAlchemy ORM  
- **Database**: PostgreSQL (production) with Supabase for auth, admin system, and user management
- **Deployment**: Frontend on Vercel, backend on Render, with Docker containerization support

The system handles restaurant discovery, user reviews, admin management, and synagogue/marketplace listings.

## Development Commands

### Frontend Development
```bash
cd frontend
npm install                    # Install dependencies  
npm run dev                    # Start development server (localhost:3000)
npm run build                  # Build for production  
npm run lint                   # Run ESLint
npm run type-check            # Run TypeScript check
npm test                      # Run Jest tests
npm run test:coverage         # Run tests with coverage
npx prisma generate           # Generate Prisma client after schema changes
npm run env:check             # Validate environment setup
```

### Backend Development
```bash
cd backend
python -m venv venv           # Create virtual environment
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt  # Install dependencies
python app.py                 # Start development server (localhost:8082)
pytest                       # Run all tests
pytest -q                    # Run quick tests
pytest --cov                 # Run tests with coverage
```

### Database Operations
```bash
# G-DB-1: All schema changes via migrations only
# Frontend Prisma operations
npm run db:migrate:dev        # Apply Prisma migrations
npm run db:seed               # Seed database with sample data

# Backend Alembic (if needed)
cd backend
python -m alembic upgrade head
```

### Admin System Management
```bash
cd frontend
npm run admin:verify          # Verify admin system setup
npm run admin:list            # List all admin users  
npm run admin:test <email>    # Test admin access for user
```

## Key Architecture Patterns

### API Routing Strategy
- **Next.js API Routes**: Handle admin operations, auth flows, and frontend-specific APIs (`frontend/app/api/`)
- **Flask Backend**: Provides restaurant data, search, reviews, and core business logic (`backend/routes/`)
- **Hybrid Approach**: Frontend API routes often proxy to backend, but some logic stays in Next.js for better integration with Supabase auth

### Database Architecture  
- **Primary DB**: PostgreSQL with SQLAlchemy ORM in backend
- **Authentication**: Supabase handles users, sessions, OAuth (Google, Apple)
- **Admin System**: Supabase tables with Row Level Security (RLS) policies
- **Caching**: Redis for API response caching and rate limiting

### Component Organization
- **Pages**: `frontend/app/` (App Router structure)
- **Components**: `frontend/components/` with feature-based folders (admin/, map/, ui/)
- **API Logic**: `backend/services/` for business logic, `backend/routes/` for endpoints
- **Database**: `backend/database/` with repository pattern and managers

### Key Services & Utilities
- **Restaurant Service**: Core business logic in `backend/services/restaurant_service_v4.py`
- **Database Managers**: V4 manager in `backend/database/database_manager_v4.py`
- **Cache Management**: Redis integration in `backend/utils/cache_manager_v4.py`
- **Search System**: Advanced filtering in `backend/search/` with PostgreSQL full-text search

## Important Development Notes

### Script Safety (CRITICAL)
- **Never use automated scripts for TypeScript/JSX modifications** - they can corrupt function syntax
- **Always commit before automated fixes** and use `git restore` to rollback issues
- **Fix syntax errors manually one by one** with `npm run type-check` validation
- See `docs/FRONTEND_SYNTAX_ERRORS_LEARNINGS.md` for detailed examples

### Environment Configuration
- **Frontend**: Uses `.env.local` with Supabase, Google Maps, and backend URL configs
- **Backend**: Uses `.env` with database, Redis, and API credentials
- **Validation**: Run `npm run env:check` to validate environment setup
- **Never commit real secrets** - use example files and environment-specific configs

### Testing Strategy
- **Frontend**: Jest with Testing Library in `frontend/__tests__/`
- **Backend**: pytest with unit/integration markers in `backend/tests/`
- **E2E**: Playwright tests for critical user flows
- **Admin Testing**: Dedicated scripts for admin functionality verification

### Build & Deployment
- **Frontend Build**: `npm run build` (requires Prisma generation)
- **Backend Build**: Uses Gunicorn with `wsgi.py` entry point
- **Docker**: Multi-stage builds with development/production configs
- **CI/CD**: GitHub Actions with comprehensive validation pipeline

## Context7 MCP Usage

### Configuration Setup
```bash
# Add context7 MCP server to Claude Code
claude mcp add --transport http context7 https://mcp.context7.com/mcp --header "CONTEXT7_API_KEY: your-api-key"

# Verify configuration
claude mcp list
claude mcp test context7
```

### Context7 Development Workflow

#### Before Implementing Features
1. **Resolve Library IDs**: `mcp_context7_resolve-library-id "library-name"`
2. **Fetch Documentation**: `mcp_context7_get-library-docs "/org/repo" "topic" token-limit`
3. **Apply Best Practices**: Use latest documentation for implementation
4. **Document Insights**: Add findings to code comments or team knowledge base

#### Example Usage Patterns
```bash
# React/Next.js development
mcp_context7_resolve-library-id "react"
mcp_context7_get-library-docs "/facebook/react" "hooks" 5000

# Database operations
mcp_context7_resolve-library-id "prisma"  
mcp_context7_get-library-docs "/prisma/prisma" "database operations" 6000

# Authentication patterns
mcp_context7_resolve-library-id "supabase"
mcp_context7_get-library-docs "/supabase/supabase" "authentication" 4000
```

### Fallback Strategy (When Context7 Unavailable)
1. Document unavailability: `// TODO: BLOCKED: Context7 docs unavailable for <lib>@<version>`
2. Use existing documentation and best judgment
3. Add review task for when Context7 becomes available
4. For hotfixes: proceed with current knowledge and add post-fix review

## Common Tasks

### Adding New Restaurant Features
1. **Context7 Research**: Consult latest docs for libraries being used
2. Update database schema in `backend/database/models.py`
3. Create/update service in `backend/services/restaurant_service_v4.py`  
4. Add API endpoint in `backend/routes/api_v4.py`
5. Create frontend API route in `frontend/app/api/restaurants/`
6. Update UI components in `frontend/components/`

### Admin System Changes
1. Update Supabase tables/RLS policies in `supabase/migrations/`
2. Modify admin API routes in `frontend/app/api/admin/`
3. Update admin UI in `frontend/components/admin/`
4. Test with `npm run admin:verify`

### Database Schema Changes
1. Update Prisma schema in `frontend/prisma/schema.prisma`
2. Run `npx prisma generate` and `npm run db:migrate:dev`
3. Update backend models/services to match schema
4. Test both frontend and backend integration

## Performance & Security Notes

### Performance Optimization
- **Bundle Analysis**: Next.js has built-in bundle analysis
- **Image Optimization**: Uses Next.js Image component with Cloudinary
- **Caching**: Redis caching for API responses, browser caching for static assets
- **Database**: Indexed queries, connection pooling, and query optimization

### Security Considerations  
- **Authentication**: Supabase JWT validation on both frontend and backend (G-SEC-5)
- **Authorization**: Role-based access with RLS policies for admin functions
- **Input Validation**: Zod schemas for frontend, comprehensive backend validation
- **CORS Configuration**: Explicit origin allowlist, no wildcard origins (G-SEC-3)
- **Rate Limiting**: Redis-based rate limiting for API endpoints (G-SEC-4)
- **Secret Management**: Never commit secrets, use environment variables only (G-SEC-1)
- **Secret Scanning**: Gitleaks enforcement in pre-commit and CI (G-SEC-6)

### Troubleshooting Common Issues
- **Build Errors**: Check TypeScript with `npm run type-check`, clear `.next` cache
- **Database Issues**: Verify connection with health endpoints, check environment variables  
- **Admin Access**: Use `npm run admin:verify` and check Supabase user metadata
- **API Failures**: Check CORS configuration and backend URL settings in Next.js config

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **React**: Functional components with hooks, proper dependency arrays
- **Python**: Black formatting (88 chars), type hints, comprehensive error handling
- **Testing**: Minimum 70% coverage for new features, integration tests for API changes
- **Documentation**: Update API docs and component documentation for significant changes

## CI/CD & Repository Rules

### CI/CD Constraints (G-CI)
- **G-CI-1**: Lint, type, and tests must be green on PRs to merge
- **G-CI-2**: CI fails if `npm install` would change lockfile unexpectedly  
- **G-CI-3**: CI jobs have reasonable timeout constraints for stability
- **G-CI-4**: Preserve test reports and coverage artifacts for 7-14 days

### Commit & PR Guidelines
- **Conventional Commits**: `type(scope): subject` (≤72 chars)
- **Types**: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
- **PR Requirements**: Description, linked issues, testing notes, screenshots (UI), risk & rollback plans
- **Migration PRs**: Must include rollback notes (G-DB-2)

### Repository Layout (Authoritative)
- `frontend/` — Next.js + TypeScript (`app/`, `components/`, `__tests__/`, `public/`)
- `backend/` — Flask API (`routes/`, `services/`, `utils/`, `tests/`); `app.py` (dev), `wsgi.py` (prod)  
- `scripts/` — Docker/dev orchestration
- `docs/` — Developer & deploy documentation
- `supabase/` — DB config/migrations
- `config/`, `tools/` — CI/MCP utilities

### Coding Style (Detailed)
- **Python**: Black (88 chars), isort, Flake8, mypy; 4-space indent
- **Names**: `snake_case` (functions/vars), `PascalCase` (classes), `lowercase_underscores` (modules)
- **TypeScript/React**: ESLint + Prettier (2 spaces), Components `PascalCase`, hooks `useCamelCase`
- **Testing**: Frontend Jest + RTL, Backend pytest with markers (`unit`, `integration`, `slow`)

## Logging & Observability

### Structured Logging (G-LOG)
- **G-LOG-1**: Use structured JSON logs; exclude PII and secrets
- **G-LOG-2**: Auto-redaction middleware for common secret patterns
- **G-OBS-1**: Provide `/healthz` and `/readyz` endpoints
- **G-OBS-2**: Instrument error tracking (Sentry) across backend and frontend

### Example Log Redaction (Flask)
```python
# backend/utils/log_redaction.py  
import logging
SENSITIVE_KEYS = ["api_key", "secret", "token", "password"]

class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.getMessage())
        for k in SENSITIVE_KEYS:
            msg = msg.replace(f"{k}=", f"{k}=***REDACTED***")
        record.msg, record.args = msg, ()
        return True
```

## Exit Checklist (G-WF-7)

Before completing any task, confirm:
- [ ] **Path Rules**: Only edited within allowed directories (G-OPS-4)
- [ ] **No Secrets**: No secrets printed, edited, or committed (G-SEC-1)  
- [ ] **Documentation**: Updated docs for behavior/command/env changes (G-DOCS-1)
- [ ] **Migrations**: Created migrations with rollback notes for schema changes (G-DB-1, G-DB-2)
- [ ] **Security**: CORS, rate limiting, JWT validation maintained (G-SEC-3, G-SEC-4, G-SEC-5)
- [ ] **Testing**: Run appropriate tests and validations to ensure changes work correctly