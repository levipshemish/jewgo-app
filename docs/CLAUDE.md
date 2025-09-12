# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JewGo is a full-stack kosher restaurant discovery platform with a Next.js frontend and Flask backend. The application provides restaurant discovery, synagogue directories, marketplace functionality, and comprehensive admin tools.

## Architecture

### Frontend (Next.js 15 with TypeScript)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type checking enabled
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for global state, React hooks for local state
- **Auth**: PostgreSQL authentication with JWT tokens
- **Database ORM**: Prisma for frontend database operations
- **UI Components**: Radix UI with custom component library
- **Maps**: Google Maps integration with custom overlays
- **Performance**: Image optimization, code splitting, caching strategies

### Backend (Flask with PostgreSQL)
- **Framework**: Flask with application factory pattern
- **Language**: Python 3.11+ with type hints
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Cache**: Redis for session management and API response caching
- **Auth**: Custom PostgreSQL authentication system with role-based access control
- **API**: RESTful APIs with versioning (v4 is current)
- **Real-time**: SocketIO for WebSocket connections
- **Monitoring**: Sentry for error tracking, custom performance monitoring

## Development Commands

### Frontend Development
```bash
cd frontend

# Development
npm run dev              # Start development server (localhost:3000)
npm run build           # Production build (includes Prisma generation)
npm run build:no-prisma # Build without Prisma generation
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint with TypeScript
npm run lint:fix        # Auto-fix linting issues  
npm run lint:strict     # ESLint with zero warnings allowed
npm run type-check      # TypeScript compilation check

# Testing
npm test               # Jest test suite
npm run test:watch     # Jest in watch mode

# Database (Prisma)
npx prisma generate    # Generate Prisma client after schema changes
npm run db:migrate:dev # Run database migrations (development)
npm run db:seed        # Seed database with sample data
```

### Backend Development  
```bash
cd backend

# Development
python app_factory_full.py  # Start development server (localhost:5000)

# Testing
pytest                      # Run test suite
pytest --cov              # Run tests with coverage
pytest -m integration     # Run integration tests only
pytest -k test_name       # Run specific test

# Code Quality
black .                    # Format code
flake8                     # Lint code
isort .                   # Sort imports
```

### Docker Development
```bash
docker-compose up         # Start all services
docker-compose up -d      # Start in background
docker-compose down       # Stop all services
docker-compose logs       # View logs
docker-compose exec backend bash  # Access backend container
```

## Database Architecture

### Core Tables
- **restaurants**: Main restaurant data with PostGIS geometry column for spatial queries
- **synagogues**: Synagogue directory with location data
- **reviews**: User reviews linked to restaurants
- **users**: User accounts (PostgreSQL auth tables)
- **marketplace/listings**: E-commerce functionality
- **categories/subcategories**: Taxonomies for various content types

### Key Database Features
- **PostGIS Integration**: Efficient distance-based queries using geometry columns
- **Cursor-based Pagination**: Stable pagination for large datasets
- **View Tracking**: Automatic view count tracking with triggers
- **Audit Logging**: Complete admin action audit trail
- **Role-based Security**: Database-level security policies

## API Architecture

### Frontend API Routes (`/frontend/app/api/`)
- Handle client-side operations and proxy to backend when needed
- Authentication endpoints (`/api/auth/*`)
- Admin operations (`/api/admin/*`)
- Local data processing routes

### Backend API Routes (`/backend/routes/`)
- **api_v4.py**: Latest API version with full restaurant CRUD
- **restaurants_keyset_api.py**: Cursor-based pagination for restaurants
- **synagogues_api.py**: Synagogue directory endpoints
- **unified_search_api.py**: Cross-category search functionality
- **metrics_api.py**: Performance and usage metrics

### Key API Patterns
- **Cursor-based Pagination**: Use `cursor` parameter for stable pagination
- **Spatial Queries**: PostGIS integration for distance-based filtering
- **Caching Strategy**: Redis caching with TTL-based invalidation
- **Error Handling**: Structured error responses with detailed logging

## Authentication System

### PostgreSQL Authentication
- **Users Table**: Primary user storage in PostgreSQL
- **Role-based Access**: 4-tier admin system (super_admin, system_admin, data_admin, moderator)
- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Redis-backed session storage
- **CSRF Protection**: Automatic CSRF protection in production

### Admin Management
```bash
# Verify admin system
npm run admin:verify

# Create super admin (provides SQL instructions)
npm run admin:create-super-admin <email> "<name>"

# Test admin access
npm run admin:test <email>
```

## Component Architecture

### Frontend Components
- **Component Library**: `/frontend/components/` with reusable UI components
- **Page Components**: `/frontend/app/` using Next.js App Router
- **Custom Components**: Radix UI with Tailwind styling
- **State Management**: Zustand stores in `/frontend/lib/stores/`

### Component Patterns
- TypeScript interfaces for all prop types
- Custom hooks for business logic
- Error boundaries for graceful error handling
- Loading states and skeleton components
- Responsive design with mobile-first approach

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Jest with React Testing Library
- **Component Tests**: Isolated component testing
- **Integration Tests**: Full page testing
- **E2E Testing**: Planned (not yet implemented)

### Backend Testing
- **Unit Tests**: pytest for individual functions
- **Integration Tests**: Database integration testing
- **API Tests**: Full endpoint testing
- **Performance Tests**: Query performance validation

## Environment Configuration

### Required Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your-jwt-secret
```

#### Backend (.env)
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=https://jewgo.app,http://localhost:3000
GOOGLE_MAPS_API_KEY=your-google-maps-key
SENTRY_DSN=your-sentry-dsn  # Optional
```

## Production Deployment

### Current Infrastructure
- **Frontend**: Vercel deployment with automatic builds
- **Backend**: Ubuntu VPS (141.148.50.111) with Docker
- **Database**: PostgreSQL with PostGIS extension
- **Cache**: Redis for sessions and caching
- **CDN**: Image optimization via Next.js Image component
- **SSL**: Let's Encrypt certificates with auto-renewal

### Health Check Endpoints
- **Frontend**: `GET /healthz`
- **Backend**: `GET /health`
- **Database**: `GET /api/health/db`
- **Redis**: `GET /api/health/redis`

## Performance Optimization

### Frontend Optimizations
- Next.js Image component with multiple formats (WebP, AVIF)
- Code splitting with dynamic imports
- Bundle optimization with tree shaking
- Static generation for cacheable pages
- Client-side caching with SWR

### Backend Optimizations
- PostgreSQL query optimization with indexes
- Redis caching for expensive operations
- Connection pooling for database connections
- Cursor-based pagination for large datasets
- PostGIS spatial indexes for location queries

## Common Development Patterns

### Adding New API Endpoints
1. Create route in `/backend/routes/`
2. Add proper type hints and error handling
3. Include authentication/authorization if needed
4. Add corresponding frontend API route if needed
5. Update tests and documentation

### Adding New UI Components
1. Create component in `/frontend/components/`
2. Add TypeScript interfaces
3. Include Tailwind styling
4. Add error boundaries and loading states
5. Create tests and stories

### Database Schema Changes
1. Update Prisma schema (`frontend/prisma/schema.prisma`)
2. Generate migration (`npm run db:migrate:dev`)
3. Update backend models if needed
4. Update TypeScript interfaces
5. Test migration on development database

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types without explicit reasoning
- Interface definitions for all props and API responses
- Proper error handling with typed error objects

### Python
- Type hints for all function signatures
- Black formatting with line length 88
- Comprehensive error handling with structured logging
- Docstrings for all public functions

### Testing
- Aim for >80% code coverage on critical paths
- Test both success and error scenarios
- Mock external dependencies
- Use descriptive test names

## Troubleshooting

### Common Issues
- **Build Errors**: Run `npm run type-check` to identify TypeScript issues
- **Database Connections**: Check DATABASE_URL and ensure PostgreSQL is running
- **API CORS Issues**: Verify CORS_ORIGINS configuration in backend
- **Cache Issues**: Clear Redis cache or restart Redis service

### Debug Commands
```bash
# Check environment configuration
npm run admin:verify

# Test database connectivity
curl https://api.jewgo.app/health

# View logs
docker-compose logs backend
docker-compose logs nginx
```

## Important Implementation Notes

### PostGIS Integration
- All restaurants have a `geom` column for spatial queries
- Use ST_Distance for accurate distance calculations
- Spatial indexes (GIST) are crucial for query performance
- Always validate coordinate data before spatial operations

### Authentication Flow
- Frontend handles JWT token storage and refresh
- Backend validates tokens on protected routes
- Admin routes require specific role permissions
- CSRF protection is automatic in production

### Error Handling
- All API responses use consistent error format
- Frontend has error boundaries for graceful degradation
- Sentry integration for production error tracking
- Structured logging for debugging

This architecture supports a scalable, maintainable codebase with modern development practices and production-ready infrastructure.