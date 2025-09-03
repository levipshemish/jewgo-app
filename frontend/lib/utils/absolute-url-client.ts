/**
 * Client-safe absolute URL utilities
 * This version doesn't use next/headers and works in both client and server environments
 */

/**
 * Get the base URL for client-side requests
 * Uses environment variables and fallbacks suitable for client-side usage
 */
export function getBaseUrlClient(): string {
  // Use environment variables available to the client
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                 process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXTAUTH_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // For client-side, try to get from window.location if available
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Production fallback - this should be configured
  console.warn('[AbsoluteURL-Client] No base URL configured, using localhost fallback');
  return 'http://localhost:3000';
}

/**
 * Resolve a relative URL to an absolute URL (client-safe)
 * @param relativeUrl - The relative URL to resolve (e.g., '/api/auth/user-with-roles')
 * @returns Absolute URL
 */
export function resolveUrlClient(relativeUrl: string): string {
  const baseUrl = getBaseUrlClient();
  return new URL(relativeUrl, baseUrl).toString();
}

/**
 * Create a fetch-compatible URL for client-side requests
 * @param relativeUrl - The relative URL to resolve
 * @returns URL object suitable for fetch()
 */
export function createClientUrl(relativeUrl: string): URL {
  const baseUrl = getBaseUrlClient();
  return new URL(relativeUrl, baseUrl);
}
