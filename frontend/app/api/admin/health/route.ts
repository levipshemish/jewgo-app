import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Test a simple query
    const restaurantCount = await prisma.restaurant.count();
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      restaurantCount,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('[ADMIN HEALTH] Error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }, { status: 503 });
  }
}
