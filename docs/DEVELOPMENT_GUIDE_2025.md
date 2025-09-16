# JewGo Development Guide 2025

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **PostgreSQL** 14+ with PostGIS
- **Redis** (for caching and rate limiting)

### Development Setup

#### Frontend (Next.js 15)
```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

#### Backend (Flask + PostgreSQL)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

## 🔧 Code Quality Standards

### Frontend (TypeScript/React)
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config with React hooks
- **Prettier**: 80 columns, 2 spaces, single quotes
- **Testing**: Jest + Testing Library

#### Commands:
```bash
npm run type-check     # TypeScript checking
npm run lint:check     # ESLint checking
npm run lint:fix       # Auto-fix linting issues
npm test              # Run tests
```

### Backend (Python/Flask)
- **Python**: 3.11+ with type hints
- **Code Style**: Black (88 columns) + Ruff linting
- **Testing**: Pytest with coverage
- **Documentation**: Docstrings for all functions

#### Commands:
```bash
source .venv/bin/activate
ruff check .              # Linting
black --check .           # Code formatting
pytest                    # Run tests
mypy .                   # Type checking
```

---

## 📁 Project Structure

```
/
├── frontend/                 # Next.js 15 TypeScript app
│   ├── app/                 # Next.js 13+ app router
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utilities and configurations
│   ├── contexts/            # React contexts
│   └── __tests__/           # Frontend tests
│
├── backend/                 # Flask Python API
│   ├── routes/              # API route definitions
│   │   └── v5/             # Version 5 API routes
│   ├── services/            # Business logic services
│   ├── middleware/          # Request/response middleware
│   ├── database/            # Database models and migrations
│   ├── utils/              # Utility functions
│   └── tests/              # Backend tests
│
├── docs/                   # Documentation
├── nginx/                  # Reverse proxy configuration
├── monitoring/             # Monitoring and alerting
└── scripts/               # Deployment and maintenance scripts
```

---

## 🗄️ Database Architecture

### PostgreSQL + PostGIS
- **Primary Database**: User data, restaurants, synagogues, mikvahs
- **PostGIS Extension**: Geospatial queries and distance calculations
- **Indexing**: Optimized for location-based searches

### Redis
- **Rate Limiting**: Request throttling and abuse prevention
- **Caching**: Frequently accessed data
- **Sessions**: User session management

### Key Tables:
- `users` - User accounts and authentication
- `restaurants` - Restaurant data with kosher certifications
- `synagogues` - Synagogue information and services
- `mikvahs` - Mikvah locations and details
- `user_roles` - Role-based access control

---

## 🔐 Authentication System

### Architecture
- **JWT Tokens**: Access and refresh tokens
- **HttpOnly Cookies**: Secure token storage
- **CSRF Protection**: Double-submit cookie pattern
- **Rate Limiting**: Prevents brute force attacks

### User Roles
- **Guest**: Limited access, temporary sessions
- **User**: Standard authenticated user
- **Moderator**: Content management permissions
- **Admin**: Full system access

### API Endpoints
```
POST /api/v5/auth/register    # User registration
POST /api/v5/auth/login       # User login
POST /api/v5/auth/logout      # User logout
GET  /api/v5/auth/profile     # Get user profile
POST /api/v5/auth/refresh     # Token refresh
```

---

## 🚀 Deployment

### Environment Configuration
- **Development**: Local environment with hot reload
- **Staging**: Production-like environment for testing
- **Production**: Live environment with optimizations

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=https://your-domain.com

# External APIs
GOOGLE_PLACES_API_KEY=your-api-key
RECAPTCHA_SECRET_KEY=your-recaptcha-key
```

### Deployment Process
1. **Code Review**: All changes reviewed via pull requests
2. **Testing**: Automated tests must pass
3. **Staging Deploy**: Deploy to staging environment
4. **Production Deploy**: Deploy to production after validation

---

## 🧪 Testing Strategy

### Frontend Testing
- **Unit Tests**: Component testing with Jest
- **Integration Tests**: User flow testing
- **E2E Tests**: Full application testing
- **Coverage Target**: 80%+ for critical paths

### Backend Testing
- **Unit Tests**: Service and utility function tests
- **Integration Tests**: API endpoint testing
- **Database Tests**: Repository and model tests
- **Security Tests**: Authentication and authorization

### Test Commands
```bash
# Frontend
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report

# Backend
pytest                   # Run all tests
pytest --cov=.          # Run with coverage report
pytest -m unit          # Run only unit tests
pytest -m integration   # Run only integration tests
```

---

## 📊 Monitoring & Performance

### Application Monitoring
- **Health Checks**: Endpoint monitoring
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Exception monitoring and alerting
- **User Analytics**: Usage patterns and behavior

### Database Monitoring
- **Query Performance**: Slow query identification
- **Connection Pooling**: Connection management
- **Index Usage**: Query optimization
- **Backup Verification**: Data integrity checks

### Rate Limiting
- **Anonymous Users**: 120 requests/minute
- **Authenticated Users**: Based on role level
- **Auth Endpoints**: 80% of base limits
- **Burst Allowance**: 200 requests for traffic spikes

---

## 🔧 Development Workflow

### Git Workflow
1. **Feature Branches**: Create from `main`
2. **Commits**: Use conventional commit messages
3. **Pull Requests**: Required for all changes
4. **Code Review**: At least one approval required
5. **Merge**: Squash and merge to `main`

### Code Quality Checks
- **Pre-commit Hooks**: Linting and formatting
- **CI/CD Pipeline**: Automated testing and deployment
- **Code Coverage**: Maintain coverage thresholds
- **Security Scanning**: Dependency vulnerability checks

### Development Best Practices
- **TypeScript**: Use strict type checking
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging with correlation IDs
- **Documentation**: Keep documentation up to date
- **Performance**: Consider performance implications
- **Security**: Validate all inputs and sanitize data

---

## 🐛 Troubleshooting

### Common Issues

#### Authentication Problems
- **Rate Limiting**: Check if hitting rate limits
- **CORS Issues**: Verify CORS configuration
- **Token Expiry**: Check JWT token expiration
- **Cookie Issues**: Verify cookie domain and security settings

#### Database Issues
- **Connection Pool**: Check connection limits
- **Query Performance**: Use EXPLAIN ANALYZE
- **Migration Issues**: Verify migration scripts
- **PostGIS**: Ensure PostGIS extension is enabled

#### Frontend Issues
- **Build Errors**: Check TypeScript and ESLint
- **API Connectivity**: Verify backend URL configuration
- **Environment Variables**: Check `.env.local` file
- **Cache Issues**: Clear Next.js cache

### Debug Commands
```bash
# Frontend debugging
npm run type-check          # Check TypeScript errors
npm run lint:check          # Check linting issues
npm run build              # Test production build

# Backend debugging
source .venv/bin/activate
python -c "import app; print('Backend imports OK')"
flask routes              # List all routes
pytest -v                 # Verbose test output
```

---

## 📚 Additional Resources

### Documentation
- [API Documentation](API_DOCUMENTATION.md)
- [Authentication Flow](AUTHENTICATION_FLOW_DOCUMENTATION.md)
- [Database Schema](DATABASE_SCHEMA_V5.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

### External Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

---

*Last Updated: September 16, 2025*  
*Maintained by: Development Team*
