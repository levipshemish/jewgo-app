import { NextRequest } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { handleRestaurantStatusChange, validateRestaurantPermissions } from '@/lib/server/restaurant-status-utils';
import { errorResponses } from '@/lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    
    // Validate permissions using shared utility
    const permissionError = validateRestaurantPermissions(adminUser);
    if (permissionError) {
      return permissionError;
    }

    // Use shared utility for status change
    return await handleRestaurantStatusChange({
      request,
      params,
      action: 'approve',
      adminUser,
    });

  } catch (error) {
    adminLogger.error('Restaurant approve error', { error: String(error) });
    return errorResponses.internalError('Failed to approve restaurant');
  }
}
