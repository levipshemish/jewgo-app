# Project Organization Guide

For contributor guidelines and day‑to‑day commands, see `docs/AGENTS.md`. For agent guardrails/workflow, see the root `AGENTS.md`.

## 🏗️ **Project Structure Overview**

After the Oracle Cloud PostgreSQL migration and cleanup, the JewGo project has been organized into a clean, maintainable structure.

## 📁 **Root Directory Structure**

```
jewgo-app/
├── .github/                # GitHub Actions, issue templates, and other repository configurations
├── .husky/                 # Git hooks for pre-commit checks
├── .vscode/                # VS Code editor settings and configurations
├── backend/                # Python Flask backend API
├── ci-scripts/             # Scripts for Continuous Integration (CI) checks
├── config/                 # Project-wide configuration files (Docker, etc.)
├── backend/data/           # CSV and JSON data files
├── backend/deployment/     # Deployment-related configurations (Procfile, etc.)
├── docs/                   # Project documentation
├── frontend/               # Next.js and React frontend application
# monitoring/ directory removed (was empty)
├── node_modules/           # Node.js dependencies (managed by npm)
├── scripts/                # General utility and automation scripts
├── supabase/               # Supabase-specific configurations
├── tools/                  # Developer tools and utilities
├── .gitignore              # Specifies files and directories to be ignored by Git
├── package.json            # Defines project scripts and dependencies for the root workspace
├── README.md               # Top-level project overview and setup instructions
└── requirements.txt        # Python dependencies for the root level (if any)
```

## 🐍 **Backend Structure**

```
backend/
├── app_factory.py         # Main Flask application factory
├── app_factory_full.py    # Full-featured application factory
├── app_factory_minimal.py # Minimal application factory
├── app.py                 # Application entry point
├── wsgi.py               # WSGI entry point
├── requirements.txt      # Python dependencies
├── requirements-dev.txt  # Development dependencies
├── requirements-optimized.txt # Optimized dependencies
├── Dockerfile           # Production Docker image
├── Dockerfile.optimized # Optimized Docker image
├── .dockerignore        # Docker ignore file
├── __init__.py          # Python package init
│
├── config/              # Configuration management
│   ├── config.py        # Main configuration
│   ├── settings.py      # Settings management
│   ├── gunicorn.conf.py # Gunicorn configuration
│   └── linting/         # Linting configurations
│
├── database/            # Database layer
│   ├── base_repository.py
│   ├── connection_manager.py
│   ├── database_manager_v3.py # Oracle Cloud database manager
│   ├── database_manager_v4.py # Latest database manager
│   ├── google_places_manager.py # Manages Google Places API interactions
│   ├── init_database.py # Initializes the database
│   ├── models.py        # SQLAlchemy models
│   ├── performance_indexes.sql # SQL for performance indexes
│   ├── search_manager.py # Manages search functionality
│   ├── setup_database.py # Sets up the database
│   ├── setup_neon.py    # Sets up Neon database
│   ├── repositories/    # Data access layer
│   ├── migrations/      # Database migrations
│   └── init.sql/        # SQL initialization scripts
│
├── routes/              # API routes
│   ├── api_v4.py        # Main API v4 routes
│   ├── api_v4_simple.py # Simplified API routes
│   ├── health_routes.py # Health check routes
│   ├── redis_health.py  # Redis health check routes
│   ├── restaurants.py   # Restaurant-related routes
│   └── __init__.py
│
├── services/            # Business logic layer
│   ├── base_service.py
│   ├── distance_filtering_service.py # Filters by distance
│   ├── google_places_service.py # Interacts with Google Places API
│   ├── health_service.py  # Provides health check logic
│   ├── hours_compute.py   # Computes business hours
│   ├── hours_normalizer.py # Normalizes business hours
│   ├── hours_sources.py   # Defines sources for business hours
│   ├── marketplace_service_v4.py # Marketplace-related business logic
│   ├── open_now_service.py # Checks if a business is open
│   ├── redis_cache_service.py # Manages Redis caching
│   ├── restaurant_service_v4.py # Restaurant-related business logic
│   ├── restaurant_service.py # Older restaurant service
│   ├── restaurant_status_service.py # Manages restaurant status
│   ├── review_service_v4.py # Review-related business logic
│   ├── scraper_service.py # Web scraping services
│   ├── service_manager.py # Manages services
│   ├── user_service_v4.py # User-related business logic
│   └── websocket_service.py # Manages websockets
│
├── utils/               # Utility functions
│   ├── api_response.py  # Standardized API responses
│   ├── cache_manager_v4.py # Manages caching
│   ├── cache_manager.py # Older cache manager
│   ├── cloudinary_uploader.py # Uploads to Cloudinary
│   ├── config_manager.py # Manages configuration
│   ├── data_validator.py # Validates data
│   ├── database_column_manager.py # Manages database columns
│   ├── database_connection_manager.py # Manages database connections
│   ├── error_handler.py # Handles errors
│   ├── feature_flags_v4.py # Manages feature flags
│   ├── feature_flags.py # Older feature flag manager
│   ├── feedback_manager.py # Manages feedback
│   ├── google_places_helper.py # Google Places helper functions
│   ├── google_places_image_scraper.py # Scrapes images from Google Places
│   ├── google_places_manager.py # Manages Google Places API
│   ├── google_places_searcher.py # Searches Google Places
│   ├── google_places_validator.py # Validates Google Places data
│   ├── hours_formatter.py # Formats business hours
│   ├── hours_manager.py # Manages business hours
│   ├── hours_parser.py  # Parses business hours
│   ├── hours.py         # Business hours utilities
│   ├── image_optimizer.py # Optimizes images
│   ├── logging_config.py # Configures logging
│   ├── restaurant_status.py # Manages restaurant status
│   ├── security.py      # Security-related utilities
│   ├── unified_database_config.py # Oracle Cloud config
│   ├── unified_hours_formatter.py # Formats business hours
│   ├── unified_search_service.py # Unified search service
│   ├── validation.py    # Validation utilities
│   ├── validators.py    # Validators
│   ├── ai/              # AI-related utilities
│   ├── kosher_miami/    # Utilities for Kosher Miami data
│   ├── ml/              # Machine learning utilities
│   └── search/          # Search-related utilities
│
├── search/              # Search functionality
│   ├── core/
│   ├── embeddings/
│   ├── indexes/
│   ├── providers/
│   ├── __init__.py
│   └── search_service.py
│
├── ai/                  # AI and ML components
│   ├── embeddings/
│   ├── ml/
│   └── semantic/
│
├── monitoring/          # Monitoring and logging
│   ├── performance_monitor.py
│   └── v4_monitoring.py
│
├── tests/               # Test suite
│   ├── performance/
│   └── utils/
│
├── types/               # Type definitions
│   └── restaurant.py
│
├── scripts/             # Utility scripts
│   ├── maintenance/     # Maintenance scripts
│   ├── migration/       # Migration scripts
│   ├── setup/           # Setup scripts
│   ├── add_unified_marketplace_data.py # Adds marketplace data
│   ├── add_username_index.py # Adds a username index to the database
│   ├── build.sh         # Build script
│   ├── check_existing_tables.py # Checks for existing tables
│   ├── check_tables_psycopg.py # Checks tables using psycopg
│   ├── check_tables_simple.py # Simple table check
│   ├── create_profiles_table_psycopg.py # Creates profiles table using psycopg
│   ├── startup.sh       # Startup script
│   └── update_restaurant_status.py # Updates restaurant status
│
└── docs/                # Backend documentation
    └── SERVICE_LAYER_ARCHITECTURE.md
```

## ⚛️ **Frontend Structure**

```
│   ├── app/                 # Next.js 15 app directory
│   │   ├── account/         # User account pages
│   │   ├── actions/         # Server-side actions
│   │   ├── add-eatery/      # Page for adding a new eatery
│   │   ├── admin/           # Admin pages
│   │   ├── api/             # API routes
│   │   ├── auth/            # Authentication pages
│   │   ├── eatery/          # Eatery pages
│   │   ├── favorites/       # User favorites
│   │   ├── live-map/        # Live map page
│   │   ├── marketplace/     # Marketplace pages
│   │   ├── mikva/           # Mikva pages
│   │   ├── notifications/   # Notification pages
│   │   ├── privacy/         # Privacy policy page
│   │   ├── profile/         # User profile pages
│   │   ├── restaurant/      # Restaurant pages
│   │   ├── shuls/           # Shul pages
│   │   ├── stores/          # Store pages
│   │   ├── terms/           # Terms of service page
│   │   ├── error.tsx        # Error page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Root page
│   │
├── components/          # React components
│   ├── admin/           # Admin components
│   ├── analytics/       # Analytics components
│   ├── auth/            # Authentication components
│   ├── eatery/          # Eatery components
│   ├── feedback/        # Feedback components
│   ├── filters/         # Filter components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   ├── location/        # Location components
│   ├── map/             # Map components
│   ├── marketplace/     # Marketplace components
│   ├── mikvah/          # Mikvah components
│   ├── navigation/      # Navigation components
│   ├── newsletter/      # Newsletter components
│   ├── pages/           # Page components
│   ├── products/        # Product components
│   ├── profile/         # Profile components
│   ├── restaurant/      # Restaurant components
│   ├── reviews/         # Review components
│   ├── search/          # Search components
│   ├── shuls/           # Shul components
│   ├── specials/        # Specials components
│   ├── stores/          # Store components
│   └── ui/              # UI components
│
├── lib/                 # Utility libraries
│   ├── ai/              # AI-related libraries
│   ├── analytics/       # Analytics libraries
│   ├── api/             # API-related libraries
│   ├── auth/            # Authentication libraries
│   ├── config/          # Configuration libraries
│   ├── database/        # Database libraries
│   ├── google/          # Google API libraries
│   ├── maps/            # Map libraries
│   ├── search/          # Search libraries
│   ├── supabase/        # Supabase libraries
│   ├── utils/           # Utility libraries
│   ├── auth.ts          # Authentication utilities
│   ├── email.ts         # Email utilities
│   └── index.ts         # Index file
│
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Frontend utilities
├── validators/          # Form validation
├── public/              # Static assets
├── prisma/              # Prisma schema
├── supabase/            # Supabase configuration
├── config/              # Frontend configuration
├── db/                  # Database-related files
├── docs/                # Frontend-specific documentation
├── filters/             # Filter components
├── logs/                # Log files
├── sandbox/             # Sandbox environment
├── scripts/             # Frontend-specific scripts
├── .dockerignore        # Docker ignore file
├── .eslintrc.json       # ESLint configuration
├── .gitignore           # Git ignore file
├── .lighthouserc.json   # Lighthouse configuration
├── .npmrc               # npm configuration
├── .nvmrc               # Node Version Manager configuration
├── .prettierrc          # Prettier configuration
├── .vercelignore        # Vercel ignore file
├── Dockerfile           # Production Dockerfile
├── Dockerfile.dev       # Development Dockerfile
├── Dockerfile.optimized # Optimized Dockerfile
├── jest.config.js       # Jest configuration
├── next.config.js       # Next.js configuration
├── package.json         # Node.js dependencies
├── postcss.config.js    # PostCSS configuration
├── README.md            # Frontend README
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## 📚 **Documentation Structure**

```
docs/
├── api/                               # API documentation
├── analytics/                         # Analytics documentation
├── authentication/                    # Authentication documentation
├── business/                          # Business logic documentation
├── cleanup-reports/                   # Cleanup reports
├── database/                          # Database documentation
├── deployment/                        # Deployment guides
├── design/                            # Design documents
├── development/                       # Development guides
├── features/                          # Feature documentation
├── frontend/                          # Frontend documentation
├── implementation-reports/            # Implementation reports
├── implementations/                   # Implementation guides
├── maintenance/                       # Maintenance guides
├── marketplace/                       # Marketplace documentation
├── migration/                         # Migration reference files
├── monitoring/                        # Monitoring guides
├── performance/                       # Performance guides
├── reports/                           # General reports
├── security/                          # Security documentation
├── setup/                             # Setup guides
├── status/                            # Status reports
├── team/                              # Team documentation
├── testing/                           # Testing documentation
├── CONTRIBUTING.md                    # Contribution guidelines
├── DEPLOYMENT_GUIDE.md                # Deployment guide
├── DEVELOPMENT_WORKFLOW.md            # Development workflow
├── README.md                          # Docs README
└── ...                                # Other documentation files
```

## 🔧 **Configuration Structure**

```
config/
├── environment/                       # Environment configurations
│   ├── active/                        # Active environment files
│   ├── backups/                       # Environment backups
│   └── templates/                     # Environment templates
│
├── docker/                           # Docker configurations
│   ├── docker-compose.frontend.dev.yml
│   ├── docker-compose.frontend.local.yml
│   ├── docker-compose.frontend.prod.yml
│   └── ...
│
├── toml/                             # TOML configurations
│   ├── backend-pyproject.toml
│   └── pyproject.toml
│
├── commitlint.config.js              # Commit linting
├── netlify.toml                      # Netlify configuration
└── templates/                        # Configuration templates
```

## 🚀 **Deployment Structure**

```
deployment/
├── Procfile                          # Heroku/Render Procfile
└── runtime.txt                       # Python runtime specification
```

## 📊 **Data Structure**

```
backend/data/
├── florida_shuls_full_20250807_171818.csv
├── kosher_miami_establishments.csv
└── kosher_miami_establishments.json
```

## 🛠️ **Scripts Structure**

```
scripts/
├── cleanup_migration_files.py        # Migration cleanup script
├── analyze-duplications.py           # Data analysis
├── app.py                            # Utility application
├── apply-anonymous-auth-fix.sh       # Auth fixes
├── cleanup/                          # Cleanup scripts
├── database/                         # Database scripts
├── deployment/                       # Deployment scripts
├── enhancement/                      # Enhancement scripts
├── maintenance/                      # Maintenance scripts
├── testing/                          # Testing scripts
└── utils/                            # Utility scripts
```

## 🎯 **Key Files and Their Purposes**

### **Core Application Files**
- `backend/app_factory.py` - Main Flask application factory
- `backend/database/database_manager_v3.py` - Oracle Cloud database manager
- `backend/config/gunicorn.conf.py` - Optimized Gunicorn configuration
- `backend/utils/unified_database_config.py` - Database configuration management

### **Documentation Files**
- `docs/DATABASE_MIGRATION_SUMMARY.md` - Complete migration documentation
- `docs/ORACLE_CLOUD_BACKUP_AND_OPTIMIZATION.md` - Backup and optimization guide
- `docs/PROJECT_STATUS_AND_TODOS.md` - Current project status

### **Configuration Files**
- `config/environment/active/` - Active environment configurations
- `backend/requirements.txt` - Production Python dependencies
- `frontend/package.json` - Node.js dependencies

### **Deployment Files**
- `backend/Dockerfile` - Production Docker image
- `backend/deployment/Procfile` - Render deployment configuration
- `config/docker/` - Docker Compose configurations

## 🔒 **Security and Access Control**

### **Database Access**
- **Production**: Oracle Cloud PostgreSQL (141.148.50.111)
- **Connection**: SSL-enabled with proper authentication
- **Backup**: Automated nightly backups (3:17am UTC, 7-day retention)

### **Environment Variables**
- **Backend**: Stored in Render environment variables
- **Frontend**: Stored in Vercel environment variables
- **Local Development**: `.env.local` files (not committed)

### **Access Control**
- **Database**: Limited app_user permissions
- **API**: Rate limiting and authentication
- **Frontend**: Supabase authentication

## 📈 **Performance Optimizations**

### **Database**
- **Connection Pooling**: pool_size=5, max_overflow=10
- **Query Optimization**: Indexed tables and optimized queries
- **Backup Strategy**: Automated nightly backups

### **Application**
- **Gunicorn Workers**: 2-4 workers (optimized for Oracle Cloud)
- **Caching**: Redis-based caching for frequently accessed data
- **CDN**: Cloudinary for image optimization

### **Frontend**
- **Next.js 15**: Latest version with optimizations
- **Static Generation**: Pre-rendered pages where possible
- **Image Optimization**: Next.js Image component with Cloudinary

## 🧪 **Testing and Quality Assurance**

### **Backend Testing**
- `backend/tests/` - Comprehensive test suite
- Performance monitoring in `backend/monitoring/`
- Database connection testing

### **Frontend Testing**
- TypeScript for type safety
- ESLint for code quality
- Component testing with React Testing Library

### **Integration Testing**
- API endpoint testing
- Database integration testing
- End-to-end user flow testing

## 🔄 **Development Workflow**

### **Code Organization**
- **Feature-based**: Related code grouped together
- **Separation of Concerns**: Clear boundaries between layers
- **Documentation**: Comprehensive documentation for all components

### **Version Control**
- **Main Branch**: Production-ready code
- **Feature Branches**: For new features and fixes
- **Commit Standards**: Conventional commit messages

### **Deployment Pipeline**
- **Automated Testing**: Pre-deployment tests
- **Build Verification**: Automated build checks
- **Environment Management**: Separate dev/staging/prod environments

## 🎊 **Migration Success**

The project has been successfully migrated to Oracle Cloud PostgreSQL with:
- ✅ **100% Data Integrity**: All 207 restaurants and 773 total rows migrated
- ✅ **Zero Downtime**: Migration completed without service interruption
- ✅ **Performance Optimized**: Connection pooling and worker configuration optimized
- ✅ **Backup System**: Automated nightly backups implemented
- ✅ **Security Enhanced**: Proper security configurations in place
- ✅ **Documentation Updated**: All internal documentation reflects changes
- ✅ **Project Cleaned**: Temporary files removed, organized structure

## 🚀 **Next Steps**

1. **Monitor Performance**: Track database and application performance
2. **Regular Backups**: Verify backup system is working correctly
3. **Security Updates**: Keep security configurations current
4. **Documentation**: Maintain up-to-date documentation
5. **Feature Development**: Continue building new features on the stable foundation

---

**🎉 The JewGo project is now clean, organized, and ready for continued development with Oracle Cloud PostgreSQL!**
