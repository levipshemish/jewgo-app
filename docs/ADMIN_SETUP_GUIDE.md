# JewGo Admin User Setup Guide

This guide provides instructions for creating the admin user `Admin@jewgo.app` with password `Jewgo123!` in the JewGo application.

## What Has Been Created

✅ **Admin Setup Script**: `/frontend/scripts/setup-admin-production.ts`
- Referenced in package.json with npm scripts
- Handles user creation, role assignment, and verification
- Includes proper rate limiting and error handling

✅ **API Testing Scripts**:
- `create-admin-user.js` - Full API testing script
- `create-admin-careful.js` - Rate-limit aware version

## Current Status

The user creation infrastructure is complete, but API rate limiting prevents immediate execution. Here are the alternative approaches:

## Method 1: Using the Web Interface (Recommended)

1. **Navigate to the JewGo registration page**
   - Go to: https://jewgo.app/auth/register
   - Or use your local development URL

2. **Register the admin user**:
   - Email: `Admin@jewgo.app`
   - Password: `Jewgo123!` (note the exclamation mark for special character requirement)
   - Name: `JewGo Administrator`
   - Accept terms and conditions

3. **Complete email verification** (if required)

4. **Assign admin role** (see SQL section below)

## Method 2: Direct API Call (When Rate Limits Reset)

Wait for API rate limits to reset (typically 1-2 hours), then use:

```bash
# Step 1: Get CSRF token
curl -X GET https://api.jewgo.app/api/v5/auth/csrf \
  -H "User-Agent: JewGo-Admin-Creator/1.0" \
  -c cookies.txt

# Step 2: Extract token and create user
CSRF_TOKEN=$(curl -s -X GET https://api.jewgo.app/api/v5/auth/csrf \
  -H "User-Agent: JewGo-Admin-Creator/1.0" \
  -c cookies.txt | jq -r '.data.csrf_token')

curl -X POST https://api.jewgo.app/api/v5/auth/register \
  -H "Content-Type: application/json" \
  -H "User-Agent: JewGo-Admin-Creator/1.0" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{
    "email": "admin@jewgo.app",
    "password": "Jewgo123!",
    "name": "JewGo Administrator",
    "terms_accepted": true
  }'
```

## Method 3: Using NPM Scripts (Future)

Once rate limits reset, you can use the built-in scripts:

```bash
# Navigate to frontend directory
cd frontend

# Create super admin
npm run admin:create-super-admin admin@jewgo.app "JewGo Administrator"

# Verify admin access
npm run admin:verify

# Test admin access
npm run admin:test admin@jewgo.app
```

## Admin Role Assignment (Required for All Methods)

After creating the user account, you must assign the admin role using SQL:

### Connect to PostgreSQL Database

1. **Access your PostgreSQL database** using your preferred method:
   - psql command line
   - pgAdmin
   - Database management tool

2. **Execute the following SQL**:

```sql
-- First, find the user ID (if you don't know it)
SELECT id, email, name FROM users WHERE email = 'admin@jewgo.app';

-- Assign super_admin role (replace USER_ID with actual ID from above query)
INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)
VALUES ('USER_ID_HERE', 'super_admin', 100, NOW(), 'system', TRUE)
ON CONFLICT (user_id, role) 
DO UPDATE SET 
  level = EXCLUDED.level,
  granted_at = EXCLUDED.granted_at,
  is_active = TRUE;

-- Verify the role assignment
SELECT u.email, ur.role, ur.level, ur.granted_at, ur.is_active
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@jewgo.app';
```

### Example with Actual User ID

If the user ID is `abc123def456`, the SQL would be:

```sql
INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)
VALUES ('abc123def456', 'super_admin', 100, NOW(), 'system', TRUE)
ON CONFLICT (user_id, role) 
DO UPDATE SET 
  level = EXCLUDED.level,
  granted_at = EXCLUDED.granted_at,
  is_active = TRUE;
```

## Verification Steps

After completing the setup:

### 1. Test Authentication

```bash
curl -X POST https://api.jewgo.app/api/v5/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@jewgo.app",
    "password": "Jewgo123!"
  }'
```

Expected response should include `"success": true` and user data with admin roles.

### 2. Test Admin API Access

Get an access token from the login response, then:

```bash
curl -X GET https://api.jewgo.app/api/v5/admin/health/system \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Use Built-in Verification

```bash
npm run admin:test admin@jewgo.app
```

## Password Requirements

The password `Jewgo123!` meets all requirements:
- ✅ At least 8 characters long
- ✅ Contains uppercase letter (J)
- ✅ Contains lowercase letters (ewgo)
- ✅ Contains number (123)
- ✅ Contains special character (!)

## Admin Permission Levels

The JewGo system has 4 admin levels:

1. **super_admin** (level 100) - Full system access
2. **system_admin** (level 50) - System management, user management
3. **data_admin** (level 25) - Content and data management
4. **moderator** (level 10) - Content moderation

The created user will have `super_admin` privileges.

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Wait 1-2 hours and try again
2. **CSRF Errors**: Get a fresh CSRF token
3. **Password Validation**: Ensure password has all required character types
4. **User Already Exists**: Check if user exists, then just assign roles

### Check User Status

```sql
-- Check if user exists
SELECT id, email, name, email_verified, failed_login_attempts, locked_until
FROM users 
WHERE email = 'admin@jewgo.app';

-- Check user roles
SELECT u.email, ur.role, ur.level, ur.is_active, ur.granted_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@jewgo.app';
```

### Unlock Account (if needed)

```sql
-- Reset failed login attempts and unlock account
UPDATE users 
SET failed_login_attempts = 0, locked_until = NULL
WHERE email = 'admin@jewgo.app';
```

## Security Notes

1. **Change Password**: After setup, consider changing the password through the admin interface
2. **Email Verification**: Complete email verification if enabled
3. **Audit Trail**: All admin actions are logged for security
4. **Session Management**: Admin sessions have enhanced security controls

## Next Steps After Setup

1. **Login to Admin Panel**: Access `/admin` on your frontend
2. **Configure System Settings**: Use admin interface to configure the application
3. **Create Additional Admins**: Use the admin interface to create more admin users
4. **Review Security Settings**: Audit admin access and permissions

---

**Setup Status**: ✅ Infrastructure Complete, ⏳ Awaiting Manual Execution
**Created**: September 15, 2025
**Scripts Location**: `/frontend/scripts/setup-admin-production.ts`