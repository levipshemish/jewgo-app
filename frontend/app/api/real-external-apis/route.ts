import { NextRequest, NextResponse } from 'next/server'

interface ExternalAPICheck {
  name: string
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime: number
  lastCheck: string
  error?: string
  statusCode?: number
}

interface ExternalAPIsStatus {
  apis: ExternalAPICheck[]
  lastUpdated: string
}

async function checkExternalAPI(name: string, url: string): Promise<ExternalAPICheck> {
  const startTime = Date.now()
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
    } as any)
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        name,
        url,
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        statusCode: response.status
      }
    } else {
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Define external APIs to check
    const apisToCheck = [
      { name: 'Google Maps API', url: 'https://maps.googleapis.com/maps/api/js' },
      { name: 'GitHub API', url: 'https://api.github.com' },
      { name: 'Backend API', url: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app/health' },
      { name: 'Frontend App', url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000' },
    ]
    
    // Check all external APIs in parallel
    const apiChecks = await Promise.all(
      apisToCheck.map(api => checkExternalAPI(api.name, api.url))
    )
    
    const status: ExternalAPIsStatus = {
      apis: apiChecks,
      lastUpdated: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: status,
      source: 'real'
    })
  } catch (error) {
    console.error('Error checking external APIs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
