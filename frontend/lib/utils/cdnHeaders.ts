/**
 * CDN Headers Utility
 * Manages CDN headers for static assets and provides consistent caching strategies
 */

export interface CDNHeaders {
  'Cache-Control': string;
  'CDN-Cache-Control'?: string;
  'Surrogate-Control'?: string;
  'Vary'?: string;
  'ETag'?: string;
  'Last-Modified'?: string;
}

export interface AssetType {
  type: 'image' | 'font' | 'script' | 'style' | 'document' | 'api';
  maxAge: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
}

// CDN header configurations for different asset types
export const CDN_CONFIGS: Record<string, AssetType> = {
  // Images - long cache with revalidation
  'image': {
    type: 'image',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    staleWhileRevalidate: 24 * 60 * 60, // 1 day
  },
  
  // Fonts - very long cache, immutable
  'font': {
    type: 'font',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    immutable: true,
  },
  
  // Scripts - moderate cache with revalidation
  'script': {
    type: 'script',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    staleWhileRevalidate: 24 * 60 * 60, // 1 day
  },
  
  // Styles - moderate cache with revalidation
  'style': {
    type: 'style',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    staleWhileRevalidate: 24 * 60 * 60, // 1 day
  },
  
  // Documents - short cache
  'document': {
    type: 'document',
    maxAge: 60 * 60, // 1 hour
    staleWhileRevalidate: 5 * 60, // 5 minutes
  },
  
  // API responses - very short cache
  'api': {
    type: 'api',
    maxAge: 5 * 60, // 5 minutes
    staleWhileRevalidate: 1 * 60, // 1 minute
  }
};

/**
 * Generate CDN headers for a specific asset type
 */
export function generateCDNHeaders(
  assetType: string,
  options: {
    etag?: string;
    lastModified?: string;
    vary?: string;
    customMaxAge?: number;
  } = {}
): CDNHeaders {
  const config = CDN_CONFIGS[assetType] || CDN_CONFIGS.document;
  const maxAge = options.customMaxAge || config.maxAge;
  
  let cacheControl = `public, max-age=${maxAge}`;
  
  if (config.staleWhileRevalidate) {
    cacheControl += `, stale-while-revalidate=${config.staleWhileRevalidate}`;
  }
  
  if (config.immutable) {
    cacheControl += ', immutable';
  }
  
  const headers: CDNHeaders = {
    'Cache-Control': cacheControl
  };
  
  // Add CDN-specific headers
  if (config.type === 'image' || config.type === 'font') {
    headers['CDN-Cache-Control'] = cacheControl;
    headers['Surrogate-Control'] = cacheControl;
  }
  
  // Add Vary header for assets that may vary
  if (options.vary) {
    headers['Vary'] = options.vary;
  } else if (config.type === 'document' || config.type === 'api') {
    headers['Vary'] = 'Accept, Accept-Encoding, Accept-Language';
  }
  
  // Add ETag if provided
  if (options.etag) {
    headers['ETag'] = options.etag;
  }
  
  // Add Last-Modified if provided
  if (options.lastModified) {
    headers['Last-Modified'] = options.lastModified;
  }
  
  return headers;
}

/**
 * Generate CDN headers for Next.js static assets
 */
export function generateNextJSHeaders(
  pathname: string,
  options: {
    etag?: string;
    lastModified?: string;
    vary?: string;
  } = {}
): CDNHeaders {
  // Determine asset type based on file extension
  const extension = pathname.split('.').pop()?.toLowerCase();
  
  let assetType: string;
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'ico':
      assetType = 'image';
      break;
      
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
    case 'eot':
      assetType = 'font';
      break;
      
    case 'js':
      assetType = 'script';
      break;
      
    case 'css':
      assetType = 'style';
      break;
      
    case 'html':
    case 'htm':
      assetType = 'document';
      break;
      
    default:
      assetType = 'document';
  }
  
  return generateCDNHeaders(assetType, options);
}

/**
 * Generate CDN headers for API responses
 */
export function generateAPIHeaders(
  endpoint: string,
  options: {
    etag?: string;
    lastModified?: string;
    vary?: string;
    customMaxAge?: number;
  } = {}
): CDNHeaders {
  // Determine cache strategy based on endpoint
  let maxAge = options.customMaxAge;
  
  if (!maxAge) {
    if (endpoint.includes('listings') || endpoint.includes('search')) {
      maxAge = 5 * 60; // 5 minutes for search/listings
    } else if (endpoint.includes('user') || endpoint.includes('auth')) {
      maxAge = 0; // No cache for user/auth data
    } else {
      maxAge = 60; // 1 minute default for other APIs
    }
  }
  
  return generateCDNHeaders('api', {
    ...options,
    customMaxAge: maxAge
  });
}

/**
 * Apply CDN headers to a Response object
 */
export function applyCDNHeaders(
  response: Response,
  headers: CDNHeaders
): Response {
  const newHeaders = new Headers(response.headers);
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      newHeaders.set(key, value);
    }
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Get CDN stats for monitoring
 */
export function getCDNStats(): Record<string, any> {
  return {
    configs: Object.keys(CDN_CONFIGS),
    assetTypes: Object.values(CDN_CONFIGS).map(config => config.type),
    defaultMaxAges: Object.fromEntries(
      Object.entries(CDN_CONFIGS).map(([key, config]) => [key, config.maxAge])
    )
  };
}
