"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Server, Database, Webhook, Activity, ChevronDown, ChevronRight, FileText } from 'lucide-react'

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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
    case 'online':
    case 'connected':
    case 'running':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'unhealthy':
    case 'offline':
    case 'disconnected':
    case 'stopped':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'unhealthy':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    healthy: 'default',
    online: 'default',
    connected: 'default',
    running: 'default',
    unhealthy: 'destructive',
    offline: 'destructive',
    disconnected: 'destructive',
    stopped: 'destructive',
    unknown: 'secondary'
  } as const

  const colors = {
    healthy: 'bg-green-100 text-green-800',
    online: 'bg-green-100 text-green-800',
    connected: 'bg-green-100 text-green-800',
    running: 'bg-green-100 text-green-800',
    unhealthy: 'bg-red-100 text-red-800',
    offline: 'bg-red-100 text-red-800',
    disconnected: 'bg-red-100 text-red-800',
    stopped: 'bg-red-100 text-red-800',
    unknown: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      {status}
    </Badge>
  )
}

function ErrorLogs({ errors, title }: { errors: string[], title: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <FileText className="h-4 w-4" />
        {title} ({errors.length})
      </button>
      
      {isExpanded && (
        <div className="mt-2 ml-6 space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded border-l-2 border-red-300">
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        setLastRefresh(new Date())
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
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Loading system status...</p>
              <button 
                onClick={() => {
                  console.log('Manual refresh clicked')
                  fetchStatus()
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Manual Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error Loading Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchStatus} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Status Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring of backend services and infrastructure
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <p className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
            <Button 
              onClick={fetchStatus} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Overall System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <StatusIcon status={status.backend.status} />
                <div>
                  <p className="font-medium">Backend</p>
                  <StatusBadge status={status.backend.status} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusIcon status={status.database.status} />
                <div>
                  <p className="font-medium">Database</p>
                  <StatusBadge status={status.database.status} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusIcon status={status.redis.status} />
                <div>
                  <p className="font-medium">Redis</p>
                  <StatusBadge status={status.redis.status} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusIcon status={status.webhook.configured ? 'healthy' : 'unhealthy'} />
                <div>
                  <p className="font-medium">Webhook</p>
                  <StatusBadge status={status.webhook.configured ? 'healthy' : 'unhealthy'} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Routes Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                API Routes Status
              </CardTitle>
              <CardDescription>
                Health status of backend API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {status.routes.map((route, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={route.status} />
                        <div>
                          <p className="font-medium">{route.name}</p>
                          <p className="text-sm text-gray-500">{route.url}</p>
                          {route.error && (
                            <p className="text-sm text-red-600">{route.error}</p>
                          )}
                          {route.failureCount && route.failureCount > 0 && (
                            <p className="text-sm text-red-600">
                              Failed {route.failureCount} time{route.failureCount > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={route.status} />
                        {route.responseTime && (
                          <p className="text-sm text-gray-500 mt-1">
                            {route.responseTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {route.errorDetails && (
                      <ErrorLogs errors={[route.errorDetails]} title="Error Details" />
                    )}
                    
                    {route.lastSuccess && (
                      <p className="text-xs text-green-600 mt-2">
                        Last success: {new Date(route.lastSuccess).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Container Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Container Status
              </CardTitle>
              <CardDescription>
                Status of Docker containers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {status.containers.map((container, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={container.status} />
                        <div>
                          <p className="font-medium">{container.name}</p>
                          {container.uptime && (
                            <p className="text-sm text-gray-500">Uptime: {container.uptime}</p>
                          )}
                          {container.healthCheck && (
                            <p className="text-sm text-gray-500">Health: {container.healthCheck}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={container.status} />
                    </div>
                    
                    {container.recentErrors && container.recentErrors.length > 0 && (
                      <ErrorLogs errors={container.recentErrors} title="Recent Errors" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhook Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Status
            </CardTitle>
            <CardDescription>
              GitHub webhook configuration and recent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <StatusIcon status={status.webhook.configured ? 'healthy' : 'unhealthy'} />
                <div>
                  <p className="font-medium">Configuration</p>
                  <StatusBadge status={status.webhook.configured ? 'healthy' : 'unhealthy'} />
                </div>
              </div>
              <div>
                <p className="font-medium">Recent Deliveries</p>
                <p className="text-2xl font-bold text-blue-600">{status.webhook.recentDeliveries}</p>
                {status.webhook.failureCount && status.webhook.failureCount > 0 && (
                  <p className="text-sm text-red-600">
                    {status.webhook.failureCount} failures
                  </p>
                )}
              </div>
              <div>
                <p className="font-medium">Last Activity</p>
                <p className="text-sm text-gray-500">
                  {status.webhook.lastActivity 
                    ? new Date(status.webhook.lastActivity).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            
            {status.webhook.recentErrors && status.webhook.recentErrors.length > 0 && (
              <div className="mt-4">
                <ErrorLogs errors={status.webhook.recentErrors} title="Webhook Errors" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              General system details and metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Backend Uptime</p>
                <p className="text-gray-600">{status.backend.uptime || 'Unknown'}</p>
              </div>
              <div>
                <p className="font-medium">Last Status Check</p>
                <p className="text-gray-600">
                  {new Date(status.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-medium">Database Last Check</p>
                <p className="text-gray-600">
                  {new Date(status.database.lastCheck).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-medium">Redis Last Check</p>
                <p className="text-gray-600">
                  {new Date(status.redis.lastCheck).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
