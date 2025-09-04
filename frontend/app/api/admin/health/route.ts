import { NextRequest, NextResponse } from 'next/server';
import { AdminDatabaseService } from '@/lib/admin/database';
import { adminLogger } from '@/lib/admin/logger';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function GET(_request: NextRequest) {
  try {
    const healthStatus: {
      status: 'healthy' | 'unhealthy';
      timestamp: string;
      services: {
        database: any;
        redis: any;
        external: any;
      };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: null as any,
        redis: null as any,
        external: null as any,
      },
    };

    // Check database health
    try {
      const dbHealth = await AdminDatabaseService.healthCheck();
      healthStatus.services.database = dbHealth;
    } catch (dbError) {
      adminLogger.warn('Database health check failed', { error: String(dbError) });
      healthStatus.services.database = {
        status: 'unhealthy',
        message: String(dbError),
        timestamp: new Date(),
      };
    }

    // Check Redis health (if configured)
    try {
      // TODO: Implement Redis health check when Redis is configured
      healthStatus.services.redis = {
        status: 'healthy',
        message: 'Redis not configured',
        timestamp: new Date(),
      };
    } catch (redisError) {
      adminLogger.warn('Redis health check failed', { error: String(redisError) });
      healthStatus.services.redis = {
        status: 'unhealthy',
        message: String(redisError),
        timestamp: new Date(),
      };
    }

    // Check external services health
    try {
      // TODO: Implement external service health checks
      healthStatus.services.external = {
        status: 'healthy',
        message: 'External services not configured',
        timestamp: new Date(),
      };
    } catch (externalError) {
      adminLogger.warn('External services health check failed', { error: String(externalError) });
      healthStatus.services.external = {
        status: 'unhealthy',
        message: String(externalError),
        timestamp: new Date(),
      };
    }

    // Determine overall health status
    const allServices = Object.values(healthStatus.services);
    const unhealthyServices = allServices.filter(service => service?.status === 'unhealthy');
    
    if (unhealthyServices.length > 0) {
      healthStatus.status = 'unhealthy';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    adminLogger.error('Health check failed', { error: String(error) });
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
