import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN LIST] Starting admin list request...');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      super_admins: [],
      admin_roles: [],
      total_admins: 0
    };

    // Test database connection
    try {
      console.log('[ADMIN LIST] Testing database connection...');
      await prisma.$connect();
      console.log('[ADMIN LIST] Database connected successfully');
      
      // Get super admins from users table
      console.log('[ADMIN LIST] Querying super admins...');
      const superAdmins = await prisma.user.findMany({
        where: {
          issuperadmin: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdat: true,
          issuperadmin: true
        }
      });
      
      result.super_admins = superAdmins;
      console.log('[ADMIN LIST] Found super admins:', superAdmins.length);

      // Get admin roles from admin_roles table
      console.log('[ADMIN LIST] Querying admin roles...');
      const adminRoles = await prisma.adminRole.findMany({
        where: {
          is_active: true
        },
        select: {
          id: true,
          user_id: true,
          role: true,
          is_active: true,
          created_at: true,
          expires_at: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      result.admin_roles = adminRoles;
      console.log('[ADMIN LIST] Found admin roles:', adminRoles.length);

      // Get user details for admin roles
      if (adminRoles.length > 0) {
        const userIds = adminRoles.map(role => role.user_id);
        const users = await prisma.user.findMany({
          where: {
            id: {
              in: userIds
            }
          },
          select: {
            id: true,
            email: true,
            name: true,
            createdat: true
          }
        });
        
        // Combine admin roles with user details
        result.admin_roles_with_users = adminRoles.map(role => {
          const user = users.find(u => u.id === role.user_id);
          return {
            ...role,
            user: user || null
          };
        });
      }

      result.total_admins = result.super_admins.length + result.admin_roles.length;
      
      await prisma.$disconnect();
      console.log('[ADMIN LIST] Database disconnected');
      
    } catch (dbError) {
      console.error('[ADMIN LIST] Database error:', dbError);
      result.database_error = String(dbError);
    }

    console.log('[ADMIN LIST] Admin list result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN LIST] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to list admins',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
