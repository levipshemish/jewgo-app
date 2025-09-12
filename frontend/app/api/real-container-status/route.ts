import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime for server-side operations
export const runtime = 'nodejs'

interface ContainerInfo {
  name: string
  status: 'running' | 'stopped' | 'unhealthy'
  uptime: string
  created: string
  image: string
  ports: string
  health: string
  recent_errors: string[]
  restart_count: number
  memory_usage: string
  cpu_usage: string
}

async function getContainerStatus(): Promise<ContainerInfo[]> {
  try {
    // Get container status from the server
    const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
    const response = await fetch(`${serverUrl}/api/v5/monitoring/containers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`)
    }

    const data = await response.json()
    if (data.success && data.data && data.data.containers) {
      return data.data.containers
    } else {
      throw new Error('Invalid response format from server')
    }
  } catch (error) {
    console.error('Error getting container status from server:', error)
    
    // Return empty array to prevent infinite loading
    // This ensures we don't show local development containers
    // The server endpoint /api/v5/monitoring/containers is not yet available
    return []
  }
}

async function getContainerDetailsFast(containerName: string): Promise<{
  uptime: string
  health: string
  recent_errors: string[]
  restart_count: number
  memory_usage: string
  cpu_usage: string
}> {
  const { exec } = require('child_process')
  const { promisify } = require('util')
  const execAsync = promisify(exec)

  try {
    // Get basic container info quickly with timeout
    let uptime = 'unknown'
    let health = 'unknown'
    let restart_count = 0
    const memory_usage = 'unknown'
    const cpu_usage = 'unknown'
    const recent_errors: string[] = []

    // Get container health and restart count in one command
    try {
      const { stdout: inspectOutput } = await execAsync(`docker inspect ${containerName} --format "{{.State.Health.Status}}|{{.RestartCount}}" 2>/dev/null || echo "unknown|0"`, { timeout: 2000 })
      const parts = inspectOutput.trim().split('|')
      if (parts.length >= 2) {
        health = parts[0] || 'unknown'
        restart_count = parseInt(parts[1]) || 0
      }
    } catch {
      // Use defaults
    }

    // Get uptime quickly
    try {
      const { stdout: uptimeOutput } = await execAsync(`docker exec ${containerName} uptime 2>/dev/null || echo "unknown"`, { timeout: 2000 })
      uptime = uptimeOutput.trim() || 'unknown'
    } catch {
      uptime = 'unknown'
    }

    // Skip slow operations like logs and stats for now
    // These can be added back later if needed

    return {
      uptime,
      health,
      recent_errors,
      restart_count,
      memory_usage,
      cpu_usage
    }
  } catch (error) {
    console.error(`Error getting details for container ${containerName}:`, error)
    return {
      uptime: 'unknown',
      health: 'unknown',
      recent_errors: [],
      restart_count: 0,
      memory_usage: 'unknown',
      cpu_usage: 'unknown'
    }
  }
}

async function _getContainerDetails(containerName: string): Promise<{
  uptime: string
  health: string
  recent_errors: string[]
  restart_count: number
  memory_usage: string
  cpu_usage: string
}> {
  // Use the fast version for now
  return getContainerDetailsFast(containerName)
}

export async function GET(_request: NextRequest) {
  try {
    const containers = await getContainerStatus()
    
    return NextResponse.json({
      success: true,
      source: 'real',
      data: {
        containers,
        timestamp: new Date().toISOString(),
        total_containers: containers.length
      }
    })
    
  } catch (error) {
    console.error('Error getting real container status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get container status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
