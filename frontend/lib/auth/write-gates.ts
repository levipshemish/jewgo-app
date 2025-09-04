import React from 'react';
import { postgresAuth } from '@/lib/auth/postgres-auth';
import { generateCorrelationId, extractIsAnonymous } from '@/lib/utils/auth-utils';

export interface WritePermissionResult {
  allowed: boolean;
  error?: string;
  reason?: string;
  correlationId: string;
}

export interface UserPermissions {
  canWrite: boolean;
  canCreateReviews: boolean;
  canCreateFavorites: boolean;
  canCreateMarketplaceItems: boolean;
  canUpdateProfile: boolean;
  isAnonymous: boolean;
  userId?: string;
}

/**
 * Write Gates - Permission checks for protected operations
 * Ensures anonymous users cannot perform write operations
 */
export class WriteGates {
  /**
   * Check if user can perform write operations
   */
  async canWrite(): Promise<WritePermissionResult> {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if user is authenticated via PostgreSQL auth
      if (!postgresAuth.isAuthenticated()) {
        return {
          allowed: false,
          error: 'No authenticated user',
          reason: 'User must be signed in to perform write operations',
          correlationId
        };
      }

      // Get user profile to check permissions
      const user = await postgresAuth.getProfile();
      
      if (!user) {
        return {
          allowed: false,
          error: 'Failed to get user profile',
          correlationId
        };
      }

      // Check if user is anonymous (guest account)
      const isAnonymous = extractIsAnonymous(user);
      if (isAnonymous) {
        return {
          allowed: false,
          error: 'Anonymous users cannot perform write operations',
          reason: 'Please upgrade your account to perform this action',
          correlationId
        };
      }

      // For PostgreSQL auth, we assume email is verified if user exists
      // You can add additional verification logic here if needed

      return {
        allowed: true,
        correlationId
      };

    } catch (error) {
      console.error(`[Write Gates] Unexpected error (${correlationId})`, error);
      return {
        allowed: false,
        error: 'Unexpected error checking permissions',
        correlationId
      };
    }
  }

  /**
   * Check if user can create reviews
   */
  async canCreateReviews(): Promise<WritePermissionResult> {
    const writeCheck = await this.canWrite();
    if (!writeCheck.allowed) {
      return writeCheck;
    }

    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Check if user can create favorites
   */
  async canCreateFavorites(): Promise<WritePermissionResult> {
    const writeCheck = await this.canWrite();
    if (!writeCheck.allowed) {
      return writeCheck;
    }

    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Check if user can create marketplace items
   */
  async canCreateMarketplaceItems(): Promise<WritePermissionResult> {
    const writeCheck = await this.canWrite();
    if (!writeCheck.allowed) {
      return writeCheck;
    }

    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Check if user can update profile
   */
  async canUpdateProfile(): Promise<WritePermissionResult> {
    const writeCheck = await this.canWrite();
    if (!writeCheck.allowed) {
      return writeCheck;
    }

    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Get comprehensive user permissions
   */
  async getUserPermissions(): Promise<UserPermissions> {
    const canWrite = (await this.canWrite()).allowed;
    const canCreateReviews = (await this.canCreateReviews()).allowed;
    const canCreateFavorites = (await this.canCreateFavorites()).allowed;
    const canCreateMarketplaceItems = (await this.canCreateMarketplaceItems()).allowed;
    const canUpdateProfile = (await this.canUpdateProfile()).allowed;

    let isAnonymous = false;
    let userId: string | undefined;

    try {
      if (postgresAuth.isAuthenticated()) {
        const user = await postgresAuth.getProfile();
        if (user) {
          isAnonymous = extractIsAnonymous(user);
          userId = user.id;
        }
      }
    } catch (error) {
      console.error('Error getting user permissions:', error);
    }

    return {
      canWrite,
      canCreateReviews,
      canCreateFavorites,
      canCreateMarketplaceItems,
      canUpdateProfile,
      isAnonymous,
      userId
    };
  }

  /**
   * Require specific permission (throws error if not allowed)
   */
  async requirePermission(permission: keyof Omit<UserPermissions, 'isAnonymous' | 'userId'>): Promise<void> {
    const permissions = await this.getUserPermissions();
    if (!permissions[permission]) {
      throw new Error(`${permission} permission denied`);
    }
  }

  /**
   * Check if user is anonymous
   */
  async isAnonymous(): Promise<boolean> {
    const permissions = await this.getUserPermissions();
    return permissions.isAnonymous;
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | undefined> {
    const permissions = await this.getUserPermissions();
    return permissions.userId;
  }
}

// Export singleton instance
export const writeGates = new WriteGates();

/**
 * React hook for write permissions
 * Note: This should only be used in React components
 */
export function useWritePermissions() {
  const [permissions, setPermissions] = React.useState<UserPermissions | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadPermissions() {
      try {
        setLoading(true);
        const userPermissions = await writeGates.getUserPermissions();
        setPermissions(userPermissions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, []);

  return { permissions, loading, error };
}

/**
 * Higher-order component for protecting write operations
 * Note: This should only be used in React components
 */
export function withWritePermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: keyof Omit<UserPermissions, 'isAnonymous' | 'userId'> = 'canWrite'
) {
  return function WithWritePermissionComponent(props: P) {
    const { permissions, loading, error } = useWritePermissions();

    if (loading) {
      return React.createElement('div', null, 'Loading permissions...');
    }

    if (error) {
      return React.createElement('div', null, `Error loading permissions: ${error}`);
    }

    if (!permissions || !permissions[permission]) {
      return React.createElement(
        'div',
        { className: 'p-4 bg-yellow-50 border border-yellow-200 rounded-md' },
        React.createElement('p', { className: 'text-yellow-800' }, 'You need to upgrade your account to perform this action.'),
        React.createElement(
          'button',
          {
            onClick: () => window.location.href = '/auth/signin',
            className: 'mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
          },
          'Sign In'
        )
      );
    }

    return React.createElement(WrappedComponent, props);
  };
}
