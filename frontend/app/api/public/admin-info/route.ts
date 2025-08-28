/* eslint-disable no-console */
import { NextRequest, NextResponse} from 'next/server';
import { prisma} from '@/lib/db/prisma';

export async function GET(_request: NextRequest) {
  try {

    const result: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'unknown',
      admin_structure: {
        superadminscount: 0,
        admin_rolescount: 0,
        totaladmins: 0
      }
    };

    // Test database connection
    try {

      await prisma.$connect();
      result.database = 'connected';
      
      // Count super admins

      const superAdminsCount = await prisma.user.count({
        where: {
          issuperadmin: true
        }
      });
      
      result.admin_structure.superadminscount = superAdminsCount;

      // Count admin roles

      const adminRolesCount = await prisma.adminRole.count({
        where: {
          isActive: true
        }
      });
      
      result.admin_structure.admin_rolescount = adminRolesCount;

      // Get unique admin user IDs
      const adminRoleUserIds = await prisma.adminRole.findMany({
        where: {
          isActive: true
        },
        select: {
          userId: true
        }
      });
      
      const adminUserIds = new Set([
        ...adminRoleUserIds.map(role => role.userId)
      ]);
      
      // Add super admin IDs
      const superAdmins = await prisma.user.findMany({
        where: {
          issuperadmin: true
        },
        select: {
          id: true
        }
      });
      
      superAdmins.forEach(admin => adminUserIds.add(admin.id));
      
      result.admin_structure.totaladmins = adminUserIds.size;

      await prisma.$disconnect();

    } catch (dbError) {
      console.error('[PUBLIC ADMIN INFO] Database error:', dbError);
      result.database = 'error';
      result.databaseerror = String(dbError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PUBLIC ADMIN INFO] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to get admin info',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
