import { supabaseBrowser } from '@/lib/supabase/client';
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
  private supabase = supabaseBrowser;

  /**
   * Attempt to upgrade anonymous user with email
   */
  async upgradeWithEmail(email: string): Promise<EmailUpgradeResult> {
    const correlationId = generateCorrelationId();
    
    try {

      // First, check if user is currently anonymous
      const { data: { user }, error: getUserError } = await this.supabase.auth.getUser();
      
      if (getUserError) {
        console.error(`[Email Upgrade] Failed to get current user (${correlationId})`, getUserError);
        return {
          success: false,
          error: 'Failed to get current user',
          correlationId
        };
      }

      if (!user) {
        console.error(`[Email Upgrade] No current user found (${correlationId})`);
        return {
          success: false,
          error: 'No current user found',
          correlationId
        };
      }

      // Check if user is anonymous
      const isAnonymous = user.user_metadata?.is_anonymous === true;
      if (!isAnonymous) {

        return {
          success: false,
          error: 'User is not anonymous',
          correlationId
        };
      }

      // Attempt to update user with email
      const { error: updateError } = await this.supabase.auth.updateUser({
        email
      });

      if (updateError) {
        console.error(`[Email Upgrade] Update user failed (${correlationId})`, updateError);
        
        // Check if this is an email conflict
        if (updateError.message.includes('EMAIL_IN_USE') || updateError.message.includes('already registered')) {

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
          error: updateError.message,
          correlationId
        };
      }

      return {
        success: true,
        correlationId
      };

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
   * Prepare for account merge when email conflict is detected
   */
  private async prepareForMerge(anonymousUserId: string, correlationId: string): Promise<{ success: boolean; error?: string }> {
    try {

      // Call prepare-merge API to set up merge token
      const response = await fetch('/api/auth/prepare-merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': this.generateCSRFToken()
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Email Upgrade] Prepare merge failed (${correlationId})`, errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to prepare for merge'
        };
      }

      return { success: true };

    } catch (error) {
      console.error(`[Email Upgrade] Prepare merge error (${correlationId})`, error);
      return {
        success: false,
        error: 'Failed to prepare for merge'
      };
    }
  }

  /**
   * Handle account merge after user signs in with existing account
   */
  async handleAccountMerge(): Promise<MergeConflictResult> {
    const correlationId = generateCorrelationId();
    
    try {

      // Call merge-anonymous API
      const response = await fetch('/api/auth/merge-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': this.generateCSRFToken()
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Email Upgrade] Merge failed (${correlationId})`, data);
        return {
          success: false,
          error: data.error || 'Failed to merge accounts',
          correlationId
        };
      }

      // console.log(`[Email Upgrade] Account merge successful (${correlationId})`, data);
      return {
        success: true,
        movedRecords: data.moved || [],
        correlationId
      };

    } catch (error) {
      // console.error(`[Email Upgrade] Merge error (${correlationId})`, error);
      return {
        success: false,
        error: 'Unexpected error during account merge',
        correlationId
      };
    }
  }

  /**
   * Verify email after upgrade
   */
  async verifyEmail(token: string, type: string): Promise<{ success: boolean; error?: string }> {
    const correlationId = generateCorrelationId();
    
    try {

      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any
      });

      if (error) {
        // console.error(`[Email Upgrade] Email verification failed (${correlationId})`, error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error) {
      // console.error(`[Email Upgrade] Email verification error (${correlationId})`, error);
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
    const correlationId = generateCorrelationId();
    
    try {

      const { error } = await this.supabase.auth.updateUser({
        password
      });

      if (error) {
        // console.error(`[Email Upgrade] Set password failed (${correlationId})`, error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error) {
      // console.error(`[Email Upgrade] Set password error (${correlationId})`, error);
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
   * Listen for auth state changes to handle token rotation
   */
  onAuthStateChange(callback: (event: string, session: any) => void): () => void {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Get current session
   */
  async getSession() {
    return this.supabase.auth.getSession();
  }

  /**
   * Sign out current user
   */
  async signOut() {
    return this.supabase.auth.signOut();
  }
}

// Export singleton instance
export const emailUpgradeFlow = new EmailUpgradeFlow();
