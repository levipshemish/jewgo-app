# Authentication System Implementation Guide

## Overview

JewGo now has a comprehensive authentication system that supports both **Supabase Auth** (primary) and **NextAuth.js** (fallback) across the entire application. This guide explains the implementation, configuration, and usage.

## 🔐 **Authentication Architecture**

### **Dual System Approach**
- **Primary**: Supabase Auth with email/password and Google OAuth
- **Fallback**: NextAuth.js for compatibility and redundancy
- **Unified Interface**: Single auth utilities that work with both systems

### **Key Components**

#### **1. Authentication Utilities** (`frontend/lib/auth.ts`)
```typescript
// Unified authentication functions
export async function getSessionUser() // Get current user from either system
export async function requireUser() // Require authentication, redirect if not
export async function requireAdmin() // Require admin privileges
export async function isAuthenticated() // Check auth status
export async function getUserProfile() // Get user profile data
```

#### **2. Supabase Clients**
- **Browser Client** (`frontend/lib/supabase/client.ts`): Client-side operations
- **Server Client** (`frontend/lib/supabase/server.ts`): Server-side operations
- **Middleware Client** (`frontend/lib/supabase/middleware.ts`): Middleware operations

#### **3. NextAuth Configuration** (`frontend/app/api/auth/[...nextauth]/route.ts`)
- Google OAuth provider
- Credentials provider
- Prisma adapter for database integration

## 🛡️ **Route Protection**

### **Middleware Protection** (`frontend/middleware.ts`)
The middleware applies security headers and verifies authentication for protected routes. Role checks are not performed here; they are enforced in route handlers.

```typescript
// Protected routes (require authentication)
const PROTECTED_PATHS = [
  "/profile", 
  "/favorites", 
  "/reviews",
  "/account",
  "/add-eatery"
];

// Admin routes (require admin privileges)
const ADMIN_PATHS = ["/admin"];
```

### **Page-Level Protection**
Individual pages can also implement client-side protection:

```typescript
// Example: favorites/page.tsx
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session) {
      router.push('/auth/signin?redirectTo=/favorites');
    }
  };
  checkAuth();
}, []);
```

## 🔧 **Configuration**

### **Environment Variables**

#### **Required for Supabase**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### **Required for NextAuth**
```bash
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### **Admin Configuration**
```bash
NEXT_PUBLIC_ADMIN_EMAIL=admin@jewgo.com
```

### **Database Setup**

#### **Supabase Database**
- User authentication handled by Supabase Auth
- User profiles stored in Supabase `auth.users` table
- Additional user data can be stored in custom tables

#### **NextAuth Database** (via Prisma)
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 🚀 **Usage Examples**

### **Server Components**
```typescript
import { requireUser, requireAdmin } from '@/lib/auth';

export default async function ProtectedPage() {
  // This will redirect to /auth/signin if not authenticated
  const user = await requireUser();
  
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Your email: {user.email}</p>
    </div>
  );
}

export default async function AdminPage() {
  // This will redirect to / if not admin
  const admin = await requireAdmin();
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {admin.name}!</p>
    </div>
  );
}
```

### **Client Components**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ClientProtectedComponent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Welcome, {user.email}!</div>;
}
```

### **Authentication Status Component**
```typescript
import AuthStatus from '@/components/auth/AuthStatus';

export default function Layout() {
  return (
    <div>
      <header>
        <AuthStatus />
      </header>
      {/* rest of layout */}
    </div>
  );
}
```

## 🔄 **Authentication Flow**

### **Sign In Flow**
1. User visits `/auth/signin`
2. Chooses authentication method (Supabase or NextAuth)
3. Enters credentials or uses Google OAuth
4. System validates credentials
5. Session is established
6. User is redirected to intended page or home

### **Sign Up Flow**
1. User visits `/auth/signup`
2. Chooses authentication method
3. Enters email, password, and confirms password
4. System validates input
5. Account is created
6. Email verification is sent (if required)
7. User is redirected to sign in

### **Protected Route Access**
1. User tries to access protected route
2. Middleware checks authentication status
3. If not authenticated, redirects to `/auth/signin`
4. After successful authentication, redirects back to original route

## 🛠️ **Development & Testing**

### **Testing Authentication**
```bash
# Test Supabase configuration
npm run test:supabase

# Test NextAuth configuration
npm run test:nextauth

# Test protected routes
npm run test:auth
```

### **Environment Setup**
```bash
# Copy environment template
cp frontend/env.example frontend/.env.local

# Fill in your configuration
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **Database Migrations**
```bash
# Run Prisma migrations for NextAuth
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## 🔒 **Security Considerations**

### **Password Requirements**
- Minimum 6 characters
- Password confirmation required
- Secure password hashing (handled by auth providers)

### **Session Management**
- Secure session tokens
- Automatic token refresh
- Session expiration handling

### **Admin Access**
- Email-based admin verification
- Configurable admin email list
- Secure admin route protection

### **OAuth Security**
- Secure OAuth flow
- Proper redirect URI validation
- Token storage security

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Authentication Not Working**
- Check environment variables
- Verify Supabase/NextAuth configuration
- Check browser console for errors
- Verify OAuth provider settings

#### **2. Protected Routes Not Working**
- Check middleware configuration
- Verify route paths in middleware

> Implementation Notes (Admin Flows)
> - CSRF: Admin layout generates a signed CSRF token on the server and exposes it via `window.__CSRF_TOKEN__`. Include it as `x-csrf-token` for POST/PUT/PATCH/DELETE to `/api/admin/*`. Alternatively, fetch from `/api/admin/csrf`.
> - RBAC: Do not rely on cookies in middleware for RBAC. Use `requireAdmin()` in route handlers; permissions derive from `ROLE_PERMISSIONS`.
- Check authentication status in browser

#### **3. Admin Access Issues**
- Verify admin email in environment
- Check admin route protection
- Verify user email matches admin list

#### **4. OAuth Errors**
- Check OAuth provider configuration
- Verify redirect URIs
- Check client ID and secret

### **Debug Commands**
```bash
# Check environment variables
npm run check:env

# Test authentication endpoints
npm run test:auth:endpoints

# Validate configuration
npm run validate:config
```

## 📚 **Additional Resources**

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Middleware Documentation](https://nextjs.org/docs/advanced-features/middleware)

## 🔄 **Migration Guide**

If you're migrating from a different authentication system:

1. **Backup existing user data**
2. **Set up new authentication providers**
3. **Migrate user accounts** (see migration scripts)
4. **Update application code**
5. **Test thoroughly**
6. **Deploy gradually**

See `docs/auth/MIGRATION_GUIDE.md` for detailed migration instructions.
