import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/api/auth-middleware';
import { simpleErrorHandler } from '@/lib/api/error-middleware';
import { ApiClientV5 } from '@/lib/api/client-v5';

const apiClient = new ApiClientV5();

export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(role && { role }),
      ...(status !== 'all' && { status }),
      sortBy,
      sortOrder
    });

    // Call backend API
    const response = await apiClient.get(`/api/v5/admin/users?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${authResult.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.success) {
      return NextResponse.json(response, { status: response.status || 500 });
    }

    return NextResponse.json(response.data);

  } catch (error) {
    return simpleErrorHandler(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const body = await request.json();

    // Call backend API
    const response = await apiClient.post('/api/v5/admin/users', body, {
      headers: {
        'Authorization': `Bearer ${authResult.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.success) {
      return NextResponse.json(response, { status: response.status || 500 });
    }

    return NextResponse.json(response.data, { status: 201 });

  } catch (error) {
    return simpleErrorHandler(error);
  }
}
