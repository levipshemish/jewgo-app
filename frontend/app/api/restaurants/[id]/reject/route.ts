import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

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
        return NextResponse.json({
          success: false,
          message: 'Invalid restaurant ID'
        }, { status: 400 });
      }

      const body = await request.json();
      const { status, reason } = body;

      // Update restaurant status in database via backend API
      const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
      const apiUrl = `${backendUrl}/api/v4/restaurants/${restaurantId}/reject`;
      
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        }
      
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
          // eslint-disable-next-line no-console
          }
      }

      return NextResponse.json({
        success: true,
        message: 'Restaurant rejected successfully',
        data: result.data || {
          id: restaurantId,
          status: 'rejected',
          updated_at: new Date().toISOString()
        }
      });

    } catch {
      // eslint-disable-next-line no-console
      // // console.error('Error rejecting restaurant:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to reject restaurant'
      }, { status: 500 });
    }
  });
} 
