import { NextRequest, NextResponse } from 'next/server';
import { validateAuthFromRequest } from '@/lib/middleware/auth-middleware';
import { handleApiError } from '@/lib/middleware/error-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    // Validate authentication
    const authResult = await validateAuthFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reviewId } = params;
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    
    const response = await fetch(`${backendUrl}/api/v5/reviews/${reviewId}/moderate`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to moderate review');
  }
}
