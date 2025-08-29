import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

export const runtime = 'nodejs';

// GET handler - fetch available roles
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    
    // Build backend URL
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v4/admin/roles/available`;
    
    try {
      // Forward request to backend
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const status = response.status;
        const payload = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        return NextResponse.json(payload, { status });
      }
      
      const data = await response.json();
      
      // Return backend response directly since it already has the correct format
      return NextResponse.json(data);
      
    } catch (error) {
      console.error('Error fetching available roles:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch available roles',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 503 }
      );
    }
  });
}
