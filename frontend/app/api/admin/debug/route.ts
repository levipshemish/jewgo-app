import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
// PostgreSQL auth - using backend API instead of Supabase
import { prisma } from '@/lib/db/prisma';

export async function GET(_request: NextRequest) {
  try {
    adminLogger.info('Starting debug request');

    const result = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      auth: 'not_implemented',
      database: 'unknown',
      prisma: 'unknown',
      errors: [] as string[]
    };

    // Test database connection
    try {
      adminLogger.info('Testing database connection');
      await prisma.$queryRaw`SELECT 1`;
      result.database = 'connected';
      result.prisma = 'working';
    } catch (error) {
      result.database = 'error';
      result.prisma = 'error';
      result.errors.push(`Database error: ${error}`);
      adminLogger.error('Database connection failed', { error });
    }

    // PostgreSQL auth - debug functionality not implemented yet
    adminLogger.info('Admin debug functionality not implemented for PostgreSQL auth');
    result.auth = 'not_implemented';
    result.errors.push('Authentication debug not implemented for PostgreSQL auth');

    adminLogger.info('Debug request completed', { result });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    adminLogger.error('Debug request failed', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}