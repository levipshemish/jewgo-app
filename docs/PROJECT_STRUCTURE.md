# JewGo Project Structure Guide

## 📁 Directory Overview

```
jewgo-app/
├── 📂 frontend/                 # Next.js 15 Frontend Application
├── 📂 backend/                  # Flask Backend API
├── 📂 docs/                     # Project Documentation
├── 📂 scripts/                  # Deployment and Utility Scripts
├── 📂 nginx/                    # Nginx Configuration
├── 📂 monitoring/               # Monitoring and Metrics
└── 📂 ops/                      # Operations and Testing
```

## 🎨 Frontend Structure (`frontend/`)

### Core Directories
```
frontend/
├── 📂 app/                      # Next.js App Router
│   ├── 📂 eatery/              # Restaurant pages and components
│   ├── 📂 shuls/               # Synagogue pages and components
│   ├── 📂 mikvah/              # Mikvah pages and components
│   ├── 📂 api/                 # API routes (if any)
│   ├── 📄 layout.tsx           # Root layout component
│   ├── 📄 page.tsx             # Home page
│   └── 📄 globals.css          # Global styles
├── 📂 components/              # Reusable React Components
│   ├── 📂 filters/             # Filter system components
│   ├── 📂 core/                # Core UI components
│   ├── 📂 layout/              # Layout components
│   └── 📂 ui/                  # Base UI components
├── 📂 lib/                     # Utilities and Configuration
│   ├── 📂 api/                 # API client and types
│   ├── 📂 filters/             # Filter types and utilities
│   ├── 📂 hooks/               # Custom React hooks
│   └── 📂 utils/               # Utility functions
├── 📂 public/                  # Static assets
├── 📂 __tests__/               # Test files
└── 📄 package.json             # Dependencies and scripts
```

### Key Components

#### Filter System
- `ModernFilterPopup.tsx` - Main filter modal with dynamic options
- `FilterPreview.tsx` - Real-time result count display
- `ActiveFilterChips.tsx` - Applied filter management
- `useLazyFilterOptions.ts` - Hook for loading filter options

#### Page Components
- `EateryPageClient.tsx` - Restaurant listing page
- `ShulsPageClient.tsx` - Synagogue listing page
- `MikvahPageClient.tsx` - Mikvah listing page

## 🔧 Backend Structure (`backend/`)

### Core Directories
```
backend/
├── 📂 routes/                  # API Route Definitions
│   ├── 📂 v5/                 # Version 5 API endpoints
│   ├── 📄 auth_api.py         # Authentication routes
│   └── 📄 debug_api.py        # Debug endpoints
├── 📂 database/               # Database Layer
│   ├── 📂 services/           # Business logic services
│   ├── 📂 repositories/       # Data access layer
│   ├── 📂 migrations/         # Database migrations
│   ├── 📄 models.py           # SQLAlchemy models
│   └── 📄 unified_connection_manager.py # Database connection
├── 📂 middleware/             # Request/Response Middleware
├── 📂 utils/                  # Utility Functions
├── 📂 cache/                  # Caching Layer (Redis)
├── 📂 security/               # Security Components
├── 📂 monitoring/             # Monitoring and Metrics
├── 📂 tests/                  # Test Files
└── 📄 app.py                  # Flask application entry point
```

### Database Layer Architecture

#### Models (`database/models.py`)
- `Restaurant` - Restaurant entity with complete schema alignment
- `Synagogue` - Synagogue entity
- `Mikvah` - Mikvah entity
- `User` - User authentication model

#### Services (`database/services/`)
- `RestaurantServiceV5` - Restaurant business logic
- `SynagogueServiceV5` - Synagogue business logic
- `MikvahServiceV5` - Mikvah business logic
- `FilterServiceV5` - Filter options service

#### Repositories (`database/repositories/`)
- `EntityRepositoryV5` - Generic entity data access
- `RestaurantRepositoryV5` - Restaurant-specific queries
- `SynagogueRepositoryV5` - Synagogue-specific queries

### API Routes (`routes/v5/`)
```
v5/
├── 📄 api_v5.py               # Main V5 API router
├── 📄 restaurants_v5.py      # Restaurant endpoints
├── 📄 synagogues_v5.py       # Synagogue endpoints
├── 📄 mikvahs_v5.py          # Mikvah endpoints
├── 📄 search_v5.py           # Search functionality
├── 📄 filters_v5.py          # Filter options
└── 📄 auth_v5.py             # Authentication V5
```

## 📚 Documentation Structure (`docs/`)

### Organization
```
docs/
├── 📄 README.md               # Documentation index
├── 📄 CURRENT_STATUS_2025.md  # Current system status
├── 📄 PROJECT_STRUCTURE.md    # This file
├── 📄 V5_API_DOCUMENTATION.md # Complete API reference
├── 📄 development-guide.md    # Development workflow
├── 📄 DEPLOYMENT_GUIDE.md     # Production deployment
├── 📂 deployment/             # Deployment-specific docs
├── 📂 metrics/                # Monitoring documentation
├── 📂 performance/            # Performance guides
├── 📂 server/                 # Server management docs
└── 📂 webhook/                # Webhook configuration
```

### Document Categories

#### Core Documentation
- **API Reference**: Complete endpoint documentation
- **Development Guide**: Setup and workflow
- **Deployment Guide**: Production deployment process

#### Technical Documentation
- **Database Schema**: Entity relationships and structure
- **Authentication**: Security and user management
- **Performance**: Optimization strategies

#### Operational Documentation
- **Server Management**: VPS and container operations
- **Monitoring**: Health checks and metrics
- **Troubleshooting**: Common issues and solutions

## 🚀 Scripts and Operations (`scripts/`)

### Deployment Scripts
```
scripts/
├── 📄 deploy-to-server.sh     # Main deployment script
├── 📄 rebuild-backend.sh      # Backend container rebuild
├── 📄 health-check.sh         # System health verification
└── 📂 essential/              # Core operational scripts
```

### Utility Scripts
- Database backup and restore
- SSL certificate management
- Performance monitoring
- Security hardening

## 🔧 Configuration Files

### Environment Configuration
- `.env.production.template` - Production environment template
- `frontend/.env.local` - Frontend development environment
- `backend/.env` - Backend environment variables

### Build Configuration
- `frontend/package.json` - Frontend dependencies and scripts
- `backend/requirements.txt` - Python dependencies
- `docker-compose.yml` - Container orchestration
- `Dockerfile` - Backend container definition

### Code Quality
- `frontend/eslint.config.js` - Frontend linting rules
- `frontend/prettier.config.js` - Code formatting
- `backend/pytest.ini` - Test configuration
- `backend/config/linting/` - Backend code quality tools

## 📊 Monitoring and Operations

### Monitoring Stack
```
monitoring/
├── 📄 prometheus-security.yml # Prometheus configuration
├── 📄 grafana-security-dashboard.json # Grafana dashboard
└── 📂 scripts/               # Monitoring scripts
```

### Operations
```
ops/
├── 📂 k6/                    # Load testing scripts
├── 📄 performance-testing-guide.md # Testing documentation
└── 📄 run-performance-tests.sh # Test execution
```

## 🏗️ Development Workflow

### Code Organization Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **Consistent Naming**: Follow established conventions
3. **Documentation**: Comprehensive inline and external docs
4. **Testing**: Test files co-located with source code
5. **Configuration**: Environment-specific settings

### File Naming Conventions

#### Frontend (TypeScript/React)
- **Components**: PascalCase (`UserCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useFilterOptions.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase (`RestaurantType.ts`)

#### Backend (Python/Flask)
- **Files/Modules**: snake_case (`restaurant_service.py`)
- **Classes**: PascalCase (`RestaurantService`)
- **Functions/Variables**: snake_case (`get_restaurants`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_PAGE_SIZE`)

### Import Organization

#### Frontend
```typescript
// External libraries
import React from 'react'
import { NextPage } from 'next'

// Internal utilities
import { api } from '@/lib/api'
import { FilterType } from '@/lib/types'

// Components
import { FilterPopup } from '@/components/filters'
```

#### Backend
```python
# Standard library
import os
from typing import Dict, List

# Third-party packages
from flask import Flask, request
from sqlalchemy import select

# Local imports
from database.models import Restaurant
from services.restaurant_service import RestaurantService
```

## 🔄 Maintenance Guidelines

### Regular Tasks

1. **Documentation Updates**: Keep docs current with code changes
2. **Dependency Updates**: Regular security and feature updates
3. **Performance Monitoring**: Track and optimize slow endpoints
4. **Code Quality**: Regular linting and formatting
5. **Test Coverage**: Maintain comprehensive test suite

### Code Review Checklist

- [ ] Follows naming conventions
- [ ] Includes appropriate documentation
- [ ] Has corresponding tests
- [ ] Maintains separation of concerns
- [ ] Handles errors gracefully
- [ ] Includes type annotations (TypeScript/Python)

---

**Last Updated**: January 15, 2025  
**Maintained By**: Development Team
