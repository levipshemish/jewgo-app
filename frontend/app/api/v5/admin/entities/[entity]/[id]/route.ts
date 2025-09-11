import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/api/auth-middleware';
import { simpleErrorHandler } from '@/lib/api/error-middleware';
import { ApiClientV5 } from '@/lib/api/client-v5';

const apiClient = new ApiClientV5();

export async function GET(
  request: NextRequest,
  { params }: { params: { entity: string; id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { entity, id } = params;

    // Validate entity type
    const validEntities = ['restaurants', 'synagogues', 'mikvah', 'stores'];
    if (!validEntities.includes(entity)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity type',
        validEntities
      }, { status: 400 });
    }

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.get(`/api/v5/admin/entities/${entity}/${id}`, {
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
  { params }: { params: { entity: string; id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { entity, id } = params;
    const body = await request.json();

    // Validate entity type
    const validEntities = ['restaurants', 'synagogues', 'mikvah', 'stores'];
    if (!validEntities.includes(entity)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity type',
        validEntities
      }, { status: 400 });
    }

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.put(`/api/v5/admin/entities/${entity}/${id}`, body, {
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
  { params }: { params: { entity: string; id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { entity, id } = params;

    // Validate entity type
    const validEntities = ['restaurants', 'synagogues', 'mikvah', 'stores'];
    if (!validEntities.includes(entity)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity type',
        validEntities
      }, { status: 400 });
    }

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity ID'
      }, { status: 400 });
    }

    // Call backend API
    const response = await apiClient.delete(`/api/v5/admin/entities/${entity}/${id}`, {
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
