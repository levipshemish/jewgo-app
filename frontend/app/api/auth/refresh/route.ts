import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Forward to v5 auth API with refresh action
    const v5Response = await fetch(`${request.nextUrl.origin}/api/v5/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        action: 'refresh',
        ...data
      })
    });

    const responseData = await v5Response.json();
    
    return NextResponse.json(responseData, { 
      status: v5Response.status,
      headers: v5Response.headers 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Token refresh failed', message: error.message },
      { status: 500 }
    );
  }
}
