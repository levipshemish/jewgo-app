# Technology Stack & Development Workflow

## Frontend Stack
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with custom JewGo design system
- **UI Components**: Radix UI primitives with custom components
- **State Management**: Zustand for global state, SWR for data fetching
- **Maps**: Google Maps JavaScript API with custom markers
- **Deployment**: Vercel (production)

## Backend Stack
- **Framework**: Flask (Python 3.11+)
- **Database**: PostgreSQL with PostGIS extension for spatial queries
- **Caching**: Redis for session storage and caching
- **Authentication**: JWT with refresh tokens, PostgreSQL-backed auth system
- **API Architecture**: RESTful API with v5 blueprint pattern
- **Server**: Gunicorn with Nginx reverse proxy
- **Deployment**: Docker containers on VPS

## Development Tools
- **Package Managers**: npm (frontend), pip with venv (backend)
- **Code Quality**: ESLint + Prettier (frontend), Black + Flake8 (backend)
- **Testing**: Jest + Testing Library (frontend), pytest (backend)
- **Type Checking**: TypeScript strict mode, mypy (backend)
- **Pre-commit**: Hooks for code quality and spatial query validation

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint check
npm run test         # Run Jest tests
```

### Backend Development
```bash
cd backend
source .venv/bin/activate
python app.py        # Start development server
pytest              # Run tests
black .             # Format code
flake8              # Lint code
alembic upgrade head # Run database migrations
```

### Database Operations
```bash
# Local database setup
psql -c "CREATE EXTENSION postgis;"
alembic upgrade head

# Production deployment
./scripts/deploy-to-server.sh
```

## Architecture Patterns
- **API Versioning**: v5 blueprint pattern with feature flags
- **Database**: Repository pattern with service layer abstraction
- **Caching**: Redis-backed caching with fallback to memory
- **Spatial Queries**: PostGIS for all distance calculations (no Python haversine)
- **Error Handling**: Sentry integration for production monitoring
- **Rate Limiting**: Redis-backed rate limiting with per-endpoint configuration

## Environment Configuration
- **Development**: Local PostgreSQL + Redis, hot reload enabled
- **Production**: Managed PostgreSQL, Redis cluster, Docker deployment
- **Environment Variables**: Separate .env files for frontend/backend
- **Secrets Management**: Environment-based configuration with validation