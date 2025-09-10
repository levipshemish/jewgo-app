import { NextRequest, NextResponse } from 'next/server'

interface ContainerInfo {
  name: string
  status: string
  image: string
  ports: string
  created: string
  uptime: string
  health: string
  recent_errors: string[]
}

interface ContainerStatusResponse {
  success: boolean
  data: {
    containers: ContainerInfo[]
    timestamp: string
    total_containers: number
  }
  error?: string
  details?: string
}

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'
    
    const response = await fetch(`${backendUrl}/api/container-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data: ContainerStatusResponse = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get container status')
    }

    return NextResponse.json({
      success: true,
      data: data.data,
      source: 'real'
    })
  } catch (error) {
    console.error('Error fetching real container status:', error)
    
    // Fallback to mock data if real collection fails
    const mockContainers: ContainerInfo[] = [
      {
        name: 'jewgo_backend',
        status: 'running',
        image: 'jewgo-app-backend:latest',
        ports: '5000/tcp',
        created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        uptime: '2h 15m',
        health: 'healthy',
        recent_errors: []
      },
      {
        name: 'jewgo_webhook',
        status: 'running',
        image: 'jewgo-app-webhook:latest',
        ports: '8080/tcp',
        created: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        uptime: '30m',
        health: 'healthy',
        recent_errors: []
      },
      {
        name: 'jewgo_postgres',
        status: 'running',
        image: 'postgres:15',
        ports: '5432/tcp',
        created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        uptime: '2h 15m',
        health: 'healthy',
        recent_errors: []
      },
      {
        name: 'jewgo_redis',
        status: 'running',
        image: 'redis:7-alpine',
        ports: '6379/tcp',
        created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        uptime: '2h 15m',
        health: 'healthy',
        recent_errors: []
      },
      {
        name: 'jewgo_nginx',
        status: 'running',
        image: 'nginx:alpine',
        ports: '80/tcp, 443/tcp',
        created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        uptime: '2h 15m',
        health: 'healthy',
        recent_errors: []
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        containers: mockContainers,
        timestamp: new Date().toISOString(),
        total_containers: mockContainers.length
      },
      source: 'mock_fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
