import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime for server-side operations
export const runtime = 'nodejs'

interface ExternalAPI {
  name: string
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime: number
  lastCheck: string
  error?: string
  rateLimit?: {
    remaining: number
    resetTime: string
    limit: number
  }
  ssl?: {
    valid: boolean
    expiresAt: string
    issuer: string
  }
}

async function checkExternalAPI(url: string, name: string, options: any = {}): Promise<ExternalAPI> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
      ...options
    })
    
    const responseTime = Date.now() - startTime
    const lastCheck = new Date().toISOString()
    
    if (response.ok) {
      // Check for rate limiting headers
      const rateLimit = {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        resetTime: response.headers.get('x-ratelimit-reset') || '',
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0')
      }
      
      return {
        name,
        url,
        status: 'healthy',
        responseTime,
        lastCheck,
        rateLimit: rateLimit.remaining > 0 ? rateLimit : undefined
      }
    } else {
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime,
        lastCheck,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getExternalAPIsStatus(): Promise<ExternalAPI[]> {
  const apis: ExternalAPI[] = []
  
  // Check Google Maps API
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (googleMapsApiKey) {
    const googleMapsStatus = await checkExternalAPI(
      `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`,
      'Google Maps API'
    )
    apis.push(googleMapsStatus)
  }
  
  // Check Google Places API
  if (googleMapsApiKey) {
    const googlePlacesStatus = await checkExternalAPI(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&key=${googleMapsApiKey}`,
      'Google Places API'
    )
    apis.push(googlePlacesStatus)
  }
  
  // Check GitHub API
  const githubStatus = await checkExternalAPI(
    'https://api.github.com/zen',
    'GitHub API'
  )
  apis.push(githubStatus)
  
  // Check Let's Encrypt (SSL certificate authority)
  const letsEncryptStatus = await checkExternalAPI(
    'https://acme-v02.api.letsencrypt.org/directory',
    'Let\'s Encrypt API'
  )
  apis.push(letsEncryptStatus)
  
  // Check Cloudflare (if using)
  const cloudflareStatus = await checkExternalAPI(
    'https://api.cloudflare.com/client/v4/user/tokens/verify',
    'Cloudflare API'
  )
  apis.push(cloudflareStatus)
  
  // Check Stripe API (if configured)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (stripeSecretKey) {
    const stripeStatus = await checkExternalAPI(
      'https://api.stripe.com/v1/balance',
      'Stripe API',
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`
        }
      }
    )
    apis.push(stripeStatus)
  }
  
  // Check Sentry API (if configured)
  const sentryDsn = process.env.SENTRY_DSN
  if (sentryDsn) {
    try {
      const sentryUrl = new URL(sentryDsn)
      const sentryStatus = await checkExternalAPI(
        `https://${sentryUrl.host}/api/0/`,
        'Sentry API'
      )
      apis.push(sentryStatus)
    } catch {
      // Invalid Sentry DSN, skip
    }
  }
  
  // Check Redis (if external)
  const redisUrl = process.env.REDIS_URL
  if (redisUrl && redisUrl.includes('redis://')) {
    try {
      const redisStatus = await checkExternalAPI(
        redisUrl.replace('redis://', 'http://').replace(':6379', ':80'),
        'Redis Service'
      )
      apis.push(redisStatus)
    } catch {
      // Redis might not be HTTP accessible, skip
    }
  }
  
  // Check PostgreSQL (if external)
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && databaseUrl.includes('postgres://')) {
    try {
      const dbUrl = new URL(databaseUrl)
      const postgresStatus = await checkExternalAPI(
        `https://${dbUrl.hostname}:${dbUrl.port || 5432}`,
        'PostgreSQL Service'
      )
      apis.push(postgresStatus)
    } catch {
      // PostgreSQL might not be HTTP accessible, skip
    }
  }
  
  return apis
}

export async function GET(_request: NextRequest) {
  try {
    const apis = await getExternalAPIsStatus()
    
    return NextResponse.json({
      success: true,
      source: 'real',
      data: {
        apis,
        timestamp: new Date().toISOString(),
        total_apis: apis.length,
        healthy_apis: apis.filter(api => api.status === 'healthy').length,
        unhealthy_apis: apis.filter(api => api.status === 'unhealthy').length
      }
    })
    
  } catch (error) {
    console.error('Error getting real external APIs status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get external APIs status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}