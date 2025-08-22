import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Anonymous auth test endpoint is working',
    timestamp: new Date().toISOString(),
    methods: ['GET', 'POST'],
    environment: process.env.NODE_ENV
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  
  return NextResponse.json({
    message: 'POST request received successfully',
    timestamp: new Date().toISOString(),
    receivedData: body,
    headers: {
      'content-type': request.headers.get('content-type'),
      'origin': request.headers.get('origin')
    }
  });
}
