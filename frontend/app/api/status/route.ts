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
  systemMetrics?: any
  databaseStatus?: any
  externalAPIs?: any
  serviceDependencies?: any
  performanceMetrics?: any
  securityMonitoring?: any
  applicationHealth?: any
  alertsNotifications?: any
  dataSources?: {
    systemMetrics: string
    databaseStatus: string
    externalAPIs: string
  }
}

async function checkRoute(url: string, name: string, method: string = 'GET'): Promise<RouteStatus> {
  const startTime = Date.now()
  try {
    const fetchOptions: any = {
      method,
      timeout: 5000,
    }
    
    // Add appropriate headers and body for POST requests
    if (method === 'POST') {
      fetchOptions.headers = {
        'Content-Type': 'application/json',
      }
      // For view tracking, we might need a simple body
      if (url.includes('/view')) {
        fetchOptions.body = JSON.stringify({})
      }
    }
    
    const response = await fetch(url, fetchOptions)
    
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
    // Try the new webhook status endpoint first
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/webhook/status`)
    
    if (response.ok) {
      const data = await response.json()
      return {
        configured: data.data?.webhook_configured || data.webhook_configured || false,
        lastActivity: new Date().toISOString(),
        recentDeliveries: data.data?.recent_deliveries || data.recent_deliveries || 0,
        recentErrors: data.data?.recent_errors || data.recent_errors || [],
        failureCount: data.data?.failure_count || data.failure_count || 0
      }
    } else {
      // If the new endpoint fails, try the old one
      const oldResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/webhook/deploy`, {
        method: 'GET'
      })
      
      if (oldResponse.ok) {
        return {
          configured: true,
          lastActivity: new Date().toISOString(),
          recentDeliveries: 0,
          recentErrors: [],
          failureCount: 0
        }
      } else {
        return {
          configured: false,
          recentDeliveries: 0,
          recentErrors: [
            `New endpoint: HTTP ${response.status}: ${response.statusText}`,
            `Old endpoint: HTTP ${oldResponse.status}: ${oldResponse.statusText}`
          ],
          failureCount: 1
        }
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
  try {
    // Try to get real container status
    const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/real-container-status`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data.containers) {
        // Convert real container data to our format
        return data.data.containers.map((container: any) => ({
          name: container.name,
          status: container.status === 'running' ? 'running' : 'stopped',
          uptime: container.uptime || 'unknown',
          healthCheck: container.health || 'unknown',
          recentErrors: container.recent_errors || []
        }))
      }
    }
  } catch (error) {
    console.error('Failed to get real container status:', error)
  }
  
  // Fallback to mock data if real collection fails
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
    
    // Define routes to check with their proper HTTP methods
    const routesToCheck = [
      { url: `${backendUrl}/health`, name: 'Health Check', method: 'GET' },
      { url: `${backendUrl}/api/restaurants?limit=1`, name: 'Restaurants API', method: 'GET' },
      { url: `${backendUrl}/api/restaurants/1577`, name: 'Restaurant Detail API', method: 'GET' },
      { url: `${backendUrl}/api/restaurants/1577/view`, name: 'View Tracking API', method: 'POST' },
      { url: `${backendUrl}/webhook/status`, name: 'Webhook Status', method: 'GET' },
    ]
    
    // Check all routes in parallel
    const routeStatuses = await Promise.all(
      routesToCheck.map(route => checkRoute(route.url, route.name, route.method))
    )
    
    // Get webhook status
    const webhookStatus = await getWebhookStatus()
    
    // Get container status
    const containerStatus = await getContainerStatus()
    const containerStatusSource = containerStatus.length > 0 && containerStatus[0].name === 'jewgo_backend' && 
      containerStatus[0].uptime !== '2 hours' ? 'real' : 'mock'
    
    // Check backend health
    const backendHealth = await checkRoute(`${backendUrl}/health`, 'Backend Health')
    
    // Get comprehensive system metrics (try real first, fallback to mock)
    let systemMetrics = null
    let systemMetricsSource = 'none'
    try {
      // Try real system metrics first
      const realMetricsResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/real-system-metrics`)
      if (realMetricsResponse.ok) {
        const realMetricsData = await realMetricsResponse.json()
        systemMetrics = realMetricsData.data
        systemMetricsSource = realMetricsData.source
      } else {
        // Fallback to mock data
        const mockMetricsResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/system-metrics`)
        if (mockMetricsResponse.ok) {
          const mockMetricsData = await mockMetricsResponse.json()
          systemMetrics = mockMetricsData.data
          systemMetricsSource = 'mock'
        }
      }
    } catch (error) {
      console.error('Failed to fetch system metrics:', error)
    }
    
    // Get real external API status
    let externalAPIs = null
    let externalAPIsSource = 'none'
    try {
      const externalResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/real-external-apis`)
      if (externalResponse.ok) {
        const externalData = await externalResponse.json()
        externalAPIs = externalData.data
        externalAPIsSource = externalData.source
      }
    } catch (error) {
      console.error('Failed to fetch external API status:', error)
    }
    
    // Get real database status
    let databaseStatus = null
    let databaseStatusSource = 'none'
    try {
      const dbResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/real-database-status`)
      if (dbResponse.ok) {
        const dbData = await dbResponse.json()
        databaseStatus = dbData.data
        databaseStatusSource = dbData.source
      }
    } catch (error) {
      console.error('Failed to fetch database status:', error)
    }
    
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
      },
      systemMetrics: systemMetrics || null,
      databaseStatus: databaseStatus || null,
      externalAPIs: externalAPIs || null,
      serviceDependencies: systemMetrics?.serviceDependencies || null,
      performanceMetrics: systemMetrics?.performanceMetrics || null,
      securityMonitoring: systemMetrics?.securityMonitoring || null,
      applicationHealth: systemMetrics?.applicationHealth || null,
      alertsNotifications: systemMetrics?.alertsNotifications || null,
      dataSources: {
        systemMetrics: systemMetricsSource,
        databaseStatus: databaseStatusSource,
        externalAPIs: externalAPIsSource,
        containerStatus: containerStatusSource
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
