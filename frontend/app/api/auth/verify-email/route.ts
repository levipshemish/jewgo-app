import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Forward to v5 auth API with verify-email action
    const v5Response = await fetch(`${request.nextUrl.origin}/api/v5/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify-email',
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
      { error: 'Email verification failed', message: error.message },
      { status: 500 }
    );
  }
}
