import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface RealSystemMetrics {
  cpu: {
    usage: number
    cores: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    percentage: number
  }
  disk: {
    total: number
    used: number
    free: number
    percentage: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
  }
  uptime: number
  timestamp: string
}

async function getSystemUptime(): Promise<number> {
  try {
    const { stdout } = await execAsync('uptime -p')
    // Parse uptime string like "up 2 days, 5 hours, 30 minutes"
    const match = stdout.match(/up\s+(\d+)\s+days?[,\s]*(\d+)?\s*hours?[,\s]*(\d+)?\s*minutes?/)
    if (match) {
      const days = parseInt(match[1]) || 0
      const hours = parseInt(match[2]) || 0
      const minutes = parseInt(match[3]) || 0
      return (days * 24 * 60) + (hours * 60) + minutes
    }
    return 0
  } catch (error) {
    console.error('Error getting uptime:', error)
    return 0
  }
}

async function getCPUMetrics(): Promise<{ usage: number; cores: number; loadAverage: number[] }> {
  try {
    // Get CPU usage using top command
    const { stdout } = await execAsync("top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'")
    const usage = parseFloat(stdout.trim()) || 0
    
    // Get number of cores
    const { stdout: coresOutput } = await execAsync('sysctl -n hw.ncpu')
    const cores = parseInt(coresOutput.trim()) || 1
    
    // Get load average
    const { stdout: loadOutput } = await execAsync('uptime | awk -F\'load averages:\' \'{print $2}\' | awk \'{print $1, $2, $3}\' | sed \'s/,//g\'')
    const loadAverage = loadOutput.trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
    
    return { usage, cores, loadAverage }
  } catch (error) {
    console.error('Error getting CPU metrics:', error)
    return { usage: 0, cores: 1, loadAverage: [0, 0, 0] }
  }
}

async function getMemoryMetrics(): Promise<{ total: number; used: number; free: number; percentage: number }> {
  try {
    const { stdout } = await execAsync('vm_stat')
    const lines = stdout.split('\n')
    
    let pageSize = 4096
    let free = 0
    let active = 0
    let inactive = 0
    let speculative = 0
    let wired = 0
    let compressed = 0
    
    for (const line of lines) {
      if (line.includes('page size of')) {
        const match = line.match(/(\d+)/)
        if (match) pageSize = parseInt(match[1])
      } else if (line.includes('Pages free:')) {
        const match = line.match(/(\d+)/)
        if (match) free = parseInt(match[1])
      } else if (line.includes('Pages active:')) {
        const match = line.match(/(\d+)/)
        if (match) active = parseInt(match[1])
      } else if (line.includes('Pages inactive:')) {
        const match = line.match(/(\d+)/)
        if (match) inactive = parseInt(match[1])
      } else if (line.includes('Pages speculative:')) {
        const match = line.match(/(\d+)/)
        if (match) speculative = parseInt(match[1])
      } else if (line.includes('Pages wired down:')) {
        const match = line.match(/(\d+)/)
        if (match) wired = parseInt(match[1])
      } else if (line.includes('Pages stored in compressor:')) {
        const match = line.match(/(\d+)/)
        if (match) compressed = parseInt(match[1])
      }
    }
    
    const total = (free + active + inactive + speculative + wired + compressed) * pageSize
    const used = (active + inactive + speculative + wired + compressed) * pageSize
    const freeBytes = free * pageSize
    const percentage = total > 0 ? (used / total) * 100 : 0
    
    return { total, used, free: freeBytes, percentage }
  } catch (error) {
    console.error('Error getting memory metrics:', error)
    return { total: 0, used: 0, free: 0, percentage: 0 }
  }
}

async function getDiskMetrics(): Promise<{ total: number; used: number; free: number; percentage: number }> {
  try {
    const { stdout } = await execAsync('df -h / | tail -1')
    const parts = stdout.trim().split(/\s+/)
    
    if (parts.length >= 4) {
      const totalStr = parts[1]
      const usedStr = parts[2]
      const freeStr = parts[3]
      
      // Convert human readable sizes to bytes
      const parseSize = (size: string): number => {
        const num = parseFloat(size)
        if (size.includes('T')) return num * 1024 * 1024 * 1024 * 1024
        if (size.includes('G')) return num * 1024 * 1024 * 1024
        if (size.includes('M')) return num * 1024 * 1024
        if (size.includes('K')) return num * 1024
        return num
      }
      
      const total = parseSize(totalStr)
      const used = parseSize(usedStr)
      const free = parseSize(freeStr)
      const percentage = total > 0 ? (used / total) * 100 : 0
      
      return { total, used, free, percentage }
    }
    
    return { total: 0, used: 0, free: 0, percentage: 0 }
  } catch (error) {
    console.error('Error getting disk metrics:', error)
    return { total: 0, used: 0, free: 0, percentage: 0 }
  }
}

async function getNetworkMetrics(): Promise<{ bytesIn: number; bytesOut: number; packetsIn: number; packetsOut: number }> {
  try {
    const { stdout } = await execAsync('netstat -ib | grep -E "en0|wlan0|eth0" | head -1')
    const parts = stdout.trim().split(/\s+/)
    
    if (parts.length >= 10) {
      const bytesIn = parseInt(parts[6]) || 0
      const bytesOut = parseInt(parts[9]) || 0
      const packetsIn = parseInt(parts[4]) || 0
      const packetsOut = parseInt(parts[7]) || 0
      
      return { bytesIn, bytesOut, packetsIn, packetsOut }
    }
    
    return { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
  } catch (error) {
    console.error('Error getting network metrics:', error)
    return { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Collect real system metrics
    const [cpu, memory, disk, network, uptime] = await Promise.all([
      getCPUMetrics(),
      getMemoryMetrics(),
      getDiskMetrics(),
      getNetworkMetrics(),
      getSystemUptime()
    ])
    
    const realMetrics: RealSystemMetrics = {
      cpu,
      memory,
      disk,
      network,
      uptime,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: realMetrics,
      source: 'real'
    })
  } catch (error) {
    console.error('Error collecting real system metrics:', error)
    
    // Fallback to mock data if real collection fails
    const mockMetrics = {
      cpu: { usage: Math.random() * 100, cores: 4, loadAverage: [0.5, 0.8, 1.2] },
      memory: { total: 8192, used: Math.random() * 8192, free: 8192 - (Math.random() * 8192), percentage: Math.random() * 100 },
      disk: { total: 100000, used: Math.random() * 100000, free: 100000 - (Math.random() * 100000), percentage: Math.random() * 100 },
      network: { bytesIn: Math.random() * 1000000, bytesOut: Math.random() * 1000000, packetsIn: Math.floor(Math.random() * 10000), packetsOut: Math.floor(Math.random() * 10000) },
      uptime: 0,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: mockMetrics,
      source: 'mock_fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
