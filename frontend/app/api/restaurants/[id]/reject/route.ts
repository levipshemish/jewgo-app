import { NextRequest } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { errorResponses, createSuccessResponse } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    const token = admin?.token || '';

    try {
      const { id } = await params;
      const restaurantId = parseInt(id);
      
      if (isNaN(restaurantId)) {
        return errorResponses.badRequest('Invalid restaurant ID');
      }

      const body = await request.json();
      const { status, reason } = body;

      // Update restaurant status in database via backend API using centralized URL
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const apiUrl = `${backendUrl}/api/v4/restaurants/${restaurantId}/reject`;
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          status: status || 'rejected',
          reason: reason || 'Rejected by admin'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Send notification email to restaurant owner (if email is available)
      if (process.env.NODE_ENV === 'production' && result.data?.owner_email) {
        try {
          await fetch('/api/notifications/restaurant-rejected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant: result.data,
              rejectedBy: 'Admin',
              reason: reason || 'Rejected by admin',
            }),
          });
        } catch {
          // Silently fail notification - don't break main operation
        }
      }

      return createSuccessResponse(
        result.data || {
          id: restaurantId,
          status: 'rejected',
          updated_at: new Date().toISOString()
        },
        'Restaurant rejected successfully'
      );

    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      return errorResponses.internalError('Failed to reject restaurant');
    }
  });
} 
