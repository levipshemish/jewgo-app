import { NextRequest, NextResponse } from 'next/server'

interface ServerStatus {
  timestamp: string
  backend: {
    status: 'healthy' | 'unhealthy'
    responseTime: number
    version?: string
  }
  database: {
    status: 'connected' | 'disconnected'
    responseTime: number
    error?: string
  }
  redis: {
    status: 'connected' | 'disconnected'
    responseTime: number
    error?: string
  }
  containers: {
    total: number
    running: number
    stopped: number
    list: Array<{
      name: string
      status: string
      image: string
      created: string
      uptime?: string
    }>
  }
  apiRoutes: {
    total: number
    working: number
    failing: number
    routes: Array<{
      path: string
      method: string
      status: 'working' | 'failing' | 'unknown'
      responseTime?: number
      lastChecked: string
    }>
  }
  system: {
    uptime: string
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
  }
  errors: {
    recent: Array<{
      timestamp: string
      level: string
      message: string
      source: string
    }>
    count: number
  }
}

export async function GET(request: NextRequest) {
  const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'
  const startTime = Date.now()
  
  try {
    // Test backend connectivity
    const backendStart = Date.now()
    let backendStatus: 'healthy' | 'unhealthy' = 'unhealthy'
    let backendResponseTime = 0
    let backendVersion: string | undefined
    
    try {
      const backendResponse = await fetch(`${serverUrl}/healthz`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      backendResponseTime = Date.now() - backendStart
      if (backendResponse.ok) {
        backendStatus = 'healthy'
        const data = await backendResponse.json()
        backendVersion = data.version || '1.0.0'
      }
    } catch (error) {
      backendResponseTime = Date.now() - backendStart
    }

    // Test database connectivity
    const dbStart = Date.now()
    let dbStatus: 'connected' | 'disconnected' = 'disconnected'
    let dbResponseTime = 0
    let dbError: string | undefined
    
    try {
      const dbResponse = await fetch(`${serverUrl}/api/restaurants?limit=1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      dbResponseTime = Date.now() - dbStart
      if (dbResponse.ok) {
        dbStatus = 'connected'
      } else {
        dbError = `HTTP ${dbResponse.status}`
      }
    } catch (error) {
      dbResponseTime = Date.now() - dbStart
      dbError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test Redis connectivity (via a simple endpoint)
    const redisStart = Date.now()
    let redisStatus: 'connected' | 'disconnected' = 'disconnected'
    let redisResponseTime = 0
    let redisError: string | undefined
    
    try {
      // Test Redis via a simple endpoint that might use caching
      const redisResponse = await fetch(`${serverUrl}/api/restaurants/1577/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      redisResponseTime = Date.now() - redisStart
      if (redisResponse.ok) {
        redisStatus = 'connected'
      } else {
        redisError = `HTTP ${redisResponse.status}`
      }
    } catch (error) {
      redisResponseTime = Date.now() - redisStart
      redisError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Get container status
    let containers = {
      total: 0,
      running: 0,
      stopped: 0,
      list: [] as Array<{
        name: string
        status: string
        image: string
        created: string
        uptime?: string
      }>
    }

    try {
      const containerResponse = await fetch(`${serverUrl}/api/container-status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      
      if (containerResponse.ok) {
        const containerData = await containerResponse.json()
        if (containerData.success && containerData.data?.containers) {
          containers.list = containerData.data.containers
          containers.total = containers.list.length
          containers.running = containers.list.filter(c => c.status === 'running').length
          containers.stopped = containers.list.filter(c => c.status !== 'running').length
        }
      }
    } catch (error) {
      // Container status is optional
    }

    // Test API routes
    const apiRoutes = [
      { path: '/healthz', method: 'GET' },
      { path: '/api/restaurants', method: 'GET' },
      { path: '/api/restaurants/1577', method: 'GET' },
      { path: '/api/restaurants/1577/view', method: 'POST' },
      { path: '/webhook/status', method: 'GET' },
      { path: '/api/container-status', method: 'GET' }
    ]

    const routeTests = await Promise.allSettled(
      apiRoutes.map(async (route) => {
        const routeStart = Date.now()
        try {
          const response = await fetch(`${serverUrl}${route.path}`, {
            method: route.method,
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          const responseTime = Date.now() - routeStart
          return {
            path: route.path,
            method: route.method,
            status: response.ok ? 'working' as const : 'failing' as const,
            responseTime,
            lastChecked: new Date().toISOString()
          }
        } catch (error) {
          const responseTime = Date.now() - routeStart
          return {
            path: route.path,
            method: route.method,
            status: 'failing' as const,
            responseTime,
            lastChecked: new Date().toISOString()
          }
        }
      })
    )

    const routes = routeTests
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)

    const apiRoutesStatus = {
      total: routes.length,
      working: routes.filter(r => r.status === 'working').length,
      failing: routes.filter(r => r.status === 'failing').length,
      routes
    }

    // System information (simplified)
    const system = {
      uptime: 'Unknown',
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      disk: {
        used: 0,
        total: 0,
        percentage: 0
      }
    }

    // Recent errors (simplified)
    const errors = {
      recent: [] as Array<{
        timestamp: string
        level: string
        message: string
        source: string
      }>,
      count: 0
    }

    const status: ServerStatus = {
      timestamp: new Date().toISOString(),
      backend: {
        status: backendStatus,
        responseTime: backendResponseTime,
        version: backendVersion
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        error: dbError
      },
      redis: {
        status: redisStatus,
        responseTime: redisResponseTime,
        error: redisError
      },
      containers,
      apiRoutes: apiRoutesStatus,
      system,
      errors
    }

    return NextResponse.json({
      success: true,
      data: status,
      responseTime: Date.now() - startTime
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 500 })
  }
}
