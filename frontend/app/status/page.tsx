'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Server, HardDrive, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

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

export default function StatusPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/server-status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
      case 'connected':
      case 'working':
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'unhealthy':
      case 'disconnected':
      case 'failing':
      case 'stopped':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
      case 'connected':
      case 'working':
      case 'running':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>
      case 'unhealthy':
      case 'disconnected':
      case 'failing':
      case 'stopped':
        return <Badge variant="destructive">Unhealthy</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (loading && !status) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading server status...</span>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Error Loading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Server Status</h1>
          <p className="text-gray-600">
            Real-time monitoring of JewGo backend infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {status && (
        <>
          {/* Overall Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Backend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.backend.status)}
                  {getStatusBadge(status.backend.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status.backend.responseTime}ms
                  {status.backend.version && ` • v${status.backend.version}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.database.status)}
                  {getStatusBadge(status.database.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status.database.responseTime}ms
                  {status.database.error && ` • ${status.database.error}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Redis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.redis.status)}
                  {getStatusBadge(status.redis.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status.redis.responseTime}ms
                  {status.redis.error && ` • ${status.redis.error}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Containers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {status.containers.running}/{status.containers.total}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status.containers.stopped} stopped
                </p>
              </CardContent>
            </Card>
          </div>

          {/* API Routes Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                API Routes Status
              </CardTitle>
              <CardDescription>
                {status.apiRoutes.working}/{status.apiRoutes.total} routes working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {status.apiRoutes.routes.map((route, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(route.status)}
                      <span className="font-mono text-sm">{route.method}</span>
                      <span className="text-sm">{route.path}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(route.status)}
                      {route.responseTime && (
                        <span className="text-xs text-gray-500">
                          {route.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Container Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Container Status
              </CardTitle>
              <CardDescription>
                Docker containers running on the server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.containers.list.length > 0 ? (
                <div className="space-y-2">
                  {status.containers.list.map((container, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(container.status)}
                        <div>
                          <span className="font-medium">{container.name}</span>
                          <p className="text-xs text-gray-500">{container.image}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(container.status)}
                        <span className="text-xs text-gray-500">
                          {container.created}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No container information available
                </p>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Uptime</h4>
                  <p className="text-sm text-gray-600">{status.system.uptime}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Memory</h4>
                  <p className="text-sm text-gray-600">
                    {status.system.memory.percentage}% used
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Disk</h4>
                  <p className="text-sm text-gray-600">
                    {status.system.disk.percentage}% used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          {status.errors.recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Recent Errors
                </CardTitle>
                <CardDescription>
                  {status.errors.count} errors in the last hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.errors.recent.map((errorItem, index) => (
                    <div key={index} className="p-2 border border-red-200 rounded bg-red-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-800">
                          {errorItem.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-red-600">
                          {new Date(errorItem.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">{errorItem.message}</p>
                      <p className="text-xs text-red-600 mt-1">Source: {errorItem.source}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}