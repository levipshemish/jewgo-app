# Frontend Migration Guide: Supabase to PostgreSQL Authentication

## 🎯 **Overview**

This guide will help you migrate your Next.js frontend from Supabase authentication to the new PostgreSQL-based authentication system. The new system provides the same functionality but with full control over your authentication data.

## 📋 **Prerequisites**

- ✅ Backend authentication system is running and tested
- ✅ New authentication endpoints are working
- ✅ You have admin access to the new system

## 🔄 **Migration Steps**

### **Step 1: Update Environment Variables**

Remove Supabase environment variables and add the new backend URL:

```bash
# Remove these from .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Add this (if not already present)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8082
```

### **Step 2: Create New Authentication Service**

Create a new authentication service to replace Supabase auth:

```typescript
// lib/auth-service.ts
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  is_verified: boolean;
  roles: string[];
  created_at: string;
  last_login_at?: string;
}

export interface LoginResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

class AuthService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8082';
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    }
  }

  private clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.accessToken = null;
      this.refreshToken = null;
    }
  }

  async register(data: RegisterData): Promise<AuthUser> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    return result.user;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    this.saveTokens(result.data.access_token, result.data.refresh_token);
    return result.data;
  }

  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${this.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.clearTokens();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          await this.refreshAccessToken();
          return this.getCurrentUser();
        }
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const result = await response.json();
      this.saveTokens(result.data.access_token, this.refreshToken);
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearTokens();
      return false;
    }
  }

  async getUserRole(): Promise<string[] | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/user-role`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.getUserRole();
        }
        return null;
      }

      const result = await response.json();
      return result.data.roles;
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const authService = new AuthService();
```

### **Step 3: Update Authentication Context**

Replace your Supabase auth context with the new one:

```typescript
// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, authService } from '@/lib/auth-service';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Check user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (data: any) => {
    try {
      const newUser = await authService.register(data);
      // Optionally auto-login after registration
      // await login(data.email, data.password);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    await checkUser();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### **Step 4: Update Login Component**

Replace Supabase login with the new authentication:

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/dashboard'); // or wherever you want to redirect
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

### **Step 5: Update Registration Component**

```typescript
// components/RegisterForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });
      
      // Redirect to login or auto-login
      router.push('/login');
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          Username (optional)
        </label>
        <input
          type="text"
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
```

### **Step 6: Update Protected Routes**

Replace Supabase auth checks with the new system:

```typescript
// components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && requiredRoles) {
      const hasRequiredRole = requiredRoles.some(role => 
        user.roles.includes(role)
      );
      
      if (!hasRequiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, requiredRoles, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requiredRoles && !requiredRoles.some(role => user.roles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}
```

### **Step 7: Update API Calls**

Replace Supabase client calls with the new authentication headers:

```typescript
// lib/api.ts
import { authService } from './auth-service';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const accessToken = authService.getAccessToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Token expired, try to refresh
    const refreshed = await authService.refreshAccessToken();
    if (refreshed) {
      // Retry the request with new token
      const newToken = authService.getAccessToken();
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${newToken}`,
      };
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, config);
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
  }

  return response;
}
```

## 🧹 **Cleanup Steps**

### **Remove Supabase Dependencies**

```bash
# Remove Supabase packages
npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react

# Remove Supabase configuration files
rm -rf .env.local.supabase
rm -rf supabase/
```

### **Update package.json**

Remove any Supabase-related scripts or dependencies.

### **Clean Up Imports**

Search your codebase for and remove:
- `@supabase/supabase-js`
- `@supabase/auth-helpers-nextjs`
- `@supabase/auth-helpers-react`
- `createClientComponentClient`
- `createServerComponentClient`

## 🧪 **Testing Checklist**

- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens are stored correctly
- [ ] Protected routes work
- [ ] Token refresh works
- [ ] Logout works
- [ ] Role-based access control works
- [ ] API calls include authentication headers

## 🚀 **Deployment Notes**

1. **Update environment variables** in production
2. **Ensure backend is accessible** from your frontend domain
3. **Configure CORS** on the backend if needed
4. **Test authentication flow** in production environment

## 🔧 **Troubleshooting**

### **Common Issues**

1. **CORS errors**: Ensure backend CORS is configured for your frontend domain
2. **Token not found**: Check localStorage and token storage logic
3. **Session expired**: Verify token refresh logic is working
4. **Role access denied**: Check user roles in the database

### **Debug Tips**

1. Check browser console for authentication errors
2. Verify JWT tokens in localStorage
3. Check network requests for authentication headers
4. Verify backend authentication endpoints are responding

## 📚 **Next Steps**

After completing the frontend migration:

1. **Test thoroughly** in development
2. **Deploy to staging** and test
3. **Deploy to production**
4. **Monitor authentication logs**
5. **Remove old Supabase code** completely

## 🎉 **Migration Complete!**

You now have full control over your authentication system with:
- ✅ Custom user management
- ✅ Role-based access control
- ✅ JWT token management
- ✅ Session management
- ✅ No external dependencies

Your authentication system is now completely self-contained and ready for production use!
