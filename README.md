# 🕍 JewGo - Kosher Restaurant Discovery Platform

**AI Model**: Claude Sonnet 4  
**Agent**: Cursor AI Assistant

A comprehensive platform for discovering and reviewing kosher restaurants, synagogues, and Jewish establishments.

## 🏗️ Project Structure

```
jewgo-app/
├── 📁 backend/                 # Python FastAPI backend
│   ├── 📁 ai/                  # AI/ML components
│   ├── 📁 config/              # Configuration files
│   │   ├── 📁 linting/         # Linting and testing configs
│   │   └── config.py           # Main configuration
│   ├── 📁 database/            # Database layer (v4 architecture)
│   │   ├── 📁 migrations/      # Database migrations
│   │   ├── 📁 repositories/    # Repository pattern implementation
│   │   └── database_manager_v4.py
│   ├── 📁 routes/              # API routes
│   ├── 📁 search/              # Search functionality
│   ├── 📁 services/            # Business logic services
│   ├── 📁 tests/               # Backend tests
│   └── 📁 utils/               # Utility functions
├── 📁 frontend/                # Next.js frontend
│   ├── 📁 app/                 # Next.js 13+ app directory
│   ├── 📁 components/          # React components
│   ├── 📁 lib/                 # Utility libraries
│   ├── 📁 public/              # Static assets
│   └── 📁 scripts/             # Frontend scripts
├── 📁 docs/                    # Documentation
│   ├── 📁 cleanup-reports/     # Code cleanup documentation
│   ├── 📁 status-reports/      # System status reports
│   └── 📁 implementation-reports/ # Implementation guides
├── 📁 config/                  # Global configuration
│   └── 📁 environment/         # Environment templates
├── 📁 deployment/              # Deployment configuration
├── 📁 monitoring/              # Monitoring and health checks
├── 📁 scripts/                 # Global scripts
└── 📁 data/                    # Data files and exports
```

## 🚀 Quick Start

### Prerequisites
- Node.js 22.x
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Environment Setup
All environment variables are now centralized in a single `.env` file in the root directory.

```bash
# Set up environment configuration
./scripts/setup-env.sh

# Edit .env file with your actual values
# Important variables to configure:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL
# - GOOGLE_MAPS_API_KEY
# - JWT_SECRET_KEY
# - SECRET_KEY
```

### Docker Setup (Recommended)
```bash
# Start all services with Docker
docker-compose -f docker-compose.optimized.yml up -d

# Check service status
docker-compose -f docker-compose.optimized.yml ps

# View logs
docker-compose -f docker-compose.optimized.yml logs -f
```

### Manual Setup (Alternative)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Environment variables are loaded from root .env file
python -m uvicorn app:app --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
# Environment variables are loaded from root .env file
npm run dev
```

## 🧹 Recent Cleanup & Organization

### ✅ Completed
- **Documentation Consolidation**: Moved scattered docs to organized structure
- **Configuration Centralization**: Consolidated environment and linting configs
- **Duplicate Removal**: Removed redundant package.json and vercel.json files
- **File Organization**: Cleaned up root directory structure
- **DS_Store Cleanup**: Removed all macOS system files

### 📋 Organization Structure
- **docs/cleanup-reports/**: Code cleanup plans and summaries
- **docs/status-reports/**: System status and audit reports  
- **docs/implementation-reports/**: Implementation guides and fixes
- **config/environment/**: Centralized environment templates
- **backend/config/linting/**: Consolidated linting configurations

## 🛠️ Development Workflow

### Code Quality Standards
- **Backend**: Python with type hints, linting via ruff, testing via pytest
- **Frontend**: TypeScript, ESLint, Prettier, Jest for testing
- **Database**: Repository pattern with v4 architecture
- **API**: RESTful design with consistent error handling

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test
```

### Deployment
```bash
# Production build
cd frontend && npm run build
cd backend && python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

## 📊 Architecture Highlights

### Database Layer (v4)
- **Repository Pattern**: Clean separation of concerns
- **Connection Management**: Optimized database connections
- **Migration System**: Automated schema updates
- **Performance**: Indexed queries and caching

### Search System
- **PostgreSQL Full-Text**: Native text search capabilities
- **Semantic Search**: AI-powered relevance scoring
- **Hybrid Search**: Combined text and semantic results
- **Caching**: Redis-based result caching

### Frontend Architecture
- **Next.js 13+**: App router with server components
- **TypeScript**: Full type safety
- **Component Library**: Reusable UI components
- **Performance**: Optimized images and bundles

## 🔧 Configuration

### Environment Variables
- **Backend**: Copy `config/environment/backend.env.example` to `backend/.env`
- **Frontend**: Copy `config/environment/frontend.env.example` to `frontend/.env.local`
- **Production**: Use `config/environment/backend.production.env.example`

### Linting Configuration
All linting configs are centralized in `backend/config/linting/`:
- `ruff.toml` - Python linting and formatting
- `mypy.ini` - Type checking
- `pytest.ini` - Testing configuration
- `.flake8` - Additional linting rules
- `.coveragerc` - Test coverage settings

## 📈 Monitoring & Health Checks

- **Health Endpoints**: `/healthz` for system status
- **Performance Monitoring**: Response time tracking
- **Error Tracking**: Sentry integration
- **Logging**: Structured logging with context

## 🤝 Contributing

1. Follow the established code organization
2. Use the centralized configuration files
3. Write tests for new functionality
4. Update documentation for significant changes
5. Follow the linting and formatting standards

## 📝 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: 2024  
**Status**: Production Ready  
**Version**: v4.0 # Force deployment update
