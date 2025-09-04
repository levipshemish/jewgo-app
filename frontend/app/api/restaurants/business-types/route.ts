import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    
    // Fetch business types from backend
    const response = await fetch(`${backendUrl}/api/v4/restaurants/business-types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({ success: true, data });

  } catch (_error) {
    console.error('Error fetching business types:', _error);
    
    // Return fallback data
    return NextResponse.json({ success: true, data: [] });
  }
}
