/* eslint-disable no-console */
import { _NextRequest, _NextResponse} from 'next/server';
import { _prisma} from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('[PUBLIC ADMIN INFO] Starting admin info request...');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'unknown',
      admin_structure: {
        super_admins_count: 0,
        admin_roles_count: 0,
        total_admins: 0
      }
    };

    // Test database connection
    try {
      console.log('[PUBLIC ADMIN INFO] Testing database connection...');
      await prisma.$connect();
      result.database = 'connected';
      
      // Count super admins
      console.log('[PUBLIC ADMIN INFO] Counting super admins...');
      const _superAdminsCount = await prisma.user.count({
        where: {
          issuperadmin: true
        }
      });
      
      result.admin_structure.super_admins_count = superAdminsCount;
      console.log('[PUBLIC ADMIN INFO] Super admins count:', superAdminsCount);
      
      // Count admin roles
      console.log('[PUBLIC ADMIN INFO] Counting admin roles...');
      const _adminRolesCount = await prisma.adminRole.count({
        where: {
          isActive: true
        }
      });
      
      result.admin_structure.admin_roles_count = adminRolesCount;
      console.log('[PUBLIC ADMIN INFO] Admin roles count:', adminRolesCount);
      
      // Get unique admin user IDs
      const _adminRoleUserIds = await prisma.adminRole.findMany({
        where: {
          isActive: true
        },
        select: {
          userId: true
        }
      });
      
      const _adminUserIds = new Set([
        ...adminRoleUserIds.map(role => role.userId)
      ]);
      
      // Add super admin IDs
      const _superAdmins = await prisma.user.findMany({
        where: {
          issuperadmin: true
        },
        select: {
          id: true
        }
      });
      
      superAdmins.forEach(admin => adminUserIds.add(admin.id));
      
      result.admin_structure.total_admins = adminUserIds.size;
      console.log('[PUBLIC ADMIN INFO] Total unique admins:', adminUserIds.size);
      
      await prisma.$disconnect();
      console.log('[PUBLIC ADMIN INFO] Database disconnected');
      
    } catch (_dbError) {
      console.error('[PUBLIC ADMIN INFO] Database error:', dbError);
      result.database = 'error';
      result.database_error = String(dbError);
    }

    console.log('[PUBLIC ADMIN INFO] Admin info result:', result);
    
    return NextResponse.json(result);
  } catch (_error) {
    console.error('[PUBLIC ADMIN INFO] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to get admin info',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
