import { NextRequest, NextResponse } from 'next/server';
import { errorResponses, createSuccessResponse } from '../utils/error-responses';
import { logAdminAction } from '../admin/audit';

export interface RestaurantStatusChangeParams {
  request: NextRequest;
  params: Promise<{ id: string }>;
  action: 'approve' | 'reject';
  adminUser: any;
  reason?: string;
}

export interface StatusChangeResult {
  success: boolean;
  message: string;
  data?: any;
  status?: number;
}

/**
 * Shared utility for handling restaurant status changes (approve/reject)
 * Eliminates duplication between admin and regular approval/rejection routes
 * Server-only utility for API routes
 */
export async function handleRestaurantStatusChange({
  request,
  params,
  action,
  adminUser,
  reason
}: RestaurantStatusChangeParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return errorResponses.badRequest('Invalid restaurant ID');
    }

    // Determine the target API endpoint based on action and context
    const isAdminRoute = request.nextUrl.pathname.includes('/admin/');
    const targetEndpoint = isAdminRoute 
      ? `/api/restaurants/${restaurantId}/${action}`
      : `/api/v4/restaurants/${restaurantId}/${action}`;

    // Prepare request body
    const requestBody: any = { status: action === 'approve' ? 'approved' : 'rejected' };
    if (action === 'reject' && reason) {
      requestBody.reason = reason;
    }

    // Make the API call
    const response = await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${targetEndpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(adminUser?.token && { 'Authorization': `Bearer ${adminUser.token}` }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return errorResponses.backendError(
        response.status,
        `Failed to ${action} restaurant`,
        errorData
      );
    }

    const result = await response.json();

    // Log admin action if applicable
    if (adminUser && isAdminRoute) {
      const auditData = {
        entityId: String(restaurantId),
        newData: action === 'reject' ? { ...result, rejection_reason: reason } : result,
        auditLevel: action === 'approve' ? 'info' as const : 'warning' as const,
      };

      await logAdminAction(adminUser, `restaurant_${action}`, 'restaurant', auditData);
    }

    // Handle notifications for production
    if (process.env.NODE_ENV === 'production' && result.data?.owner_email) {
      try {
        const notificationEndpoint = action === 'approve' 
          ? '/api/notifications/restaurant-approved'
          : '/api/notifications/restaurant-rejected';
        
        await fetch(notificationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant: result.data,
            [action === 'approve' ? 'approvedBy' : 'rejectedBy']: 'Admin',
            ...(action === 'reject' && { reason: reason || 'Rejected by admin' }),
          }),
        });
      } catch (notificationError) {
        // Log but don't fail the main operation
        console.warn('Failed to send notification:', notificationError);
      }
    }

    return createSuccessResponse(
      result.data || {
        id: restaurantId,
        status: action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      },
      `Restaurant ${action}d successfully`
    );

  } catch (error) {
    console.error(`Restaurant ${action} error:`, error);
    return errorResponses.internalError(`Failed to ${action} restaurant`);
  }
}

/**
 * Helper function to validate admin permissions for restaurant operations
 */
export function validateRestaurantPermissions(adminUser: any, requiredPermission = 'restaurant:edit'): NextResponse | null {
  if (!adminUser) {
    return errorResponses.unauthorized();
  }

  if (!adminUser.permissions?.includes(requiredPermission)) {
    return errorResponses.insufficientPermissions(requiredPermission);
  }

  return null;
}
