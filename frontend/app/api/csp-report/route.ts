import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log CSP violations for monitoring
    console.error('CSP Violation:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      violation: body
    });
    
    // In production, you might want to send this to a monitoring service
    // like Sentry, LogRocket, or a custom logging endpoint
    
    return NextResponse.json({ status: 'logged' });
  } catch (error) {
    console.error('CSP report processing error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
