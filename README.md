# JewGo - Kosher Restaurant Discovery Platform

A comprehensive platform for discovering and reviewing kosher restaurants, synagogues, and Jewish community resources.

## 🚀 Recent Updates (August 2025)

### ✅ **Admin System - Production Ready**

- **✅ Complete Supabase Integration**: Fully migrated admin system from Prisma to Supabase
- **✅ Role-Based Access Control (RBAC)**: Implemented 4-tier admin role system (super_admin, system_admin, data_admin, moderator)
- **✅ Row Level Security (RLS)**: Database-level security policies for admin tables
- **✅ Admin Management Scripts**: Complete set of npm scripts for admin user management
- **✅ Super Admin Setup**: admin@jewgo.app configured as super admin with full privileges
- **✅ Production Verification**: All admin functions tested and verified working

### 🔧 **Technical Improvements**

- **Supabase Migration**: Complete admin system migration from PostgreSQL to Supabase
- **Admin Functions**: Database functions for role management (`get_user_admin_role`, `assign_admin_role`)
- **Security Enhancements**: RLS policies, secure metadata storage, service role integration
- **Management Tools**: Comprehensive admin verification and testing scripts

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Admin System](#admin-system)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### 🍽️ Restaurant Management
- **Comprehensive Restaurant Database**: Kosher restaurants with detailed information
- **Advanced Search & Filtering**: Find restaurants by location, cuisine, kosher certification
- **User Reviews & Ratings**: Community-driven reviews and ratings system
- **Hours & Specials**: Real-time hours and special offers
- **Map Integration**: Interactive maps with restaurant locations

### 🏛️ Synagogue Directory
- **Florida Synagogue Database**: Comprehensive directory of synagogues
- **Location Services**: Find nearby synagogues and prayer times
- **Community Information**: Contact details and community resources

### 👥 User Management
- **User Authentication**: Secure login with multiple providers (Google, Apple)
- **Profile Management**: User profiles with preferences and history
- **Review System**: User-generated reviews and ratings
- **Favorites**: Save favorite restaurants and synagogues

### 🔧 Admin System
- **Comprehensive Admin Dashboard**: Real-time system metrics and management tools
- **Database Management**: Manage restaurants, reviews, synagogues, and users
- **Audit Logging**: Complete audit trail of all admin actions
- **Role-Based Access Control**: Granular permissions for different admin functions
- **CSRF Protection**: Secure admin actions with CSRF token validation

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Supabase**: Authentication and real-time database
- **Prisma**: Database ORM
- **Google Maps API**: Location services

### Backend
- **Flask**: Python web framework
- **PostgreSQL**: Primary database
- **Redis**: Caching and rate limiting
- **Gunicorn**: WSGI server
- **Alembic**: Database migrations

### Infrastructure
- **Vercel**: Frontend deployment
- **Render**: Backend deployment
- **Supabase**: Database and authentication
- **Sentry**: Error monitoring
- **Google Analytics**: Analytics tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/jewgo-app.git
   cd jewgo-app
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

3. **Install dependencies**
   ```bash
   # Frontend dependencies
   cd frontend
   npm install
   
   # Backend dependencies
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Set up database**
   ```bash
   # Run database migrations
   cd backend
   python -m alembic upgrade head
   ```

5. **Start development servers**
   ```bash
   # Start backend (from backend directory)
   python app.py
   
   # Start frontend (from frontend directory)
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000/admin

## 🏗️ Development

### Project Structure

```
jewgo-app/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App Router pages and components
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility libraries and configurations
│   ├── prisma/              # Database schema and migrations
│   └── public/              # Static assets
├── backend/                 # Flask backend application
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── database/            # Database models and repositories
│   └── utils/               # Utility functions
├── docs/                    # Project documentation
├── scripts/                 # Development and deployment scripts
└── supabase/                # Supabase configuration
```

### Development Commands

```bash
# Frontend development
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check

# Backend development
cd backend
python app.py        # Start development server
pytest               # Run tests
black .              # Format code
flake8               # Lint code

# Database management
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database (development only)
```

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Backend (.env)
```bash
DATABASE_URL=postgresql://...
FLASK_ENV=development
SECRET_KEY=your-secret-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🚀 Deployment

### Frontend (Vercel)

1. **Connect repository to Vercel**
2. **Configure environment variables**
3. **Deploy automatically on push to main**

### Backend (Render)

1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Set environment variables**
4. **Deploy automatically**

### Database (Supabase)

1. **Create Supabase project**
2. **Run database migrations**
3. **Configure authentication**
4. **Set up admin users**

For detailed deployment instructions, see [Deployment Guide](docs/DEPLOYMENT_GUIDE.md).

## 🔧 Admin System

### Overview

The admin system provides comprehensive administrative capabilities for managing the JewGo platform with full Supabase integration, role-based access control, and secure authentication.

### ✅ **Status: Production Ready**

The admin system is fully implemented and functional with:
- **4-Tier Role System**: super_admin, system_admin, data_admin, moderator
- **Supabase Integration**: Complete migration from Prisma to Supabase
- **Row Level Security**: Database-level access control policies
- **Management Scripts**: Comprehensive admin user management tools

### Features

- **Dashboard**: Real-time system metrics and overview
- **Restaurant Management**: Manage restaurant listings and details
- **Review Moderation**: Moderate user reviews and ratings
- **User Management**: Manage user accounts and permissions
- **Synagogue Directory**: Manage synagogue listings
- **Audit Logging**: Complete audit trail of all admin actions

### Access

- **URL**: `/admin`
- **Authentication**: Requires admin role in Supabase
- **Security**: CSRF token protection for all actions

### Quick Setup

1. **Verify admin system**
   ```bash
   cd frontend
   npm run admin:verify
   ```

2. **Create super admin** (Manual SQL method)
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{is_super_admin}', 'true'::jsonb
   ) WHERE email = 'your-email@example.com';
   ```

3. **Test admin access**
   ```bash
   npm run admin:test your-email@example.com
   ```

### Admin Management Commands

```bash
# Verify system setup
npm run admin:verify

# List all admin users
npm run admin:list

# Create super admin (provides SQL instructions)
npm run admin:create-super-admin <email> "<name>"

# Assign admin role
npm run admin:assign-role <email> <role>

# Test admin access
npm run admin:test <email>
```

For detailed admin system documentation, see [Admin Roles Production Setup](docs/setup/ADMIN_ROLES_PRODUCTION_SETUP.md).

## 📚 API Documentation

### REST API Endpoints

#### Restaurants
- `GET /api/restaurants` - List restaurants
- `GET /api/restaurants/{id}` - Get restaurant details
- `POST /api/restaurants` - Create restaurant (admin)
- `PUT /api/restaurants/{id}` - Update restaurant (admin)

#### Reviews
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/{id}` - Update review
- `DELETE /api/reviews/{id}` - Delete review

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/admin/users` - List users (admin)

#### Synagogues
- `GET /api/synagogues` - List synagogues
- `GET /api/synagogues/{id}` - Get synagogue details

### Admin API Endpoints

- `GET /api/admin/csrf` - Generate CSRF token
- `GET /api/admin/restaurants` - Manage restaurants
- `GET /api/admin/reviews` - Moderate reviews
- `GET /api/admin/synagogues` - Manage synagogues
- `GET /api/admin/users` - Manage users

For complete API documentation, see [API Documentation](docs/api/).

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Run tests and linting**
5. **Submit a pull request**

### Code Standards

- **Frontend**: ESLint + Prettier, TypeScript strict mode
- **Backend**: Black + Flake8, type hints
- **Testing**: Jest (frontend), pytest (backend)
- **Commits**: Conventional Commits format

### Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest

# End-to-end tests
npm run test:e2e
```

For detailed contributing guidelines, see [Contributing Guide](docs/CONTRIBUTING.md).

## 🔍 Troubleshooting

### Common Issues

#### Admin System Issues

1. **500 Internal Server Error on Admin Page**
   ```bash
   # Check environment variables
   npm run env:check
   
   # Clear build cache
   rm -rf .next && npm run build
   ```

2. **CSRF Token Errors**
   ```bash
   # Verify CSRF route exists
   ls frontend/app/api/admin/csrf/route.ts
   ```

3. **Database Query Errors**
   ```bash
   # Test database connection
   npm run db:test
   ```

#### Build Issues

1. **Webpack Module Errors**
   ```bash
   # Clear all caches
   rm -rf .next node_modules/.cache
   npm install
   ```

2. **TypeScript Errors**
   ```bash
   # Run type check
   npm run type-check
   ```

#### Deployment Issues

1. **Environment Variables**
   ```bash
   # Validate environment
   npm run env:check
   ```

2. **Database Connection**
   ```bash
   # Test database connectivity
   curl -X GET "https://your-backend.onrender.com/health"
   ```

For comprehensive troubleshooting, see [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md).

## 📊 Monitoring & Analytics

### Health Checks

- **Frontend**: `GET /healthz`
- **Backend**: `GET /health`
- **Database**: `GET /health/db`
- **Admin System**: `GET /api/admin/health`

### Error Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior analytics
- **Custom Logging**: Application-specific logging

### Performance Monitoring

- **Response Times**: API endpoint performance
- **Database Queries**: Query performance and optimization
- **User Experience**: Frontend performance metrics

## 🔒 Security

### Authentication

- **Supabase Auth**: Secure user authentication
- **OAuth Providers**: Google, Apple integration
- **Session Management**: Secure session handling

### Authorization

- **Role-Based Access Control**: Granular permissions
- **Admin System**: Secure admin authentication
- **API Security**: Rate limiting and validation

### Data Protection

- **Input Validation**: Comprehensive input sanitization
- **CSRF Protection**: CSRF token validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Content Security Policy

## 📈 Performance

### Optimization

- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Next.js Image component
- **Caching**: Redis caching for API responses
- **Database Indexing**: Optimized database queries

### Monitoring

- **Performance Metrics**: Response times and throughput
- **Resource Usage**: Memory and CPU monitoring
- **User Experience**: Core Web Vitals tracking

## 📞 Support

### Getting Help

1. **Documentation**: Check the `/docs` directory
2. **Issues**: Create a GitHub issue with detailed information
3. **Discussions**: Use GitHub Discussions for questions
4. **Email**: Contact the development team

### Issue Reporting

When reporting issues, include:

- **Error Details**: Full error messages and stack traces
- **Environment**: OS, Node.js version, database version
- **Steps to Reproduce**: Detailed reproduction steps
- **Expected vs Actual**: What you expected vs what happened
- **Screenshots**: Visual evidence of the issue
- **Logs**: Relevant application and system logs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase**: Authentication and database services
- **Vercel**: Frontend deployment platform
- **Render**: Backend deployment platform
- **Google Maps**: Location services
- **Open Source Community**: Various open source libraries and tools

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅
