import { postgresAuth } from '@/lib/auth/postgres-auth';
import { generateCorrelationId } from '@/lib/utils/auth-utils';

export interface EmailUpgradeResult {
  success: boolean;
  error?: string;
  requiresMerge?: boolean;
  correlationId: string;
}

export interface MergeConflictResult {
  success: boolean;
  error?: string;
  movedRecords?: string[];
  correlationId: string;
}

/**
 * Email upgrade flow for anonymous users
 * Handles email conflicts and account merging
 */
export class EmailUpgradeFlow {
  /**
   * Attempt to upgrade anonymous user with email
   */
  async upgradeWithEmail(email: string): Promise<EmailUpgradeResult> {
    const correlationId = generateCorrelationId();
    
    try {
      // First, check if user is currently authenticated
      const authState = typeof postgresAuth.getCachedAuthState === 'function'
        ? postgresAuth.getCachedAuthState()
        : (postgresAuth.isAuthenticated() ? 'authenticated' : 'unauthenticated');
      if (authState === 'unauthenticated') {
        console.error(`[Email Upgrade] No current user found (${correlationId})`);
        return {
          success: false,
          error: 'No current user found',
          correlationId
        };
      }

      // Get current user profile
      const user = await postgresAuth.getProfile();
      if (!user) {
        console.error(`[Email Upgrade] Failed to get current user (${correlationId})`);
        return {
          success: false,
          error: 'Failed to get current user',
          correlationId
        };
      }

      // Check if user is anonymous (guest account)
      const isAnonymous = user.is_guest === true;
      if (!isAnonymous) {
        return {
          success: false,
          error: 'User is not anonymous',
          correlationId
        };
      }

      // For PostgreSQL auth, we'll need to implement the email upgrade logic
      // This would typically involve calling a backend endpoint
      try {
        // Call backend to update user email
        const response = await postgresAuth.request('/upgrade-email', {
          method: 'POST',
          body: JSON.stringify({ email })
        });

        if (response.ok) {
          return {
            success: true,
            correlationId
          };
        } else {
          const errorData = await response.json();
          
          // Check if this is an email conflict
          if (errorData.error?.includes('EMAIL_IN_USE') || errorData.error?.includes('already registered')) {
            // Prepare for merge by setting up merge token
            const mergeResult = await this.prepareForMerge(user.id, correlationId);
            
            if (mergeResult.success) {
              return {
                success: false,
                requiresMerge: true,
                error: 'Email already in use. Please sign in with your existing account to merge.',
                correlationId
              };
            } else {
              return {
                success: false,
                error: 'Failed to prepare for account merge',
                correlationId
              };
            }
          }
          
          return {
            success: false,
            error: errorData.error || 'Failed to upgrade email',
            correlationId
          };
        }
      } catch (error) {
        console.error(`[Email Upgrade] Update user failed (${correlationId})`, error);
        return {
          success: false,
          error: 'Failed to upgrade email',
          correlationId
        };
      }

    } catch (error) {
      console.error(`[Email Upgrade] Unexpected error (${correlationId})`, error);
      return {
        success: false,
        error: 'Unexpected error during email upgrade',
        correlationId
      };
    }
  }

  /**
   * Prepare for account merge when email conflict occurs
   */
  private async prepareForMerge(userId: string, correlationId: string): Promise<MergeConflictResult> {
    try {
      // This would typically involve setting up a merge token or session
      // For now, we'll return success as the merge logic would be implemented separately
      return {
        success: true,
        movedRecords: [],
        correlationId
      };
    } catch (error) {
      console.error(`[Email Upgrade] Prepare merge failed (${correlationId})`, error);
      return {
        success: false,
        error: 'Failed to prepare for merge',
        correlationId
      };
    }
  }

  /**
   * Verify email after upgrade
   */
  async verifyEmail(token: string, type: string): Promise<{ success: boolean; error?: string }> {
    const _correlationId = generateCorrelationId();
    
    try {
      // Call backend to verify email
      const response = await postgresAuth.request('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, type })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Email verification failed'
        };
      }

    } catch (_error) {
      return {
        success: false,
        error: 'Unexpected error during email verification'
      };
    }
  }

  /**
   * Set password after email verification
   */
  async setPassword(password: string): Promise<{ success: boolean; error?: string }> {
    const _correlationId = generateCorrelationId();
    
    try {
      // Call backend to set password
      const response = await postgresAuth.request('/set-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to set password'
        };
      }

    } catch (_error) {
      return {
        success: false,
        error: 'Unexpected error while setting password'
      };
    }
  }

  /**
   * Generate CSRF token for API calls
   */
  private generateCSRFToken(): string {
    // In a real implementation, you might want to generate a proper CSRF token
    // For now, we'll use a simple approach
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get current session
   */
  async getSession() {
    const authState = typeof postgresAuth.getCachedAuthState === 'function'
      ? postgresAuth.getCachedAuthState()
      : (postgresAuth.isAuthenticated() ? 'authenticated' : 'unauthenticated');
    if (authState === 'authenticated' || authState === 'guest') {
      return { data: { session: { user: await postgresAuth.getProfile() } } };
    }
    return { data: { session: null } };
  }

  /**
   * Sign out current user
   */
  async signOut() {
    return postgresAuth.signOut();
  }
}

// Export singleton instance
export const emailUpgradeFlow = new EmailUpgradeFlow();
