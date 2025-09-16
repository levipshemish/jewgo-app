# JewGo App

A comprehensive Jewish community platform providing location-based search and filtering for restaurants, synagogues, and mikvahs.

## 🚀 Features

### Core Functionality
- **Location-based Search** - Find Jewish establishments near you
- **Advanced Filtering** - Entity-specific filters for restaurants, synagogues, and mikvahs
- **Real-time Results** - Live filter previews and result counts
- **Responsive Design** - Mobile-first approach with modern UI

### Entity Types

#### 🍽️ Restaurants
- Kosher certification filtering
- Price range and rating filters
- Hours-based filtering (open now, morning, afternoon, evening, late night)
- Kosher details (Cholov Stam, Cholov Yisroel, Pas Yisroel)

#### 🕍 Synagogues
- Denomination filtering (Orthodox, Conservative, Reform, Reconstructionist)
- Shul type and category filtering
- Service availability (daily minyan, Shabbat services, holiday services)
- Facility filtering (parking, kiddush facilities, social hall, library, Hebrew school)

#### 🛁 Mikvahs
- Appointment requirements
- Status filtering (active, inactive, pending)
- Contact person filtering
- Facility and accessibility options

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **API Client**: Custom v5 API client with caching and retry logic

### Backend (Flask)
- **Framework**: Flask with Python
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Caching**: Redis for performance optimization
- **API**: RESTful v5 API with comprehensive filtering

### Key Components

#### Filter System
- `ModernFilterPopup` - Main filter modal component
- `FilterPreview` - Real-time result count display
- `ActiveFilterChips` - Applied filter management
- `useLazyFilterOptions` - Dynamic filter option loading

#### API Integration
- Entity-specific endpoints for restaurants, synagogues, and mikvahs
- Comprehensive filter options API
- Location-based search with PostGIS
- Caching and performance optimization

## 📁 Project Structure

```
jewgo-app/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   │   ├── eatery/          # Restaurant listings
│   │   ├── shuls/           # Synagogue listings
│   │   ├── mikvah/          # Mikvah listings
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── filters/         # Filter system components
│   │   ├── core/            # Core UI components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Utilities and hooks
│   │   ├── api/             # API client and configuration
│   │   ├── filters/         # Filter types and utilities
│   │   └── hooks/           # Custom React hooks
│   └── docs/                # Documentation
├── backend/                 # Flask backend application
│   ├── routes/              # API route definitions
│   ├── database/            # Database models and services
│   │   ├── services/        # Business logic services
│   │   └── repositories/    # Data access layer
│   ├── utils/               # Utility functions
│   └── tests/               # Backend tests
└── docs/                    # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- PostgreSQL with PostGIS extension
- Redis (optional, for caching)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Environment Variables
Create `.env.local` in the frontend directory:
```env
NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app
```

## 🔧 Development

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting (80 columns, 2 spaces, single quotes)
- **Testing**: Jest and Testing Library for frontend tests

### Backend Standards
- **Python**: Black formatting (88 columns), Ruff linting
- **Type Hints**: Required for all functions
- **Testing**: Pytest with coverage reporting
- **Documentation**: Comprehensive docstrings

### Git Workflow
- **Commits**: Conventional Commits format
- **Branches**: Direct push to main (no feature branches)
- **Testing**: All tests must pass before deployment

## 📊 API Documentation

### Endpoints
- `GET /api/v5/restaurants` - Restaurant listings with filtering
- `GET /api/v5/synagogues` - Synagogue listings with filtering
- `GET /api/v5/mikvahs` - Mikvah listings with filtering
- `GET /api/v5/{entity}/filter-options` - Available filter options

### Filter Parameters
All endpoints support:
- Location filtering (`latitude`, `longitude`, `radius`)
- Entity-specific filters (see entity documentation)
- Pagination (`page`, `limit`, `cursor`)
- Sorting options

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
```

### Backend Tests
```bash
cd backend
pytest                     # Run all tests
pytest --cov              # Run with coverage
pytest -m "not slow"      # Skip slow tests
```

### Test Categories
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load and stress testing

## 🚀 Deployment

### Production Environment
- **Frontend**: Vercel deployment
- **Backend**: VPS with Docker
- **Database**: Managed PostgreSQL with PostGIS
- **Caching**: Redis for session and data caching

### Environment Configuration
- Development: Local development with hot reloading
- Staging: Production-like environment for testing
- Production: Optimized for performance and reliability

## 📈 Performance

### Optimization Strategies
- **Caching**: Redis caching for API responses
- **Lazy Loading**: Filter options loaded on demand
- **Pagination**: Cursor-based pagination for large datasets
- **Geospatial**: PostGIS for efficient location queries
- **CDN**: Static asset delivery optimization

### Monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: API response time monitoring
- **User Analytics**: Usage pattern analysis
- **Health Checks**: Service availability monitoring

## 🤝 Contributing

### Development Guidelines
1. Follow the established code style and conventions
2. Write comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting
5. Use conventional commit messages

### Code Review Process
- All changes require review
- Focus on code quality, performance, and security
- Test coverage must be maintained or improved
- Documentation must be updated for user-facing changes

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Check the documentation in the `docs/` directory
- Review the API documentation
- Contact the development team

## 🔄 Changelog

### Recent Updates
- ✅ Implemented entity-specific filter system
- ✅ Added comprehensive filter options for all entity types
- ✅ Improved API documentation and type definitions
- ✅ Enhanced error handling and fallback systems
- ✅ Optimized performance with caching and lazy loading

### Upcoming Features
- 🔄 Advanced filter combinations
- 🔄 Saved filter presets
- 🔄 Real-time notifications
- 🔄 Enhanced mobile experience