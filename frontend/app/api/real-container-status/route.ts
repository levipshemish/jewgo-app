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
    // Get local containers (real data from the development environment)
    // Note: Server endpoint /api/v5/monitoring/containers is not yet available
    // TODO: Switch back to server endpoint once it's deployed
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    // Get all containers with basic information only (much faster)
    const { stdout: containersOutput } = await execAsync('docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}|{{.CreatedAt}}"', { timeout: 5000 })
    
    const containers: ContainerInfo[] = []
    const containerLines = containersOutput.trim().split('\n').filter((line: string) => line.trim())

    for (const line of containerLines) {
      const parts = line.split('|')
      if (parts.length >= 5) {
        const name = parts[0]
        const status = parts[1]
        const image = parts[2]
        const ports = parts[3]
        const created = parts[4]

        // Skip non-jewgo containers
        if (!name.includes('jewgo')) {
          continue
        }

        // Determine container status
        let containerStatus: 'running' | 'stopped' | 'unhealthy' = 'stopped'
        if (status.includes('Up')) {
          if (status.includes('unhealthy')) {
            containerStatus = 'unhealthy'
          } else {
            containerStatus = 'running'
          }
        }

        // Get basic container information (without detailed stats to avoid delays)
        const containerDetails = await getContainerDetailsFast(name)
        
        containers.push({
          name,
          status: containerStatus,
          uptime: containerDetails.uptime,
          created,
          image,
          ports,
          health: containerDetails.health,
          recent_errors: containerDetails.recent_errors,
          restart_count: containerDetails.restart_count,
          memory_usage: containerDetails.memory_usage,
          cpu_usage: containerDetails.cpu_usage
        })
      }
    }

    return containers
  } catch (error) {
    console.error('Error getting container status:', error)
    // Return empty array instead of throwing to prevent infinite loading
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
    let memory_usage = 'unknown'
    let cpu_usage = 'unknown'
    let recent_errors: string[] = []

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

async function getContainerDetails(containerName: string): Promise<{
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