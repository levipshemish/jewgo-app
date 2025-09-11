import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth-middleware';
import { simpleErrorHandler } from '@/lib/middleware/error-middleware';
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
    const component = searchParams.get('component') || 'all'; // all, database, redis, cache, performance

    // Build query parameters
    const queryParams = new URLSearchParams({
      component
    });

    // Call backend API
    const response = await apiClient.get(`/api/v5/admin/system?${queryParams}`, {
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
    const { action } = body;

    // Validate action
    const validActions = ['clear_cache', 'restart_services', 'run_migration', 'backup_database'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
        validActions
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.post('/api/v5/admin/system', body, {
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
