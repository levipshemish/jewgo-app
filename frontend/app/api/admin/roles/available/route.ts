import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

export const runtime = 'nodejs';

// GET handler - fetch available roles
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    
    try {
      // Forward request to backend
      const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v4/admin/roles/available`;
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const status = response.status;
      const payload = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const err = typeof payload === 'object' && payload ? payload : { error: 'Failed to fetch available roles' };
        return NextResponse.json(
          {
            success: false,
            error: err.error || 'Failed to fetch available roles',
            message: err.message || 'Request failed',
            status_code: status,
          },
          { status }
        );
      }

      // Normalize response to { success, data, message } format
      if (payload && payload.success === true && payload.data) {
        return NextResponse.json(payload);
      }
      if (payload && Array.isArray(payload)) {
        return NextResponse.json({ success: true, data: payload, message: 'Success' });
      }
      return NextResponse.json({ success: true, data: payload, message: 'Success' });
      
    } catch (error) {
      console.error('Error fetching available roles:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch available roles',
          message: error instanceof Error ? error.message : 'Unknown error',
          status_code: 503,
        },
        { status: 503 }
      );
    }
  });
}
