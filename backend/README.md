# JewGo Backend API

A Flask-based REST API for the JewGo application, providing endpoints for kosher restaurant, synagogue, and mikvah discovery.

## 🚀 Current Status (January 2025)

### ✅ System Health
- **API V5**: Fully operational, returning complete data (207 restaurants)
- **Database**: PostgreSQL with PostGIS, properly connected and indexed
- **Authentication**: JWT-based system with security hardening
- **Caching**: Redis integration for performance optimization
- **Deployment**: Production-ready Docker deployment on VPS

### 🔧 Recent Fixes
- **Database Connection**: Fixed UnifiedConnectionManager connection issues
- **Model Alignment**: Updated Restaurant model to match database schema
- **API Stability**: All V5 endpoints returning proper data
- **Documentation**: Comprehensive cleanup and organization

## 🏗️ Architecture

### Core Components
- **Flask Application**: Main API server with V5 endpoints
- **SQLAlchemy ORM**: Database models aligned with PostgreSQL schema
- **Redis Cache**: Performance optimization and session management
- **PostGIS**: Geospatial queries for location-based search
- **JWT Authentication**: Secure user sessions with key rotation

### Database Layer
```
database/
├── models.py                    # SQLAlchemy models (aligned with DB schema)
├── unified_connection_manager.py # Fixed database connection management
├── services/                    # Business logic layer
│   ├── restaurant_service_v5.py # Restaurant operations
│   ├── synagogue_service_v5.py  # Synagogue operations
│   └── mikvah_service_v5.py     # Mikvah operations
└── repositories/                # Data access layer
    └── entity_repository_v5.py  # Generic entity operations
```

### API Routes
```
routes/v5/
├── api_v5.py          # Main V5 router
├── restaurants_v5.py  # Restaurant endpoints (207 active)
├── synagogues_v5.py   # Synagogue endpoints
├── mikvahs_v5.py      # Mikvah endpoints
├── filters_v5.py      # Filter options
└── auth_v5.py         # Authentication V5
```

## 📊 API Documentation

### Base URL
- Production: `https://api.jewgo.app`
- Development: `http://localhost:5000`

### Current Data Status
- **Restaurants**: 207 active with complete data
- **Geographic Coverage**: Florida-focused with PostGIS indexing
- **Filter Options**: Complete filter categories populated
- **Response Format**: Full JSON objects with all required fields

### Core Endpoints

#### Restaurants (✅ Fully Operational)
```bash
GET /api/v5/restaurants                    # List all restaurants
GET /api/v5/restaurants?limit=5           # Paginated results
GET /api/v5/restaurants?include_filter_options=true # With filter options
GET /api/v5/restaurants/{id}              # Specific restaurant
```

#### Filter Options (✅ Working)
- **Agencies**: Kosher Miami, ORB
- **Cities**: 20 different Florida cities
- **Kosher Categories**: Dairy, Meat, Pareve
- **Price Ranges**: $, $$, $$$, $$$$
- **Ratings**: 5.0, 4.5, 4.0, 3.5

### Authentication
```bash
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
GET /api/auth/profile      # User profile
POST /api/auth/refresh     # Token refresh
```

## 🔧 Setup & Development

### Prerequisites
- Python 3.9+
- PostgreSQL with PostGIS extension
- Redis (for caching)

### Quick Start
```bash
# 1. Virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Environment setup
cp .env.example .env  # Configure your settings

# 4. Run application
python app.py
```

### Database Connection
The system uses `UnifiedConnectionManager` for database connectivity:
```python
# Fixed connection management (no problematic arguments)
DATABASE_URL=postgresql://user:password@host:port/database
```

## 🧪 Testing

### Test Categories
```bash
pytest                    # All tests
pytest --cov            # With coverage
pytest -m "not slow"    # Skip slow integration tests
pytest -m unit          # Unit tests only
```

### Current Test Status
- **Unit Tests**: Core functionality covered
- **Integration Tests**: API endpoints validated
- **Database Tests**: Connection and query testing
- **Performance Tests**: Load testing with k6

## 🔒 Security

### Authentication & Authorization
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Rate limiting on all endpoints
- CORS configuration for frontend

### CORS Handling
- In production, CORS is handled by Nginx. The backend disables Flask-CORS to avoid duplicate `Access-Control-Allow-Origin` headers.
- In development (non-production `FLASK_ENV`), Flask-CORS is enabled with `supports_credentials` for local testing.
- Configure allowed origins at the edge (Nginx) and keep `FRONTEND_ORIGINS` up to date for health checks.

### Security Headers
- Content Security Policy
- X-Frame-Options protection
- Strict-Transport-Security
- Input validation and sanitization

### Recent Security Improvements
- Key rotation system implemented
- Enhanced error handling
- Security middleware stack
- Comprehensive logging

## 📈 Performance

### Optimization Features
- **Redis Caching**: API response caching
- **Connection Pooling**: Optimized database connections
- **PostGIS Indexes**: Efficient geospatial queries
- **Cursor Pagination**: Large dataset handling

### Current Performance
- **API Response**: < 200ms average for restaurant listings
- **Database Queries**: Optimized with proper indexing
- **Cache Hit Rate**: High for frequently accessed data
- **Concurrent Users**: Supports production load

## 🚀 Deployment

### Production Environment
```bash
# Docker deployment
docker build -t jewgo-backend .
docker run -p 5000:5000 jewgo-backend

# With docker-compose
docker-compose up -d backend
```

### Environment Configuration
```env
# Database (Required)
DATABASE_URL=postgresql://app_user:password@host:port/jewgo_db
POSTGRES_DB=jewgo_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_password

# Redis (Optional but recommended)
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Application
FLASK_ENV=production
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
```

### Deployment Process
1. **Code Push**: Changes pushed to main branch
2. **Docker Build**: Automated image building
3. **Health Checks**: Comprehensive endpoint testing
4. **Rolling Deployment**: Zero-downtime updates
5. **Monitoring**: Post-deployment verification

## 🔧 Configuration

### Feature Flags
- `API_V5_ENABLED=true` - V5 API endpoints (recommended)
- `API_V4_ENABLED=false` - Legacy V4 API (deprecated)
- `MARKETPLACE_ENABLED=true` - Marketplace features
- `SEARCH_ENABLED=true` - Search functionality

### Performance Settings
- `DATABASE_POOL_SIZE=10` - Connection pool size
- `DATABASE_MAX_OVERFLOW=20` - Max overflow connections
- `CACHE_DEFAULT_TIMEOUT=600` - Redis cache TTL
- `API_RATE_LIMIT=100` - Requests per hour per IP

## 📊 Monitoring & Health

### Health Endpoints
```bash
GET /healthz          # Basic health check
GET /readyz          # Readiness check
GET /api/v5/monitoring/health # Detailed health status
```

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard visualization
- **Structured Logging**: JSON-formatted logs
- **Error Tracking**: Comprehensive error reporting

## 🤝 Contributing

### Code Standards
- **Formatting**: Black (88 characters)
- **Linting**: Ruff with strict rules
- **Type Hints**: Required for all functions
- **Documentation**: Comprehensive docstrings

### Development Workflow
1. Follow conventional commit format
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

### File Organization
- **snake_case** for files/modules
- **PascalCase** for classes
- **snake_case** for functions/variables
- **UPPER_SNAKE_CASE** for constants

---

**Last Updated**: January 15, 2025  
**Version**: 5.0.0  
**Status**: ✅ Production Ready
