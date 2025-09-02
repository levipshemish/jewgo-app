'use client';

// Client-safe exports for auth-related helpers used in Client Components
// Duplicated from auth-utils.ts to avoid pulling in any `server-only` paths.

/**
 * Validate redirect URL with corrected security logic
 * Treats "/" as exact root only, allows prefixes for specific paths
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  if (!url) {
    return '/';
  }
  try {
    if (!url.startsWith('/')) {
      return '/';
    }
    const decodedUrl = decodeURIComponent(url);
    if (url.length > 2048) {
      return '/';
    }
    if (url.includes('#') || url.includes('%23')) {
      return '/';
    }
    const allowedPaths = new Set([
      '/',
      '/profile/settings',
      '/favorites',
      '/auth/callback',
      '/auth/signin',
      '/auth/signup',
    ]);
    // Normalize path without query
    const path = decodedUrl.split('?')[0];
    if (path === '/') {
      return '/';
    }
    // Allow exact matches or subpaths under specific prefixes
    const allowedPrefixes = ['/profile', '/favorites', '/auth'];
    const isAllowed = allowedPaths.has(path) || allowedPrefixes.some((p) => path.startsWith(p + '/'));
    if (!isAllowed) {
      return '/';
    }
    // Sanitize query params to drop dangerous keys
    const [decodedPath, query = ''] = decodedUrl.split('?');
    const params = new URLSearchParams(query);
    const blocked = new Set(['redirect', 'returnTo', 'nextUrl', 'continue', 'url']);
    const safeParams = new URLSearchParams();
    params.forEach((value, key) => {
      if (!blocked.has(key.toLowerCase())) {
        safeParams.set(key, value);
      }
    });
    const safe = decodedPath + (safeParams.toString() ? `?${safeParams.toString()}` : '');
    return safe;
  } catch {
    return '/';
  }
}

/**
 * Map Apple OAuth errors to user-friendly messages
 */
export function mapAppleOAuthError(error: string): string {
  const normalizedError = error.toLowerCase().trim();
  switch (normalizedError) {
    case 'user_cancelled':
    case 'user_canceled':
      return 'You cancelled Sign in with Apple';
    case 'invalid_grant':
      return 'Session expired—try again';
    case 'access_denied':
      return 'Access denied';
    case 'configuration_error':
      return 'Service temporarily unavailable';
    case 'network_error':
      return 'Connection failed';
    case 'server_error':
      return 'Service temporarily unavailable';
    case 'temporarily_unavailable':
      return 'Service temporarily unavailable';
    case 'invalid_request':
      return 'Invalid request—try again';
    case 'unsupported_response_type':
      return 'Service configuration error';
    case 'invalid_scope':
      return 'Service configuration error';
    case 'invalid_client':
      return 'Service configuration error';
    case 'unauthorized_client':
      return 'Service configuration error';
    case 'redirect_uri_mismatch':
      return 'Service configuration error';
    case 'invalid_state':
      return 'Session expired—try again';
    default:
      if (normalizedError.includes('cancelled') || normalizedError.includes('canceled')) {
        return 'You cancelled Sign in with Apple';
      }
      if (normalizedError.includes('expired') || normalizedError.includes('invalid_grant')) {
        return 'Sign in failed. Please try again.';
      }
      if (normalizedError.includes('denied') || normalizedError.includes('access_denied')) {
        return 'Access denied';
      }
      if (normalizedError.includes('configuration') || normalizedError.includes('config')) {
        return 'Service temporarily unavailable';
      }
      if (normalizedError.includes('network') || normalizedError.includes('connection')) {
        return 'Connection failed';
      }
      if (normalizedError.includes('server') || normalizedError.includes('service')) {
        return 'Service temporarily unavailable';
      }
      return 'Sign in failed. Please try again.';
  }
}

