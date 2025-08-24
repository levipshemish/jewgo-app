import { NextRequest, NextResponse } from 'next/server';
import { generateSignedCSRFToken } from '@/lib/utils/auth-utils.server';
import { getCORSHeaders } from '@/lib/config/environment';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return new Response(null, {
    status: 204,
    headers: {
      ...getCORSHeaders(origin),
      'Cache-Control': 'no-store'
    }
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const token = generateSignedCSRFToken();

  return NextResponse.json(
    { token },
    {
      status: 200,
      headers: {
        ...getCORSHeaders(origin),
        'Cache-Control': 'no-store'
      }
    }
  );
}

