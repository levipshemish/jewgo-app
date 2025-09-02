import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireSuperAdmin } from '@/lib/server/rbac-middleware';
import { getBackendAuthHeader } from '@/lib/server/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    // Ensure caller has role management permission
    await requireSuperAdmin(request);

    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v4/admin/roles/available`;
    const authHeader = await getBackendAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Authorization header required', message: 'No authorization header found' }, { status: 401 });
    }

    try {
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });
      const status = response.status;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return NextResponse.json({ success: false, error: payload?.error || 'Failed to fetch available roles', message: payload?.message || 'Request failed' }, { status });
      }
      // Normalize to { success, data, message }
      if (payload && payload.success === true && 'data' in payload) {
        return NextResponse.json(payload);
      }
      return NextResponse.json({ success: true, data: payload, message: 'Success' });
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch available roles', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
    }
  });
}
