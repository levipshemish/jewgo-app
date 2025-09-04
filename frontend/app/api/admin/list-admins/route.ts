import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
// import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function GET(_request: NextRequest) {
  try {
    adminLogger.info('Starting admin list request');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      super_admins: [],
      admin_roles: [],
      total_admins: 0
    };

    // Test database connection
    try {
      adminLogger.info('Testing database connection');
      await prisma.$connect();
      adminLogger.info('Database connected successfully');
      
      // Get super admins from users table
      adminLogger.info('Querying super admins');
      const superAdmins = await prisma.user.findMany({
        where: {
          issuperadmin: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          issuperadmin: true,
          createdat: true,
          updatedat: true
        },
        orderBy: {
          createdat: 'desc'
        }
      });
      
      result.super_admins = superAdmins;
      adminLogger.info('Found super admins', { count: superAdmins.length });
      
      // Get admin roles
      adminLogger.info('Querying admin roles');
      const adminRoles = await prisma.adminRole.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          userId: true,
          role: true,
          isActive: true,
          assignedAt: true,
          expiresAt: true
        },
        orderBy: {
          assignedAt: 'desc'
        }
      });
      
      result.admin_roles = adminRoles;
      adminLogger.info('Found admin roles', { count: adminRoles.length });
      
      // Get user details for admin roles
      if (adminRoles.length > 0) {
        const userIds = adminRoles.map(role => role.userId);
        const users = await prisma.user.findMany({
          where: {
            id: {
              in: userIds
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            issuperadmin: true
          }
        });
        
        // Combine admin roles with user details
        result.admin_roles_with_users = adminRoles.map(role => {
          const user = users.find(u => u.id === role.userId);
          return {
            ...role,
            user: user || null
          };
        });
      }
      
      // Calculate total admins (super admins + users with admin roles)
      const adminUserIds = new Set([
        ...superAdmins.map(admin => admin.id),
        ...adminRoles.map(role => role.userId)
      ]);
      result.total_admins = adminUserIds.size;
      
      await prisma.$disconnect();
      adminLogger.info('Database disconnected');
      
    } catch (dbError) {
      adminLogger.error('Database error', { error: String(dbError) });
      result.database_error = String(dbError);
    }

    adminLogger.info('Admin list result', result);
    
    return NextResponse.json(result);
  } catch (error) {
    adminLogger.error('Unexpected error', { error: String(error) });
    return NextResponse.json({ 
      error: 'Failed to get admin list',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
