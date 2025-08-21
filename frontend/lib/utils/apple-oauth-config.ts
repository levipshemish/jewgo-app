/**
 * Apple OAuth Configuration Utilities
 * 
 * This module provides utilities to check Apple OAuth configuration status
 * and guide users through the setup process.
 */

export interface AppleOAuthConfigStatus {
  isEnabled: boolean;
  isConfigured: boolean;
  missingSteps: string[];
  setupUrl: string;
}

/**
 * Check if Apple OAuth is enabled via feature flags
 */
export function isAppleOAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true';
}

/**
 * Check if Apple OAuth is properly configured
 * This checks for the presence of required environment variables
 */
export function isAppleOAuthConfigured(): boolean {
  // In a real implementation, you might check for actual configuration
  // For now, we'll check if the feature flag is enabled
  return isAppleOAuthEnabled();
}

/**
 * Get the current Apple OAuth configuration status
 */
export function getAppleOAuthConfigStatus(): AppleOAuthConfigStatus {
  const isEnabled = isAppleOAuthEnabled();
  const isConfigured = isAppleOAuthConfigured();
  
  const missingSteps: string[] = [];
  
  if (!isEnabled) {
    missingSteps.push('Apple OAuth feature flag is not enabled');
  }
  
  if (!isConfigured) {
    missingSteps.push('Apple OAuth is not configured in Supabase Dashboard');
    missingSteps.push('Apple Developer Console setup is incomplete');
    missingSteps.push('Environment variables are missing');
  }
  
  return {
    isEnabled,
    isConfigured,
    missingSteps,
    setupUrl: '/auth/apple-setup'
  };
}

/**
 * Get setup instructions based on current configuration status
 */
export function getAppleOAuthSetupInstructions(): {
  title: string;
  description: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    completed: boolean;
  }>;
} {
  const status = getAppleOAuthConfigStatus();
  
  const steps = [
    {
      number: 1,
      title: 'Enable Feature Flags',
      description: 'Set NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true in environment variables',
      completed: status.isEnabled
    },
    {
      number: 2,
      title: 'Configure Apple Developer Console',
      description: 'Create Services ID and generate client secret',
      completed: false // This would need to be checked against actual configuration
    },
    {
      number: 3,
      title: 'Enable Apple Provider in Supabase',
      description: 'Add client ID and secret to Supabase Dashboard',
      completed: false // This would need to be checked against actual configuration
    },
    {
      number: 4,
      title: 'Configure Redirect URLs',
      description: 'Set up proper callback URLs in both Apple and Supabase',
      completed: false // This would need to be checked against actual configuration
    }
  ];
  
  return {
    title: status.isConfigured ? 'Apple OAuth is Ready' : 'Apple OAuth Setup Required',
    description: status.isConfigured 
      ? 'Apple Sign-In is fully configured and ready to use'
      : 'Complete the setup steps below to enable Apple Sign-In',
    steps
  };
}

/**
 * Get the documentation URL for Apple OAuth setup
 */
export function getAppleOAuthSetupDocsUrl(): string {
  return '/docs/setup/APPLE_OAUTH_SUPABASE_SETUP.md';
}

/**
 * Check if user should be redirected to setup page
 */
export function shouldRedirectToSetup(): boolean {
  return isAppleOAuthEnabled() && !isAppleOAuthConfigured();
}
