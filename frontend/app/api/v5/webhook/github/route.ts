import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/error-middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    
    const response = await fetch(`${backendUrl}/api/v5/webhook/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': request.headers.get('X-GitHub-Event') || '',
        'X-GitHub-Delivery': request.headers.get('X-GitHub-Delivery') || '',
        'X-Hub-Signature-256': request.headers.get('X-Hub-Signature-256') || '',
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to process GitHub webhook');
  }
}
