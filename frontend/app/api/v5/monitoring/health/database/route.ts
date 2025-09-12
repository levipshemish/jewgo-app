import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/error-middleware';

export async function GET(_request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    
    const response = await fetch(`${backendUrl}/api/v5/monitoring/health/database`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to check database health');
  }
}
