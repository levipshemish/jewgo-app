import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Server-only environment variables
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo.onrender.com'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'oSJtZUQN-B-gBmc9F0xemMCUuPseer30QYmVo8lde4E'

// Request timeout in milliseconds (increased for slow backend)
const REQUEST_TIMEOUT = 30000

async function forward(req: NextRequest, method: 'GET' | 'PUT' | 'DELETE') {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Validate environment configuration
    if (!ADMIN_TOKEN) {
      console.error(`[${requestId}] ADMIN_TOKEN not configured`)
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Admin authentication not configured',
          requestId 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request URL and query parameters
    const url = new URL(req.url)
    const search = url.search || ''
    const target = `${BACKEND_API_URL}/api/admin/users${search}`

    // Log request for debugging
    // console.log(`[${requestId}] ${method} ${target}`)

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'JewGo-Admin-Proxy/1.0',
    }

    // Prepare fetch options with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const init: RequestInit = { 
      method, 
      headers,
      signal: controller.signal
    }

    // Add body for non-GET requests
    if (method !== 'GET') {
      const body = await req.text()
      init.body = body
    }

    // Make request to backend
    const res = await fetch(target, init)
    clearTimeout(timeoutId)

    const duration = Date.now() - startTime
    // Log response for debugging
    // console.log(`[${requestId}] ${method} ${target} -> ${res.status} (${duration}ms)`)

    // Handle non-2xx responses
    if (!res.ok) {
      let errorDetails = 'Unknown error'
      try {
        const errorBody = await res.text()
        const errorData = JSON.parse(errorBody)
        errorDetails = errorData.error || errorData.message || errorBody
      } catch {
        errorDetails = `HTTP ${res.status}: ${res.statusText}`
      }

      return new Response(
        JSON.stringify({
          error: 'Backend request failed',
          details: errorDetails,
          status: res.status,
          requestId
        }),
        {
          status: res.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Return successful response
    const text = await res.text()
    const contentType = res.headers.get('content-type') || 'application/json'
    
    return new Response(text, { 
      status: res.status, 
      headers: { 'Content-Type': contentType } 
    })

  } catch (_error) {
    const duration = Date.now() - startTime
    // Log error for debugging
    // console.error(`[${requestId}] Error in ${method} request:`, error)
    
    let status = 500
    let errorMessage = 'Internal server error'
    
    if (_error instanceof Error) {
      if (_error.name === 'AbortError') {
        status = 408
        errorMessage = 'Request timeout'
      } else if (_error.message.includes('fetch')) {
        status = 502
        errorMessage = 'Backend connection failed'
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: _error instanceof Error ? _error.message : 'Unknown error',
        requestId,
        duration
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export async function GET(req: NextRequest) {
  return forward(req, 'GET')
}

export async function PUT(req: NextRequest) {
  return forward(req, 'PUT')
}

export async function DELETE(req: NextRequest) {
  return forward(req, 'DELETE')
}


