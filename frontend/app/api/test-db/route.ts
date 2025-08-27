import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST-DB] Testing database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('[TEST-DB] Database connected successfully');
    
    // Test a simple query
    const restaurantCount = await prisma.restaurant.count();
    console.log('[TEST-DB] Restaurant count:', restaurantCount);
    
    await prisma.$disconnect();
    console.log('[TEST-DB] Database disconnected');
    
    return NextResponse.json({
      status: 'success',
      database: 'connected',
      restaurantCount,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('[TEST-DB] Error:', error);
    
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: String(error),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }, { status: 500 });
  }
}
