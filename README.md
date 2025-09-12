# JewGo - Kosher Restaurant Discovery Platform

A platform for discovering and reviewing kosher restaurants, synagogues, and Jewish community resources. This repository contains the Next.js frontend and a Flask backend used in production at https://api.jewgo.app.

Last Updated: 2025-01-27  
Status: Production Ready ✅
<!-- Codebase cleaned and organized -->

## Recent highlights (Jan 2025)

- **Codebase cleanup and organization**: Removed unused backup files, duplicate Dockerfiles, and deprecated code
- **Backend optimization**: Consolidated database managers, removed unused health endpoints, cleaned up connection managers
- **Frontend cleanup**: Removed unused development pages, duplicate utility files, and unnecessary dependencies
- **Documentation updates**: Updated project structure documentation to reflect cleaned codebase

## Previous highlights (Sep 2025)

- PostGIS integration for spatial queries (restaurants table now has a geometry column, spatial indexes, and automatic triggers).
- Restaurant API fixes: location-based filtering, distance sorting, and correct cursor-based pagination.
- Frontend ↔ backend API communication fixes (CORS resolved by using frontend routes, corrected backend endpoint calls).
- Map popup UI updated to use a unified glassy Card design and consistent data display.
- Unified listing page design across categories with mock-data fallbacks when backend endpoints are not available.
- Shuls pagination fixed (increased page size, infinite scroll + explicit Load More fallback).
- Restaurant listing page overhaul (reviews integrated, Google Places integration, improved image handling).
- Shtel Marketplace feature released (store/product management, Stripe checkout, admin approval workflows).
- Complete TypeScript migration — project compiles with type checking enabled.
- Admin system production-ready with 4-tier RBAC and PostgreSQL-backed authentication.
- Backend testing and CI/CD readiness: core tests passing and CI-ready pipelines.

For detailed implementation and migration notes, see the docs/ directory.

## Table of contents

- Features
- Tech stack
- Quick start
- Development
- Deployment
- Admin system
- API documentation
- Contributing
- Troubleshooting
- Monitoring & Security
- Support

## Features

- Restaurant management: searchable kosher restaurant listings, reviews, ratings, hours, specials, map integration.
- Synagogue directory: searchable synagogue listings and community contact information.
- Reviews: user and Google reviews combined, with moderation tools.
- User accounts: authentication, profile management, avatars, favorites.
- Shtel Marketplace: store and product management, orders, payments (Stripe).
- Admin dashboard: role-based access control, moderation, audit logging.

## Tech stack

Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma (DB schema used for some local tooling)
- Google Maps (frontend)

Backend
- Flask (Python)
- PostgreSQL (production DB with PostGIS for spatial queries)
- Redis (caching)
- Gunicorn
- Alembic (migrations)

Infrastructure & tools
- Vercel (frontend)
- Render / VPS (backend)
- Sentry (error monitoring)
- Stripe (payments)

## Quick start (developer)

Prerequisites
- Node.js 18+
- npm / pnpm
- Python 3.11+
- PostgreSQL (for local development)
- Git

Clone & install
```bash
git clone https://github.com/mml555/jewgo-app.git
cd jewgo-app
```

Frontend
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your configuration:
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
npm install
npm run dev
```

Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY, REFRESH_PEPPER, etc.
alembic upgrade head
python app.py
```

Access locally
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Development

Project structure (top-level)
```
jewgo-app/
├── frontend/        # Next.js frontend (app router, components, pages)
├── backend/         # Flask backend (routes, services, models)
├── docs/            # Project documentation and migration notes
├── scripts/         # Development and deployment helper scripts
└── config/          # Config files and templates
```

Common commands
Frontend
```bash
cd frontend
npm run dev        # dev server
npm run build      # production build
npm run test       # tests
npm run lint
npm run type-check
```

Backend
```bash
cd backend
source .venv/bin/activate
python app.py      # start dev server
pytest             # run tests
black .            # format
flake8             # lint
```

Database
- Migrations are handled with Alembic (backend/migrations).
- Local seed/reset scripts available in scripts/ (use with caution).

## Environment variables (examples)

Frontend (.env.local)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_VERCEL_URL=your-vercel-url
```

Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/jewgo
FLASK_ENV=development
ENVIRONMENT=development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
REFRESH_PEPPER=some-random-pepper
ACCESS_TTL_SECONDS=900
REFRESH_TTL_SECONDS=3888000
```

Notes
- In production, ensure COOKIE_DOMAIN and proper SameSite/Secure cookie settings are configured if frontend and backend are on different domains.
- JWT_SECRET_KEY (or JWT_SECRET) and REFRESH_PEPPER are required in production.

## Deployment

Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy on push to main (or your release branch)

Backend (Render / VPS / Docker)
1. Create service and connect the repo
2. Configure environment variables and secrets
3. Deploy; use Docker or Gunicorn+nginx based on deployment plan

Database (PostgreSQL)
1. Provision a managed Postgres instance
2. Run migrations (alembic upgrade head)
3. Apply PostGIS extension if using spatial queries (CREATE EXTENSION postgis;)

Health checks
- Frontend: GET /healthz
- Backend: GET /health
- DB: GET /health/db

Production API
- api.jewgo.app (production API host)

## Admin system

- Role system: super_admin, system_admin, data_admin, moderator.
- Admin UI accessible at /admin (frontend).
- Admin actions protected by CSRF tokens and DB-level policies.
- Quick SQL method to mark a user as super admin:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_super_admin}', 'true'::jsonb
)
WHERE email = 'your-email@example.com';
```

Admin helper scripts (frontend)
```bash
npm run admin:verify
npm run admin:list
npm run admin:create-super-admin <email> "<name>"
npm run admin:assign-role <email> <role>
npm run admin:test <email>
```

## API documentation (high-level)

Restaurants
- GET /api/restaurants
- GET /api/restaurants/{id}
- POST /api/restaurants (admin)
- PUT /api/restaurants/{id} (admin)

Reviews
- GET /api/reviews
- POST /api/reviews
- PUT /api/reviews/{id}
- DELETE /api/reviews/{id}

Users
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/admin/users (admin)

Synagogues
- GET /api/synagogues
- GET /api/synagogues/{id}

Admin endpoints
- GET /api/admin/csrf
- GET /api/admin/restaurants
- GET /api/admin/reviews
- GET /api/admin/users

For full API reference and examples see docs/api/ and the backend routes folder.

## Contributing

- Fork the repo, create a feature branch, make changes, run lint/tests, and open a pull request.
- Follow Conventional Commits for commit messages.
- Frontend uses ESLint + Prettier and TypeScript strict mode. Backend uses Black and Flake8.

## Troubleshooting (common issues)

CSRF token errors
- Verify admin CSRF route exists and frontend is requesting /api/admin/csrf before mutating requests.

Database / migration issues
- Ensure DATABASE_URL points to correct instance and alembic migrations have been applied.

CORS
- Frontend should call backend via frontend API routes where possible. Backend CORS is configured for the production frontend domain.

Build / TypeScript errors
- Run type checks: npm run type-check
- Clear caches: rm -rf .next node_modules/.cache && npm install

## Monitoring & analytics

- Sentry for error monitoring
- Google Analytics (optional)
- Health endpoints for automated monitoring

## Security

- JWT-based authentication with rotating refresh tokens.
- REFRESH_PEPPER required in production to secure refresh token hashing.
- CSRF protection enabled for mutating admin routes.
- RLS (Row Level Security) policies applied on admin tables when configured.

## Production server (summary)

- Domain: api.jewgo.app
- Production stack: PostgreSQL + PostGIS, Redis, Flask backend, Next.js frontend
- SSL: Let's Encrypt configured (auto-renew)
- Service management: Docker containers and system-level monitoring in production

Common ops commands
```bash
ssh ubuntu@141.148.50.111
docker ps
docker logs jewgo-backend --tail 50
docker-compose restart
```

## Support

- Check docs/ first.
- Open a GitHub issue with reproduction steps, environment, and logs.
