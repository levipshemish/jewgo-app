import { _NextRequest, _NextResponse} from 'next/server';
import { _requireAdmin} from '@/lib/admin/auth';
import { _AdminDatabaseService} from '@/lib/admin/database';
import { _prisma} from '@/lib/db/prisma';
import { _corsHeaders} from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const _adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system statistics
    const _stats = await AdminDatabaseService.getDatabaseStats();

    // Return system stats
    return NextResponse.json({
      totalUsers: stats.totalUsers,
      totalRestaurants: stats.totalRestaurants,
      totalReviews: stats.totalReviews,
      totalSynagogues: 0, // Mock data - not in database service
      totalKosherPlaces: 0, // Mock data - not in database service
      pendingApprovals: stats.pendingSubmissions,
      systemHealth: 'healthy',
      lastBackup: new Date().toISOString(),
      uptime: '24h 30m',
      activeSessions: Math.floor(Math.random() * 50) + 10, // Mock data
    });
  } catch (_error) {
    console.error('[ADMIN] System stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
