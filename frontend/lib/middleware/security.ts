import { NextRequest, NextResponse } from 'next/server';

export async function securityMiddleware(req: NextRequest): Promise<NextResponse> {
  // Basic no-op security gate; headers applied in middleware.ts response
  return new NextResponse(null, { status: 200 });
}

export function corsHeaders(_req: NextRequest): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token, Authorization',
  };
}

