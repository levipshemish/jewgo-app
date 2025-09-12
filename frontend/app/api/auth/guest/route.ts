import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Forward to anonymous endpoint
    const anonymousResponse = await fetch(`${request.nextUrl.origin}/api/auth/anonymous`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-CSRF-Token': request.headers.get('x-csrf-token') || '',
      },
      body: JSON.stringify({})
    });

    const responseData = await anonymousResponse.json();
    
    return NextResponse.json(responseData, { 
      status: anonymousResponse.status,
      headers: anonymousResponse.headers 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Guest login failed', message: error.message },
      { status: 500 }
    );
  }
}
