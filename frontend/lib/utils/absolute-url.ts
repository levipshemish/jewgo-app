import { headers } from 'next/headers';

/**
 * Get the base URL for server-side requests
 * Resolves relative URLs to absolute URLs using request headers or environment variables
 */
export async function getBaseUrl(): Promise<string> {
  try {
    // Try to get from headers first (most reliable for server-side)
    const headersList = await headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Headers() may not be available in all contexts
    console.warn('[AbsoluteURL] Could not access headers:', error);
  }
  
  // Fallback to environment variables
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                 process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXTAUTH_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Final fallback for development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  // Production fallback - this should be configured
  console.warn('[AbsoluteURL] No base URL configured, using localhost fallback');
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Resolve a relative URL to an absolute URL
 * @param relativeUrl - The relative URL to resolve (e.g., '/api/auth/user-with-roles')
 * @returns Absolute URL
 */
export async function resolveUrl(relativeUrl: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  return new URL(relativeUrl, baseUrl).toString();
}

/**
 * Create a fetch-compatible URL for server-side requests
 * @param relativeUrl - The relative URL to resolve
 * @returns URL object suitable for fetch()
 */
export async function createServerUrl(relativeUrl: string): Promise<URL> {
  const baseUrl = await getBaseUrl();
  return new URL(relativeUrl, baseUrl);
}
