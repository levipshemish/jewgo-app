import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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
      const superAdminCount = await prisma.user.count({
        where: {
          issuperadmin: true
        }
      });
      
      result.admin_structure.super_admins_count = superAdminCount;
      console.log('[PUBLIC ADMIN INFO] Found super admins:', superAdminCount);

      // Count admin roles
      console.log('[PUBLIC ADMIN INFO] Counting admin roles...');
      const adminRoleCount = await prisma.adminRole.count({
        where: {
          is_active: true
        }
      });
      
      result.admin_structure.admin_roles_count = adminRoleCount;
      console.log('[PUBLIC ADMIN INFO] Found admin roles:', adminRoleCount);

      result.admin_structure.total_admins = superAdminCount + adminRoleCount;
      
      // Get some sample admin emails (without exposing too much info)
      if (superAdminCount > 0) {
        const sampleSuperAdmins = await prisma.user.findMany({
          where: {
            issuperadmin: true
          },
          select: {
            email: true,
            name: true,
            createdat: true
          },
          take: 3
        });
        result.sample_super_admins = sampleSuperAdmins;
      }

      if (adminRoleCount > 0) {
        const sampleAdminRoles = await prisma.adminRole.findMany({
          where: {
            is_active: true
          },
          select: {
            role: true,
            assignedAt: true,
            expiresAt: true
          },
          take: 3
        });
        result.sample_admin_roles = sampleAdminRoles;
      }
      
      await prisma.$disconnect();
      console.log('[PUBLIC ADMIN INFO] Database disconnected');
      
    } catch (dbError) {
      console.error('[PUBLIC ADMIN INFO] Database error:', dbError);
      result.database = 'error';
      result.database_error = String(dbError);
    }

    console.log('[PUBLIC ADMIN INFO] Admin info result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PUBLIC ADMIN INFO] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to get admin info',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
