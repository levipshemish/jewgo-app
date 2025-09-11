import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

interface ApiRoute {
  path: string
  methods: string[]
  type: 'file' | 'directory'
  size?: number
  lastModified?: string
}

export async function GET(_request: NextRequest) {
  try {
    const apiRoutes: ApiRoute[] = []
    const apiDir = join(process.cwd(), 'app/api')
    
    function scanDirectory(dirPath: string, basePath: string = '') {
      try {
        const items = readdirSync(dirPath)
        
        for (const item of items) {
          const fullPath = join(dirPath, item)
          const relativePath = basePath ? `${basePath}/${item}` : item
          const stats = statSync(fullPath)
          
          if (stats.isDirectory()) {
            // Skip node_modules and other non-API directories
            if (!item.startsWith('.') && !item.includes('node_modules')) {
              apiRoutes.push({
                path: `/api/${relativePath}`,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                type: 'directory',
                lastModified: stats.mtime.toISOString()
              })
              scanDirectory(fullPath, relativePath)
            }
          } else if (item === 'route.ts') {
            // This is an API route file
            const routePath = basePath ? `/api/${basePath}` : '/api'
            const existingRoute = apiRoutes.find(r => r.path === routePath)
            
            if (existingRoute) {
              existingRoute.type = 'file'
              existingRoute.size = stats.size
              existingRoute.lastModified = stats.mtime.toISOString()
            } else {
              apiRoutes.push({
                path: routePath,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                type: 'file',
                size: stats.size,
                lastModified: stats.mtime.toISOString()
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error)
      }
    }
    
    scanDirectory(apiDir)
    
    // Sort routes by path
    apiRoutes.sort((a, b) => a.path.localeCompare(b.path))
    
    // Categorize routes
    const categorizedRoutes = {
      core: apiRoutes.filter(r => 
        r.path.includes('/status') || 
        r.path.includes('/health') || 
        r.path.includes('/metrics') ||
        r.path.includes('/real-')
      ),
      admin: apiRoutes.filter(r => r.path.includes('/admin/')),
      auth: apiRoutes.filter(r => r.path.includes('/auth/')),
      data: apiRoutes.filter(r => 
        r.path.includes('/restaurants') || 
        r.path.includes('/reviews') || 
        r.path.includes('/users') ||
        r.path.includes('/statistics')
      ),
      system: apiRoutes.filter(r => 
        r.path.includes('/migrate') || 
        r.path.includes('/update-database') ||
        r.path.includes('/cron/') ||
        r.path.includes('/maintenance/')
      ),
      v4: apiRoutes.filter(r => r.path.includes('/v4/')),
      v5: apiRoutes.filter(r => r.path.includes('/v5/')),
      other: apiRoutes.filter(r => 
        !r.path.includes('/admin/') &&
        !r.path.includes('/auth/') &&
        !r.path.includes('/restaurants') &&
        !r.path.includes('/reviews') &&
        !r.path.includes('/users') &&
        !r.path.includes('/statistics') &&
        !r.path.includes('/migrate') &&
        !r.path.includes('/update-database') &&
        !r.path.includes('/cron/') &&
        !r.path.includes('/maintenance/') &&
        !r.path.includes('/v4/') &&
        !r.path.includes('/v5/') &&
        !r.path.includes('/status') &&
        !r.path.includes('/health') &&
        !r.path.includes('/metrics') &&
        !r.path.includes('/real-')
      )
    }
    
    return NextResponse.json({
      success: true,
      source: 'real',
      data: {
        total_routes: apiRoutes.length,
        categorized_routes: categorizedRoutes,
        all_routes: apiRoutes,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error getting API routes:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get API routes',
      data: {
        total_routes: 0,
        categorized_routes: {},
        all_routes: [],
        timestamp: new Date().toISOString()
      }
    })
  }
}
