# System Index - JewGo App Codebase

## Project Overview
A full-stack web application with Next.js frontend and Python backend, featuring restaurant discovery, marketplace functionality, and user authentication.

## Directory Structure & Purposes

### Root Level
- **frontend/** - Next.js 14 application with TypeScript, Tailwind CSS, and Supabase integration
- **backend/** - Python Flask/FastAPI backend with database, AI services, and API routes
- **supabase/** - Database schema, migrations, and Supabase configuration
- **docs/** - Project documentation and guides
- **scripts/** - Utility scripts for deployment, testing, and maintenance
- **tools/** - Development tools and CI/CD utilities
- **config/** - Configuration files and environment templates
- **monitoring/** - Application monitoring and logging setup
- **deployment/** - Deployment configurations and scripts
- **archive/** - Deprecated or archived code
- **data/** - Static data files and datasets
- **projects/** - Additional project modules or features

### Frontend Structure (`frontend/`)
- **app/** - Next.js 14 app router pages and API routes
  - **api/** - API endpoints for restaurants, auth, marketplace
  - **auth/** - Authentication pages and flows
  - **marketplace/** - Marketplace feature pages
  - **restaurant/** - Restaurant discovery and details
  - **profile/** - User profile management
- **components/** - Reusable React components
- **lib/** - Utility libraries and configurations
- **hooks/** - Custom React hooks
- **types/** - TypeScript type definitions
- **utils/** - Utility functions
- **validators/** - Form validation schemas
- **filters/** - Data filtering utilities
- **db/** - Database utilities and configurations
- **prisma/** - Prisma ORM schema and migrations
- **public/** - Static assets
- **__tests__/** - Test files
- **coverage/** - Test coverage reports

### Backend Structure (`backend/`)
- **routes/** - API route handlers
- **services/** - Business logic services
- **database/** - Database models and utilities
- **ai/** - AI/ML services and integrations
- **search/** - Search functionality
- **utils/** - Utility functions
- **types/** - Type definitions
- **monitoring/** - Backend monitoring setup
- **tests/** - Backend test files
- **scripts/** - Backend utility scripts
- **config/** - Backend configuration

### Configuration & Deployment
- **.github/** - GitHub Actions workflows
- **.husky/** - Git hooks
- **.vscode/** - VS Code settings
- **.cursor/** - Cursor IDE configuration
- **ci-scripts/** - CI/CD scripts
- **.vercel/** - Vercel deployment configuration

## Cross-Links & Dependencies

### Frontend ↔ Backend
- API routes in `frontend/app/api/` call backend services
- Shared types between frontend and backend
- Database schema shared via Supabase

### Frontend ↔ Database
- Prisma schema in `frontend/prisma/`
- Supabase client configuration
- Database utilities in `frontend/db/`

### Backend ↔ Database
- Database models in `backend/database/`
- Migration scripts and schema management
- Direct database connections

### External Integrations
- Supabase for authentication and database
- Vercel for frontend deployment
- Render for backend deployment
- Redis for caching and rate limiting
- Sentry for error monitoring (disabled)

## Key Technologies
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React
- **Backend**: Python, Flask/FastAPI, SQLAlchemy
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: NextAuth.js, Supabase Auth
- **Deployment**: Vercel, Render
- **Testing**: Jest, Playwright, Pytest
- **Monitoring**: Sentry, custom monitoring

## Development Workflow
- Main branch deployment strategy
- Comprehensive testing suite
- Type checking and linting
- Performance monitoring
- Security validation
- Mobile-responsive design requirements
