import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adminLogger } from '@/lib/admin/logger';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function POST(request: NextRequest) {
  try {
    adminLogger.info('Starting user promotion request');
    
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      adminLogger.warn('Unauthorized promotion attempt');
      return errorResponses.unauthorized();
    }

    // Check permissions - only super admins can promote users
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_EDIT)) {
      adminLogger.warn('Insufficient permissions for user promotion', { 
        userId: adminUser.id,
        permissions: adminUser.permissions 
      });
      return errorResponses.forbidden();
    }

    // Parse request body
    const body = await request.json();
    const { targetUserId, targetEmail } = body;

    if (!targetUserId && !targetEmail) {
      adminLogger.warn('Missing target user identifier');
      return errorResponses.badRequest();
    }

    // Get Supabase admin client
    const supabase = await createServerSupabaseClient();
    
    let targetUser;
    
    // Find the target user
    if (targetUserId) {
      const { data: user, error } = await supabase.auth.admin.getUserById(targetUserId);
      if (error || !user.user) {
        adminLogger.error('Failed to find user by ID', { targetUserId, error });
        return errorResponses.notFound();
      }
      targetUser = user.user;
    } else if (targetEmail) {
      // Find user by email using listUsers and filtering
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) {
        adminLogger.error('Failed to list users', { error });
        return errorResponses.internalError();
      }
      
      const user = users.users.find((u: any) => u.email === targetEmail);
      if (!user) {
        adminLogger.error('User not found by email', { targetEmail });
        return errorResponses.notFound();
      }
      targetUser = user;
    }

    if (!targetUser) {
      adminLogger.error('Target user not found');
      return errorResponses.notFound();
    }

    // Check if user is already a super admin
    const currentMetadata = targetUser.user_metadata || {};
    if (currentMetadata.issuperadmin) {
      adminLogger.info('User is already a super admin', { 
        targetUserId: targetUser.id,
        targetEmail: targetUser.email 
      });
      return NextResponse.json({ 
        message: 'User is already a super admin',
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.user_metadata?.name || targetUser.email
        }
      });
    }

    // Update user metadata to make them a super admin
    const updatedMetadata = {
      ...currentMetadata,
      issuperadmin: true,
      promoted_by: adminUser.id,
      promoted_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { user_metadata: updatedMetadata }
    );

    if (updateError) {
      adminLogger.error('Failed to promote user', { 
        targetUserId: targetUser.id,
        error: updateError 
      });
      return NextResponse.json({ 
        error: 'Failed to promote user',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      }, { status: 500 });
    }

    adminLogger.info('User promoted to super admin successfully', {
      promotedBy: adminUser.id,
      promotedUser: targetUser.id,
      promotedEmail: targetUser.email
    });

    return NextResponse.json({
      message: 'User promoted to super admin successfully',
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: updatedUser.user.user_metadata?.name || updatedUser.user.email,
        issuperadmin: true
      }
    });

  } catch (error) {
    adminLogger.error('Unexpected error in user promotion', { error: String(error) });
    return NextResponse.json({ 
      error: 'Failed to promote user',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
