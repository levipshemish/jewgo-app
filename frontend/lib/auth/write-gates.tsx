import React from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
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
  private supabase = supabaseBrowser;

  /**
   * Check if user can perform write operations
   */
  async canWrite(): Promise<WritePermissionResult> {
    const correlationId = generateCorrelationId();
    
    try {

      const { data: { user }, error: getUserError } = await this.supabase.auth.getUser();
      
      if (getUserError) {
        console.error(`[Write Gates] Failed to get user (${correlationId})`, getUserError);
        return {
          allowed: false,
          error: 'Failed to get user',
          correlationId
        };
      }

      if (!user) {

        return {
          allowed: false,
          error: 'No authenticated user',
          reason: 'User must be signed in to perform write operations',
          correlationId
        };
      }

      // Check if user is anonymous
      const isAnonymous = extractIsAnonymous(user);
      if (isAnonymous) {

        return {
          allowed: false,
          error: 'Anonymous users cannot perform write operations',
          reason: 'Please upgrade your account to perform this action',
          correlationId
        };
      }

      // Check if user email is verified (for non-anonymous users)
      if (!user.email_confirmed_at) {

        return {
          allowed: false,
          error: 'Email not verified',
          reason: 'Please verify your email address to perform write operations',
          correlationId
        };
      }

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

    // Additional review-specific checks could go here
    // For example, check if user has been banned from reviews
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

    // Additional favorite-specific checks could go here
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

    // Additional marketplace-specific checks could go here
    // For example, check if user has completed profile setup
    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Check if user can update their profile
   */
  async canUpdateProfile(): Promise<WritePermissionResult> {
    const writeCheck = await this.canWrite();
    if (!writeCheck.allowed) {
      return writeCheck;
    }

    // Additional profile-specific checks could go here
    return {
      allowed: true,
      correlationId: writeCheck.correlationId
    };
  }

  /**
   * Get comprehensive user permissions
   */
  async getUserPermissions(): Promise<UserPermissions> {
    const correlationId = generateCorrelationId();
    
    try {

      const { data: { user }, error: getUserError } = await this.supabase.auth.getUser();
      
      if (getUserError || !user) {

        return {
          canWrite: false,
          canCreateReviews: false,
          canCreateFavorites: false,
          canCreateMarketplaceItems: false,
          canUpdateProfile: false,
          isAnonymous: true,
          userId: undefined
        };
      }

      const isAnonymous = extractIsAnonymous(user);
      const canWrite = !isAnonymous && !!user.email_confirmed_at;

      // console.log(`[Write Gates] User permissions calculated (${correlationId})`, {
      //   userId: user.id,
      //   isAnonymous,
      //   canWrite,
      //   emailConfirmed: !!user.email_confirmed_at
      // });

      return {
        canWrite,
        canCreateReviews: canWrite,
        canCreateFavorites: canWrite,
        canCreateMarketplaceItems: canWrite,
        canUpdateProfile: canWrite,
        isAnonymous,
        userId: user.id
      };

    } catch (error) {
      // console.error(`[Write Gates] Error getting permissions (${correlationId})`, error);
      return {
        canWrite: false,
        canCreateReviews: false,
        canCreateFavorites: false,
        canCreateMarketplaceItems: false,
        canUpdateProfile: false,
        isAnonymous: true,
        userId: undefined
      };
    }
  }

  /**
   * Require write permission (throws error if not allowed)
   */
  async requireWrite(): Promise<void> {
    const result = await this.canWrite();
    if (!result.allowed) {
      throw new Error(result.error || 'Write permission denied');
    }
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
 */
export function withWritePermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: keyof Omit<UserPermissions, 'isAnonymous' | 'userId'> = 'canWrite'
) {
  return function WithWritePermissionComponent(props: P) {
    const { permissions, loading, error } = useWritePermissions();

    if (loading) {
      return <div>Loading permissions...</div>;
    }

    if (error) {
      return <div>Error loading permissions: {error}</div>;
    }

    if (!permissions || !permissions[permission]) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            You need to upgrade your account to perform this action.
          </p>
          <button 
            onClick={() => window.location.href = '/auth/signin'}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
