# Project Organization Guide

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
├── data/                   # CSV and JSON data files
├── deployment/             # Deployment-related configurations (Procfile, etc.)
├── docs/                   # Project documentation
├── frontend/               # Next.js and React frontend application
├── monitoring/             # Monitoring and health check configurations
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
│   ├── models.py        # SQLAlchemy models
│   ├── repositories/    # Data access layer
│   ├── migrations/      # Database migrations
│   └── init.sql/        # SQL initialization scripts
│
├── routes/              # API routes
│   ├── api_v4.py        # Main API v4 routes
│   ├── api_v4_simple.py # Simplified API routes
│   └── __init__.py
│
├── services/            # Business logic layer
│   ├── base_service.py
│   ├── restaurant_service.py
│   ├── search_service.py
│   └── ...
│
├── utils/               # Utility functions
│   ├── api_response.py
│   ├── cache_manager_v4.py
│   ├── unified_database_config.py # Oracle Cloud config
│   └── ...
│
├── search/              # Search functionality
│   ├── core/
│   ├── embeddings/
│   ├── indexes/
│   ├── providers/
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
│   ├── setup/           # Setup scripts
│   │   ├── create_tables.py
│   │   └── add_categories.py
│   ├── build.sh         # Build script
│   ├── startup.sh       # Startup script
│   └── ...
│
└── docs/                # Backend documentation
    └── SERVICE_LAYER_ARCHITECTURE.md
```

## ⚛️ **Frontend Structure**

```
frontend/
├── app/                 # Next.js 15 app directory
│   ├── api/             # API routes
│   ├── auth/            # Authentication pages
│   ├── marketplace/     # Marketplace pages
│   ├── restaurant/      # Restaurant pages
│   ├── profile/         # User profile pages
│   └── ...
│
├── components/          # React components
│   ├── ui/              # UI components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   ├── marketplace/     # Marketplace components
│   └── ...
│
├── lib/                 # Utility libraries
│   ├── auth.ts          # Authentication utilities
│   ├── database.ts      # Database utilities
│   ├── utils.ts         # General utilities
│   └── ...
│
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Frontend utilities
├── validators/          # Form validation
├── public/              # Static assets
├── prisma/              # Prisma schema
├── supabase/            # Supabase configuration
└── package.json         # Node.js dependencies
```

## 📚 **Documentation Structure**

```
docs/
├── DATABASE_MIGRATION_SUMMARY.md      # Complete migration summary
├── ORACLE_CLOUD_BACKUP_AND_OPTIMIZATION.md # Backup and optimization guide
├── PROJECT_ORGANIZATION.md            # This file
├── PROJECT_STATUS_AND_TODOS.md        # Project status
├── CONTRIBUTING.md                    # Contribution guidelines
│
├── api/                               # API documentation
│   ├── API_ENDPOINTS_SUMMARY.md
│   ├── API_V4_MIGRATION_GUIDE.md
│   └── DATABASE_V4_API_DOCUMENTATION.md
│
├── database/                          # Database documentation
│   ├── README.md                      # Database overview
│   ├── schema.md                      # Database schema
│   ├── postgresql-setup.md            # PostgreSQL setup
│   └── DATABASE_REFACTORING_GUIDE.md
│
├── deployment/                        # Deployment guides
│   ├── BUILD_AND_DEPLOY_QUICK_REFERENCE.md
│   ├── BUILD_AND_DEPLOY_SYSTEM_SUMMARY.md
│   ├── CLOUD_DEPLOYMENT_GUIDE.md
│   └── ...
│
├── features/                          # Feature documentation
│   ├── PROFILE_MANAGEMENT_SYSTEM.md
│   ├── website-data-management.md
│   ├── orb-scraper.md
│   └── ...
│
├── setup/                             # Setup guides
│   ├── ENVIRONMENT_CONSOLIDATION.md
│   ├── env-variables-setup.md
│   └── ...
│
├── migration/                         # Migration reference files
│   ├── CLEANUP_SUMMARY.md            # Cleanup summary
│   ├── DATABASE_FIX_SUMMARY.md       # Database fix documentation
│   ├── install_backup_system.sh      # Backup system installer
│   └── setup_oracle_backups.sh       # Alternative backup setup
│
├── maintenance/                       # Maintenance guides
├── monitoring/                        # Monitoring guides
├── performance/                       # Performance guides
├── reports/                           # Implementation reports
├── security/                          # Security documentation
├── status/                            # Status reports
└── team/                              # Team documentation
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
data/
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
- `deployment/Procfile` - Render deployment configuration
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
