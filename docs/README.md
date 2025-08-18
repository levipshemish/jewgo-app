# JewGo App Documentation

## Overview

JewGo is a comprehensive kosher restaurant discovery and management platform that helps users find kosher restaurants, bakeries, and other food establishments. The platform includes advanced filtering, location-based search, comprehensive kosher supervision information, and a complete ordering system.

## 🚀 Quick Start

### Prerequisites
- Node.js 22.x
- Python 3.11.8+
- PostgreSQL database
- Google Places API key
- Cloudinary account

### Development Setup
```bash
# Clone the repository
git clone https://github.com/mml555/jewgo-app.git
cd jewgo-app

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup
cd ../backend
python3 -m venv venv_py311
source venv_py311/bin/activate
pip install -r requirements.txt
python app.py
```

## 📁 Documentation Structure

### [Deployment](./deployment/README.md)
- Render deployment configuration
- Vercel frontend deployment
- Neon database setup
- Environment configuration
- Troubleshooting guides

### [Development](./development/README.md)
- Development environment setup
- Architecture overview
- Contributing guidelines
- Code standards
- Performance optimization

### [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- **Mandatory global rule**: Test, commit, and push workflow
- Automated testing and deployment script
- Code quality enforcement
- Team collaboration guidelines

### [MCP Standards](./MCP_STANDARDS.md)
- **Model Context Protocol (MCP) integration**
- TypeScript/ESLint validation tools
- Schema drift detection
- CI guard and health checks
- Performance monitoring and budgets

### [API](./api/README.md)
- API endpoints documentation
- Authentication
- Request/response formats
- Error handling
- Health check endpoints

### [Database](./database/README.md)
- Database schema
- Migration guides
- Data management
- Backup procedures
- Performance optimization

### [Features](./features/README.md)
- ORB scraper system
- Advanced filtering
- Authentication system
- Order system
- Monitoring and health checks
- Error boundary system

### [Maintenance](./maintenance/README.md)
- Data cleanup procedures
- Update processes
- System maintenance
- Performance optimization
- Monitoring setup

### [Testing](./testing/README.md)
- Testing strategies
- Unit testing
- Integration testing
- E2E testing
- Performance testing

### [Security](./security/README.md)
- Security best practices
- Authentication
- Authorization
- Data protection
- API security

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 15.4.5 with TypeScript 5.0.0
- **Styling**: Tailwind CSS 3.3.0
- **State Management**: React hooks and Context API
- **Maps**: Google Maps API with Leaflet integration
- **Authentication**: Supabase Auth (Email/Password, Google OAuth, Magic Links)
- **Validation**: Zod schema validation
- **Testing**: Jest 30.0.5, React Testing Library 16.3.0

### Backend
- **Framework**: Flask 3.1.0 (Python 3.11.8)
- **Database**: PostgreSQL with SQLAlchemy 2.0.36
- **ORM**: SQLAlchemy 2.0
- **API**: RESTful endpoints with comprehensive error handling
- **Scraping**: ORB data integration
- **Testing**: Pytest 8.3.4
- **Monitoring**: Sentry SDK 2.19.2

### Infrastructure
- **Frontend Deployment**: Vercel
- **Backend Deployment**: Render
- **Database**: Neon PostgreSQL
- **CDN**: Cloudinary for image optimization
- **Monitoring**: Sentry error tracking
- **CI/CD**: GitHub Actions

## 🔧 Key Features

### Restaurant Discovery
- Advanced filtering by kosher type, certifying agency, location
- Map-based search with distance calculations
- Real-time availability and hours
- User reviews and ratings
- Location-based recommendations

### Order System
- Complete ordering functionality
- Menu selection and customization
- Payment processing options
- Delivery and pickup options
- Order tracking and confirmation

### Kosher Information
- Comprehensive kosher supervision details
- Chalav Yisroel, Pas Yisroel, Glatt kosher flags
- Certifying agency information
- Kosher certificate links
- Kosher category validation

### User Experience
- Mobile-responsive design
- Error boundary system with recovery
- Loading states and skeleton screens
- Form validation with real-time feedback
- Favorites system
- Add new restaurant submissions

### Performance & Monitoring
- Bundle optimization and code splitting
- Image optimization with Cloudinary
- Performance monitoring with Lighthouse
- Error tracking with Sentry
- Health check endpoints

## 📊 Current Status

- **Total Restaurants**: 107+
- **Dairy Restaurants**: 99+
- **Pareve Restaurants**: 8+
- **Chalav Yisroel**: 104+
- **Pas Yisroel**: 22+
- **Order System**: ✅ Complete
- **Error Boundaries**: ✅ Implemented
- **Loading States**: ✅ Implemented
- **Form Validation**: ✅ Implemented

## 🔗 Quick Links

- [Live Application](https://jewgo-app.vercel.app)
- [Backend API](https://jewgo.onrender.com)
- [GitHub Repository](https://github.com/mml555/jewgo-app)
- [API Health Check](https://jewgo.onrender.com/health)

## 📞 Support

For questions or issues:
- Check the [troubleshooting guide](./TROUBLESHOOTING_GUIDE.md)
- Review [maintenance procedures](./maintenance/README.md)
- Check [deployment guides](./deployment/README.md)
- Open an issue on GitHub

## 🧪 Testing

### Current Testing Status
- **Unit Tests**: ✅ Framework ready
- **Integration Tests**: ✅ Framework ready
- **E2E Tests**: ✅ Framework ready
- **Performance Tests**: ✅ Framework ready

### Running Tests
```bash
# Frontend tests
cd frontend
npm run test:coverage

# Backend tests
cd backend
pytest --cov=backend tests/
```

---

*Last updated: August 2024* 