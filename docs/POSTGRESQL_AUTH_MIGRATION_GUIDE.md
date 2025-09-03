# 🚀 PostgreSQL Authentication Migration Guide

## Overview

This guide will help you migrate from Supabase authentication to a custom PostgreSQL-based authentication system. This gives you full control over your authentication, eliminates external dependencies, and provides better security.

## 🎯 What We're Building

- **Custom JWT Authentication**: Using your own PostgreSQL database
- **User Management**: Complete user registration, login, and role management
- **Session Management**: Secure JWT tokens with refresh capabilities
- **Role-Based Access Control**: Admin, moderator, and user roles
- **Security Features**: Password hashing, rate limiting, account locking

## 📋 Prerequisites

1. **PostgreSQL Database**: Either local or cloud-based (Oracle Cloud, AWS RDS, etc.)
2. **Python Environment**: Backend virtual environment with required packages
3. **Backend Access**: Ability to run backend scripts and restart services

## 🔧 Step 1: Configure Your PostgreSQL Database

### Option A: Use Your Existing Oracle Cloud PostgreSQL

You already have a PostgreSQL database at `141.148.50.111`. Update your `backend/config.env`:

```bash
# PostgreSQL Database Configuration
DATABASE_URL=postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require

# JWT Configuration
JWT_SECRET_KEY=your-super-secure-jwt-secret-here
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=604800
```

### Option B: Local PostgreSQL (Development)

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql postgresql-contrib  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database and user
sudo -u postgres psql
CREATE DATABASE jewgo_auth;
CREATE USER jewgo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jewgo_auth TO jewgo_user;
\q

# Update config.env
DATABASE_URL=postgresql://jewgo_user:your_password@localhost:5432/jewgo_auth
```

## 🚀 Step 2: Setup the Authentication System

### 2.1 Run the Setup Script

```bash
cd backend
python setup_auth_database.py
```

This script will:
- Create all necessary database tables
- Initialize default roles (user, moderator, admin, super_admin)
- Create your first admin user
- Verify the system is working

### 2.2 Expected Output

```
🚀 JewGo Authentication System Setup
==================================================
📊 Database URL: postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db...
✅ Database connection successful
✅ Database tables created successfully
✅ Default roles initialized successfully

👤 Admin User Setup
------------------------------
Admin email (default: admin@jewgo.com): 
Admin password (default: Admin123!): 

✅ Admin user created successfully

🎉 Authentication system setup completed!

📋 Next Steps:
1. Update your frontend to use the new authentication endpoints
2. Remove Supabase configuration from your environment
3. Test the new authentication system
4. Admin login: admin@jewgo.com / Admin123!
```

## 🔗 Step 3: Test the New Authentication System

### 3.1 Start Your Backend

```bash
cd backend
python app.py
```

### 3.2 Test the Health Endpoint

```bash
curl http://localhost:8082/api/auth/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "roles_count": 4,
    "users_count": 1,
    "timestamp": "2025-09-03T03:45:00.000000"
  }
}
```

### 3.3 Test User Registration

```bash
curl -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### 3.4 Test User Login

```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "roles": ["user"]
    },
    "access_token": "jwt-token-here",
    "refresh_token": "refresh-token-here",
    "expires_in": 3600,
    "refresh_expires_in": 604800
  }
}
```

### 3.5 Test Protected Endpoints

```bash
# Get current user info
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8082/api/auth/me

# Get user role (admin only)
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8082/api/auth/user-role
```

## 🔄 Step 4: Update Your Frontend

### 4.1 Remove Supabase Dependencies

```bash
cd frontend
npm uninstall @supabase/supabase-js @supabase/ssr
```

### 4.2 Update Authentication Configuration

Create a new authentication service that uses your backend endpoints instead of Supabase.

### 4.3 Update Environment Variables

Remove Supabase variables and add your backend URL:

```bash
# Remove these
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY

# Keep these
NEXT_PUBLIC_BACKEND_URL=http://localhost:8082
```

## 🧪 Step 5: Verify Everything Works

### 5.1 Test Complete Authentication Flow

1. **Register** a new user
2. **Login** with the user
3. **Access** protected endpoints
4. **Refresh** tokens
5. **Logout** the user

### 5.2 Test Admin Functions

1. **Login** as admin
2. **Access** admin-only endpoints
3. **Verify** role-based permissions

## 🔒 Security Considerations

### 5.1 JWT Secret

- **Change the default JWT secret** immediately after setup
- Use a strong, random secret (at least 32 characters)
- Store it securely in environment variables

### 5.2 Database Security

- **Use SSL connections** for production databases
- **Restrict database access** to only necessary IPs
- **Regular backups** of your authentication data

### 5.3 Rate Limiting

The system includes built-in rate limiting:
- Registration: 5 attempts per hour
- Login: 10 attempts per hour
- Token refresh: 20 attempts per hour
- General endpoints: 100 attempts per hour

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify `DATABASE_URL` is correct
   - Check database is running and accessible
   - Verify credentials and permissions

2. **Tables Not Created**
   - Ensure you have write permissions to the database
   - Check for any SQL errors in the logs

3. **Authentication Fails**
   - Verify JWT secret is set correctly
   - Check token expiration settings
   - Ensure user account is active

### Debug Commands

```bash
# Check database connection
cd backend
python -c "
from database.database_manager_v3 import EnhancedDatabaseManager
db = EnhancedDatabaseManager()
print('Connected:', db.connect())
"

# Check authentication tables
cd backend
python -c "
from database.auth_models import User, Role
from database.database_manager_v3 import EnhancedDatabaseManager
db = EnhancedDatabaseManager()
if db.connect():
    session = db.get_session()
    users = session.query(User).count()
    roles = session.query(Role).count()
    print(f'Users: {users}, Roles: {roles}')
    session.close()
"
```

## 📚 API Reference

### Authentication Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/auth/register` | POST | User registration | 5/hour |
| `/api/auth/login` | POST | User login | 10/hour |
| `/api/auth/refresh` | POST | Token refresh | 20/hour |
| `/api/auth/logout` | POST | User logout | 50/hour |
| `/api/auth/me` | GET | Current user info | 100/hour |
| `/api/auth/user-role` | GET | User role (admin) | 100/hour |
| `/api/auth/health` | GET | System health | No limit |
| `/api/auth/setup` | POST | Initial setup | 1/hour |

### Request/Response Examples

See the test commands above for detailed examples of each endpoint.

## 🎉 Migration Complete!

Once you've completed all steps:

1. ✅ **Authentication system** is running on your PostgreSQL database
2. ✅ **No more Supabase dependencies**
3. ✅ **Full control** over your authentication logic
4. ✅ **Better security** with custom JWT implementation
5. ✅ **Scalable architecture** that grows with your needs

## 🔮 Next Steps

1. **Customize** the authentication logic for your specific needs
2. **Add** additional security features (2FA, password policies, etc.)
3. **Integrate** with your existing user management systems
4. **Monitor** authentication metrics and security events
5. **Scale** the system as your user base grows

## 📞 Support

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review the backend logs for error messages
3. Verify all environment variables are set correctly
4. Test database connectivity independently
5. Ensure all required Python packages are installed

---

**Happy coding! 🚀**
