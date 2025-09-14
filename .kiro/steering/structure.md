# Project Structure & Organization

## Root Directory Layout
```
jewgo-app/
├── frontend/           # Next.js frontend application
├── backend/            # Flask backend API
├── docs/              # Project documentation and guides
├── scripts/           # Deployment and utility scripts
├── config/            # Configuration files and templates
├── monitoring/        # Prometheus, Grafana monitoring setup
├── nginx/             # Nginx configuration files
└── deployment-logs/   # Deployment history and logs
```

## Frontend Structure (`frontend/`)
```
frontend/
├── app/               # Next.js App Router pages and layouts
│   ├── (auth)/       # Authentication pages group
│   ├── admin/        # Admin dashboard pages
│   ├── listings/     # Entity listing pages
│   └── api/          # API route handlers
├── components/        # Reusable UI components
│   ├── ui/           # Base UI components (shadcn/ui style)
│   ├── forms/        # Form components
│   ├── maps/         # Google Maps components
│   └── admin/        # Admin-specific components
├── lib/              # Utility libraries and configurations
│   ├── utils/        # Helper functions
│   ├── hooks/        # Custom React hooks
│   ├── contexts/     # React context providers
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
└── styles/           # Global CSS and Tailwind config
```

## Backend Structure (`backend/`)
```
backend/
├── app.py                    # Main application entry point
├── app_factory_full.py      # Application factory with full configuration
├── routes/                  # API route blueprints
│   └── v5/                 # Version 5 API routes
│       ├── api_v5.py       # Main entity API (restaurants, synagogues, etc.)
│       ├── auth_api.py     # Authentication endpoints
│       ├── admin_api.py    # Admin management endpoints
│       └── monitoring_api.py # Health and monitoring endpoints
├── database/               # Database layer
│   ├── repositories/       # Data access layer
│   ├── services/          # Business logic layer
│   └── connection_manager.py # Database connection management
├── middleware/             # Request/response middleware
│   ├── auth_v5.py         # Authentication middleware
│   ├── rate_limit_v5.py   # Rate limiting middleware
│   └── observability_v5.py # Logging and monitoring
├── utils/                 # Utility modules
│   ├── logging_config.py  # Structured logging setup
│   ├── feature_flags_v5.py # Feature flag management
│   └── security.py        # Security utilities
├── cache/                 # Caching layer
│   └── redis_manager_v5.py # Redis cache management
├── migrations/            # Alembic database migrations
└── tests/                # Test suite
```

## Key Architectural Patterns

### API Organization
- **Versioned APIs**: All routes under `/api/v5/` namespace
- **Blueprint Pattern**: Each major feature area has its own blueprint
- **Generic Entity Pattern**: Unified handling for restaurants, synagogues, mikvah, stores
- **Service Layer**: Business logic separated from route handlers

### Database Layer
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic and validation
- **Connection Manager**: Centralized database connection handling
- **PostGIS Integration**: Spatial queries handled at database level

### Frontend Organization
- **App Router**: Next.js 13+ file-based routing
- **Component Hierarchy**: ui/ → forms/ → feature-specific components
- **Type Safety**: Strict TypeScript with shared type definitions
- **Context Providers**: Global state management with React Context

## File Naming Conventions
- **Frontend**: PascalCase for components, camelCase for utilities
- **Backend**: snake_case for Python modules, PascalCase for classes
- **API Routes**: RESTful naming with version prefixes (`/api/v5/restaurants`)
- **Database**: snake_case table names, descriptive column names

## Import Patterns
- **Frontend**: Absolute imports with `@/` prefix for src directory
- **Backend**: Relative imports within modules, absolute for cross-module
- **Shared Types**: Centralized in `frontend/lib/types/` and `backend/types/`

## Configuration Management
- **Environment Files**: Separate `.env` files for frontend/backend
- **Feature Flags**: Centralized in `utils/feature_flags_v5.py`
- **Deployment Config**: Docker Compose with environment-specific overrides
- **Monitoring**: Separate monitoring stack in `monitoring/` directory