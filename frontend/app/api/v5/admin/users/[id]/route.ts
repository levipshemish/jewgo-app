import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth-middleware';
import { simpleErrorHandler } from '@/lib/middleware/error-middleware';
import { ApiClientV5 } from '@/lib/api/client-v5';

const apiClient = new ApiClientV5();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.get(`/api/v5/admin/users/${id}`, {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.put(`/api/v5/admin/users/${id}`, body, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.delete(`/api/v5/admin/users/${id}`, {
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
