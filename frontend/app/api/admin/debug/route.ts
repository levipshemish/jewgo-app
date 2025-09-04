import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(_request: NextRequest) {
  try {
    adminLogger.info('Starting debug request');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'unknown',
      auth: 'unknown',
      admin_vars: {
        ADMIN_RBAC_FAIL_OPEN: process.env.ADMIN_RBAC_FAIL_OPEN,
        ADMIN_DEV_MOCK: process.env.ADMIN_DEV_MOCK,
        ADMIN_DEFAULT_ROLE: process.env.ADMIN_DEFAULT_ROLE,
        ADMIN_BYPASS_PERMS: process.env.ADMIN_BYPASS_PERMS,
        NODE_ENV: process.env.NODE_ENV,
      }
    };

    // Test database connection
    try {
      adminLogger.info('Testing database connection');
      await prisma.$connect();
      result.database = 'connected';
      
      // Test a simple query
      const restaurantCount = await prisma.restaurant.count();
      result.restaurant_count = restaurantCount;
      
      await prisma.$disconnect();
    } catch (dbError) {
      adminLogger.error('Database error', { error: String(dbError) });
      result.database = 'error';
      result.database_error = String(dbError);
    }

    // Test authentication
    try {
      adminLogger.info('Testing authentication');
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        result.auth = 'error';
        result.auth_error = String(error);
      } else if (!user) {
        result.auth = 'no_user';
      } else {
        result.auth = 'authenticated';
        result.user = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        };
        
        // Check if user has admin role
        try {
          const { data: adminRole } = await supabase
            .from('admin_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          result.admin_role = adminRole?.role || 'none';
        } catch (roleError) {
          result.admin_role = 'error';
          result.role_error = String(roleError);
        }
      }
    } catch (authError) {
      adminLogger.error('Auth error', { error: String(authError) });
      result.auth = 'error';
      result.auth_error = String(authError);
    }

    adminLogger.info('Debug result', result);
    
    return NextResponse.json(result);
  } catch (error) {
    adminLogger.error('Unexpected error', { error: String(error) });
    return NextResponse.json({ 
      error: 'Debug failed',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
