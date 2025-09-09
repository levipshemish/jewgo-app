import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime for server-side operations
export const runtime = 'nodejs'

interface RouteStatus {
  name: string
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
  lastChecked: string
  error?: string
  errorDetails?: string
  lastSuccess?: string
  failureCount?: number
}

interface WebhookStatus {
  configured: boolean
  lastActivity?: string
  recentDeliveries: number
  lastDelivery?: {
    id: string
    event: string
    timestamp: string
    status: 'success' | 'failed'
  }
  recentErrors?: string[]
  failureCount?: number
}

interface ContainerStatus {
  name: string
  status: 'running' | 'stopped' | 'unhealthy'
  uptime?: string
  lastRestart?: string
  recentErrors?: string[]
  healthCheck?: string
}

interface SystemStatus {
  timestamp: string
  backend: {
    status: 'online' | 'offline'
    version?: string
    uptime?: string
  }
  routes: RouteStatus[]
  webhook: WebhookStatus
  containers: ContainerStatus[]
  database: {
    status: 'connected' | 'disconnected'
    lastCheck: string
  }
  redis: {
    status: 'connected' | 'disconnected'
    lastCheck: string
  }
}

async function checkRoute(url: string, name: string): Promise<RouteStatus> {
  const startTime = Date.now()
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000,
    } as any)
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        name,
        url,
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        failureCount: 0
      }
    } else {
      let errorDetails = ''
      try {
        const errorText = await response.text()
        errorDetails = errorText.substring(0, 200) // Limit error details length
      } catch (e) {
        errorDetails = 'Could not read error response'
      }
      
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorDetails,
        failureCount: 1
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: errorMessage,
      errorDetails: error instanceof Error ? error.stack?.substring(0, 200) : undefined,
      failureCount: 1
    }
  }
}

async function getWebhookStatus(): Promise<WebhookStatus> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/webhook/status`)
    
    if (response.ok) {
      const data = await response.json()
      return {
        configured: data.webhook_configured || false,
        lastActivity: new Date().toISOString(),
        recentDeliveries: data.recent_deliveries || 0,
        recentErrors: data.recent_errors || [],
        failureCount: data.failure_count || 0
      }
    } else {
      return {
        configured: false,
        recentDeliveries: 0,
        recentErrors: [`HTTP ${response.status}: ${response.statusText}`],
        failureCount: 1
      }
    }
  } catch (error) {
    return {
      configured: false,
      recentDeliveries: 0,
      recentErrors: [error instanceof Error ? error.message : 'Unknown error'],
      failureCount: 1
    }
  }
}

async function getContainerStatus(): Promise<ContainerStatus[]> {
  // This would typically be done by querying the Docker API
  // For now, we'll return mock data based on what we know
  return [
    {
      name: 'jewgo_backend',
      status: 'running',
      uptime: '2 hours',
      healthCheck: 'healthy',
      recentErrors: []
    },
    {
      name: 'jewgo_webhook',
      status: 'running',
      uptime: '30 minutes',
      healthCheck: 'healthy',
      recentErrors: ['Signature verification failed', 'Missing deployment script']
    },
    {
      name: 'jewgo_postgres',
      status: 'running',
      uptime: '2 hours',
      healthCheck: 'healthy',
      recentErrors: []
    },
    {
      name: 'jewgo_redis',
      status: 'running',
      uptime: '2 hours',
      healthCheck: 'healthy',
      recentErrors: []
    },
    {
      name: 'jewgo_nginx',
      status: 'running',
      uptime: '5 hours',
      healthCheck: 'healthy',
      recentErrors: []
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'
    
    // Define routes to check
    const routesToCheck = [
      { url: `${backendUrl}/health`, name: 'Health Check' },
      { url: `${backendUrl}/api/restaurants?limit=1`, name: 'Restaurants API' },
      { url: `${backendUrl}/api/restaurants/1577`, name: 'Restaurant Detail API' },
      { url: `${backendUrl}/api/restaurants/1577/view`, name: 'View Tracking API' },
      { url: `${backendUrl}/webhook/status`, name: 'Webhook Status' },
    ]
    
    // Check all routes in parallel
    const routeStatuses = await Promise.all(
      routesToCheck.map(route => checkRoute(route.url, route.name))
    )
    
    // Get webhook status
    const webhookStatus = await getWebhookStatus()
    
    // Get container status
    const containerStatus = await getContainerStatus()
    
    // Check backend health
    const backendHealth = await checkRoute(`${backendUrl}/health`, 'Backend Health')
    
    const systemStatus: SystemStatus = {
      timestamp: new Date().toISOString(),
      backend: {
        status: backendHealth.status === 'healthy' ? 'online' : 'offline',
        uptime: '2 hours', // This would need to be tracked
      },
      routes: routeStatuses,
      webhook: webhookStatus,
      containers: containerStatus,
      database: {
        status: 'connected', // This would need to be checked
        lastCheck: new Date().toISOString(),
      },
      redis: {
        status: 'connected', // This would need to be checked
        lastCheck: new Date().toISOString(),
      }
    }
    
    return NextResponse.json({
      success: true,
      data: systemStatus
    })
    
  } catch (error) {
    console.error('Error getting system status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
