# Development Guide

## Getting Started

This guide will help you set up the development environment and understand the codebase structure for the JewGo app.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Python**: Version 3.9 or higher
- **PostgreSQL**: Version 13 or higher with PostGIS extension
- **Redis**: Version 6 or higher (optional, for caching)

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd jewgo-app
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Database Setup
```bash
# Create database
createdb jewgo_app

# Enable PostGIS extension
psql jewgo_app -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Development Workflow

### Code Style

#### Frontend (TypeScript/React)
- **Prettier**: 80 columns, 2 spaces, single quotes
- **ESLint**: Follow React and TypeScript rules
- **Components**: PascalCase (`UserCard.tsx`)
- **Hooks**: `useXyz` naming convention
- **Files**: kebab-case for non-component files

#### Backend (Python)
- **Black**: 88 columns formatting
- **Ruff**: Linting rules
- **Type Hints**: Required for all functions
- **Files**: `snake_case`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`

### Git Workflow

#### Commit Messages
Use Conventional Commits format:
```
feat: add ID-based routing
fix: prevent infinite fetch loop
docs: update API documentation
refactor: simplify filter logic
test: add unit tests for filters
```

#### Branch Strategy
- Push directly to `main` branch
- Run tests and checks before pushing
- No feature branches (per project preference)

### Testing

#### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
npm run type-check         # TypeScript checking
npm run lint:check         # Linting
```

#### Backend Tests
```bash
cd backend
pytest                     # Run all tests
pytest --cov              # Run with coverage
pytest -m "not slow"      # Skip slow tests
ruff check .              # Linting
black --check .           # Format checking
mypy .                    # Type checking
```

## Code Organization

### Frontend Structure
```
frontend/
├── app/                   # Next.js app router
│   ├── eatery/           # Restaurant pages
│   ├── shuls/            # Synagogue pages
│   ├── mikvah/           # Mikvah pages
│   └── api/              # API routes
├── components/           # React components
│   ├── filters/          # Filter system
│   ├── core/             # Core UI components
│   └── layout/           # Layout components
├── lib/                  # Utilities and hooks
│   ├── api/              # API clients
│   ├── filters/          # Filter types
│   └── hooks/            # Custom hooks
└── docs/                 # Documentation
```

### Backend Structure
```
backend/
├── routes/               # API route definitions
├── database/             # Database layer
│   ├── services/         # Business logic
│   └── repositories/     # Data access
├── utils/                # Utility functions
└── tests/                # Test files
```

## Adding New Features

### 1. Filter System

#### Adding New Filter Types
1. Update filter types in `frontend/lib/filters/filters.types.ts`
2. Add filter section to `ModernFilterPopup.tsx`
3. Update backend service to handle new filter
4. Add filter to API documentation

#### Example: Adding a New Restaurant Filter
```typescript
// 1. Update types
interface RestaurantFilters {
  // ... existing filters
  newFilter?: string;
}

// 2. Add to ModernFilterPopup
{entityType === 'restaurants' && (
  <div className="space-y-3">
    <label>New Filter</label>
    <CustomDropdown
      value={draftFilters.newFilter || ""}
      onChange={(value) => setDraftFilter('newFilter', value)}
      options={filterOptions?.newFilterOptions || []}
    />
  </div>
)}
```

### 2. API Endpoints

#### Adding New Endpoints
1. Create route in `backend/routes/v5/api_v5.py`
2. Add service method in appropriate service file
3. Create frontend API route in `frontend/app/api/`
4. Update API client if needed
5. Add tests

#### Example: Adding New Entity Type
```python
# backend/routes/v5/api_v5.py
@v5_bp.route('/api/v5/new-entities', methods=['GET'])
def get_new_entities():
    service = get_entity_service('new_entities')
    return service.get_entities(request.args)
```

### 3. Components

#### Creating New Components
1. Create component file in appropriate directory
2. Add TypeScript interfaces
3. Include proper error handling
4. Add tests
5. Update component index files

#### Example: New Filter Component
```typescript
// frontend/components/filters/NewFilter.tsx
interface NewFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export function NewFilter({ value, onChange, options }: NewFilterProps) {
  // Component implementation
}
```

## Debugging

### Frontend Debugging
- Use React DevTools for component debugging
- Check browser console for errors
- Use Next.js development mode for detailed error messages
- Enable source maps for better debugging

### Backend Debugging
- Use Python debugger (`pdb`) for step-by-step debugging
- Check application logs for errors
- Use database query logging for SQL debugging
- Enable debug mode in Flask for detailed error messages

### Common Issues

#### Filter Options Not Loading
1. Check API endpoint is accessible
2. Verify filter options are being returned
3. Check for CORS issues
4. Verify authentication if required

#### Location-based Queries Failing
1. Verify PostGIS extension is enabled
2. Check latitude/longitude values are valid
3. Verify radius parameter is in correct units
4. Check database indexes are created

#### Performance Issues
1. Check for N+1 query problems
2. Verify database indexes are being used
3. Check for memory leaks in frontend
4. Monitor API response times

## Performance Optimization

### Frontend Optimization
- Use React.memo for expensive components
- Implement proper key props for lists
- Use lazy loading for large datasets
- Optimize bundle size with code splitting

### Backend Optimization
- Use database indexes for frequently queried fields
- Implement proper caching strategies
- Use connection pooling
- Optimize SQL queries

### Database Optimization
- Create indexes for filter columns
- Use PostGIS for geospatial queries
- Implement proper foreign key constraints
- Regular database maintenance

## Security Considerations

### Frontend Security
- Validate all user inputs
- Sanitize data before display
- Use HTTPS in production
- Implement proper authentication

### Backend Security
- Validate all API inputs
- Use parameterized queries
- Implement rate limiting
- Secure database connections

### Data Protection
- Encrypt sensitive data
- Implement proper access controls
- Regular security audits
- Follow data privacy regulations

## Deployment

### Frontend Deployment
- Build optimization for production
- Environment variable configuration
- CDN setup for static assets
- Error monitoring setup

### Backend Deployment
- Docker containerization
- Environment configuration
- Database migration scripts
- Health check endpoints

### Monitoring
- Application performance monitoring
- Error tracking and alerting
- Database performance monitoring
- User analytics

## Contributing

### Code Review Process
1. All changes require review
2. Focus on code quality and performance
3. Ensure tests are included
4. Update documentation as needed

### Pull Request Guidelines
- Clear description of changes
- Link to related issues
- Include screenshots for UI changes
- Ensure all tests pass

### Issue Reporting
- Use clear, descriptive titles
- Include steps to reproduce
- Provide environment details
- Include relevant logs or screenshots

## Resources

### Documentation
- [Filter System Documentation](./filter-system.md)
- [API Endpoints Documentation](./api-endpoints.md)
- [API Client Documentation](./api-client.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Flask Documentation](https://flask.palletsprojects.com)
- [PostGIS Documentation](https://postgis.net/documentation)

### Tools
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/documentation)
