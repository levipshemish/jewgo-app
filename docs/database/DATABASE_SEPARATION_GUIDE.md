# Database Separation Architecture Guide

## Overview

The JewGo application uses a **dual-database architecture** to separate authentication from application data, providing better security, scalability, and maintainability.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   PostgreSQL    │
│   (Next.js)     │    │   (Auth Only)   │    │   (App Data)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • User Login    │───▶│ • User Auth     │    │ • Restaurants   │
│ • OAuth Flow    │    │ • Sessions      │    │ • Reviews       │
│ • Middleware    │    │ • User Profiles │    │ • Business Data │
│ • Auth State    │    │ • JWT Tokens    │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Responsibilities

### 🔐 Supabase Database (Authentication)
**Purpose**: User authentication and session management only

**Stores**:
- User accounts and profiles
- Authentication sessions
- OAuth provider data (Google, Apple)
- JWT tokens and refresh tokens
- User metadata and preferences

**Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Frontend Usage**:
```typescript
// Authentication only
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get user session
const { data: { user } } = await supabase.auth.getUser();
```

### 🗄️ PostgreSQL Database (Application Data)
**Purpose**: All application business logic and data

**Stores**:
- Restaurant information
- User reviews and ratings
- Business data and analytics
- Application configuration
- Audit logs and system data

**Environment Variables**:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

**Backend Usage**:
```python
# Application data only
DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# Query restaurants, reviews, etc.
session.query(Restaurant).all()
```

## Configuration Validation

### ✅ Correct Configuration
```bash
# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Data (PostgreSQL)
DATABASE_URL=postgresql://app_user:password@141.148.50.111:5432/app_db
```

### ❌ Incorrect Configuration
```bash
# WRONG: Using database connection for auth
NEXT_PUBLIC_SUPABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# WRONG: Using Supabase for application data
DATABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co
```

## Security Benefits

### 1. **Separation of Concerns**
- Authentication data isolated from business data
- Different security policies for each database
- Reduced attack surface

### 2. **Access Control**
- Supabase handles auth with built-in security
- PostgreSQL can have stricter access controls
- Different backup and recovery strategies

### 3. **Scalability**
- Auth can scale independently of application data
- Different performance optimization strategies
- Independent maintenance windows

## Implementation Details

### Frontend Authentication Flow
1. User signs in through Supabase Auth
2. Supabase returns JWT token
3. Token stored in httpOnly cookies
4. Middleware validates token with Supabase
5. User ID passed to backend for data queries

### Backend Data Flow
1. Backend receives authenticated requests
2. Validates user ID from Supabase token
3. Queries PostgreSQL for application data
4. Returns data to frontend
5. No direct database access from frontend

### User ID Synchronization
```typescript
// Frontend gets user ID from Supabase
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;

// Backend uses user ID for data queries
const userReviews = await db.query(
  "SELECT * FROM reviews WHERE user_id = $1", 
  [userId]
);
```

## Monitoring and Maintenance

### Health Checks
```bash
# Validate configuration
./scripts/validate-db-separation.sh

# Check Supabase auth status
curl https://your-project.supabase.co/auth/v1/health

# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Backup Strategy
- **Supabase**: Automatic backups managed by Supabase
- **PostgreSQL**: Manual backups to Oracle Cloud storage
- **Different schedules**: Auth data vs business data

### Performance Monitoring
- **Supabase**: Built-in analytics and monitoring
- **PostgreSQL**: Custom monitoring with connection pooling
- **Separate metrics**: Auth performance vs data performance

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Check Supabase configuration
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
curl https://your-project.supabase.co/auth/v1/health
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Verify DATABASE_URL format
echo $DATABASE_URL
```

#### 3. Configuration Conflicts
```bash
# Run validation script
./scripts/validate-db-separation.sh
```

### Migration Scenarios

#### From Single Database to Dual Database
1. Set up Supabase project
2. Configure environment variables
3. Migrate user data to Supabase
4. Update application code
5. Test authentication flow
6. Deploy with new configuration

#### From Supabase-Only to Dual Database
1. Set up PostgreSQL database
2. Migrate application data
3. Update backend configuration
4. Keep Supabase for auth only
5. Test data access
6. Deploy with separation

## Best Practices

### 1. **Environment Management**
- Use different environment variables for each database
- Validate configuration on startup
- Document configuration requirements

### 2. **Error Handling**
- Handle auth failures gracefully
- Provide fallback for database issues
- Log errors with appropriate context

### 3. **Testing**
- Test authentication flow independently
- Test data access independently
- Integration tests for combined flows

### 4. **Security**
- Never expose database credentials to frontend
- Use connection pooling for PostgreSQL
- Implement proper CORS policies
- Regular security audits

## Conclusion

The dual-database architecture provides:
- ✅ **Better Security**: Isolated authentication and data
- ✅ **Improved Scalability**: Independent scaling of services
- ✅ **Enhanced Maintainability**: Clear separation of concerns
- ✅ **Flexible Deployment**: Different hosting strategies possible

This architecture follows industry best practices and provides a solid foundation for the JewGo application's growth and security requirements.
