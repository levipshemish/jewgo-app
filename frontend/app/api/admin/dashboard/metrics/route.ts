import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

interface DashboardMetrics {
  totalUsers: number;
  totalRestaurants: number;
  totalReviews: number;
  pendingSubmissions: number;
  userGrowth: number;
  restaurantGrowth: number;
  reviewGrowth: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    responseTime: number;
    errorRate: number;
  };
}

async function calculateGrowthPercentage(
  currentCount: number
): Promise<number> {
  // For now, return a mock growth percentage
  // TODO: Implement actual database queries when prisma setup is complete
  return Math.round((Math.random() * 30 - 5) * 100) / 100; // -5% to +25% growth
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access  
    const admin = await requireAdmin(request);
    
    // All admin roles can access basic metrics
    if (!admin || !admin.adminRole || admin.roleLevel < 1) {
      return NextResponse.json(
        { error: 'Insufficient permissions for dashboard metrics' },
        { status: 403 }
      );
    }

    const startTime = Date.now();
    
    // Mock data for now - TODO: Replace with actual database queries
    const totalUsers = 1247;
    const totalRestaurants = 89;
    const totalReviews = 543;
    const pendingSubmissions = 12;

    // Calculate growth percentages
    const [userGrowth, restaurantGrowth, reviewGrowth] = await Promise.all([
      calculateGrowthPercentage(totalUsers),
      calculateGrowthPercentage(totalRestaurants),
      calculateGrowthPercentage(totalReviews)
    ]);

    const responseTime = Date.now() - startTime;

    // System health calculation
    const systemHealth = {
      status: (responseTime < 1000 && totalUsers > 0) ? 'healthy' as const : 
              (responseTime < 3000) ? 'warning' as const : 'error' as const,
      uptime: '99.8%', // This would come from monitoring service
      responseTime,
      errorRate: 0.02 // This would come from error tracking service
    };

    const metrics: DashboardMetrics = {
      totalUsers,
      totalRestaurants,
      totalReviews,
      pendingSubmissions,
      userGrowth: Math.round(userGrowth * 100) / 100,
      restaurantGrowth: Math.round(restaurantGrowth * 100) / 100,
      reviewGrowth: Math.round(reviewGrowth * 100) / 100,
      systemHealth
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    
    // Return fallback metrics to prevent dashboard failure
    const fallbackMetrics: DashboardMetrics = {
      totalUsers: 0,
      totalRestaurants: 0,
      totalReviews: 0,
      pendingSubmissions: 0,
      userGrowth: 0,
      restaurantGrowth: 0,
      reviewGrowth: 0,
      systemHealth: {
        status: 'error',
        uptime: 'Unknown',
        responseTime: 0,
        errorRate: 0
      }
    };

    return NextResponse.json(fallbackMetrics, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}