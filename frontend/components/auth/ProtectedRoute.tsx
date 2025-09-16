'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
  showLoading?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/auth/signin',
  showLoading = true,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const hasRoleRedirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      // Prevent infinite loops by checking current path and redirect state
      if (typeof window !== 'undefined' && 
          window.location.pathname !== redirectTo && 
          !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.push(redirectTo);
      }
    } else if (isAuthenticated()) {
      // Reset redirect flag when user becomes authenticated
      hasRedirectedRef.current = false;
    }
  }, [loading, isAuthenticated, router, redirectTo]);

  useEffect(() => {
    if (!loading && user && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => 
        user.roles.some(userRole => userRole.role === role)
      );
      
      if (!hasRequiredRole) {
        // Prevent infinite loops by checking current path and redirect state
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/unauthorized' && 
            !hasRoleRedirectedRef.current) {
          hasRoleRedirectedRef.current = true;
          router.push('/unauthorized');
        }
      } else {
        // Reset role redirect flag when user has required roles
        hasRoleRedirectedRef.current = false;
      }
    }
  }, [loading, user, requiredRoles, router]);

  // Show loading spinner while checking authentication
  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show loading spinner while redirecting
  if (!loading && !isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check role requirements
  if (!loading && user && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => 
      user.roles.some(userRole => userRole.role === role)
    );
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
  }

  // User is authenticated and has required roles (if any)
  return <>{children}</>;
}

// Convenience components for common role requirements
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'super_admin']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['super_admin']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function ModeratorRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['moderator', 'admin', 'super_admin']} {...props}>
      {children}
    </ProtectedRoute>
  );
}
