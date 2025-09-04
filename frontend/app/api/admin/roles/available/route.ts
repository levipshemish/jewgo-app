import { NextRequest, NextResponse } from 'next/server';
import { handleRoute, json } from '@/lib/server/route-helpers';
import { requireAdminOrThrow, getBackendAuthHeader } from '@/lib/server/admin-auth';
import { getBackendUrl } from '@/lib/api-config';
import { errorResponses, createSuccessResponse } from '@/lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    // Ensure caller has role management permission
    await requireAdminOrThrow(request);

    const backendUrl = `${process.env.BACKEND_URL || getBackendUrl()}/api/v4/admin/roles/available`;
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
      return createSuccessResponse({ message: 'No roles available' });
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch available roles', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
    }
  });
}
